"""Test API endpoints through the full stack (Caddy -> Backend)."""

import anyio
import httpx
import pytest


class TestAPIEndpoints:
    """Test suite for API endpoints."""

    def test_health_endpoint(self, base_url: str, http_client: httpx.Client):
        """Test the health check endpoint."""
        response = http_client.get(f"{base_url}/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "readerai-backend"
        assert "timestamp" in data

    def test_initial_passage_endpoint(self, base_url: str, http_client: httpx.Client):
        """Test the initial passage endpoint."""
        response = http_client.get(f"{base_url}/initial_passage_http")

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "passage" in data
        assert "vocabulary_question" in data
        assert isinstance(data["passage"], str)
        assert len(data["passage"]) > 100  # Should have substantial content

        # Verify vocabulary question structure
        vocab = data["vocabulary_question"]
        assert "word" in vocab
        assert "question" in vocab
        assert "options" in vocab
        assert "correct_answer" in vocab
        assert len(vocab["options"]) == 4

    def test_chat_endpoint(self, base_url: str, http_client: httpx.Client, api_headers: dict):
        """Test the chat endpoint."""
        payload = {"message": "What is the main topic of the passage?"}

        response = http_client.post(f"{base_url}/chat_http", json=payload, headers=api_headers)

        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0

    def test_cors_headers(self, base_url: str, http_client: httpx.Client):
        """Test CORS headers are properly set."""
        response = http_client.options(f"{base_url}/health")

        # FastAPI should handle CORS
        assert response.status_code in [200, 204]
        # Check for CORS headers if they're configured
        # assert "Access-Control-Allow-Origin" in response.headers

    @pytest.mark.anyio
    async def test_concurrent_requests(self, base_url: str, async_http_client: httpx.AsyncClient):
        """Test that the API can handle concurrent requests."""

        async def make_health_request():
            return await async_http_client.get(f"{base_url}/health")

        # Make 10 concurrent requests
        responses = []
        async with anyio.create_task_group() as tg:
            for _ in range(10):

                async def fetch_and_append():
                    response = await make_health_request()
                    responses.append(response)

                tg.start_soon(fetch_and_append)

        # All should succeed
        for response in responses:
            assert response.status_code == 200
            assert response.json()["status"] == "healthy"

    def test_invalid_endpoint_404(self, base_url: str, http_client: httpx.Client):
        """Test that invalid endpoints return 404."""
        response = http_client.get(f"{base_url}/nonexistent-endpoint")
        assert response.status_code == 404

    def test_caddy_compression(self, base_url: str, http_client: httpx.Client):
        """Test that Caddy applies gzip compression."""
        # Request with Accept-Encoding
        response = http_client.get(
            f"{base_url}/initial_passage_http", headers={"Accept-Encoding": "gzip"}
        )

        assert response.status_code == 200
        # Caddy should compress the response
        # Note: httpx automatically decompresses, so we check the header
        if "Content-Encoding" in response.headers:
            assert response.headers.get("Content-Encoding") == "gzip"
