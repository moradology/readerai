"""
CLI tool to display current configuration
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.tree import Tree

from readerai.config import get_settings

app = typer.Typer()
console = Console()


@app.command()
def show(
    section: str = typer.Argument(
        None, help="Specific section to show (aws, server, llm, audio, db)"
    ),
):
    """Display current ReaderAI configuration"""
    settings = get_settings()

    if section:
        # Show specific section
        section_lower = section.lower()
        if section_lower == "aws":
            show_aws_config(settings)
        elif section_lower == "server":
            show_server_config(settings)
        elif section_lower == "llm":
            show_llm_config(settings)
        elif section_lower == "audio":
            show_audio_config(settings)
        elif section_lower == "db":
            show_db_config(settings)
        else:
            console.print(f"[red]Unknown section: {section}[/red]")
            console.print("Valid sections: aws, server, llm, audio, db")
    else:
        # Show all configuration
        show_all_config(settings)


def show_all_config(settings):
    """Display all configuration sections"""
    tree = Tree("[bold]ReaderAI Configuration[/bold]")

    # Root settings
    root = tree.add("[cyan]Application[/cyan]")
    root.add(f"Name: {settings.app_name}")
    root.add(f"Version: {settings.version}")

    # AWS
    aws = tree.add("[cyan]AWS[/cyan]")
    aws.add(f"Region: {settings.aws.region}")
    aws.add(f"Audio Cache Bucket: {settings.aws.audio_cache_bucket}")
    aws.add(f"Polly Voice: {settings.aws.polly_voice_id}")
    aws.add(f"Polly Engine: {settings.aws.polly_engine}")

    # Server
    server = tree.add("[cyan]Server[/cyan]")
    server.add(f"Host: {settings.server.host}")
    server.add(f"Port: {settings.server.port}")
    server.add(f"Environment: {settings.server.environment}")
    server.add(f"Debug: {settings.server.debug}")
    server.add(f"CORS Origins: {settings.server.cors_origins}")

    # LLM
    llm = tree.add("[cyan]LLM[/cyan]")
    llm.add(f"Provider: {settings.llm.provider}")
    llm.add(f"Model: {settings.llm.model}")
    llm.add(f"Temperature: {settings.llm.temperature}")
    llm.add(f"Max Tokens: {settings.llm.max_tokens}")
    llm.add(f"API Key: {'✓ Set' if settings.llm.api_key else '✗ Not set'}")

    # Audio
    audio = tree.add("[cyan]Audio Processing[/cyan]")
    audio.add(f"Chunk Target: {settings.audio.chunk_target_words} words")
    audio.add(f"Chunk Min: {settings.audio.chunk_min_words} words")
    audio.add(f"Chunk Max: {settings.audio.chunk_max_words} words")
    audio.add(f"Format: {settings.audio.audio_format}")
    audio.add(f"Sample Rate: {settings.audio.audio_sample_rate} Hz")

    # Database
    db = tree.add("[cyan]Database[/cyan]")
    db.add(f"URL: {settings.db.url}")
    db.add(f"Echo SQL: {settings.db.echo}")

    console.print(tree)


def show_aws_config(settings):
    """Show AWS configuration"""
    table = Table(title="AWS Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Region", settings.aws.region)
    table.add_row("Audio Cache Bucket", settings.aws.audio_cache_bucket)
    table.add_row("Polly Voice ID", settings.aws.polly_voice_id)
    table.add_row("Polly Engine", settings.aws.polly_engine)
    table.add_row(
        "Access Key", "✓ Set" if settings.aws.aws_access_key_id else "✗ Not set"
    )
    table.add_row(
        "Secret Key", "✓ Set" if settings.aws.aws_secret_access_key else "✗ Not set"
    )

    console.print(table)


def show_server_config(settings):
    """Show server configuration"""
    table = Table(title="Server Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Host", settings.server.host)
    table.add_row("Port", str(settings.server.port))
    table.add_row("Environment", settings.server.environment)
    table.add_row("Debug Mode", str(settings.server.debug))
    table.add_row("CORS Origins", str(settings.server.cors_origins))

    console.print(table)


def show_llm_config(settings):
    """Show LLM configuration"""
    table = Table(title="LLM Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Provider", settings.llm.provider)
    table.add_row("Model", settings.llm.model)
    table.add_row("Temperature", str(settings.llm.temperature))
    table.add_row("Max Tokens", str(settings.llm.max_tokens))
    table.add_row("API Key", "✓ Set" if settings.llm.api_key else "✗ Not set")

    console.print(table)


def show_audio_config(settings):
    """Show audio configuration"""
    table = Table(title="Audio Processing Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Chunk Target Words", str(settings.audio.chunk_target_words))
    table.add_row("Chunk Min Words", str(settings.audio.chunk_min_words))
    table.add_row("Chunk Max Words", str(settings.audio.chunk_max_words))
    table.add_row("Audio Format", settings.audio.audio_format)
    table.add_row("Sample Rate", f"{settings.audio.audio_sample_rate} Hz")

    console.print(table)


def show_db_config(settings):
    """Show database configuration"""
    table = Table(title="Database Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("URL", settings.db.url)
    table.add_row("Echo SQL", str(settings.db.echo))

    console.print(table)


if __name__ == "__main__":
    app()
