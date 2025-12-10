"""Database configuration and repository factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Union

from app.config import get_settings
from app.repositories.base import SessionRepositoryProtocol
from app.repositories.memory import InMemorySessionRepository

# Global in-memory repository (for non-postgres mode)
_memory_repository: InMemorySessionRepository | None = None


def get_memory_repository() -> InMemorySessionRepository:
    """Get or create the in-memory repository singleton."""
    global _memory_repository
    if _memory_repository is None:
        _memory_repository = InMemorySessionRepository()
    return _memory_repository


@asynccontextmanager
async def get_repository() -> AsyncGenerator[SessionRepositoryProtocol, None]:
    """
    Factory for session repository based on configuration.

    Usage:
        async with get_repository() as repo:
            session = await repo.create("python")
    """
    settings = get_settings()

    if settings.is_postgres:
        from app.db.session import get_db_session
        from app.repositories.postgres import PostgresSessionRepository

        async with get_db_session() as db_session:
            yield PostgresSessionRepository(db_session)
    else:
        yield get_memory_repository()


async def get_session_repository() -> AsyncGenerator[
    Union[InMemorySessionRepository, "PostgresSessionRepository"], None  # noqa: F821
]:
    """FastAPI dependency for repository injection."""
    async with get_repository() as repo:
        yield repo
