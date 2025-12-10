import pytest
from fastapi.testclient import TestClient


class TestCreateSession:
    """Tests for POST /sessions endpoint."""

    def test_create_session_default_language(self, client: TestClient) -> None:
        """Create session with default language (javascript)."""
        response = client.post("/sessions")
        assert response.status_code == 201

        data = response.json()
        assert "id" in data
        assert data["code"] == ""
        assert data["language"] == "javascript"
        assert data["participants"] == 0
        assert "createdAt" in data

    def test_create_session_javascript(self, client: TestClient) -> None:
        """Create session with explicit javascript language."""
        response = client.post("/sessions", json={"language": "javascript"})
        assert response.status_code == 201
        assert response.json()["language"] == "javascript"

    def test_create_session_python(self, client: TestClient) -> None:
        """Create session with python language."""
        response = client.post("/sessions", json={"language": "python"})
        assert response.status_code == 201
        assert response.json()["language"] == "python"

    def test_create_session_invalid_language(self, client: TestClient) -> None:
        """Creating session with invalid language returns 422."""
        response = client.post("/sessions", json={"language": "rust"})
        assert response.status_code == 422


class TestGetSession:
    """Tests for GET /sessions/{session_id} endpoint."""

    def test_get_existing_session(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Get an existing session by ID."""
        session_id = sample_session["id"]
        response = client.get(f"/sessions/{session_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == session_id
        assert data["language"] == "javascript"

    def test_get_nonexistent_session(self, client: TestClient) -> None:
        """Getting nonexistent session returns 404."""
        response = client.get("/sessions/nonexistent-id")

        assert response.status_code == 404
        data = response.json()
        assert data["code"] == "SESSION_NOT_FOUND"
        assert data["status"] == 404


class TestUpdateCode:
    """Tests for PUT /sessions/{session_id}/code endpoint."""

    def test_update_code(self, client: TestClient, sample_session: dict) -> None:
        """Update code in a session."""
        session_id = sample_session["id"]
        new_code = "console.log('Updated!');"

        response = client.put(
            f"/sessions/{session_id}/code", json={"code": new_code}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == new_code
        assert data["language"] == "javascript"

    def test_update_code_and_language(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Update both code and language."""
        session_id = sample_session["id"]

        response = client.put(
            f"/sessions/{session_id}/code",
            json={"code": "print('Hello')", "language": "python"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "print('Hello')"
        assert data["language"] == "python"

    def test_update_code_empty_string(
        self, client: TestClient, sample_session_with_code: dict
    ) -> None:
        """Update code to empty string."""
        session_id = sample_session_with_code["id"]

        response = client.put(f"/sessions/{session_id}/code", json={"code": ""})

        assert response.status_code == 200
        assert response.json()["code"] == ""

    def test_update_code_nonexistent_session(self, client: TestClient) -> None:
        """Updating code for nonexistent session returns 404."""
        response = client.put(
            "/sessions/nonexistent-id/code",
            json={"code": "some code"},
        )

        assert response.status_code == 404
        assert response.json()["code"] == "SESSION_NOT_FOUND"

    def test_update_code_missing_code_field(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Missing code field returns 422."""
        session_id = sample_session["id"]
        response = client.put(
            f"/sessions/{session_id}/code", json={"language": "python"}
        )
        assert response.status_code == 422


class TestExecuteCode:
    """Tests for POST /sessions/{session_id}/execute endpoint."""

    def test_execute_empty_code(
        self, client: TestClient, sample_session: dict
    ) -> None:
        """Execute empty code returns success."""
        session_id = sample_session["id"]
        response = client.post(f"/sessions/{session_id}/execute")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["output"] == ""
        assert "executionTime" in data

    def test_execute_javascript_code(
        self, client: TestClient, sample_session_with_code: dict
    ) -> None:
        """Execute JavaScript code (mock)."""
        session_id = sample_session_with_code["id"]
        response = client.post(f"/sessions/{session_id}/execute")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Mock JS Output" in data["output"]
        assert data["executionTime"] >= 0

    def test_execute_python_code(self, client: TestClient) -> None:
        """Execute Python code (mock)."""
        # Create Python session
        create_response = client.post("/sessions", json={"language": "python"})
        session_id = create_response.json()["id"]

        # Add code
        client.put(
            f"/sessions/{session_id}/code",
            json={"code": "print('Hello')"},
        )

        # Execute
        response = client.post(f"/sessions/{session_id}/execute")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "Mock Python Output" in data["output"]

    def test_execute_nonexistent_session(self, client: TestClient) -> None:
        """Executing code for nonexistent session returns 404."""
        response = client.post("/sessions/nonexistent-id/execute")

        assert response.status_code == 404
        assert response.json()["code"] == "SESSION_NOT_FOUND"


class TestHealthCheck:
    """Tests for health check endpoint."""

    def test_health_check(self, client: TestClient) -> None:
        """Health check returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
