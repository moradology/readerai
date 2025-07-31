"""
Configuration management CLI commands
"""

import sys
from pathlib import Path
from typing import Any

import typer
import yaml  # type: ignore[import-untyped]
from pydantic import BaseModel
from rich.console import Console
from rich.syntax import Syntax

from readerai.config import Settings

app = typer.Typer()
console = Console()


def extract_schema_with_defaults(
    model: type[BaseModel], include_descriptions: bool = True
) -> dict[str, Any]:
    """
    Extract schema from a Pydantic model including field names, defaults, and descriptions.

    Args:
        model: The Pydantic model class to extract from
        include_descriptions: Whether to include field descriptions as comments

    Returns:
        Dictionary representation of the model with defaults
    """
    from pydantic_core import PydanticUndefined

    result = {}

    for field_name, field_info in model.model_fields.items():
        # Get the default value
        if (
            field_info.default is not None
            and field_info.default is not PydanticUndefined
        ):
            default_value = field_info.default
        elif field_info.default_factory is not None:
            # For fields with default_factory, instantiate to get defaults
            try:
                # For Settings fields, we need to check if it's a Pydantic Settings field
                if hasattr(field_info.default_factory, "__name__") and "Settings" in field_info.default_factory.__name__:
                    # It's a Settings class, instantiate without arguments
                    default_value = field_info.default_factory()
                else:
                    # Regular default factory
                    default_value = field_info.default_factory()
            except (TypeError, Exception):
                # If factory fails, use empty placeholder
                default_value = ""
        else:
            # No default - use empty string or appropriate placeholder
            default_value = ""

        # If it's a BaseModel subclass, recurse
        if isinstance(default_value, BaseModel):
            result[field_name] = extract_schema_with_defaults(
                type(default_value), include_descriptions
            )
        elif hasattr(default_value, "value") and default_value != "":
            # Handle enums by getting their value
            result[field_name] = default_value.value
        elif isinstance(default_value, dict):
            # For dict fields that might contain BaseModel instances
            cleaned_dict = {}
            for k, v in default_value.items():
                if isinstance(v, BaseModel):
                    # Convert Pydantic model to dict, excluding None values
                    cleaned_dict[k] = v.model_dump(
                        exclude_unset=True, exclude_none=True
                    )
                else:
                    cleaned_dict[k] = v
            result[field_name] = cleaned_dict
        else:
            result[field_name] = default_value

    return result


def add_yaml_comments(yaml_str: str, model: type[BaseModel], indent: int = 0) -> str:
    """
    Add field descriptions as YAML comments.

    Args:
        yaml_str: The YAML string to add comments to
        model: The Pydantic model to get descriptions from
        indent: Current indentation level

    Returns:
        YAML string with comments added
    """
    lines = yaml_str.split("\n")
    result_lines = []

    # Build a map of field names to descriptions
    descriptions = {}
    for field_name, field_info in model.model_fields.items():
        if field_info.description:
            descriptions[field_name] = field_info.description

    # Process each line
    for line in lines:
        # Check if this line contains a field name
        for field_name, description in descriptions.items():
            if line.strip().startswith(f"{field_name}:"):
                # Add comment on the same line
                if "#" not in line:  # Don't add if already has a comment
                    line = f"{line}  # {description}"
                break
        result_lines.append(line)

    return "\n".join(result_lines)


