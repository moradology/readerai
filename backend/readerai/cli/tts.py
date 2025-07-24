"""
TTS CLI commands for audio synthesis and caching
"""

import json
from pathlib import Path

import anyio
import typer
from rich.console import Console
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
)
from rich.table import Table

from readerai.config import get_settings
from readerai.tts import TTSBatchRequest, TTSRequest, TTSService

# Text chunking is handled inline for now

console = Console()
app = typer.Typer()


@app.command()
def synthesize(
    text: str = typer.Argument(..., help="Text to synthesize"),
    voice_id: str | None = typer.Option(
        None, "--voice", "-v", help="Polly voice ID (default: from config)"
    ),
    output: Path | None = typer.Option(
        None, "--output", "-o", help="Save audio to file"
    ),
    show_timings: bool = typer.Option(
        False, "--timings", "-t", help="Display word timings"
    ),
):
    """Synthesize text to speech"""

    async def _synthesize():
        service = TTSService()
        request = TTSRequest(text=text, voice_id=voice_id, engine="standard")

        with console.status("[bold green]Synthesizing..."):
            response = await service.synthesize(request)

        if response.cached:
            console.print("[yellow]✓ Using cached audio[/yellow]")
        else:
            console.print("[green]✨ Generated new audio[/green]")

        console.print(f"Cache key: {response.cache_key[:16]}...")
        console.print(f"Audio URL: {response.presigned_audio_url}")

        if show_timings and response.timings:
            table = Table(title="Word Timings")
            table.add_column("Word", style="cyan")
            table.add_column("Time (ms)", justify="right")

            for timing in response.timings[:10]:  # Show first 10
                table.add_row(timing.value, str(timing.time))

            if len(response.timings) > 10:
                table.add_row("...", "...")

            console.print(table)

        if output:
            # Download and save audio
            import httpx

            async with httpx.AsyncClient() as client:
                resp = await client.get(response.presigned_audio_url)
                if resp.status_code == 200:
                    output.write_bytes(resp.content)
                    console.print(f"[green]✓ Saved audio to {output}[/green]")
                else:
                    console.print(
                        f"[red]✗ Failed to download audio: {resp.status_code}[/red]"
                    )

    anyio.run(_synthesize)


@app.command()
def pregen(
    book_path: Path = typer.Argument(..., help="Path to book/story text file"),
    voice_id: str | None = typer.Option(
        None, "--voice", "-v", help="Polly voice ID (default: from config)"
    ),
    batch_size: int = typer.Option(
        5, "--batch-size", "-b", help="Number of chunks to process concurrently"
    ),
    chunk_size: int = typer.Option(
        400, "--chunk-size", "-c", help="Target words per chunk"
    ),
    metadata_output: Path | None = typer.Option(
        None, "--metadata", "-m", help="Save chunk metadata as JSON"
    ),
):
    """Pre-generate TTS audio for a book/story"""

    if not book_path.exists():
        console.print(f"[red]✗ Book file not found: {book_path}[/red]")
        raise typer.Exit(1)

    async def _pregen():
        console.print(f"[bold]📚 Pre-generating audio for: {book_path.name}[/bold]")

        # Read the book content
        content = book_path.read_text(encoding="utf-8")

        # Split into manageable chunks - simple implementation for now
        words = content.split()
        chunks = []

        for i in range(0, len(words), chunk_size):
            chunk_words = words[i : i + chunk_size]
            chunk_text = " ".join(chunk_words)
            chunks.append(
                {
                    "text": chunk_text,
                    "word_count": len(chunk_words),
                    "start_index": i,
                    "end_index": i + len(chunk_words),
                }
            )

        console.print(f"📄 Split into {len(chunks)} chunks")

        # Initialize TTS service
        voice = voice_id or "Joanna"  # Default voice
        service = TTSService()

        # Process chunks in batches
        metadata = {
            "book": book_path.name,
            "voice": voice,
            "total_chunks": len(chunks),
            "chunks": [],
        }

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=console,
        ) as progress:
            task = progress.add_task(
                f"Processing chunks with voice '{voice}'", total=len(chunks)
            )

            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i : i + batch_size]

                # Create batch request
                batch_request = TTSBatchRequest(
                    items=[
                        TTSRequest(text=chunk["text"], voice_id=voice, engine="neural")
                        for chunk in batch_chunks
                    ]
                )

                # Synthesize batch
                batch_response = await service.synthesize_batch(batch_request)

                # Process results
                for j, result in enumerate(batch_response.results):
                    chunk_num = i + j + 1
                    chunk_data = batch_chunks[j]

                    chunk_metadata = {
                        "chunk_number": chunk_num,
                        "cache_key": result.cache_key,
                        "word_count": chunk_data["word_count"],
                        "start_index": chunk_data["start_index"],
                        "end_index": chunk_data["end_index"],
                        "cached": result.cached,
                        "audio_url": result.presigned_audio_url,
                        "text_url": result.presigned_text_url,
                        "timings_url": result.presigned_timings_url,
                    }

                    metadata["chunks"].append(chunk_metadata)

                    if result.cached:
                        progress.console.print(
                            f"   Chunk {chunk_num}: [yellow]✓ Cached[/yellow] - {result.cache_key[:8]}..."
                        )
                    else:
                        progress.console.print(
                            f"   Chunk {chunk_num}: [green]✨ Generated[/green] - {result.cache_key[:8]}..."
                        )

                progress.update(task, advance=len(batch_chunks))

        console.print("\n[green]✅ Pre-generation complete![/green]")
        console.print(f"   Total chunks: {len(chunks)}")
        console.print(f"   Voice: {voice}")
        console.print("   All audio cached in S3")

        # Save metadata if requested
        if metadata_output:
            metadata_output.write_text(json.dumps(metadata, indent=2))
            console.print(f"\n[green]✓ Saved metadata to {metadata_output}[/green]")

        # Show usage instructions
        console.print(
            "\n[bold]Now you can serve this content using the cache endpoints:[/bold]"
        )
        console.print("  GET /api/tts/{cache_key}/audio")
        console.print("  GET /api/tts/{cache_key}/text")
        console.print("  GET /api/tts/{cache_key}/timings")
        console.print("  GET /api/tts/{cache_key}/all")

    anyio.run(_pregen)


