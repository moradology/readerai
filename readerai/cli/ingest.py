"""
CLI tool for ingesting stories and pre-generating audio with AWS Polly
"""

import asyncio
import hashlib
import json
from pathlib import Path
from typing import Optional

import aioboto3
import typer
from pydantic import BaseModel
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

app = typer.Typer()
console = Console()


class Chunk(BaseModel):
    """A chunk of text with metadata"""

    index: int
    text: str
    word_count: int
    start_word_index: int
    end_word_index: int


class StoryMetadata(BaseModel):
    """Metadata for an ingested story"""

    title: str
    slug: str
    total_words: int
    chunks: list[dict[str, any]]
    voice_id: str
    grade_level: Optional[int] = None
    tags: Optional[list[str]] = None


def slugify(text: str) -> str:
    """Convert text to URL-safe slug"""
    return text.lower().replace(" ", "-").replace("'", "").replace('"', "")


def create_chunks(text: str, target_words: int = 400) -> list[Chunk]:
    """Split text into chunks at paragraph boundaries"""
    paragraphs = text.strip().split("\n\n")
    chunks = []
    current_chunk = []
    current_word_count = 0
    total_word_index = 0

    for para in paragraphs:
        para_words = para.split()
        para_word_count = len(para_words)

        # If adding this paragraph exceeds target and we have content, create chunk
        if current_word_count + para_word_count > target_words and current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(
                Chunk(
                    index=len(chunks),
                    text=chunk_text,
                    word_count=current_word_count,
                    start_word_index=total_word_index - current_word_count,
                    end_word_index=total_word_index - 1,
                )
            )
            current_chunk = [para]
            current_word_count = para_word_count
        else:
            current_chunk.append(para)
            current_word_count += para_word_count

        total_word_index += para_word_count

    # Add final chunk
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        chunks.append(
            Chunk(
                index=len(chunks),
                text=chunk_text,
                word_count=current_word_count,
                start_word_index=total_word_index - current_word_count,
                end_word_index=total_word_index - 1,
            )
        )

    return chunks


def generate_cache_key(text: str, voice_id: str) -> str:
    """Generate consistent cache key for text + voice combination"""
    return hashlib.sha256(f"{text}:{voice_id}".encode()).hexdigest()


async def synthesize_chunk(
    session: aioboto3.Session,
    chunk: Chunk,
    story_slug: str,
    voice_id: str,
    bucket_name: str,
) -> dict[str, any]:
    """Synthesize and upload a single chunk"""
    async with session.client("polly") as polly, session.client("s3") as s3:
        # Generate audio
        response = await polly.synthesize_speech(
            Text=chunk.text, VoiceId=voice_id, OutputFormat="mp3", Engine="standard"
        )

        # Read audio stream
        audio_data = await response["AudioStream"].read()

        # Generate S3 key
        cache_key = generate_cache_key(chunk.text, voice_id)
        s3_key = f"stories/{story_slug}/{voice_id}/chunk_{chunk.index:03d}_{cache_key[:8]}.mp3"

        # Upload to S3
        await s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=audio_data,
            ContentType="audio/mpeg",
            StorageClass="ONEZONE_IA",
        )

        return {
            "chunk_index": chunk.index,
            "s3_key": s3_key,
            "cache_key": cache_key,
            "word_count": chunk.word_count,
            "text_preview": chunk.text[:50] + "..."
            if len(chunk.text) > 50
            else chunk.text,
        }


@app.command()
def story(
    title: str = typer.Argument(..., help="Story title"),  # noqa: B008
    text_file: Path = typer.Argument(..., help="Path to text file"),  # noqa: B008
    voice: str = typer.Option("Joanna", "--voice", "-v", help="AWS Polly voice ID"),
    grade_level: Optional[int] = typer.Option(
        None, "--grade", "-g", help="Grade level (1-12)"
    ),
    tags: Optional[str] = typer.Option(
        None, "--tags", "-t", help="Comma-separated tags"
    ),
    bucket: str = typer.Option(
        "readerai-audio-cache-dev", "--bucket", "-b", help="S3 bucket name"
    ),
    region: str = typer.Option("us-east-1", "--region", "-r", help="AWS region"),
):
    """Ingest a single story and pre-generate all audio chunks"""

    # Validate file exists
    if not text_file.exists():
        console.print(f"[red]Error: File '{text_file}' not found[/red]")
        raise typer.Exit(1)

    # Read text
    text = text_file.read_text().strip()
    if not text:
        console.print("[red]Error: File is empty[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold blue]Ingesting story:[/bold blue] {title}")
    console.print(f"Voice: {voice}")
    console.print(f"Text length: {len(text)} characters")

    # Create chunks
    chunks = create_chunks(text)
    console.print(f"Created {len(chunks)} chunks")

    # Process chunks asynchronously
    asyncio.run(
        process_story(
            title=title,
            chunks=chunks,
            voice_id=voice,
            grade_level=grade_level,
            tags=tags.split(",") if tags else None,
            bucket_name=bucket,
            region=region,
        )
    )


