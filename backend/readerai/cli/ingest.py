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


class Chapter(BaseModel):
    """A chapter with metadata"""

    number: int
    title: str
    text: str
    word_count: int
    start_line: int | None = None
    end_line: int | None = None


class ChapterBoundary(BaseModel):
    """Detected chapter boundary in text"""

    line_number: int
    title: str
    pattern_matched: str | None = None


class StoryMetadata(BaseModel):
    """Metadata for an ingested story (legacy)"""

    title: str
    slug: str
    total_words: int
    chunks: list[dict[str, Any]]
    voice_id: str
    grade_level: int | None = None
    tags: list[str] | None = None


class ContentMetadata(BaseModel):
    """Metadata for ingested content (story or book)"""

    title: str
    slug: str
    content_type: str  # "story" or "book"
    total_words: int
    chapters: list[dict[str, Any]]  # Chapter metadata
    voice_id: str
    grade_level: int | None = None
    tags: list[str] | None = None
    author: str | None = None


def slugify(text: str) -> str:
    """Convert text to URL-safe slug"""
    return text.lower().replace(" ", "-").replace("'", "").replace('"', "")


def create_chunks(text: str, target_words: int | None = None) -> list[Chunk]:
    """Split text into chunks at paragraph boundaries"""
    if target_words is None:
        target_words = 400  # Default chunk size

    paragraphs = text.strip().split("\n\n")
    chunks: list[Chunk] = []
    current_chunk: list[str] = []
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


def detect_chapter_boundaries(
    file_path: Path, max_preview_lines: int = 2000
) -> list[ChapterBoundary]:
    """
    First pass: Detect chapter boundaries using regex patterns.
    Returns list of detected boundaries with line numbers.
    """
    # Common chapter patterns
    patterns = [
        (r"^Chapter\s+(\d+)(?:\s*[-:.]?\s*(.*))?", "numbered"),
        (r"^CHAPTER\s+([IVXLCDM]+)(?:\s*[-:.]?\s*(.*))?", "roman"),
        (r"^(\d+)\.\s+([A-Z].*)$", "numbered_title"),
        (r"^Part\s+(\w+)(?:\s*[-:.]?\s*(.*))?", "part"),
        (r"^([A-Z][^.!?]*?)$", "title_only"),  # All caps title
    ]

    boundaries = []
    console.print("[yellow]Scanning for chapter boundaries...[/yellow]")

    with open(file_path, encoding="utf-8") as f:
        for line_no, line in enumerate(f):
            line_stripped = line.strip()

            # Skip empty lines and very short lines
            if len(line_stripped) < 3:
                continue

            for pattern, pattern_type in patterns:
                match = re.match(pattern, line_stripped)
                if match:
                    # Extract chapter title
                    if pattern_type in ["numbered", "roman"]:
                        number = match.group(1)
                        title = (
                            match.group(2) if match.group(2) else f"Chapter {number}"
                        )
                    elif pattern_type == "numbered_title":
                        title = f"{match.group(1)}. {match.group(2)}"
                    elif pattern_type == "part":
                        title = f"Part {match.group(1)}"
                    else:
                        title = match.group(0)

                    # Avoid false positives - check context
                    if pattern_type == "title_only" and len(line_stripped) > 50:
                        continue  # Probably not a chapter title

                    boundaries.append(
                        ChapterBoundary(
                            line_number=line_no,
                            title=title.strip(),
                            pattern_matched=pattern_type,
                        )
                    )
                    break

            # Show preview of what we're finding
            if line_no < max_preview_lines and len(boundaries) < 5:
                if any(re.match(p[0], line_stripped) for p in patterns):
                    console.print(f"[dim]Line {line_no}: {line_stripped[:60]}...[/dim]")

    console.print(
        f"[green]Found {len(boundaries)} potential chapter boundaries[/green]"
    )
    return boundaries


