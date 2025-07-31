# ReaderAI Backend

AI-powered reading companion for children - Backend API and Services

## Overview

ReaderAI is an interactive educational reading application that helps children learn through:

- **Text-to-Speech Reading** - High-quality audio narration with word-level synchronization
- **Interactive Interruptions** - Students can pause anytime to ask vocabulary or comprehension questions
- **Intelligent Checkpoints** - AI-driven comprehension questions at optimal moments
- **Real-time Communication** - WebSocket-based interaction for seamless user experience

## Architecture

### Core Components

- **FastAPI Application** - Modern async web framework serving REST and WebSocket APIs
- **TTS Service** - AWS Polly integration for high-quality speech synthesis
- **DSPy Integration** - LLM-powered question generation and assessment
- **Docker Infrastructure** - Containerized deployment with development hot-reload

### Communication Patterns

- **HTTP Streaming** - Audio chunks delivered efficiently via HTTP
- **WebSockets** - Real-time control, interruptions, and state synchronization
- **REST API** - Standard operations like answer submission and progress tracking

```
Audio Flow:    Client ← HTTP Stream ← TTS Service
Control Flow:  Client ↔ WebSocket ↔ Server
Data Flow:     Client → REST API → Server
```

## Project Structure

```
backend/
├── readerai/                    # Main application package
│   ├── api/                     # FastAPI route handlers
│   │   └── tts.py              # Text-to-speech endpoints
│   ├── cli/                     # Command-line interface
│   │   ├── tts.py              # TTS CLI commands
│   │   ├── ingest.py           # Content ingestion
│   │   └── ...                 # Other CLI modules
│   ├── config/                  # Configuration management
│   │   ├── aws.py              # AWS settings
│   │   ├── database.py         # Database configuration
│   │   └── llm.py              # LLM provider settings
│   ├── flows/                   # Business logic flows
│   │   ├── comprehension.py    # Comprehension questioning
│   │   ├── vocabulary.py       # Vocabulary assistance
│   │   └── passage_extractor.py # Text processing
│   ├── llm/                     # LLM integration
│   │   └── client.py           # LLM client utilities
│   ├── pipeline/                # Processing pipelines
│   │   └── chapter_boundary_detector.py # Content analysis
│   ├── tts/                     # Text-to-speech services
│   │   ├── service.py          # Core TTS logic
│   │   ├── models.py           # Data models
│   │   └── constants.py        # TTS configuration
│   └── utils/                   # Shared utilities
├── tests/                       # Test suite
│   ├── integration/            # Integration tests with real services
│   ├── unit/                   # Unit tests
│   └── manual/                 # Manual testing tools
├── integration-tests/          # Docker-based full-stack tests
├── docs/                       # Documentation
└── examples/                   # Usage examples
```

## Development Setup

### Prerequisites

- **Python 3.13+** - Required for the application
- **UV Package Manager** - Modern Python dependency management
- **Docker & Docker Compose** - For containerized development
- **AWS Credentials** - For TTS and storage services

### Quick Start

1. **Install Dependencies**

   ```bash
   cd backend
   uv sync
   ```

2. **Configure Settings**

   ```bash
   cp settings.example.yaml settings.yaml
   # Edit settings.yaml with your configuration
   ```

3. **Start Development Server**

   ```bash
   # With hot-reload
   docker compose up

   # Or run locally
   uv run uvicorn readerai.main:app --reload
   ```

### Environment Configuration

Key settings in `settings.yaml`:

```yaml
aws:
  audio_cache_bucket: your-s3-bucket
  region: us-east-1

llm:
  provider: openai # or anthropic, etc.
  api_key: your-api-key

server:
  host: 0.0.0.0
  port: 8000
```

## Testing

### Test Categories

#### Unit Tests

Pure function testing with no external dependencies:

```bash
uv run pytest tests/test_tts_pure_functions.py
```

#### Integration Tests

Real service integration with AWS Polly:

```bash
# Basic integration tests
uv run pytest tests/integration/ -m integration

# Audio playback tests (hear the results)
uv run pytest tests/integration/test_tts_audio_playback.py -m integration --play-audio -s
```

#### Docker Integration Tests

Full-stack testing through Docker:

