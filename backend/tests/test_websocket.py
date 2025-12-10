import pytest
from fastapi.testclient import TestClient


class TestWebSocketEndpoint:
    """Tests for WebSocket /ws/sessions/{session_id} endpoint."""

    def test_websocket_connect_valid_session(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Connect to WebSocket for valid session."""
        session_id = sample_session["id"]

        with client.websocket_connect(f"/ws/sessions/{session_id}") as websocket:
            # Should receive participant_joined message
            data = websocket.receive_json()
            assert data["type"] == "participant_joined"
            assert data["sessionId"] == session_id
            assert data["participants"] == 1
            assert "timestamp" in data

    def test_websocket_connect_invalid_session(self, client: TestClient) -> None:
        """Connect to WebSocket for invalid session closes connection."""
        with pytest.raises(Exception):
            # Should fail to connect or close immediately
            with client.websocket_connect("/ws/sessions/invalid-session-id"):
                pass

    def test_websocket_participant_count_increases(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Participant count increases on connect."""
        session_id = sample_session["id"]

        # Verify initial participant count is 0
        response = client.get(f"/sessions/{session_id}")
        assert response.json()["participants"] == 0

        with client.websocket_connect(f"/ws/sessions/{session_id}") as websocket:
            # Receive the join message
            websocket.receive_json()

            # Check participant count increased
            response = client.get(f"/sessions/{session_id}")
            assert response.json()["participants"] == 1

    def test_websocket_multiple_participants(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Multiple WebSocket connections increase participant count."""
        session_id = sample_session["id"]

        with client.websocket_connect(f"/ws/sessions/{session_id}") as ws1:
            # First participant joins
            msg1 = ws1.receive_json()
            assert msg1["type"] == "participant_joined"
            assert msg1["participants"] == 1

            with client.websocket_connect(f"/ws/sessions/{session_id}") as ws2:
                # Second participant joins - both should receive broadcast
                msg2 = ws2.receive_json()
                assert msg2["type"] == "participant_joined"
                assert msg2["participants"] == 2

                # First participant also receives the update
                msg1_update = ws1.receive_json()
                assert msg1_update["type"] == "participant_joined"
                assert msg1_update["participants"] == 2

                # Verify via REST API
                response = client.get(f"/sessions/{session_id}")
                assert response.json()["participants"] == 2


class TestWebSocketCodeUpdates:
    """Tests for WebSocket code update broadcasts."""

    def test_code_update_broadcast(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Code updates are broadcast to connected clients."""
        session_id = sample_session["id"]

        with client.websocket_connect(f"/ws/sessions/{session_id}") as websocket:
            # Receive participant_joined
            websocket.receive_json()

            # Update code via REST API
            client.put(
                f"/sessions/{session_id}/code",
                json={"code": "console.log('test');"},
            )

            # Should receive code_update broadcast
            data = websocket.receive_json()
            assert data["type"] == "code_update"
            assert data["sessionId"] == session_id
            assert data["code"] == "console.log('test');"
            assert data["language"] == "javascript"

    def test_code_update_with_language_change(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Code update with language change is broadcast."""
        session_id = sample_session["id"]

        with client.websocket_connect(f"/ws/sessions/{session_id}") as websocket:
            websocket.receive_json()  # participant_joined

            # Update code and language
            client.put(
                f"/sessions/{session_id}/code",
                json={"code": "print('hello')", "language": "python"},
            )

            # Should receive code_update with new language
            data = websocket.receive_json()
            assert data["type"] == "code_update"
            assert data["code"] == "print('hello')"
            assert data["language"] == "python"

    def test_multiple_clients_receive_code_update(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Multiple connected clients receive code updates."""
        session_id = sample_session["id"]

        with client.websocket_connect(f"/ws/sessions/{session_id}") as ws1:
            ws1.receive_json()  # participant_joined for ws1

            with client.websocket_connect(f"/ws/sessions/{session_id}") as ws2:
                ws2.receive_json()  # participant_joined for ws2
                ws1.receive_json()  # participant_joined broadcast to ws1

                # Update code
                client.put(
                    f"/sessions/{session_id}/code",
                    json={"code": "shared code"},
                )

                # Both clients should receive the update
                data1 = ws1.receive_json()
                data2 = ws2.receive_json()

                assert data1["type"] == "code_update"
                assert data1["code"] == "shared code"
                assert data2["type"] == "code_update"
                assert data2["code"] == "shared code"