def extract_chapters_from_boundaries(
    file_path: Path, boundaries: list[ChapterBoundary]
) -> list[Chapter]:
    """
    Extract chapter text based on detected boundaries.
    """
    chapters = []

    with open(file_path, encoding="utf-8") as f:
        lines = f.readlines()

    # Add a final boundary at the end of the file
    boundaries.append(
        ChapterBoundary(line_number=len(lines), title="END", pattern_matched="eof")
    )

    for i in range(len(boundaries) - 1):
        start_line = boundaries[i].line_number
        end_line = boundaries[i + 1].line_number

        # Skip the END boundary
        if boundaries[i].pattern_matched == "eof":
            break

        # Extract chapter text
        chapter_lines = lines[start_line:end_line]
        chapter_text = "".join(chapter_lines).strip()

        # Count words
        word_count = len(chapter_text.split())

        chapters.append(
            Chapter(
                number=i + 1,
                title=boundaries[i].title,
                text=chapter_text,
                word_count=word_count,
                start_line=start_line,
                end_line=end_line,
            )
        )

    return chapters


def clean_chapter_text(chapter: Chapter) -> str:
    """
    Second pass: Clean chapter text using LLM.
    For now, this is a placeholder - we'll integrate DSPy later.
    """
    # TODO: Integrate with DSPy for intelligent cleaning
    # For now, do basic cleaning
    text = chapter.text

    # Remove common headers/footers
    lines = text.split("\n")
    cleaned_lines = []

    for line in lines:
        # Skip page numbers
        if re.match(r"^\s*\d+\s*$", line):
            continue
        # Skip common headers
        if re.match(r"^Page \d+", line, re.IGNORECASE):
            continue
        # Skip copyright notices
        if "copyright" in line.lower() or "©" in line:
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