async def process_story(
    title: str,
    chunks: list[Chunk],
    voice_id: str,
    grade_level: Optional[int],
    tags: Optional[list[str]],
    bucket_name: str,
    region: str,
):
    """Process all chunks for a story"""
    story_slug = slugify(title)
    session = aioboto3.Session()

    chunk_metadata = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Generating audio chunks...", total=len(chunks))

        # Process chunks
        for chunk in chunks:
            metadata = await synthesize_chunk(
                session=session,
                chunk=chunk,
                story_slug=story_slug,
                voice_id=voice_id,
                bucket_name=bucket_name,
            )
            chunk_metadata.append(metadata)
            progress.update(
                task,
                advance=1,
                description=f"Generated chunk {chunk.index + 1}/{len(chunks)}",
            )

    # Save metadata
    total_words = sum(c.word_count for c in chunks)
    metadata = StoryMetadata(
        title=title,
        slug=story_slug,
        total_words=total_words,
        chunks=chunk_metadata,
        voice_id=voice_id,
        grade_level=grade_level,
        tags=tags,
    )

    # Save metadata to S3
    async with session.client("s3") as s3:
        await s3.put_object(
            Bucket=bucket_name,
            Key=f"stories/{story_slug}/metadata.json",
            Body=metadata.model_dump_json(indent=2),
            ContentType="application/json",
        )

    console.print(f"\n[green]✓ Successfully ingested '{title}'[/green]")
    console.print(f"  - {len(chunks)} chunks generated")
    console.print(f"  - {total_words} total words")
    console.print(f"  - Stored in: s3://{bucket_name}/stories/{story_slug}/")


@app.command()
def bulk(
    directory: Path = typer.Argument(..., help="Directory containing text files"),  # noqa: B008
    voice: str = typer.Option("Joanna", "--voice", "-v", help="AWS Polly voice ID"),
    bucket: str = typer.Option(
        "readerai-audio-cache-dev", "--bucket", "-b", help="S3 bucket name"
    ),
    region: str = typer.Option("us-east-1", "--region", "-r", help="AWS region"),
):
    """Bulk ingest all .txt files in a directory"""

    if not directory.exists() or not directory.is_dir():
        console.print(f"[red]Error: '{directory}' is not a valid directory[/red]")
        raise typer.Exit(1)

    txt_files = list(directory.glob("*.txt"))
    if not txt_files:
        console.print(f"[yellow]No .txt files found in '{directory}'[/yellow]")
        raise typer.Exit(0)

    console.print(f"\n[bold blue]Found {len(txt_files)} stories to ingest[/bold blue]")

    for txt_file in txt_files:
        # Use filename (without extension) as title
        title = txt_file.stem.replace("_", " ").replace("-", " ").title()

        console.print(f"\n[dim]{'=' * 60}[/dim]")
        story(
            title=title, text_file=txt_file, voice=voice, bucket=bucket, region=region
        )

    console.print("\n[green]✓ Bulk ingestion complete![/green]")


@app.command()
def list_stories(
    bucket: str = typer.Option(
        "readerai-audio-cache-dev", "--bucket", "-b", help="S3 bucket name"
    ),
    region: str = typer.Option("us-east-1", "--region", "-r", help="AWS region"),
):
    """List all ingested stories"""
    asyncio.run(list_stories_async(bucket, region))


async def list_stories_async(bucket_name: str, region: str):
    """List stories from S3"""
    session = aioboto3.Session()

    async with session.client("s3") as s3:
        # List all metadata.json files
        response = await s3.list_objects_v2(
            Bucket=bucket_name, Prefix="stories/", Delimiter="/"
        )

        if "CommonPrefixes" not in response:
            console.print("[yellow]No stories found[/yellow]")
            return

        console.print("\n[bold]Ingested Stories:[/bold]")

        for prefix in response["CommonPrefixes"]:
            story_prefix = prefix["Prefix"]

            # Try to get metadata
            try:
                metadata_response = await s3.get_object(
                    Bucket=bucket_name, Key=f"{story_prefix}metadata.json"
                )
                metadata_content = await metadata_response["Body"].read()
                metadata = json.loads(metadata_content)

                console.print(f"\n• {metadata['title']}")
                console.print(f"  Slug: {metadata['slug']}")
                console.print(f"  Chunks: {len(metadata['chunks'])}")
                console.print(f"  Words: {metadata['total_words']}")
                console.print(f"  Voice: {metadata['voice_id']}")
                if metadata.get("grade_level"):
                    console.print(f"  Grade: {metadata['grade_level']}")
                if metadata.get("tags"):
                    console.print(f"  Tags: {', '.join(metadata['tags'])}")
            except Exception:
                # Just show the directory if no metadata
                story_name = story_prefix.split("/")[-2]
                console.print(f"\n• {story_name} [dim](no metadata)[/dim]")


if __name__ == "__main__":
    app()
