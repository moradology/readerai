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
        None, help="Specific section to show (aws, server, llm)"
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
        else:
            console.print(f"[red]Unknown section: {section}[/red]")
            console.print("Valid sections: aws, server, llm")
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
    if settings.aws.profile:
        aws.add(f"Profile: {settings.aws.profile}")

    # Server
    server = tree.add("[cyan]Server[/cyan]")
    server.add(f"Host: {settings.server.host}")
    server.add(f"Port: {settings.server.port}")
    server.add(f"Environment: {settings.server.environment.value}")
    server.add(f"CORS Origins: {settings.server.cors_origins}")

    # LLM
    llm = tree.add("[cyan]LLM[/cyan]")
    llm.add(
        f"API Key: {'✓ Set' if settings.llm.api_key else '✗ Not set (will use OPENAI_API_KEY or GOOGLE_API_KEY)'}"
    )

    console.print(tree)


def show_aws_config(settings):
    """Show AWS configuration"""
    table = Table(title="AWS Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Region", settings.aws.region)
    table.add_row("Audio Cache Bucket", settings.aws.audio_cache_bucket)
    table.add_row("Profile", settings.aws.profile or "Not set")

    console.print(table)


def show_server_config(settings):
    """Show server configuration"""
    table = Table(title="Server Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Host", settings.server.host)
    table.add_row("Port", str(settings.server.port))
    table.add_row("Environment", settings.server.environment.value)
    table.add_row("CORS Origins", str(settings.server.cors_origins))

    console.print(table)


def show_llm_config(settings):
    """Show LLM configuration"""
    table = Table(title="LLM Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("API Key", "✓ Set" if settings.llm.api_key else "✗ Not set")
    table.add_row("Model", "Set via LLM_MODEL env var (default: openai/gpt-4)")

    console.print(table)
