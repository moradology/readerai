"""
Infrastructure management CLI commands
"""

import subprocess  # nosec B404
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from readerai.config import get_settings

app = typer.Typer()
console = Console()


def get_infra_dir() -> Path:
    """Get the infrastructure directory path"""
    # Go up from backend/readerai/cli to find infra/
    current_file = Path(__file__)
    project_root = current_file.parent.parent.parent.parent
    infra_dir = project_root / "infra" / "terraform"

    if not infra_dir.exists():
        console.print(
            f"[red]Error: Infrastructure directory not found at {infra_dir}[/red]"
        )
        raise typer.Exit(1)

    return infra_dir


def check_prerequisites():
    """Check that required tools are installed"""
    # Check terraform
    try:
        result = subprocess.run(  # nosec B603, B607
            ["terraform", "version"], capture_output=True, text=True
        )
        if result.returncode != 0:
            raise FileNotFoundError
    except FileNotFoundError:
        console.print(
            "[red]Error: Terraform is not installed. Please install it first.[/red]"
        )
        console.print("Visit: https://www.terraform.io/downloads")
        raise typer.Exit(1)

    # Check AWS CLI
    try:
        result = subprocess.run(  # nosec B603, B607
            ["aws", "sts", "get-caller-identity"], capture_output=True, text=True
        )
        if result.returncode != 0:
            console.print("[red]Error: AWS credentials not configured.[/red]")
            console.print("Run: aws configure")
            raise typer.Exit(1)
    except FileNotFoundError:
        console.print(
            "[red]Error: AWS CLI is not installed. Please install it first.[/red]"
        )
        raise typer.Exit(1)


def run_terraform_command(command: list[str], cwd: Path) -> int:
    """Run a terraform command and stream output"""
    process = subprocess.Popen(  # nosec B603
        command,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )

    # Stream output in real-time
    if process.stdout:
        for line in process.stdout:
            print(line, end="")

    process.wait()
    return process.returncode


@app.command()
def init(
    upgrade: bool = typer.Option(False, "--upgrade", "-u", help="Upgrade providers"),
):
    """Initialize Terraform infrastructure"""
    check_prerequisites()
    infra_dir = get_infra_dir()

    console.print("[bold blue]Initializing Terraform...[/bold blue]")

    cmd = ["terraform", "init"]
    if upgrade:
        cmd.append("-upgrade")

    if run_terraform_command(cmd, infra_dir) == 0:
        console.print("[green]✓ Terraform initialized successfully[/green]")
    else:
        console.print("[red]✗ Terraform initialization failed[/red]")
        raise typer.Exit(1)


@app.command()
def plan(
    environment: str = typer.Option(
        None, "--env", "-e", help="Environment (dev/staging/prod)"
    ),
    out: str = typer.Option("tfplan", "--out", "-o", help="Output plan file"),
):
    """Plan infrastructure changes"""
    check_prerequisites()
    infra_dir = get_infra_dir()
    settings = get_settings()

    # Use environment from settings if not provided
    env = environment or "dev"

    console.print(
        f"[bold blue]Planning infrastructure for environment: {env}[/bold blue]"
    )

    # Create tfvars if needed
    tfvars_file = infra_dir / "terraform.tfvars"
    if not tfvars_file.exists():
        console.print("[yellow]Creating terraform.tfvars...[/yellow]")
        tfvars_content = f"""aws_region   = "{settings.aws.region}"
environment  = "{env}"
project_name = "readerai"
"""
        tfvars_file.write_text(tfvars_content)

    cmd = ["terraform", "plan", f"-out={out}"]

    if run_terraform_command(cmd, infra_dir) == 0:
        console.print(f"[green]✓ Plan saved to {out}[/green]")
        console.print("Run 'readerai infra deploy' to apply changes")
    else:
        console.print("[red]✗ Planning failed[/red]")
        raise typer.Exit(1)


