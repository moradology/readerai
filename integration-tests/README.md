# ReaderAI Integration Tests

This directory contains integration tests that verify the complete ReaderAI stack works correctly together (Frontend → Caddy → Backend).

## Test Coverage

- **API Endpoints**: Tests all HTTP endpoints through Caddy reverse proxy
- **WebSocket**: Tests real-time WebSocket connections
- **Full User Flows**: End-to-end scenarios mimicking real user interactions
- **Error Handling**: Validates graceful degradation and error recovery
- **Static Files**: Ensures frontend assets are served correctly

## Running Tests Locally

### Prerequisites

- Docker and Docker Compose installed
- Services running (`../scripts/build_and_run.sh`)

### Run all tests:

```bash
./run_tests.sh
```

### Run specific test file:

```bash
./run_tests.sh tests/test_api_endpoints.py
```

### Run specific test:

```bash
./run_tests.sh tests/test_api_endpoints.py::TestAPIEndpoints::test_health_endpoint
```

## Running Tests in Docker

This runs tests in an isolated container:

```bash
# From project root
docker compose -f docker-compose.yml -f docker-compose.test.yml up --exit-code-from tests
```

## Test Structure

- `conftest.py` - Shared fixtures and configuration
- `test_api_endpoints.py` - HTTP API endpoint tests
- `test_websocket.py` - WebSocket connection tests
- `test_full_flow.py` - Complete user journey tests

## Key Features

- Uses `httpx` instead of `requests` for modern async support
- Automatic service health checks before tests run
- Proper SSL/TLS handling for local Caddy certificates
- Timeout protection for all tests
- Clean test isolation

## CI/CD Integration

Tests run automatically on:

- Push to main/develop branches
- Pull requests to main

See `.github/workflows/integration-tests.yml` for details.
