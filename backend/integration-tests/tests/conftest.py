"""Pytest configuration and fixtures for integration tests."""

import os
import time
from typing import AsyncGenerator, Generator

import httpx
import pytest


@pytest.fixture(scope="session")
def base_url() -> str:
    """Get the base URL for testing."""
    return os.environ.get("TEST_BASE_URL", "https://localhost")


@pytest.fixture(scope="session")
def http_client() -> Generator[httpx.Client, None, None]:
    """Create an HTTPX client for the test session."""
    # Disable SSL verification for local testing with self-signed certs
    with httpx.Client(verify=False, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
async def async_http_client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create an async HTTPX client for the test session."""
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session", autouse=True)
def wait_for_services(base_url: str, http_client: httpx.Client) -> None:
    """Wait for all services to be healthy before running tests."""
    health_endpoint = f"{base_url}/health"
    max_retries = 30
    retry_delay = 2

    for i in range(max_retries):
        try:
            response = http_client.get(health_endpoint)
            if response.status_code == 200:
                print(f"\n✅ Services are healthy: {response.json()}")
                return
        except (httpx.ConnectError, httpx.ConnectTimeout):
            if i < max_retries - 1:
                print(f"\n⏳ Waiting for services... ({i + 1}/{max_retries})")
                time.sleep(retry_delay)
            else:
                raise TimeoutError(
                    f"Services did not become healthy after {max_retries * retry_delay} seconds"
                )


@pytest.fixture
def api_headers() -> dict[str, str]:
    """Common headers for API requests."""
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


@pytest.fixture
def anyio_backend():
    """Configure anyio to use asyncio backend for tests"""
    return "asyncio"
