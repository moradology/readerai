#!/bin/bash

# Integration test runner script
set -e

echo "🧪 Running ReaderAI Integration Tests"
echo "===================================="

# Set test environment
export TEST_BASE_URL="${TEST_BASE_URL:-https://localhost}"

# Check if services are already running
if curl -k -f "$TEST_BASE_URL/health" > /dev/null 2>&1; then
    echo "✅ Services already running at $TEST_BASE_URL"
else
    echo "❌ Services not running. Please start them first:"
    echo "   ./scripts/build_and_run.sh"
    exit 1
fi

# Change to integration tests directory
cd "$(dirname "$0")"

# Install test dependencies if needed
if [ ! -d ".venv" ]; then
    echo "📦 Setting up test environment..."
    uv venv
    source .venv/bin/activate
    uv sync
else
    source .venv/bin/activate
fi

# Run tests
echo ""
echo "🏃 Running tests..."
echo ""

# Run with coverage if available
if command -v coverage &> /dev/null; then
    coverage run -m pytest -v "$@"
    echo ""
    echo "📊 Coverage Report:"
    coverage report
else
    pytest -v "$@"
fi

# Deactivate virtual environment
deactivate

echo ""
echo "✨ Integration tests complete!"