@app.command()
def deploy(
    plan_file: str = typer.Option("tfplan", "--plan", "-p", help="Plan file to apply"),
    auto_approve: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
    environment: str = typer.Option(
        None, "--env", "-e", help="Environment (dev/staging/prod)"
    ),
):
    """Deploy infrastructure"""
    check_prerequisites()
    infra_dir = get_infra_dir()

    # If no plan file exists, create one
    plan_path = infra_dir / plan_file
    if not plan_path.exists():
        console.print("[yellow]No plan file found. Creating one...[/yellow]")
        plan(environment=environment, out=plan_file)

    console.print("[bold blue]Deploying infrastructure...[/bold blue]")

    cmd = ["terraform", "apply"]

    if auto_approve:
        cmd.append("-auto-approve")

    cmd.append(plan_file)

    if run_terraform_command(cmd, infra_dir) == 0:
        console.print("[green]✓ Infrastructure deployed successfully[/green]")

        # Generate .env file
        console.print("[yellow]Generating environment variables...[/yellow]")
        output_cmd = ["terraform", "output", "-json"]
        result = subprocess.run(  # nosec B603
            output_cmd, cwd=infra_dir, capture_output=True, text=True
        )

        if result.returncode == 0:
            import json

            outputs = json.loads(result.stdout)

            # Create .env.aws file
            env_file = infra_dir.parent.parent / ".env.aws"
            env_content = f"""# Generated by readerai infra deploy
AWS_AUDIO_CACHE_BUCKET={outputs.get("audio_cache_bucket_name", {}).get("value", "")}
BACKEND_ROLE_ARN={outputs.get("backend_role_arn", {}).get("value", "")}
"""
            env_file.write_text(env_content)
            console.print(f"[green]✓ Environment variables saved to {env_file}[/green]")
    else:
        console.print("[red]✗ Deployment failed[/red]")
        raise typer.Exit(1)


@app.command()
def destroy(
    auto_approve: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation"),
    environment: str = typer.Option(None, "--env", "-e", help="Environment to destroy"),
):
    """Destroy infrastructure"""
    check_prerequisites()
    infra_dir = get_infra_dir()

    env = environment or "dev"

    if not auto_approve:
        confirm = typer.confirm(
            f"⚠️  This will destroy ALL infrastructure for environment '{env}'. Continue?",
            default=False,
        )
        if not confirm:
            console.print("[yellow]Destruction cancelled[/yellow]")
            raise typer.Exit(0)

    console.print(
        f"[bold red]Destroying infrastructure for environment: {env}[/bold red]"
    )

    cmd = ["terraform", "destroy"]
    if auto_approve:
        cmd.append("-auto-approve")

    if run_terraform_command(cmd, infra_dir) == 0:
        console.print("[green]✓ Infrastructure destroyed[/green]")
    else:
        console.print("[red]✗ Destruction failed[/red]")
        raise typer.Exit(1)


@app.command()
def status():
    """Show current infrastructure status"""
    check_prerequisites()
    infra_dir = get_infra_dir()
    settings = get_settings()

    console.print("[bold]Infrastructure Status[/bold]\n")

    # Show current configuration
    table = Table(title="Current Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("AWS Region", settings.aws.region)
    table.add_row("Audio Cache Bucket", settings.aws.audio_cache_bucket)
    # Polly voice is now a parameter, not config

    console.print(table)
    console.print()

    # Check Terraform state
    console.print("[yellow]Checking Terraform state...[/yellow]")

    # Run terraform show
    cmd = ["terraform", "show", "-json"]
    result = subprocess.run(cmd, cwd=infra_dir, capture_output=True, text=True)  # nosec B603

    if result.returncode == 0:
        import json

        try:
            state = json.loads(result.stdout)
            if state.get("values", {}).get("root_module", {}).get("resources"):
                resources = state["values"]["root_module"]["resources"]

                resource_table = Table(title="Deployed Resources")
                resource_table.add_column("Type", style="cyan")
                resource_table.add_column("Name", style="green")
                resource_table.add_column("Status", style="yellow")

                for resource in resources:
                    resource_table.add_row(
                        resource["type"], resource["name"], "✓ Deployed"
                    )

                console.print(resource_table)
            else:
                console.print("[yellow]No resources currently deployed[/yellow]")
        except json.JSONDecodeError:
            console.print("[yellow]No Terraform state found[/yellow]")
    else:
        console.print("[yellow]Could not read Terraform state[/yellow]")


@app.command()
def validate():
    """Validate Terraform configuration"""
    check_prerequisites()
    infra_dir = get_infra_dir()

    console.print("[bold blue]Validating Terraform configuration...[/bold blue]")

    cmd = ["terraform", "validate"]

    if run_terraform_command(cmd, infra_dir) == 0:
        console.print("[green]✓ Configuration is valid[/green]")
    else:
        console.print("[red]✗ Configuration validation failed[/red]")
        raise typer.Exit(1)
