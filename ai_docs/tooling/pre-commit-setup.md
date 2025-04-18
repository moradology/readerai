# Pre-commit Hook Implementation

## Purpose

Add automated code quality checks that run before each commit to ensure consistent code style, catch common issues, and maintain high-quality standards in the codebase.

## Recommended Hooks

For a Python project using DSPy, FastAPI, and focusing on LLM code, we recommend the following pre-commit hooks:

### Code Formatting

- **black**: Opinionated code formatter that ensures consistent style
- **isort**: Sorts imports alphabetically and automatically separates them into sections
- **prettier**: Format Markdown and other non-Python files consistently

### Linting

- **ruff**: Fast Python linter that includes checks from flake8, pycodestyle, pydocstyle, etc.
- **mypy**: Static type checking to validate type annotations
- **pylint**: More comprehensive linting with customizable rules

### Code Quality

- **bandit**: Security-focused linter that finds common security issues
- **pydocstyle**: Checks docstring style compliance (Google style in our case)
- **pyupgrade**: Automatically upgrade syntax for newer Python versions

### Git Hooks

- **trailing-whitespace**: Remove trailing whitespace
- **end-of-file-fixer**: Ensure files end with a newline
- **check-yaml**: Validates YAML files
- **check-json**: Validates JSON files
- **check-added-large-files**: Prevents giant files from being committed
- **check-merge-conflict**: Ensures merge conflict strings aren't included
- **no-commit-to-branch**: Protect main branch from direct commits

## Configuration

Here's a recommended `.pre-commit-config.yaml` configuration:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: no-commit-to-branch
        args: [--branch, main]

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.11.5
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pycqa/isort
    rev: 6.0.1
    hooks:
      - id: isort
        args: ["--profile", "black"]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.15.0
    hooks:
      - id: mypy
        additional_dependencies: ["pydantic>=2.0.0", "types-requests"]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.8.3
    hooks:
      - id: bandit
        args: ["-c", "pyproject.toml"]

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0-alpha.8
    hooks:
      - id: prettier
        types_or: [markdown, yaml, json]
```

## pyproject.toml Configuration

We'll also need to extend our `pyproject.toml` with configuration sections for these tools:

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
strict_optional = true

[tool.ruff]
target-version = "py311"
line-length = 88
select = [
    "E",   # pycodestyle errors
    "F",   # pyflakes
    "I",   # isort
    "N",   # pep8-naming
    "UP",  # pyupgrade
    "ASYNC", # flake8-async
    "S",   # bandit
    "BLE", # blind-except
    "B",   # flake8-bugbear
    "A",   # flake8-builtins
    "COM", # flake8-commas
    "C4",  # flake8-comprehensions
    "DTZ", # flake8-datetimez
    "T10", # flake8-debugger
    "ISC", # flake8-implicit-str-concat
    "G",   # flake8-logging-format
    "PIE", # flake8-pie
    "T20", # flake8-print
    "PYI", # flake8-pyi
    "PT",  # flake8-pytest-style
    "RSE", # flake8-raise
    "RET", # flake8-return
    "SIM", # flake8-simplify
    "TID", # flake8-tidy-imports
    "ARG", # flake8-unused-arguments
    "ERA", # eradicate
    "PGH", # pygrep-hooks
    "PL",  # pylint
    "FLY", # flynt
    "NPY", # NumPy-specific rules
    "RUF", # Ruff-specific rules
]
ignore = [
    "E501",    # line too long (handled by black)
    "PLR0913", # too many arguments in function definition
]

[tool.ruff.per-file-ignores]
"tests/**/*.py" = [
    "S101",    # Use of assert detected
    "ARG001",  # Unused function argument
]

[tool.bandit]
exclude_dirs = ["tests", "experiments"]
skips = ["B101"]  # Skip assert warning in test code
```

## Developer Impact

### Setup Instructions

> **Important**: These steps use UV for dependency management. Make sure your virtual environment is activated first.

1. Install pre-commit and other dev dependencies:

   ```bash
   # This adds to the lock file AND installs the packages
   uv add pre-commit ruff mypy bandit
   ```

2. Install the git hooks:

   ```bash
   # Use the pre-commit executable installed by UV
   uv run pre-commit install
   ```

3. Run against all files to verify setup:
   ```bash
   # Run pre-commit via UV to ensure correct environment
   uv run pre-commit run --all-files
   ```

### Workflow Changes

- Hooks run automatically when committing
- Failed checks prevent the commit
- Fix the issues and commit again
- For occasional bypassing: `git commit -m "message" --no-verify`
- CI will still enforce these checks, so bypassing locally doesn't bypass them in the pipeline

## Integration with CI

Add a CI job to verify pre-commit checks in GitHub Actions:

```yaml
jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - uses: pre-commit/action@v3.0.1
```

## Phased Implementation

To minimize disruption, we recommend a phased approach:

1. **Phase 1**: Format-only hooks (black, isort, trailing-whitespace)
2. **Phase 2**: Add ruff with minimal rules
3. **Phase 3**: Add mypy with basic settings
4. **Phase 4**: Gradually increase strictness of all tools

This allows the team to adapt to the new workflow gradually rather than facing a large number of errors at once.
