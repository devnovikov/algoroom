from datetime import datetime, timezone

from fastapi import WebSocket

from app.models import ExecutionResult, SessionUpdate


class ConnectionManager:
    """
    Manages WebSocket connections per session.

    Handles:
    - Connection lifecycle (connect/disconnect)
    - Broadcasting messages to all participants in a session
    - Participant count tracking
    """

    def __init__(self) -> None:
        # session_id -> list of active WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept connection and add to session's connection list."""
        await websocket.accept()
        if session_id not in self._connections:
            self._connections[session_id] = []
        self._connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str) -> None:
        """Remove connection from session's list."""
        if session_id in self._connections:
            if websocket in self._connections[session_id]:
                self._connections[session_id].remove(websocket)
            # Clean up empty session lists
            if not self._connections[session_id]:
                del self._connections[session_id]

    def get_participant_count(self, session_id: str) -> int:
        """Get number of connected participants for a session."""
        return len(self._connections.get(session_id, []))

    async def broadcast(self, session_id: str, message: SessionUpdate) -> None:
        """Send message to all connected participants in a session."""
        connections = self._connections.get(session_id, [])
        dead_connections: list[WebSocket] = []

        for connection in connections:
            try:
                await connection.send_json(message.model_dump(mode="json"))
            except Exception:
                dead_connections.append(connection)

        # Clean up dead connections
        for dead in dead_connections:
            self.disconnect(dead, session_id)

    async def broadcast_code_update(
        self,
        session_id: str,
        code: str,
        language: str,
    ) -> None:
        """Broadcast a code update to all session participants."""
        update = SessionUpdate(
            type="code_update",
            sessionId=session_id,
            code=code,
            language=language,  # type: ignore[arg-type]
            timestamp=datetime.now(timezone.utc),
        )
        await self.broadcast(session_id, update)

    async def broadcast_participant_joined(
        self,
        session_id: str,
        participant_count: int,
    ) -> None:
        """Broadcast participant joined event."""
        update = SessionUpdate(
            type="participant_joined",
            sessionId=session_id,
            participants=participant_count,
            timestamp=datetime.now(timezone.utc),
        )
        await self.broadcast(session_id, update)

    async def broadcast_participant_left(
        self,
        session_id: str,
        participant_count: int,
    ) -> None:
        """Broadcast participant left event."""
        update = SessionUpdate(
            type="participant_left",
            sessionId=session_id,
            participants=participant_count,
            timestamp=datetime.now(timezone.utc),
        )
        await self.broadcast(session_id, update)

    async def broadcast_execution_result(
        self,
        session_id: str,
        result: ExecutionResult,
    ) -> None:
        """Broadcast execution result to all session participants."""
        update = SessionUpdate(
            type="execution_result",
            sessionId=session_id,
            executionResult=result,
            timestamp=datetime.now(timezone.utc),
        )
        await self.broadcast(session_id, update)


# Global connection manager instance
connection_manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Dependency injection helper."""
    return connection_manager
