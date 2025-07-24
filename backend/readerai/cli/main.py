"""
Main CLI entry point for ReaderAI
"""

import typer

from readerai.cli import (
    config,
    extract_passages,
    infra,
    ingest,
    run_comprehension,
    run_vocabulary,
    tts,
)

app = typer.Typer(
    name="readerai",
    help="ReaderAI CLI - AI-powered reading companion for children",
    add_completion=True,
)

# Add subcommands
app.add_typer(ingest.app, name="ingest", help="Ingest stories and generate audio")
app.add_typer(infra.app, name="infra", help="Manage infrastructure deployment")
app.add_typer(tts.app, name="tts", help="Text-to-speech synthesis and caching")
app.add_typer(config.app, name="config", help="Configuration management")


# Add single commands as subcommands
@app.command("passages")
def passages_command():
    """Extract passages from text (reads from stdin)"""
    extract_passages.main()


@app.command("vocabulary")
def vocabulary_command():
    """Run vocabulary question generation"""
    run_vocabulary.main()


@app.command("comprehension")
def comprehension_command():
    """Run comprehension question generation"""
    run_comprehension.main()


if __name__ == "__main__":
    app()
