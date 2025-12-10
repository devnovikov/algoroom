"""
Integration tests for client-server interaction.

These tests simulate real-world usage patterns where the frontend
interacts with the backend through REST and WebSocket APIs.
"""

import pytest
from fastapi.testclient import TestClient


class TestSessionLifecycle:
    """Test complete session lifecycle from creation to execution."""

    def test_complete_session_workflow(self, client: TestClient) -> None:
        """
        Test complete workflow:
        1. Create session
        2. Get session
        3. Update code
        4. Execute code
        """
        # 1. Create session
        create_response = client.post("/sessions", json={"language": "javascript"})
        assert create_response.status_code == 201
        session = create_response.json()
        session_id = session["id"]

        assert session["code"] == ""
        assert session["language"] == "javascript"
        assert session["participants"] == 0

        # 2. Get session - verify it exists
        get_response = client.get(f"/sessions/{session_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == session_id

        # 3. Update code
        code = "console.log('Hello from integration test!');"
        update_response = client.put(
            f"/sessions/{session_id}/code", json={"code": code}
        )
        assert update_response.status_code == 200
        assert update_response.json()["code"] == code

        # 4. Execute code
        exec_response = client.post(f"/sessions/{session_id}/execute")
        assert exec_response.status_code == 200
        result = exec_response.json()
        assert result["success"] is True
        assert "executionTime" in result

    def test_session_language_switch(self, client: TestClient) -> None:
        """Test switching language mid-session."""
        # Create JavaScript session
        create_response = client.post("/sessions", json={"language": "javascript"})
        session_id = create_response.json()["id"]

        # Add JS code
        client.put(
            f"/sessions/{session_id}/code",
            json={"code": "console.log('JS');"},
        )

        # Switch to Python
        update_response = client.put(
            f"/sessions/{session_id}/code",
            json={"code": "print('Python')", "language": "python"},
        )
        assert update_response.status_code == 200
        session = update_response.json()
        assert session["language"] == "python"
        assert session["code"] == "print('Python')"

        # Execute Python code
        exec_response = client.post(f"/sessions/{session_id}/execute")
        assert exec_response.status_code == 200
        assert "Python" in exec_response.json()["output"]


class TestCollaborativeEditing:
    """Test collaborative editing scenarios with WebSocket."""

    def test_realtime_code_sync(self, client: TestClient) -> None:
        """
        Simulate two users collaborating:
        1. User A creates session
        2. User B joins via WebSocket
        3. User A updates code
        4. User B receives update via WebSocket
        """
        # User A creates session
        create_response = client.post("/sessions", json={"language": "python"})
        session_id = create_response.json()["id"]

        # User B joins via WebSocket
        with client.websocket_connect(f"/ws/sessions/{session_id}") as ws_user_b:
            # User B receives join notification
            join_msg = ws_user_b.receive_json()
            assert join_msg["type"] == "participant_joined"
            assert join_msg["participants"] == 1

            # User A updates code (via REST API)
            code = "def hello():\n    print('Hello from User A!')"
            client.put(f"/sessions/{session_id}/code", json={"code": code})

            # User B receives code update
            update_msg = ws_user_b.receive_json()
            assert update_msg["type"] == "code_update"
            assert update_msg["code"] == code
            assert update_msg["language"] == "python"

    def test_multiple_participants_sync(self, client: TestClient) -> None:
        """Test synchronization with multiple participants."""
        # Create session
        create_response = client.post("/sessions")
        session_id = create_response.json()["id"]

        # Three participants connect
        with client.websocket_connect(f"/ws/sessions/{session_id}") as ws1:
            ws1.receive_json()  # participant 1 joins

            with client.websocket_connect(f"/ws/sessions/{session_id}") as ws2:
                join_msg_2 = ws2.receive_json()
                assert join_msg_2["participants"] == 2
                ws1.receive_json()  # ws1 gets notified

                with client.websocket_connect(f"/ws/sessions/{session_id}") as ws3:
                    join_msg_3 = ws3.receive_json()
                    assert join_msg_3["participants"] == 3
                    ws1.receive_json()  # ws1 gets notified
                    ws2.receive_json()  # ws2 gets notified

                    # Verify participant count via REST
                    response = client.get(f"/sessions/{session_id}")
                    assert response.json()["participants"] == 3

                    # Update code - all three should receive it
                    client.put(
                        f"/sessions/{session_id}/code",
                        json={"code": "shared_code = True"},
                    )

                    update1 = ws1.receive_json()
                    update2 = ws2.receive_json()
                    update3 = ws3.receive_json()

                    assert update1["type"] == "code_update"
                    assert update2["type"] == "code_update"
                    assert update3["type"] == "code_update"
                    assert update1["code"] == update2["code"] == update3["code"]


class TestErrorHandling:
    """Test error handling in client-server interaction."""

    def test_404_on_invalid_session_operations(self, client: TestClient) -> None:
        """Test 404 errors for invalid session IDs."""
        invalid_id = "00000000-0000-0000-0000-000000000000"

        # GET should return 404
        get_response = client.get(f"/sessions/{invalid_id}")
        assert get_response.status_code == 404
        assert get_response.json()["code"] == "SESSION_NOT_FOUND"

        # PUT should return 404
        put_response = client.put(
            f"/sessions/{invalid_id}/code", json={"code": "test"}
        )
        assert put_response.status_code == 404

        # Execute should return 404
        exec_response = client.post(f"/sessions/{invalid_id}/execute")
        assert exec_response.status_code == 404

    def test_validation_errors(self, client: TestClient) -> None:
        """Test validation error responses."""
        # Invalid language
        response = client.post("/sessions", json={"language": "invalid"})
        assert response.status_code == 422

        # Create valid session
        create_response = client.post("/sessions")
        session_id = create_response.json()["id"]

        # Missing required field
        response = client.put(
            f"/sessions/{session_id}/code", json={"language": "python"}
        )
        assert response.status_code == 422


class TestConcurrentOperations:
    """Test concurrent operations on the same session."""

    def test_rapid_code_updates(self, client: TestClient) -> None:
        """Test rapid sequential code updates."""
        create_response = client.post("/sessions")
        session_id = create_response.json()["id"]

        # Perform rapid updates
        for i in range(10):
            code = f"let step = {i};"
            response = client.put(
                f"/sessions/{session_id}/code", json={"code": code}
            )
            assert response.status_code == 200
            assert response.json()["code"] == code

        # Final state should be last update
        final_response = client.get(f"/sessions/{session_id}")
        assert final_response.json()["code"] == "let step = 9;"

    def test_execution_after_updates(self, client: TestClient) -> None:
        """Test execution uses latest code after updates."""
        create_response = client.post("/sessions")
        session_id = create_response.json()["id"]

        # Update code multiple times
        client.put(f"/sessions/{session_id}/code", json={"code": "let x = 1;"})
        client.put(f"/sessions/{session_id}/code", json={"code": "let x = 2;"})
        client.put(
            f"/sessions/{session_id}/code",
            json={"code": "console.log('final');"},
        )

        # Verify execution uses final code
        exec_response = client.post(f"/sessions/{session_id}/execute")
        assert exec_response.status_code == 200
        # Mock executor returns based on code content
        assert "Mock JS Output" in exec_response.json()["output"]


class TestDataPersistence:
    """Test data persistence within a session."""

    def test_session_data_persists(self, client: TestClient) -> None:
        """Test that session data persists across requests."""
        # Create session
        create_response = client.post("/sessions", json={"language": "python"})
        session_id = create_response.json()["id"]
        created_at = create_response.json()["createdAt"]

        # Update code
        code = "print('persistent')"
        client.put(f"/sessions/{session_id}/code", json={"code": code})

        # Multiple GET requests should return same data
        for _ in range(3):
            response = client.get(f"/sessions/{session_id}")
            data = response.json()
            assert data["id"] == session_id
            assert data["code"] == code
            assert data["language"] == "python"
            assert data["createdAt"] == created_at

    def test_independent_sessions(self, client: TestClient) -> None:
        """Test that multiple sessions are independent."""
        # Create two sessions
        session1 = client.post("/sessions", json={"language": "javascript"}).json()
        session2 = client.post("/sessions", json={"language": "python"}).json()

        # Update each session differently
        client.put(
            f"/sessions/{session1['id']}/code",
            json={"code": "js code"},
        )
        client.put(
            f"/sessions/{session2['id']}/code",
            json={"code": "python code"},
        )

        # Verify independence
        s1_data = client.get(f"/sessions/{session1['id']}").json()
        s2_data = client.get(f"/sessions/{session2['id']}").json()

        assert s1_data["code"] == "js code"
        assert s1_data["language"] == "javascript"
        assert s2_data["code"] == "python code"
        assert s2_data["language"] == "python"