```bash
cd integration-tests
./run_tests.sh
```

### Test Commands Reference

| Command                                  | Purpose                   |
| ---------------------------------------- | ------------------------- |
| `uv run pytest`                          | Run all tests             |
| `uv run pytest -m "not integration"`     | Skip integration tests    |
| `uv run pytest -m audio --play-audio -s` | Audio tests with playback |
| `uv run pytest tests/integration/ -v`    | Verbose integration tests |
| `./integration-tests/run_tests.sh`       | Full Docker stack tests   |

### Audio Test Requirements

For audio integration tests:

- AWS credentials configured
- `AWS_AUDIO_CACHE_BUCKET` environment variable
- Audio player installed (`afplay` on macOS, `aplay`/`mpg123` on Linux)

## CLI Usage

ReaderAI includes a comprehensive CLI for content management and testing:

### TTS Commands

```bash
# Synthesize text to speech
uv run readerai tts synthesize "Hello, world!" --voice Joanna

# Test different voices
uv run readerai tts test-voices

# Batch synthesis
uv run readerai tts batch-synthesize story.txt
```

### Content Management

```bash
# Ingest new story content
uv run readerai ingest story.txt --title "My Story"

# Extract chapters from text
uv run readerai extract-chapters story.txt

# Generate comprehension questions
uv run readerai run-comprehension story.txt
```

### Configuration

```bash
# Show current configuration
uv run readerai show-config

# Validate settings
uv run readerai config validate
```

## API Endpoints

### TTS Endpoints

- `POST /api/tts/synthesize` - Synthesize text to speech
- `GET /api/tts/stream/{audio_id}` - Stream audio content
- `POST /api/tts/batch` - Batch synthesis requests

### WebSocket Endpoints

- `WS /ws/reading/{session_id}` - Real-time reading session
- `WS /ws/interruption/{session_id}` - Handle student interruptions

### Health & Status

- `GET /health` - Service health check
- `GET /api/status` - Detailed system status

## Development Workflow

### Code Style & Quality

```bash
# Run linting and formatting
uv run pre-commit run --all-files

# Type checking
uv run mypy readerai/

# Security scanning
uv run bandit -r readerai/
```

### Dependencies

```bash
# Add new dependency
uv add package-name

# Add development dependency
uv add --dev package-name

# Update dependencies
uv sync --upgrade
```

### Docker Development

```bash
# Start with hot-reload
docker compose up

# Rebuild containers
docker compose up --build

# Run production build
docker compose --no-override up
```

## Deployment

### Docker Production

```bash
cd backend
docker compose --no-override up -d
```

### Environment Variables

Required for production:

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `AWS_AUDIO_CACHE_BUCKET`
- `LLM_API_KEY`
- `DATABASE_URL` (if using database)

## Architecture Decisions

### Why This Tech Stack?

- **FastAPI** - Modern async framework with automatic OpenAPI documentation
- **DSPy** - Structured LLM programming for reliable AI interactions
- **AWS Polly** - High-quality TTS with word-level timing
- **anyio** - Consistent async interface across backends
- **UV** - Fast, reliable Python package management

### Key Design Principles

- **Functional Programming** - Pure functions over complex classes
- **Composable Architecture** - Small, focused components
- **Real Service Testing** - Integration over mocking
- **Streaming Architecture** - Efficient data delivery
- **Type Safety** - Runtime-compatible type annotations for DSPy

## Troubleshooting

### Common Issues

**TTS Tests Failing**

- Verify AWS credentials: `aws sts get-caller-identity`
- Check S3 bucket access: `aws s3 ls s3://your-bucket`

**Audio Playback Not Working**

- Install audio player: `brew install mpg123` (macOS) or `apt install mpg123` (Linux)
- Check file permissions and audio system

**Docker Issues**

- Clear containers: `docker compose down -v`
- Rebuild: `docker compose up --build`

### Getting Help

- Check [project documentation](../docs/)
- Review [architecture decisions](../docs/architecture/)
- Run health checks: `uv run readerai show-config`

## Contributing

1. Follow functional programming principles
2. Use `anyio` instead of `asyncio`
3. Add tests for new features
4. Run pre-commit hooks before committing
5. Prefer editing existing files over creating new ones

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.