async def synthesize_chunk(
    session: aioboto3.Session,
    chunk: Chunk,
    story_slug: str,
    voice_id: str,
    bucket_name: str,
) -> dict[str, Any]:
    """Synthesize and upload a single chunk (legacy)"""
    async with session.client("polly") as polly, session.client("s3") as s3:  # type: ignore
        # Generate audio
        response = await polly.synthesize_speech(
            Text=chunk.text,
            VoiceId=voice_id,
            OutputFormat="mp3",
            Engine="neural",  # Use neural for pre-generated content
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


async def synthesize_chapter(
    session: aioboto3.Session,
    chapter: Chapter,
    content_slug: str,
    voice_id: str,
    bucket_name: str,
) -> dict[str, Any]:
    """Synthesize and upload a single chapter"""
    async with session.client("polly") as polly, session.client("s3") as s3:  # type: ignore
        # Clean the text
        clean_text = clean_chapter_text(chapter)

        # Generate audio
        response = await polly.synthesize_speech(
            Text=clean_text,
            VoiceId=voice_id,
            OutputFormat="mp3",
            Engine="neural",  # Use neural for pre-generated content
        )

        # Read audio stream
        audio_data = await response["AudioStream"].read()

        # Generate S3 keys for chapter structure
        chapter_slug = slugify(chapter.title)
        chapter_prefix = (
            f"content/{content_slug}/chapters/{chapter.number:03d}-{chapter_slug}"
        )

        # Upload audio
        audio_key = f"{chapter_prefix}/audio.mp3"
        await s3.put_object(
            Bucket=bucket_name,
            Key=audio_key,
            Body=audio_data,
            ContentType="audio/mpeg",
            StorageClass="ONEZONE_IA",
        )

        # Upload text
        text_key = f"{chapter_prefix}/text.json"
        text_data = {
            "title": chapter.title,
            "text": clean_text,
            "word_count": len(clean_text.split()),
            "original_line_start": chapter.start_line,
            "original_line_end": chapter.end_line,
        }
        await s3.put_object(
            Bucket=bucket_name,
            Key=text_key,
            Body=json.dumps(text_data, indent=2),
            ContentType="application/json",
        )

        # TODO: Generate and upload timings
        # For now, upload placeholder
        timings_key = f"{chapter_prefix}/timings.json"
        timings_data = {
            "words": [],  # Will be populated with word-level timing
            "duration": 0,  # Will be calculated from audio
        }
        await s3.put_object(
            Bucket=bucket_name,
            Key=timings_key,
            Body=json.dumps(timings_data, indent=2),
            ContentType="application/json",
        )

        return {
            "chapter_number": chapter.number,
            "chapter_title": chapter.title,
            "audio_key": audio_key,
            "text_key": text_key,
            "timings_key": timings_key,
            "word_count": len(clean_text.split()),
            "text_preview": clean_text[:100] + "..."
            if len(clean_text) > 100
            else clean_text,
        }


@app.command()
def story(
    title: str = typer.Argument(..., help="Story title"),  # noqa: B008
    text_file: Path = typer.Argument(..., help="Path to text file"),  # noqa: B008
    voice: str | None = typer.Option(None, "--voice", "-v", help="AWS Polly voice ID"),
    grade_level: int | None = typer.Option(
        None, "--grade", "-g", help="Grade level (1-12)"
    ),
    tags: str | None = typer.Option(None, "--tags", "-t", help="Comma-separated tags"),
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
    region: str | None = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """Ingest a single story and pre-generate all audio chunks"""

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
    text = text_file.read_text().strip()
    if not text:
        console.print("[red]Error: File is empty[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold blue]Ingesting story:[/bold blue] {title}")
    console.print(f"Voice: {voice}")
    console.print(f"Text length: {len(text)} characters")
    console.print(f"Bucket: {bucket}")
    console.print(f"Region: {region}")

    # Create chunks
    chunks = create_chunks(text)
    console.print(f"Created {len(chunks)} chunks")

    # Process chunks asynchronously
    anyio.run(
        process_story,
        title,
        chunks,
        voice,
        grade_level,
        tags.split(",") if tags else None,
        bucket,
        region,
    )


async def process_story(
    title: str,
    chunks: list[Chunk],
    voice_id: str,
    grade_level: int | None,
    tags: list[str] | None,
    bucket_name: str,
    region: str,
):
    """Process all chunks for a story"""
    story_slug = slugify(title)
    settings = get_settings()

    # Create session with profile if specified
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
    story_metadata = StoryMetadata(
        title=title,
        slug=story_slug,
        total_words=total_words,
        chunks=chunk_metadata,
        voice_id=voice_id,
        grade_level=grade_level,
        tags=tags,
    )

    # Save metadata to S3
    async with session.client("s3") as s3:  # type: ignore
        await s3.put_object(
            Bucket=bucket_name,
            Key=f"stories/{story_slug}/metadata.json",
            Body=story_metadata.model_dump_json(indent=2),
            ContentType="application/json",
        )

    console.print(f"\n[green]✓ Successfully ingested '{title}'[/green]")
    console.print(f"  - {len(chunks)} chunks generated")
    console.print(f"  - {total_words} total words")
    console.print(f"  - Stored in: s3://{bucket_name}/stories/{story_slug}/")


@app.command()
def bulk(
    directory: Path = typer.Argument(..., help="Directory containing text files"),  # noqa: B008
    voice: str | None = typer.Option(None, "--voice", "-v", help="AWS Polly voice ID"),
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
    region: str | None = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """Bulk ingest all .txt files in a directory"""

    # Get defaults from settings
    settings = get_settings()
    voice = voice or "Joanna"  # Default voice
    bucket = bucket or settings.aws.audio_cache_bucket
    region = region or settings.aws.region

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
    bucket: str | None = typer.Option(None, "--bucket", "-b", help="S3 bucket name"),
    region: str | None = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """List all ingested stories"""
    settings = get_settings()
    bucket = bucket or settings.aws.audio_cache_bucket
    region = region or settings.aws.region
    anyio.run(list_stories_async, bucket, region)


async def list_stories_async(bucket_name: str, region: str):
    """List stories from S3"""
    settings = get_settings()

    # Create session with profile if specified
    if settings.aws.profile:
        session = aioboto3.Session(profile_name=settings.aws.profile)
    else:
        session = aioboto3.Session()

    async with session.client("s3") as s3:  # type: ignore
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
    force_single: bool = typer.Option(
        False, "--force-single", help="Treat as single story even if chapters detected"
    ),
):
    """Ingest a book with automatic chapter detection"""

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

    # First pass: Detect chapters
    boundaries = detect_chapter_boundaries(text_file)

    if not boundaries or force_single:
        if not boundaries:
            console.print(
                "[yellow]No chapters detected. Processing as single story.[/yellow]"
            )
        else:
            console.print(
                "[yellow]Force single mode - ignoring chapter boundaries.[/yellow]"
            )

        # Process as single story
        story(
            title=title,
            text_file=text_file,
            voice=voice,
            grade_level=grade_level,
            tags=tags,
            bucket=bucket,
            region=region,
        )
        return

    # Show detected chapters
    console.print(f"\n[green]Detected {len(boundaries)} chapters:[/green]")
    table = Table(show_header=True, header_style="bold")
    table.add_column("Chapter", style="cyan")
    table.add_column("Line", justify="right")
    table.add_column("Pattern", style="dim")

    for i, boundary in enumerate(boundaries[:10]):  # Show first 10
        table.add_row(
            boundary.title, str(boundary.line_number), boundary.pattern_matched or ""
        )

    if len(boundaries) > 10:
        table.add_row("...", "...", "...")

    console.print(table)

    # Ask for confirmation
    if not typer.confirm("Proceed with chapter extraction?", default=True):
        console.print("[yellow]Aborted.[/yellow]")
        raise typer.Exit(0)

    # Extract chapters
    chapters = extract_chapters_from_boundaries(text_file, boundaries)
    console.print(f"\n[blue]Extracted {len(chapters)} chapters[/blue]")

    # Process chapters asynchronously
    anyio.run(
        process_book,
        title,
        author,
        chapters,
        voice,
        grade_level,
        tags.split(",") if tags else None,
        bucket,
        region,
    )


async def process_book(
    title: str,
    author: str | None,
    chapters: list[Chapter],
    voice_id: str,
    grade_level: int | None,
    tags: list[str] | None,
    bucket_name: str,
    region: str,
):
    """Process all chapters for a book"""
    book_slug = slugify(title)
    settings = get_settings()

    # Create session
    if settings.aws.profile:
        session = aioboto3.Session(profile_name=settings.aws.profile)
        console.print(f"[dim]Using AWS profile: {settings.aws.profile}[/dim]")
    else:
        session = aioboto3.Session()

    chapter_metadata: list[dict[str, Any]] = []

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Processing chapters...", total=len(chapters))

        # Process chapters
        for chapter in chapters:
            metadata = await synthesize_chapter(
                session=session,
                chapter=chapter,
                content_slug=book_slug,
                voice_id=voice_id,
                bucket_name=bucket_name,
            )
            chapter_metadata.append(metadata)
            progress.update(
                task,
                advance=1,
                description=f"Processed chapter {chapter.number}/{len(chapters)}: {chapter.title[:30]}...",
            )

    # Save book metadata
    total_words = sum(c.word_count for c in chapters)
    book_metadata = ContentMetadata(
        title=title,
        slug=book_slug,
        content_type="book",
        total_words=total_words,
        chapters=chapter_metadata,
        voice_id=voice_id,
        grade_level=grade_level,
        tags=tags,
        author=author,
    )

    # Save metadata to S3
    async with session.client("s3") as s3:  # type: ignore
        await s3.put_object(
            Bucket=bucket_name,
            Key=f"content/{book_slug}/metadata.json",
            Body=book_metadata.model_dump_json(indent=2),
            ContentType="application/json",
        )

    console.print(f"\n[green]✓ Successfully processed '{title}'[/green]")
    console.print(f"  - {len(chapters)} chapters")
    console.print(f"  - {total_words} total words")
    console.print(f"  - Stored in: s3://{bucket_name}/content/{book_slug}/")
