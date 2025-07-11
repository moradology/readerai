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

## 🛠️ Tech Stack

- **Backend**: Python 3.13, FastAPI, DSPy (LLM framework), AWS Polly (TTS)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit
- **Infrastructure**: Docker, Caddy (reverse proxy with automatic HTTPS), AWS S3
- **Testing**: Pytest, Jest, Integration tests with httpx
- **Development**: uv (package management), pre-commit hooks, hot reload support

## 📋 Prerequisites

- **Python:** Version 3.13 or higher required.
- **Node.js:** Version 18+ for frontend development.
- **Docker & Docker Compose:** For containerized deployment (optional).
- **`uv`:** A fast Python package installer and resolver. Install via: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Git:** For cloning the repository.
- **Google Cloud API Key:** A valid API key with the Gemini API enabled. See [Google AI documentation](https://ai.google.dev/) for setup instructions.

## ⚙️ Installation & Setup

1.  **Clone the Repository:**

    ```bash
    git clone git@github.com:moradology/readerai.git
    cd readerai
    ```

2.  **Set Python Version and Install Dependencies:**

    ```bash
    # Navigate to backend directory
    cd backend

    # Ensure Python 3.13 is used
    uv python pin 3.13

    # Install all dependencies (creates venv automatically)
    uv sync
    ```

3.  **Install Development Dependencies (optional):**

    ```bash
    # Install dev tools like ipython and pre-commit
    cd backend && uv sync --group dev
    ```

    To add a new dependency:

    ```bash
    # Add to main dependencies
    cd backend && uv add <package-name>

    # Add to dev dependencies
    cd backend && uv add --group dev <package-name>
    ```

4.  **Configure Environment Variables:**

- Create a `.env` file from `.env.example`:
  ```bash
  cd backend
  cp .env.example .env
  ```
- Configure your settings:

  ```dotenv
  GOOGLE_API_KEY="your_actual_api_key_here"
  DEFAULT_LLM_MODEL="gemini/gemini-2.5-flash-preview-04-17"  # Change to preferred model
  ```

  _(The application uses `python-dotenv` to load this automatically)_

## ▶️ Running the Application

### Local Development (without Docker)

1.  **Start the FastAPI Server:**

    ```bash
    cd backend
    uv run uvicorn main:app --reload
    ```

2.  **In a separate terminal, start the frontend:**

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3.  **Access the Application:**
    - Frontend: `http://localhost:5173`
    - Backend API: `http://localhost:8000`
    - API Documentation: `http://localhost:8000/docs`

## 🐳 Docker Deployment

ReaderAI includes a complete Docker setup for easy deployment with HTTPS support:

### Quick Start

```bash
# First time setup
cd backend
cp .env.example .env
# Edit .env with your API keys

# Development mode (with hot reload)
./scripts/build_and_run.sh

# Production mode (optimized, no mounts)
./scripts/build_and_run_prod.sh
```

Access the application at:

- HTTP: `http://localhost` (redirects to HTTPS)
- HTTPS: `https://localhost` (self-signed certificate)

### Understanding Docker Compose Overrides

The project uses Docker Compose with an override pattern:

- `docker-compose.yml` - Base configuration for production
- `docker-compose.override.yml` - Development overrides (auto-loaded)

**Key differences:**

- Development: Mounts source code, enables hot reload, adds debug logging
- Production: No mounts, optimized builds, minimal logging

### Manual Docker Commands

```bash
# Development (default - uses override file automatically)
cd backend && docker compose up --build

# Production (explicitly skip override file)
cd backend && docker compose --no-override up --build

# Run in background
docker compose up -d

# View logs
docker compose logs -f [service_name]

# Stop services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

### Architecture

- **Backend**: FastAPI application running on port 8000 (internal)
- **Caddy**: Reverse proxy providing:
  - HTTPS/TLS termination with automatic certificates
  - Static file serving for the React frontend
  - WebSocket support for real-time features
  - API request proxying to backend
- **Network**: User-defined bridge network for service communication

### Configuration

The Docker setup uses:

- `Dockerfile`: Multi-stage build with proper uv installation
- `docker-compose.yml`: Base service orchestration (production)
- `docker-compose.override.yml`: Development overrides (auto-loaded)
- `Caddyfile`: Reverse proxy configuration with routing rules

Environment variables are loaded from `.env` file automatically.

**Development Mode**:

- Mounts only source code for hot reloading
- Enables `--reload` flag on uvicorn
- Preserves container's dependency environment

**Production Mode**:

- No volume mounts (full isolation)
- Optimized for performance
- Uses `npm ci` for reproducible builds

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

ReaderAI uses Google's Gemini models via DSPy. Configure in `.env`:

```dotenv
GOOGLE_API_KEY="your-api-key-here"
DEFAULT_LLM_MODEL="gemini/gemini-2.0-flash-001"  # Latest and fastest

# Other supported models:
# gemini/gemini-1.5-pro         # More accurate, slower
# gemini/gemini-2.5-flash       # Good balance
# gemini/gemini-1.5-flash       # Legacy, still supported
```

Override per-command:

```bash
readerai-vocabulary --passage "..." --model gemini/gemini-1.5-pro
```

Model recommendations:

- **Development/Testing**: `gemini-2.0-flash-001` (fast, cost-effective)
- **Production**: `gemini-1.5-pro` (highest quality)
- **High Volume**: `gemini-2.5-flash` (good balance)

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

We use pre-commit hooks to maintain code quality:

```bash
# Install pre-commit (included in dev dependencies)
cd backend && uv sync --group dev

# Set up git hooks
cd backend && uv run pre-commit install

# Run manually on all files
cd backend && uv run pre-commit run --all-files
```

#### Running Tests

```bash
# Run unit tests
cd backend && uv run pytest tests/

# Run with coverage
cd backend && uv run pytest --cov=readerai tests/

# Run integration tests (requires Docker services running)
cd backend/integration-tests
./run_tests.sh
```

#### Useful Commands

```bash
# Format code
cd backend && uv run black readerai/

# Type checking
cd backend && uv run mypy readerai/

# Update all dependencies
cd backend && uv lock --upgrade
```

## 🧪 Testing

ReaderAI includes comprehensive testing:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test the full stack (Frontend → Caddy → Backend)
- **E2E Tests**: Test complete user workflows

See [backend/integration-tests/README.md](backend/integration-tests/README.md) for details on running integration tests.

## 🚀 Deployment

For production deployment:

1. Set proper environment variables in `backend/.env`
2. Use the production Docker script: `cd backend && ./scripts/build_and_run_prod.sh`
3. Configure your domain in `backend/Caddyfile` for automatic HTTPS
4. Set up AWS infrastructure with Terraform (see `infra/terraform/`)
5. Consider using a reverse proxy or load balancer for scaling

## 📚 Project Structure

```
readerai/
├── backend/           # Python backend
│   ├── readerai/      # Core Python package
│   │   ├── flows/     # LLM interaction flows
│   │   ├── utils/     # Utility functions
│   │   ├── cli/       # Command-line tools
│   │   └── tts/       # Text-to-speech integration
│   ├── tests/         # Unit tests
│   ├── integration-tests/ # Full-stack integration tests
│   ├── scripts/       # Build and deployment scripts
│   ├── docker-compose.yml # Production Docker config
│   ├── docker-compose.override.yml # Development overrides
│   └── main.py        # FastAPI application
├── frontend/          # React TypeScript frontend
├── infra/             # Infrastructure (Terraform, AWS)
├── docs/              # Architecture documentation
├── Caddyfile          # Reverse proxy configuration
└── CONTRIBUTING.md    # Development guidelines
```

## 🔧 Troubleshooting

### Common Issues

**Python version mismatch:**

```bash
# If you see "incompatible with project's Python requirement"
cd backend
uv python pin 3.13
uv sync
```

**Docker build fails:**

```bash
# Clean rebuild
docker compose down -v
docker system prune -f
./scripts/build_and_run.sh
```

**Port already in use:**

```bash
# Find process using port 80
sudo lsof -i :80
# Or change ports in docker-compose.yml
```

**SSL certificate warnings:**

- The local Caddy server uses self-signed certificates
- Your browser will show a security warning - this is normal for local development
- Click "Advanced" and "Proceed to localhost" to continue

**Hot reload not working:**

- Ensure you're using the development script (`build_and_run.sh`)
- Check that `docker-compose.override.yml` exists
- Verify volume mounts in `docker compose ps`
