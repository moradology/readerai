"""Test WebSocket functionality through the full stack."""

import json
import time

import pytest
import websocket


class TestWebSocket:
    """Test suite for WebSocket connections."""

    @pytest.fixture
    def ws_url(self, base_url: str) -> str:
        """Convert HTTP URL to WebSocket URL."""
        return base_url.replace("https://", "wss://").replace("http://", "ws://")

    def test_websocket_connection(self, ws_url: str):
        """Test basic WebSocket connection."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})  # Disable SSL verification

        try:
            # Connect to WebSocket
            ws.connect(f"{ws_url}/ws")

            # Connection should be established
            assert ws.connected

            # Send a ping (some servers require activity)
            ws.ping()

        finally:
            ws.close()

    def test_websocket_initial_passage(self, ws_url: str):
        """Test receiving initial passage through WebSocket."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})

        try:
            ws.connect(f"{ws_url}/ws")

            # Send request for initial passage
            ws.send(json.dumps({"type": "get_initial_passage"}))

            # Receive response
            response = ws.recv()
            data = json.loads(response)

            # Verify response structure
            assert "passage" in data
            assert "vocabulary_question" in data
            assert len(data["passage"]) > 100

        finally:
            ws.close()

    def test_websocket_chat_interaction(self, ws_url: str):
        """Test chat interaction through WebSocket."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})

        try:
            ws.connect(f"{ws_url}/ws")

            # First get the initial passage
            ws.send(json.dumps({"type": "get_initial_passage"}))
            ws.recv()  # Acknowledge initial passage response

            # Send a chat message
            ws.send(json.dumps({"type": "chat", "message": "What is photosynthesis?"}))

            # Receive chat response
            response = ws.recv()
            data = json.loads(response)

            # Verify response
            assert "response" in data or "message" in data
            response_text = data.get("response") or data.get("message", "")
            assert len(response_text) > 0

        finally:
            ws.close()

    def test_websocket_reconnection(self, ws_url: str):
        """Test WebSocket reconnection scenario."""
        # First connection
        ws1 = websocket.WebSocket(sslopt={"cert_reqs": 0})
        ws1.connect(f"{ws_url}/ws")
        assert ws1.connected
        ws1.close()

        # Wait a bit
        time.sleep(0.5)

        # Second connection should work
        ws2 = websocket.WebSocket(sslopt={"cert_reqs": 0})
        ws2.connect(f"{ws_url}/ws")
        assert ws2.connected
        ws2.close()

    def test_websocket_invalid_message(self, ws_url: str):
        """Test WebSocket behavior with invalid messages."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})

        try:
            ws.connect(f"{ws_url}/ws")

            # Send invalid JSON
            ws.send("not valid json")

            # Should either get an error response or connection might close
            # This depends on the backend implementation
            try:
                response = ws.recv()
                # If we get a response, it might be an error message
                assert response is not None
            except websocket.WebSocketConnectionClosedException:
                # Connection closed is also a valid response to invalid input
                pass

        finally:
            if ws.connected:
                ws.close()

    @pytest.mark.timeout(10)
    def test_websocket_concurrent_messages(self, ws_url: str):
        """Test sending multiple messages in quick succession."""
        ws = websocket.WebSocket(sslopt={"cert_reqs": 0})

        try:
            ws.connect(f"{ws_url}/ws")

            # Send multiple messages quickly
            messages = [
                {"type": "chat", "message": "Hello"},
                {"type": "chat", "message": "How are you?"},
                {"type": "chat", "message": "Tell me about the passage"},
            ]

            for msg in messages:
                ws.send(json.dumps(msg))
                # Small delay to avoid overwhelming
                time.sleep(0.1)

            # Should receive responses for all messages
            responses = []
            for _ in messages:
                response = ws.recv()
                responses.append(json.loads(response))

            # Verify we got responses
            assert len(responses) == len(messages)

        finally:
            ws.close()
