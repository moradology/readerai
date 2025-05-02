# ReaderAI: AI-Powered Reading Assistant

ReaderAI leverages Large Language Models via DSPy and provides an interactive web interface using FastAPI to help users improve reading comprehension and vocabulary. Engage with text through AI-powered analysis, vocabulary question generation, and interactive feedback.

## 🌟 Development Philosophy

ReaderAI follows a unique development methodology that combines traditional software engineering practices with AI-assisted development. Our approach:

1. **Specification-First Development**: Every feature begins with clear specifications and requirements
2. **Architectural Decision Records**: Key design decisions are documented with context and rationale
3. **AI-Assisted Implementation**: Features are implemented using structured prompts that guide development
4. **Comprehensive Testing**: Rigorous testing ensures reliability across different scenarios

For more details on our development process, see [CONTRIBUTING.md](CONTRIBUTING.md).

## ✨ Key Features

- **Interactive Web Interface:** FastAPI-powered UI for real-time interaction
- **CLI Tools:** Command-line interface for batch processing and integration
  - Passage extraction from text streams
  - Vocabulary question generation
  - Reading comprehension analysis
- **Configurable LLM Integration:** Easily switch models via .env configuration
- **Contextual Learning:** Maintains passage context for accurate assessments

## 📋 Prerequisites

- **Python:** Version 3.11 or higher recommended.
- **`uv`:** A fast Python package installer and resolver. If you don't have it, install via `pip install uv`.
- **Git:** For cloning the repository.
- **Google Cloud API Key:** A valid API key with the Gemini API enabled. See [Google AI documentation](https://ai.google.dev/) for setup instructions.

## ⚙️ Installation & Setup

1.  **Clone the Repository:**

    ```bash
    git clone git@github.com:moradology/readerai.git
    cd readerai
    ```

2.  **Create and Activate Virtual Environment:**
    Using `uv` (recommended):

    ```bash
    # Create a virtual environment named .venv
    uv venv .venv
    # Activate it
    # Linux/macOS/WSL:
    source .venv/bin/activate
    # Windows (Command Prompt/PowerShell):
    # .venv\Scripts\activate
    ```

3.  **Install Dependencies:**
    Using `uv` (syncs with lock file):

    ```bash
    uv sync
    ```

    To add a new dependency:

    ```bash
    uv add <package-name>
    ```

4.  **Configure Environment Variables:**

- Create a `.env` file from `.env.example`:
  ```bash
  cp .env.example .env
  ```
- Configure your settings:
  ```dotenv
  GOOGLE_API_KEY="your_actual_api_key_here"
  DEFAULT_LLM_MODEL="gemini/gemini-2.5-flash-preview-04-17"  # Change to preferred model
  ```


    _(The application uses `python-dotenv` to load this automatically)_

## ▶️ Running the Application

1.  **Ensure Virtual Environment is Active:** Your terminal prompt should show `(.venv)` at the beginning.

2.  **Start the FastAPI Server:**
    From the project root directory (`readerai/`), run:

    ```bash
    uvicorn main:app --reload
    ```

    - `uvicorn`: The ASGI server running the application.
    - `main`: The Python file (`main.py`).
    - `app`: The FastAPI application instance created in `main.py`.
    - `--reload`: Automatically restarts the server when code changes are detected (useful for development).

3.  **Access the Application:**
    Open your web browser and navigate to: `http://127.0.0.1:8000/`
    To view related docs on fastapi ends see: `http://127.0.0.1:8000/docs`

## 🖱️ Usage

- Upon loading the main page (`/`), the initial text passage and an automatically generated vocabulary question will be displayed in the chat interface.
- Type your answer to the question or other messages (like "hello", "vocabulary question") into the input box at the bottom.
- Press the "Send" button or hit Enter to submit your message.
- The AI will respond, either assessing your answer or generating a reply based on your input.

## 🖥️ Command Line Tools

ReaderAI provides powerful CLI utilities for batch processing:

### Vocabulary Analysis

```bash
readerai-vocabulary --passage "Your text here" [--model MODEL_NAME] [--json]
readerai-vocabulary --passage-file input.txt [--output output.json]
```

### Comprehension Analysis

```bash
readerai-comprehension --passage "Your text here" [--model MODEL_NAME]
readerai-comprehension --passage-file input.txt [--json]
```

### Passage Extraction (Stream Processing)

```bash
cat large_file.txt | readerai-passages --output passages.jsonl
```

Key Options:

- `--model`: Override default LLM (uses DEFAULT_LLM_MODEL from .env)
- `--json`: Machine-readable output format
- `--output`: Specify output file (defaults to stdout)

## 🔧 Model Configuration

Customize the LLM model via `.env`:

```dotenv
DEFAULT_LLM_MODEL="your-preferred-model"  # Supported models: gemini/gemini-2.5-flash, etc.
```

Override per-command:

```bash
readerai-vocabulary --passage "..." --model gemini/gemini-1.5-pro
```

Supported features by model:

- Gemini 2.5 Flash: Best for high-volume processing
- Gemini 1.5 Pro: Higher accuracy for complex analyses

## 🤝 Contributing

We welcome contributions to ReaderAI! Whether you're interested in fixing bugs, adding new features, or improving documentation, your help is appreciated.

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide to learn about:

- Our feature development process
- Coding standards
- How to create effective implementation prompts
- Testing guidelines
- Documentation requirements

### Development Tools

#### Pre-commit Hooks

We use pre-commit hooks to maintain code quality and consistency. To set up pre-commit:

1. Install the pre-commit tool:

   ```bash
   uv pip install pre-commit
   ```

2. Install the git hooks:

   ```bash
   pre-commit install
   ```

3. Now hooks will run automatically on commit

Pre-commit will automatically check code formatting, import sorting, type hints, and linting issues before each commit. See [.pre-commit-config.yaml](.pre-commit-config.yaml) for the complete list of checks.

This project uses a unique specification-first approach with detailed architectural decision records and implementation prompts that guide development.
