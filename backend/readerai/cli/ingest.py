"""
CLI tool for ingesting stories and pre-generating audio with AWS Polly
"""

import hashlib
import json
import re
from pathlib import Path
from typing import Any

import aioboto3
import anyio
import typer
from pydantic import BaseModel
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from readerai.config import get_settings

app = typer.Typer()
console = Console()


class Chunk(BaseModel):
    """A chunk of text with metadata"""

    index: int
    text: str
    word_count: int
    start_word_index: int
    end_word_index: int


class ContentMetadata(BaseModel):
    """Metadata for ingested content"""

    title: str
    slug: str
    content_type: str = "story"
    total_words: int
    total_chunks: int | None = None
    chunks: list[dict[str, Any]] | None = None
    chapters: list[dict[str, Any]] | None = None
    voice_id: str
    grade_level: int | None = None
    tags: list[str] | None = None
    author: str | None = None


class AudioStatus(BaseModel):
    """Status of a single audio chunk"""

    chunk_index: int
    cache_key: str
    s3_key: str
    exists: bool
    url: str | None = None


class StoryStatus(BaseModel):
    """Overall status of story audio generation"""

    title: str
    slug: str
    total_chunks: int
    generated_chunks: int
    missing_chunks: list[int]
    complete: bool
    chunks: list[AudioStatus]


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")


def create_chunks(text: str, target_words: int | None = None) -> list[Chunk]:
    """
    Split text into chunks for TTS processing.

    Args:
        text: The text to chunk
        target_words: Target words per chunk (default from settings)
    """
    if target_words is None:
        target_words = 150  # Default chunk size

    words = text.split()
    chunks: list[Chunk] = []
    current_chunk_words = []
    start_word_index = 0

    for i, word in enumerate(words):
        current_chunk_words.append(word)

        # Check if we should end this chunk
        # End on sentence boundaries when we're near the target size
        if len(current_chunk_words) >= target_words * 0.8:
            # Look for sentence end
            if word.endswith((".", "!", "?", '."', '!"', '?"')):
                # Create chunk
                chunk_text = " ".join(current_chunk_words)
                chunks.append(
                    Chunk(
                        index=len(chunks),
                        text=chunk_text,
                        word_count=len(current_chunk_words),
                        start_word_index=start_word_index,
                        end_word_index=i,
                    )
                )
                # Reset for next chunk
                current_chunk_words = []
                start_word_index = i + 1

    # Handle remaining words
    if current_chunk_words:
        chunk_text = " ".join(current_chunk_words)
        chunks.append(
            Chunk(
                index=len(chunks),
                text=chunk_text,
                word_count=len(current_chunk_words),
                start_word_index=start_word_index,
                end_word_index=len(words) - 1,
            )
        )

    return chunks


def generate_cache_key(text: str, voice_id: str) -> str:
    """Generate consistent cache key for TTS output"""
    content = f"{text}|{voice_id}"
    return hashlib.sha256(content.encode()).hexdigest()


async def synthesize_chunk(
    session: aioboto3.Session,
    chunk: Chunk,
    content_slug: str,
    voice_id: str,
    bucket_name: str,
) -> dict[str, Any]:
    """
    Synthesize a single chunk using AWS Polly and upload to S3.
    Returns chunk metadata.
    """
    cache_key = generate_cache_key(chunk.text, voice_id)
    s3_key = f"content/{content_slug}/audio/{chunk.index:04d}_{cache_key[:8]}.mp3"

    # Check if already exists
    async with session.client("s3") as s3:  # type: ignore
        try:
            await s3.head_object(Bucket=bucket_name, Key=s3_key)
            # Already exists
            return {
                "index": chunk.index,
                "cache_key": cache_key,
                "s3_key": s3_key,
                "word_count": chunk.word_count,
                "start_word_index": chunk.start_word_index,
                "end_word_index": chunk.end_word_index,
                "cached": True,
            }
        except Exception:
            pass  # nosec B110 - Doesn't exist, need to generate

    # Generate with Polly
    async with session.client("polly") as polly:  # type: ignore
        response = await polly.synthesize_speech(
            Text=chunk.text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine="neural",
            TextType="text",
        )

    # Upload to S3
    audio_data = await response["AudioStream"].read()
    async with session.client("s3") as s3:  # type: ignore
        await s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=audio_data,
            ContentType="audio/mpeg",
        )

    return {
        "index": chunk.index,
        "cache_key": cache_key,
        "s3_key": s3_key,
        "word_count": chunk.word_count,
        "start_word_index": chunk.start_word_index,
        "end_word_index": chunk.end_word_index,
        "cached": False,
    }


