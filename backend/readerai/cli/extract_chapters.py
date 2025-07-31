"""
CLI command for extracting chapters from books using boundary detection.

This module implements the approach where:
1. LLM identifies N specific chapters
2. Generates unique start/end patterns for each
3. Validates exactly one match per pattern
4. Verifies extracted content
"""

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# Import the chapter extraction
from readerai.pipeline.chapter_boundary_detector import extract_chapters

# Initialize CLI app and console
app = typer.Typer()
console = Console()


@app.command()
def extract(
    input_file: Path = typer.Argument(..., help="Input text file"),
    output: Path | None = typer.Option(None, "--output", "-o", help="Output file"),
    format: str = typer.Option(
        "json", "--format", "-f", help="Output format (json, yaml, text)"
    ),
    llm_model: str = typer.Option(
        "google:gemini-2.0-flash", "--model", help="LLM model to use"
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
):
    """
    Extract chapters using boundary detection.

    This method:
    1. Identifies N chapters in the text
    2. Generates unique start/end patterns for each chapter
    3. Validates exactly one match per pattern
    4. Uses LLM to verify extracted content

    Examples:
        # Basic extraction
        readerai extract-chapters book.txt

        # Save to file
        readerai extract-chapters book.txt --output chapters.json

        # Different format
        readerai extract-chapters book.txt --format yaml

        # Use different model
        readerai extract-chapters book.txt --model google:gemini-2.5-flash
    """
    if not input_file.exists():
        console.print(f"[red]Error: Input file '{input_file}' not found[/red]")
        raise typer.Exit(1)

    console.print(f"[blue]Processing: {input_file.name}[/blue]")

    if verbose:
        console.print("[dim]Configuration:[/dim]")
        console.print(f"  Model: {llm_model}")
        console.print(f"  Format: {format}")

    # Read the file
    with open(input_file, encoding="utf-8") as f:
        text = f.read()

    # Extract chapters with progress
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Extracting chapters...", total=100)

        # Extract chapters
        results = extract_chapters(text, model=llm_model)

        progress.update(task, completed=100, description="Complete!")

    # Display results
    console.print(f"\n[green]✓[/green] Extracted {len(results)} chapters")

    verified_count = sum(1 for r in results if r.verification_passed)
    if verified_count < len(results):
        console.print(
            f"[yellow]⚠[/yellow]  Verified {verified_count}/{len(results)} chapters"
        )
    else:
        console.print("[green]✓[/green] All chapters verified successfully")

    # Show summary table
    if verbose or not output:
        table = Table(title="Extracted Chapters")
        table.add_column("#", style="cyan", width=4)
        table.add_column("Title", style="green")
        table.add_column("Words", style="yellow", justify="right")
        table.add_column("Verified", style="magenta", justify="center")

        for result in results:
            table.add_row(
                str(result.chapter_number),
                result.chapter_title[:50] + "..."
                if len(result.chapter_title) > 50
                else result.chapter_title,
                str(result.word_count),
                "✓" if result.verification_passed else "✗",
            )

        console.print(table)

    # Prepare output data
    if format == "json":
        output_data = json.dumps(
            {
                "file": str(input_file),
                "chapter_count": len(results),
                "chapters": [
                    {
                        "number": r.chapter_number,
                        "title": r.chapter_title,
                        "text": r.text,
                        "word_count": r.word_count,
                        "start_line": r.start_line,
                        "end_line": r.end_line,
                        "verified": r.verification_passed,
                        "notes": r.verification_notes,
                    }
                    for r in results
                ],
            },
            indent=2,
        )
    elif format == "yaml":
        import yaml

        output_data = yaml.dump(
            {
                "file": str(input_file),
                "chapter_count": len(results),
                "chapters": [
                    {
                        "number": r.chapter_number,
                        "title": r.chapter_title,
                        "word_count": r.word_count,
                        "verified": r.verification_passed,
                    }
                    for r in results
                ],
            }
        )
    else:  # text format
        output_data = f"Extracted {len(results)} chapters from {input_file.name}\n\n"
        for r in results:
            output_data += f"Chapter {r.chapter_number}: {r.chapter_title}\n"
            output_data += f"{'=' * 60}\n\n"
            output_data += r.text
            output_data += f"\n\n{'=' * 60}\n\n"

    # Save or print output
    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(output_data)
        console.print(f"\n[green]✓[/green] Saved to {output}")
    else:
        if format != "text":
            print(output_data)


if __name__ == "__main__":
    app()