@app.command()
def cache_info(
    cache_key: str = typer.Argument(..., help="Cache key to inspect"),
    voice_id: str | None = typer.Option(
        None, "--voice", "-v", help="Polly voice ID (default: Joanna)"
    ),
    engine: str = typer.Option(
        "standard", "--engine", "-e", help="Polly engine: 'standard' or 'neural'"
    ),
):
    """Display information about a cached synthesis"""

    async def _cache_info():
        service = TTSService()
        settings = get_settings()
        voice = voice_id or "Joanna"  # Default voice

        # Build S3 keys
        audio_key, text_key, timings_key = service._build_s3_keys(
            voice_id=voice, cache_key=cache_key, engine=engine
        )
        bucket = settings.aws.audio_cache_bucket

        console.print(f"[bold]Cache Key:[/bold] {cache_key}")
        console.print(f"[bold]Voice ID:[/bold] {voice}")
        console.print(f"[bold]Engine:[/bold] {engine}")
        console.print(f"[bold]S3 Bucket:[/bold] {bucket}")

        async with service.session.client("s3") as s3:
            # Check each object
            for key, label in [
                (audio_key, "Audio"),
                (text_key, "Text"),
                (timings_key, "Timings"),
            ]:
                try:
                    obj = await s3.head_object(Bucket=bucket, Key=key)
                    size = obj["ContentLength"]
                    modified = obj["LastModified"]
                    console.print(f"\n[green]✓ {label}:[/green]")
                    console.print(f"  Key: {key}")
                    console.print(f"  Size: {size:,} bytes")
                    console.print(f"  Modified: {modified}")
                except Exception:
                    console.print(f"\n[red]✗ {label}:[/red] Not found")

            # Try to fetch and display text content
            try:
                obj = await s3.get_object(Bucket=bucket, Key=text_key)
                content = await obj["Body"].read()
                data = json.loads(content)
                text_preview = (
                    data["text"][:100] + "..."
                    if len(data["text"]) > 100
                    else data["text"]
                )
                console.print(f"\n[bold]Text Preview:[/bold] {text_preview}")
            except Exception:
                # Unable to fetch text - not critical for cache info display
                pass  # nosec B110

    anyio.run(_cache_info)


@app.command()
def batch_synth(
    input_file: Path = typer.Argument(..., help="JSON file with texts to synthesize"),
    voice_id: str | None = typer.Option(
        None, "--voice", "-v", help="Polly voice ID (default: from config)"
    ),
    output: Path | None = typer.Option(
        None, "--output", "-o", help="Save results to JSON file"
    ),
):
    """Batch synthesize multiple texts from JSON file"""

    if not input_file.exists():
        console.print(f"[red]✗ Input file not found: {input_file}[/red]")
        raise typer.Exit(1)

    async def _batch_synth():
        # Load texts from JSON
        try:
            data = json.loads(input_file.read_text())
            if isinstance(data, list):
                texts = data
            elif isinstance(data, dict) and "texts" in data:
                texts = data["texts"]
            else:
                console.print(
                    '[red]✗ Invalid JSON format. Expected list of strings or {"texts": [...]}[/red]'
                )
                raise typer.Exit(1)
        except json.JSONDecodeError as e:
            console.print(f"[red]✗ Invalid JSON: {e}[/red]")
            raise typer.Exit(1)

        console.print(f"[bold]📋 Loaded {len(texts)} texts to synthesize[/bold]")

        service = TTSService()
        voice = voice_id or "Joanna"  # Default voice

        # Create batch request
        batch_request = TTSBatchRequest(
            items=[
                TTSRequest(text=text, voice_id=voice, engine="standard")
                for text in texts
            ]
        )

        with console.status(f"[bold green]Synthesizing {len(texts)} texts..."):
            batch_response = await service.synthesize_batch(batch_request)

        # Display results
        table = Table(title="Batch Synthesis Results")
        table.add_column("#", style="dim", width=4)
        table.add_column("Cache Key", style="cyan")
        table.add_column("Cached", style="yellow")
        table.add_column("Text Preview", style="white")

        results = []
        for i, (text, result) in enumerate(zip(texts, batch_response.results)):
            preview = text[:30] + "..." if len(text) > 30 else text
            table.add_row(
                str(i + 1),
                result.cache_key[:16] + "...",
                "✓" if result.cached else "✨",
                preview,
            )

            results.append(
                {
                    "text": text,
                    "cache_key": result.cache_key,
                    "cached": result.cached,
                    "audio_url": result.presigned_audio_url,
                    "text_url": result.presigned_text_url,
                    "timings_url": result.presigned_timings_url,
                }
            )

        console.print(table)

        # Save results if requested
        if output:
            output.write_text(json.dumps(results, indent=2))
            console.print(f"\n[green]✓ Saved results to {output}[/green]")

    anyio.run(_batch_synth)


if __name__ == "__main__":
    app()