@app.command("generate-example")
def generate_example(
    output: Path = typer.Option(None, "--output", "-o", help="Output file path"),
    with_comments: bool = typer.Option(
        True,
        "--with-comments/--no-comments",
        help="Include field descriptions as comments",
    ),
    format: str = typer.Option(
        "yaml", "--format", "-f", help="Output format (yaml, json, env)"
    ),
):
    """Generate example configuration file from Settings schema"""

    # Extract the schema with defaults
    schema = extract_schema_with_defaults(Settings, include_descriptions=with_comments)

    if format == "yaml":
        # Convert to YAML
        yaml_content = yaml.dump(schema, default_flow_style=False, sort_keys=False)

        # Add comments if requested
        if with_comments:
            yaml_content = add_yaml_comments(yaml_content, Settings)

        # Add API key examples after providers section
        yaml_lines = yaml_content.split("\n")
        result_lines = []
        provider_indent = 0

        for i, line in enumerate(yaml_lines):
            result_lines.append(line)

            # Detect when we're in a provider block
            if line.strip() and not line.strip().startswith("#"):
                # Check if this is a provider name under 'providers:'
                if i > 0 and "providers:" in yaml_lines[i - 1]:
                    provider_indent = len(line) - len(line.lstrip())
                elif (
                    line.strip().endswith(":")
                    and len(line) - len(line.lstrip()) == provider_indent
                ):
                    # This is a provider name
                    provider_name = line.strip().rstrip(":")
                    # Look ahead to see if next lines are part of this provider
                    if i + 1 < len(yaml_lines) and yaml_lines[i + 1].strip().startswith(
                        "name:"
                    ):
                        # Add api_key comment after the models line
                        for j in range(i + 1, min(i + 10, len(yaml_lines))):
                            if "models:" in yaml_lines[j]:
                                # Find where models array ends
                                k = j + 1
                                while k < len(yaml_lines) and yaml_lines[k].startswith(
                                    " " * (provider_indent + 4)
                                ):
                                    k += 1
                                # Insert api_key comment
                                indent = " " * (provider_indent + 2)
                                if provider_name == "openai":
                                    result_lines.insert(
                                        len(result_lines) + (k - i - 1),
                                        f"{indent}# api_key: sk-...  # Or use OPENAI_API_KEY env var",
                                    )
                                elif provider_name == "anthropic":
                                    result_lines.insert(
                                        len(result_lines) + (k - i - 1),
                                        f"{indent}# api_key: sk-ant-...  # Or use ANTHROPIC_API_KEY env var",
                                    )
                                break

        yaml_content = "\n".join(result_lines)

        # Add header
        header = "# ReaderAI Configuration Example\n"
        header += "# Generated from Pydantic Settings schema\n"
        header += "# \n"
        header += "# This file shows all available configuration options with their default values.\n"
        header += "# Copy this file and modify as needed for your environment.\n\n"

        content = header + yaml_content

    elif format == "json":
        import json

        content = json.dumps(schema, indent=2)

    elif format == "env":
        # Flatten to environment variable format
        lines = ["# ReaderAI Environment Variables Example\n"]

        def flatten_dict(d: dict, prefix: str = "") -> list[str]:
            items = []
            for key, value in d.items():
                env_key = f"{prefix}{key}".upper()
                if isinstance(value, dict):
                    items.extend(flatten_dict(value, f"{env_key}_"))
                else:
                    if isinstance(value, list):
                        value = ",".join(str(v) for v in value)
                    elif value == "":
                        value = '""'
                    items.append(f"{env_key}={value}")
            return items

        lines.extend(flatten_dict(schema))
        content = "\n".join(lines)
    else:
        console.print(f"[red]Unknown format: {format}[/red]")
        raise typer.Exit(1)

    # Output
    if output:
        output.write_text(content)
        console.print(
            f"[green]✓ Generated {format} configuration example: {output}[/green]"
        )
    else:
        # Check if stdout is a terminal for syntax highlighting
        if sys.stdout.isatty():
            # Display to console with syntax highlighting
            if format == "yaml":
                syntax = Syntax(content, "yaml", theme="monokai", line_numbers=True)
            elif format == "json":
                syntax = Syntax(content, "json", theme="monokai", line_numbers=True)
            else:
                syntax = Syntax(content, "bash", theme="monokai", line_numbers=True)
            console.print(syntax)
        else:
            # Output is being redirected, print raw content
            print(content)


@app.command("show")
def show(
    section: str = typer.Argument(
        None, help="Specific section to show (aws, server, llm, database)"
    ),
):
    """Display current configuration settings"""
    # Import here to avoid circular import
    from readerai.cli.show_config import show as show_config

    show_config(section)


@app.command("validate")
def validate(
    config_file: Path = typer.Argument(..., help="Configuration file to validate"),
):
    """Validate a configuration file against the Settings schema"""

    if not config_file.exists():
        console.print(f"[red]Error: File '{config_file}' not found[/red]")
        raise typer.Exit(1)

    # Determine format from extension
    ext = config_file.suffix.lower()

    try:
        if ext in [".yaml", ".yml"]:
            with open(config_file) as f:
                data = yaml.safe_load(f)
        elif ext == ".json":
            import json

            with open(config_file) as f:
                data = json.load(f)
        else:
            console.print(f"[red]Unsupported file format: {ext}[/red]")
            raise typer.Exit(1)

        # Try to create Settings with the loaded data
        settings = Settings(**data)

        console.print("[green]✓ Configuration file is valid![/green]")
        console.print("\nLoaded settings:")
        console.print(f"  AWS region: {settings.aws.region}")
        console.print(f"  Server port: {settings.server.port}")

    except Exception as e:
        console.print("[red]✗ Configuration validation failed:[/red]")
        console.print(f"  {type(e).__name__}: {e}")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
