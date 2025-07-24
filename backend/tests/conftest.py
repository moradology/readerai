"""
Pytest configuration and fixtures
"""

import pytest


def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--play-audio",
        action="store_true",
        default=False,
        help="Actually play audio in tests that support it",
    )


@pytest.fixture
def play_audio(request):
    """Fixture to check if audio should be played"""
    return request.config.getoption("--play-audio")


@pytest.fixture
def anyio_backend():
    """Configure anyio to use asyncio backend for tests"""
    return "asyncio"
