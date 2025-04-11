## Build/Test/Lint Commands

- Test: `pytest tests/` - runs all test cases
- Lint: `pre-commit run --all-files` - runs all linting and static analysis checks
- Dependency management: `uv` for virtual environments and package management
- Install dependencies: `uv sync`

## Code Style Guidelines

- **Formatting**: PEP 8 style guide with appropriate docstrings
- **Error handling**: Ask for forgiveness rather than permission, and use try/except blocks with error logging
- **Naming conventions**: snake_case for variables/functions, PascalCase for classes
- **Imports**: Group by standard library → 3rd party → project modules → relative paths
- **Tests**: Files named test_*.py following pytest conventions; prefer functions for tests unless there is a good reason to use pytest classes
- **Type hints**: Use Python type annotations throughout

## Libraries

- **FastAPI Framework**: API with WebSocket support for chat interface
- **DSPy**: Framework for LLM prompting with Google's Gemini models


## Project Architecture
- **Flows**: LLM-centric workflows that serve as states in our larger application and use DSPy to describe interactions
    1. Modular Design: Each flow encapsulates specific LLM interaction patterns
    2. Flows are built with examples stored in `if __name__ == "__main__":` blocks to enable easy testing
    3. Flows are meant to encapsulate both user-LLM interactions and LLM-LLM evaluations of produced outputs
    4. Flows can encapsulate multiple steps, including validation steps conducted by the LLM. These can be stored as the `classmethod` `metric` for our `dspy.Module` to keep related portions of the code close together.

## Software Engineering Design Principles

### KISS (Keep It Simple, Stupid)

- Write straightforward, uncomplicated solutions.
- Avoid over-engineering and unnecessary complexity.
- Results in more readable and maintainable Python code.
- Always ask for clarification if there is obvious vagueness in proposed solutions.

### YAGNI (You Aren't Gonna Need It)

- Prevent adding speculative features.
- Focus on implementing only what's currently needed.
- Reduce code bloat and maintenance overhead.

### Python-Specific Best Practices

- Follow the Zen of Python
- Use list/dict comprehensions when they enhance readability
- Prefer composition over inheritance when possible

### SOLID Principles

- Single Responsibility Principle: Each class/module has one responsibility
  - Example: Separate flows for vocabulary, comprehension, and response
  - DO NOT enforce this rule dogmatically. If it is truly sensible to combine responsibilities, do so. Feel free to ask for clarification when this is unclear.
- Open-Closed Principle: Open for extension, closed for modification
- Liskov Substitution Principle: Derived classes should be substitutable
- Interface Segregation Principle: Many client-specific interfaces over one
- Dependency Inversion Principle: Depend on abstractions, not concretions
    - This can be as simple as heavy reliance on functions