async def process_story(
    title: str,
    text: str,
    voice_id: str,
    grade_level: int | None,
    tags: list[str] | None,
    bucket_name: str,
    region: str,
) -> None:
    """Process a single story"""
    story_slug = slugify(title)
    settings = get_settings()

    # Create chunks
    chunks = create_chunks(text)
    console.print(f"[yellow]Created {len(chunks)} chunks[/yellow]")

    # Create session
    if settings.aws.profile:
        session = aioboto3.Session(profile_name=settings.aws.profile)
        console.print(f"[dim]Using AWS profile: {settings.aws.profile}[/dim]")
    else:
        session = aioboto3.Session()

    chunk_metadata: list[dict[str, Any]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Processing chunks...", total=len(chunks))

        # Process chunks in parallel (with limit)
        sem = anyio.Semaphore(5)  # Limit concurrent API calls

        async def process_chunk_with_sem(chunk: Chunk) -> dict[str, Any]:
            async with sem:
                metadata = await synthesize_chunk(
                    session=session,
                    chunk=chunk,
                    content_slug=story_slug,
                    voice_id=voice_id,
                    bucket_name=bucket_name,
                )
                progress.update(task, advance=1)
                return metadata

        # Process all chunks
        async with anyio.create_task_group() as tg:
            for chunk in chunks:
                chunk_metadata.append(await tg.start(process_chunk_with_sem, chunk))

    # Sort metadata by index
    chunk_metadata.sort(key=lambda x: x["index"])

    # Show cache statistics
    cached_count = sum(1 for m in chunk_metadata if m.get("cached", False))
    if cached_count > 0:
        console.print(
            f"[green]Used cache for {cached_count}/{len(chunks)} chunks[/green]"
        )

    # Save story metadata
    story_metadata = ContentMetadata(
        title=title,
        slug=story_slug,
        content_type="story",
        total_words=len(text.split()),
        total_chunks=len(chunks),
        chunks=chunk_metadata,
        voice_id=voice_id,
        grade_level=grade_level,
        tags=tags,
    )

    # Save metadata to S3
    async with session.client("s3") as s3:  # type: ignore
        await s3.put_object(
            Bucket=bucket_name,
            Key=f"content/{story_slug}/metadata.json",
            Body=story_metadata.model_dump_json(indent=2),
            ContentType="application/json",
        )

    console.print(f"\n[green]✓ Successfully processed '{title}'[/green]")
    console.print(f"  - {len(chunks)} chunks")
    console.print(f"  - {len(text.split())} words")
    console.print(f"  - Voice: {voice_id}")
    console.print(f"  - Stored in: s3://{bucket_name}/content/{story_slug}/")


@app.command()
def story(
    title: str = typer.Argument(..., help="Story title"),  # noqa: B008
    text_file: Path = typer.Argument(..., help="Path to story text file"),  # noqa: B008
    voice: str | None = typer.Option(None, "--voice", "-v", help="AWS Polly voice ID"),
    grade_level: int | None = typer.Option(
        None, "--grade", "-g", help="Grade level (1-12)"
    ),
    tags: str | None = typer.Option(None, "--tags", "-t", help="Comma-separated tags"),
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
    region: str | None = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """Ingest a story and pre-generate all audio chunks"""

    # Get defaults from settings
    settings = get_settings()
    voice = voice or "Joanna"  # Default voice
    bucket = bucket or settings.aws.audio_cache_bucket
    region = region or settings.aws.region

    # Validate file exists
    if not text_file.exists():
        console.print(f"[red]Error: File '{text_file}' not found[/red]")
        raise typer.Exit(1)

    # Read text
    with open(text_file, encoding="utf-8") as f:
        text = f.read().strip()

    word_count = len(text.split())
    console.print(f"\n[bold blue]Processing story:[/bold blue] {title}")
    console.print(f"Words: {word_count}")
    console.print(f"Voice: {voice}")
    console.print(f"Grade level: {grade_level or 'Not specified'}")
    if tags:
        console.print(f"Tags: {tags}")

    # Process asynchronously
    anyio.run(
        process_story,
        title,
        text,
        voice,
        grade_level,
        tags.split(",") if tags else None,
        bucket,
        region,
    )


@app.command()
def bulk(
    directory: Path = typer.Argument(..., help="Directory containing story files"),  # noqa: B008
    voice: str | None = typer.Option(None, "--voice", "-v", help="AWS Polly voice ID"),
    grade_level: int | None = typer.Option(
        None, "--grade", "-g", help="Grade level (1-12)"
    ),
    pattern: str = typer.Option("*.txt", "--pattern", "-p", help="File pattern"),
):
    """Bulk ingest stories from a directory"""
    if not directory.is_dir():
        console.print(f"[red]Error: '{directory}' is not a directory[/red]")
        raise typer.Exit(1)

    # Find all matching files
    files = list(directory.glob(pattern))
    if not files:
        console.print(f"[yellow]No files matching '{pattern}' in {directory}[/yellow]")
        raise typer.Exit(0)

    console.print(f"[green]Found {len(files)} files to process[/green]")

    # Process each file
    for file_path in files:
        # Extract title from filename (remove extension)
        title = file_path.stem.replace("_", " ").replace("-", " ").title()

        console.print(f"\n[blue]Processing: {file_path.name}[/blue]")
        story(title=title, text_file=file_path, voice=voice, grade_level=grade_level)


@app.command()
def list_stories(
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
):
    """List all ingested stories"""
    settings = get_settings()
    bucket = bucket or settings.aws.audio_cache_bucket

    async def _list_stories() -> None:
        # Create session
        if settings.aws.profile:
            session = aioboto3.Session(profile_name=settings.aws.profile)
        else:
            session = aioboto3.Session()

        stories = []

        async with session.client("s3") as s3:  # type: ignore
            # List all metadata files
            paginator = s3.get_paginator("list_objects_v2")
            async for page in paginator.paginate(
                Bucket=bucket, Prefix="content/", Delimiter="/"
            ):
                if "CommonPrefixes" in page:
                    for prefix in page["CommonPrefixes"]:
                        story_slug = prefix["Prefix"].split("/")[1]

                        # Try to get metadata
                        try:
                            response = await s3.get_object(
                                Bucket=bucket,
                                Key=f"content/{story_slug}/metadata.json",
                            )
                            data = await response["Body"].read()
                            metadata = json.loads(data)
                            stories.append(metadata)
                        except Exception:
                            # No metadata file
                            stories.append({"title": story_slug, "slug": story_slug})

        # Display as table
        if stories:
            table = Table(show_header=True, header_style="bold")
            table.add_column("Title", style="cyan")
            table.add_column("Type", style="yellow")
            table.add_column("Words", justify="right")
            table.add_column("Chunks", justify="right")
            table.add_column("Voice")
            table.add_column("Grade", justify="center")

            for story in sorted(stories, key=lambda x: x.get("title", "")):
                table.add_row(
                    story.get("title", "Unknown"),
                    story.get("content_type", "story"),
                    str(story.get("total_words", "?")),
                    str(story.get("total_chunks", "?")),
                    story.get("voice_id", "?"),
                    str(story.get("grade_level", "-")),
                )

            console.print(table)
            console.print(f"\n[green]Total: {len(stories)} stories[/green]")
        else:
            console.print("[yellow]No stories found[/yellow]")

    anyio.run(_list_stories)


@app.command()
def book(
    title: str = typer.Argument(..., help="Book title"),  # noqa: B008
    text_file: Path = typer.Argument(..., help="Path to book text file"),  # noqa: B008
    author: str | None = typer.Option(None, "--author", "-a", help="Book author"),
    voice: str | None = typer.Option(None, "--voice", "-v", help="AWS Polly voice ID"),
    grade_level: int | None = typer.Option(
        None, "--grade", "-g", help="Grade level (1-12)"
    ),
    tags: str | None = typer.Option(None, "--tags", "-t", help="Comma-separated tags"),
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
    region: str | None = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """Ingest a book (processes as single story)"""

    # Get defaults from settings
    settings = get_settings()
    voice = voice or "Joanna"  # Default voice
    bucket = bucket or settings.aws.audio_cache_bucket
    region = region or settings.aws.region

    # Validate file exists
    if not text_file.exists():
        console.print(f"[red]Error: File '{text_file}' not found[/red]")
        raise typer.Exit(1)

    # Get file size
    file_size = text_file.stat().st_size / 1024 / 1024  # MB
    console.print(f"\n[bold blue]Processing book:[/bold blue] {title}")
    if author:
        console.print(f"Author: {author}")
    console.print(f"File: {text_file.name} ({file_size:.1f} MB)")
    console.print(f"Voice: {voice}")

    # Process as single story (no chapter detection)
    console.print("[yellow]Processing book as single story.[/yellow]")

    story(
        title=title,
        text_file=text_file,
        voice=voice,
        grade_level=grade_level,
        tags=tags,
        bucket=bucket,
        region=region,
    )
