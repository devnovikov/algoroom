"""Test configuration and fixtures."""

import os

# Force in-memory repository for all tests BEFORE importing app modules
os.environ["REPOSITORY_TYPE"] = "memory"
os.environ["DATABASE_URL"] = "memory://"

import pytest
from fastapi.testclient import TestClient

from app.database import get_memory_repository
from app.main import app
from app.websocket import connection_manager


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_state() -> None:
    """Clear all state before each test."""
    # Clear in-memory session repository
    get_memory_repository().clear()
    # Clear WebSocket connections
    connection_manager._connections.clear()


@pytest.fixture
def sample_session(client: TestClient) -> dict:
    """Create a sample session for testing."""
    response = client.post("/sessions", json={"language": "javascript"})
    return response.json()


@pytest.fixture
def sample_session_with_code(client: TestClient, sample_session: dict) -> dict:
    """Create a session with code."""
    session_id = sample_session["id"]
    response = client.put(
        f"/sessions/{session_id}/code",
        json={"code": "console.log('Hello, World!');"},
    )
    return response.json()
