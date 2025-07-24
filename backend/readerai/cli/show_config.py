"""
CLI tool to display current configuration
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.tree import Tree

from readerai.__version__ import __app_name__, __version__
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
    root.add(f"Name: {__app_name__}")
    root.add(f"Version: {__version__}")

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

    # LLM
    llm = tree.add("[cyan]LLM[/cyan]")

    # Show providers
    providers_node = llm.add("Providers:")
    for name, provider in settings.llm.providers.items():
        provider_info = f"{name}: {provider.api_base}"
        if provider.api_key:
            provider_info += " (API key set)"
        providers_node.add(provider_info)

    # Show model assignments
    models_node = llm.add("Model Assignments:")
    for role, model_ref in settings.llm.models.items():
        models_node.add(f"{role}: {model_ref}")

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

    console.print(table)


def show_llm_config(settings):
    """Show LLM configuration"""
    # Show providers table
    providers_table = Table(title="LLM Providers")
    providers_table.add_column("Provider", style="cyan")
    providers_table.add_column("API Base", style="green")
    providers_table.add_column("Models", style="yellow")
    providers_table.add_column("API Key", style="magenta")

    for name, provider in settings.llm.providers.items():
        api_key_status = "✓ Set" if provider.api_key else "✗ Not set"
        models_str = ", ".join(provider.models[:3])
        if len(provider.models) > 3:
            models_str += f" (+{len(provider.models) - 3} more)"
        providers_table.add_row(
            name, provider.api_base, models_str or "Any", api_key_status
        )

    console.print(providers_table)
    console.print()

    # Show model assignments table
    models_table = Table(title="Model Assignments")
    models_table.add_column("Role", style="cyan")
    models_table.add_column("Model", style="green")

    for role, model_ref in settings.llm.models.items():
        models_table.add_row(role.title(), model_ref)

    console.print(models_table)
