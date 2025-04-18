# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Management (UV)

This project uses UV for dependency management - NEVER use pip directly.

### Key UV Commands

- `uv sync` - Install all dependencies from the lock file
- `uv add <package-name>` - Add a new dependency to the lock file AND install it
- `uv run <command>` - Run a command in the virtual environment

### Important UV Rules

1. ALWAYS use `uv add` to add new dependencies (NEVER use pip)
2. After adding dependencies, they are automatically in the lock file
3. We DON'T need to manually add dependencies to pyproject.toml when using `uv add`
4. When running tools like pytest or pre-commit, ALWAYS use `uv run` prefix

### Common Pitfalls to Avoid

1. **DON'T** use `pip install` - it bypasses the lock file and breaks reproducibility
2. **DON'T** manually edit pyproject.toml dependencies unless you need version constraints
3. **DON'T** run tools directly without the `uv run` prefix - they might use system Python
4. **DON'T** modify tests to make them pass - fix underlying code issues instead
5. **DON'T** add timeouts or circuit breakers to bypass test failures

## Build/Test/Lint Commands

- Install dependencies: `uv sync`
- Run app: `uv run uvicorn main:app --reload`
- Run all tests: `uv run pytest tests/`
- Run single test: `uv run pytest tests/test_passage_extractor.py::test_text_chunker_legacy`
- Run tests by pattern: `uv run pytest tests/test_comprehension.py -k "answerable"`
- Run linting:
  - First-time setup (only once):
    1. `uv add pre-commit` (adds to lock file + installs)
    2. `uv run pre-commit install` (sets up git hooks)
  - Daily usage: Automatic on commits, or manually:
    - `uv run pre-commit run --all-files`

## Code Style Guidelines

- **Formatting**: Follow PEP 8 with Google-style docstrings
- **Imports**: Standard lib → 3rd party → project modules → relative imports
- **Types**: Use type hints for all parameters and return values
- **Naming**: snake_case for variables/functions, PascalCase for classes
- **Error Handling**: Use try/except with specific exception types
- **File Structure**: Each LLM interaction flow is a separate module in the flows directory
- **Tests**: pytest-based tests in separate test\_\*.py files
- **Linting**: Code is automatically checked by ruff, mypy and other tools via pre-commit

### Type Handling

- Use proper imports: `from typing import Dict, List, Optional, Any, Union`
- For optional values: `parameter: Optional[Type] = None`
- For possible multiple types: `parameter: Union[Type1, Type2]`
- When using `Any`, consider adding comments explaining why
- Avoid circular imports by using string type annotations when needed

### Error Handling

- Catch specific exceptions rather than broad `Exception`
- Log errors with useful context
- Never silently swallow exceptions with empty `except` blocks
- Consider providing fallback behavior in `except` blocks
- Use the `finally` block for cleanup that must always happen

## Project Architecture

- DSPy for LLM prompting with Google's Gemini models
- FastAPI for web interface
- Each feature starts with a spec followed by ADRs and implementation prompts
- Infrastructure changes follow Lightweight Technical Notes (LTNs) in ai_docs/tooling

## Development Workflow

- Use full specs/ADRs/PRDs for semantic features (user-facing functionality)
- Use Lightweight Technical Notes (LTNs) for infrastructure (like pre-commit setup)
- Always create documentation first, then implement
- After implementation, ensure tests pass without warnings or errors

## Testing Principles

- **Test Integrity**: Tests exist to verify code works correctly; NEVER add hacks to make tests pass artificially
- **Fix Root Causes**: When tests fail, investigate and fix the underlying issues, not the symptoms
- **No Timeouts**: Never add arbitrary timeouts or circuit breakers to bypass test failures
- **No Test Modifications**: Don't modify tests to fit implementation; implementation should satisfy tests
- **Proper Debugging**: Use print statements, logging, or debuggers to understand test failures
- **Quality Verification**: Tests should verify both functionality AND quality (code should do the right thing, the right way)

## IMPORTANT

- ALWAYS run tests after making changes. Your changes aren't complete until they pass properly.
- NEVER circumvent or "cheat" on tests with timeouts, skips or other hacks. If a test is failing, something is wrong with the code.
- If you find tests that seem to hang indefinitely, this indicates a serious issue (potential infinite loop or deadlock) that must be fixed properly.
- After tests pass, run pre-commit checks with `pre-commit run --all-files` and fix any linting or formatting issues.

## Communication Style

- Be concise and direct in your responses and commit messages
- Focus on specifics and technical details rather than generalizations
- NEVER add "Generated with Claude Code" or "Co-Authored-By: Claude" to commits
- Keep commit messages focused on WHAT changed and WHY, not HOW it was done
- When creating PRs, focus on technical details, not on the fact that an agent helped
