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

  * **Initial Passage & Question:** Loads a default passage and automatically generates a relevant vocabulary question on startup.
  * **Interactive Chat Interface:** Simple web UI for sending messages and receiving responses from the AI.
  * **Vocabulary Question Generation:** Identifies challenging words in the text and creates context-based questions.
  * **Usage Examples:** Provides example sentences for the identified vocabulary words.
  * **Answer Assessment:** Evaluates user-provided answers to vocabulary questions and gives feedback.
  * **DSPy Integration:** Utilizes the DSPy framework for structuring prompts and logic for interacting with LLMs (Gemini).
  * **FastAPI Backend:** Exposes the AI logic through a robust asynchronous web API.

## 📋 Prerequisites

  * **Python:** Version 3.11 or higher recommended.
  * **`uv`:** A fast Python package installer and resolver. If you don't have it, install via `pip install uv`.
  * **Git:** For cloning the repository.
  * **Google Cloud API Key:** A valid API key with the Gemini API enabled. See [Google AI documentation](https://ai.google.dev/) for setup instructions.

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
    Using `uv` (syncs with `uv.lock` or resolves from `pyproject.toml`):

    ```bash
    uv pip sync
    ```


4.  **Configure Environment Variables:**

      * Create a `.env` file in the project root directory (`readerai/`). You can copy the structure from `.env.example` if it exists.
      * Add your Google API key to the `.env` file:
        ```dotenv
        GOOGLE_API_KEY="your_actual_api_key_here"
        ```

    *(The application uses `python-dotenv` to load this automatically)*

## ▶️ Running the Application

1.  **Ensure Virtual Environment is Active:** Your terminal prompt should show `(.venv)` at the beginning.

2.  **Start the FastAPI Server:**
    From the project root directory (`readerai/`), run:

    ```bash
    uvicorn main:app --reload
    ```

      * `uvicorn`: The ASGI server running the application.
      * `main`: The Python file (`main.py`).
      * `app`: The FastAPI application instance created in `main.py`.
      * `--reload`: Automatically restarts the server when code changes are detected (useful for development).

3.  **Access the Application:**
    Open your web browser and navigate to: `http://127.0.0.1:8000/`
    To view related docs on fastapi ends see: `http://127.0.0.1:8000/docs`

## 🖱️ Usage

  * Upon loading the main page (`/`), the initial text passage and an automatically generated vocabulary question will be displayed in the chat interface.
  * Type your answer to the question or other messages (like "hello", "vocabulary question") into the input box at the bottom.
  * Press the "Send" button or hit Enter to submit your message.
  * The AI will respond, either assessing your answer or generating a reply based on your input.

## 🤝 Contributing

We welcome contributions to ReaderAI! Whether you're interested in fixing bugs, adding new features, or improving documentation, your help is appreciated.

Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide to learn about:
- Our feature development process
- Coding standards
- How to create effective implementation prompts
- Testing guidelines
- Documentation requirements

This project uses a unique specification-first approach with detailed architectural decision records and implementation prompts that guide development.