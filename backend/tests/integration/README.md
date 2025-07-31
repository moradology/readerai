# Integration Tests

These tests interact with real AWS services and require proper credentials.

## Setup

1. Ensure AWS credentials are configured
2. Deploy infrastructure with `readerai infra apply`
3. Load environment variables from `.env.aws`

## Running Tests

### All Integration Tests

```bash
# Run all integration tests
uv run pytest -m integration

# With output
uv run pytest -m integration -v -s
```

### Audio Playback Tests

```bash
# Run audio tests WITH playback
uv run pytest -m audio --play-audio

# Run specific audio test
uv run pytest -m "integration and audio" --play-audio -v
```

## Test Categories

- **integration**: Tests that use real AWS services
- **audio**: Tests that can play audio (use with `--play-audio`)
- **slow**: Tests that take longer to run

## Examples

```bash
# Run integration tests except slow ones
uv run pytest -m "integration and not slow"

# Run only the TTS tests
uv run pytest tests/integration/test_tts_*.py -v

# Play a specific audio test
uv run pytest tests/integration/test_tts_audio_playback.py::test_play_synthesized_audio --play-audio
```
