"""End-to-end tests for complete user flows."""

import json
import time

import httpx
import pytest
import websocket


class TestFullUserFlow:
    """Test complete user interaction flows."""

    @pytest.fixture
    def ws_url(self, base_url: str) -> str:
        """Convert HTTP URL to WebSocket URL."""
        return base_url.replace("https://", "wss://").replace("http://", "ws://")

    def test_complete_reading_session_http(self, base_url: str, http_client: httpx.Client):
        """Test a complete reading session using HTTP endpoints."""
        # Step 1: Get initial passage
        response = http_client.get(f"{base_url}/initial_passage_http")
        assert response.status_code == 200

        initial_data = response.json()
        passage = initial_data["passage"]
        vocab_question = initial_data["vocabulary_question"]

        # Verify we got meaningful content
        assert len(passage) > 100
        assert vocab_question["word"] in passage

        # Step 2: Answer the vocabulary question
        answer_payload = {"message": f"I think the answer is {vocab_question['options'][0]}"}

        chat_response = http_client.post(f"{base_url}/chat_http", json=answer_payload)
        assert chat_response.status_code == 200

        # Step 3: Ask a follow-up question
        followup_payload = {"message": "Can you explain more about the main topic of this passage?"}

        followup_response = http_client.post(f"{base_url}/chat_http", json=followup_payload)
        assert followup_response.status_code == 200
        assert len(followup_response.json()["response"]) > 50

    def test_complete_reading_session_websocket(self, ws_url: str):
        """Test a complete reading session using WebSocket."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})

        try:
            # Connect
            ws.connect(f"{ws_url}/ws")

            # Step 1: Get initial passage
            ws.send(json.dumps({"type": "get_initial_passage"}))
            initial_response = ws.recv()
            initial_data = json.loads(initial_response)

            assert "passage" in initial_data
            assert "vocabulary_question" in initial_data

            vocab_word = initial_data["vocabulary_question"]["word"]

            # Step 2: Answer vocabulary question
            ws.send(
                json.dumps(
                    {
                        "type": "chat",
                        "message": f"The word {vocab_word} means {initial_data['vocabulary_question']['options'][0]}",
                    }
                )
            )

            answer_response = ws.recv()
            json.loads(answer_response)  # Verify response is valid JSON

            # Step 3: Ask about passage comprehension
            ws.send(
                json.dumps(
                    {
                        "type": "chat",
                        "message": "What are the main characters or elements in this passage?",
                    }
                )
            )

            comprehension_response = ws.recv()
            comprehension_data = json.loads(comprehension_response)

            # Verify we got meaningful responses
            response_text = comprehension_data.get("response") or comprehension_data.get(
                "message", ""
            )
            assert len(response_text) > 20

        finally:
            ws.close()

    @pytest.mark.asyncio
    async def test_mixed_protocol_session(
        self,
        base_url: str,
        ws_url: str,
        http_client: httpx.Client,
        async_http_client: httpx.AsyncClient,
    ):
        """Test mixing HTTP and WebSocket in same session (simulating real usage)."""
        # Start with HTTP to get initial content
        initial_response = await async_http_client.get(f"{base_url}/initial_passage_http")
        assert initial_response.status_code == 200

        # Switch to WebSocket for interactive chat
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})
        try:
            ws.connect(f"{ws_url}/ws")

            # Continue conversation via WebSocket
            ws.send(
                json.dumps(
                    {
                        "type": "chat",
                        "message": "I just read the passage about the underground ecosystem",
                    }
                )
            )

            ws_response = ws.recv()
            assert ws_response is not None

        finally:
            ws.close()

        # Finish with HTTP health check
        health_response = await async_http_client.get(f"{base_url}/health")
        assert health_response.status_code == 200

    def test_error_recovery_flow(self, base_url: str, http_client: httpx.Client):
        """Test system behavior during error conditions."""
        # Test with empty message
        empty_response = http_client.post(f"{base_url}/chat_http", json={"message": ""})
        # Should either return 422 or handle gracefully
        assert empty_response.status_code in [200, 422]

        # Test with very long message
        long_message = "a" * 10000
        long_response = http_client.post(f"{base_url}/chat_http", json={"message": long_message})
        # Should handle without crashing
        assert long_response.status_code in [200, 413, 422]

        # Test rapid requests (rate limiting check)
        for i in range(5):
            response = http_client.get(f"{base_url}/health")
            assert response.status_code == 200
            time.sleep(0.1)  # Small delay to be nice

    def test_frontend_static_files(self, base_url: str, http_client: httpx.Client):
        """Test that frontend files are served correctly."""
        # Test root serves index.html
        response = http_client.get(base_url)
        assert response.status_code == 200
        assert "<!DOCTYPE html>" in response.text
        assert "ReaderAI" in response.text or "reader" in response.text.lower()

        # Test that non-existent routes fall back to index.html (SPA behavior)
        spa_response = http_client.get(f"{base_url}/some/spa/route")
        assert spa_response.status_code == 200
        assert "<!DOCTYPE html>" in spa_response.text
