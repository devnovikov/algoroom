"""Business logic for session operations - async."""

from app.models import Session, UpdateCodeRequest
from app.repositories.base import SessionRepositoryProtocol


class SessionService:
    """Business logic for session operations."""

    def __init__(self, repository: SessionRepositoryProtocol) -> None:
        self._repository = repository

    async def create_session(self, language: str = "javascript") -> Session:
        return await self._repository.create(language)

    async def get_session(self, session_id: str) -> Session | None:
        return await self._repository.get(session_id)

    async def update_code(self, session_id: str, request: UpdateCodeRequest) -> Session | None:
        session = await self._repository.get(session_id)
        if not session:
            return None

        updates: dict = {"code": request.code}
        if request.language:
            updates["language"] = request.language

        updated_session = session.model_copy(update=updates)
        return await self._repository.update(updated_session)

    async def add_participant(self, session_id: str) -> Session | None:
        return await self._repository.increment_participants(session_id)

    async def remove_participant(self, session_id: str) -> Session | None:
        return await self._repository.decrement_participants(session_id)
