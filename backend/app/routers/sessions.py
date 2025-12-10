from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.database import get_session_repository
from app.models import (
    ApiError,
    CreateSessionRequest,
    ExecutionResult,
    Session,
    UpdateCodeRequest,
)
from app.repositories.base import SessionRepositoryProtocol
from app.services.session_service import SessionService
from app.websocket import ConnectionManager, get_connection_manager

router = APIRouter(prefix="/sessions", tags=["sessions"])


def get_session_service(
    repo: Annotated[SessionRepositoryProtocol, Depends(get_session_repository)],
) -> SessionService:
    return SessionService(repo)


@router.post(
    "",
    response_model=Session,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ApiError, "description": "Invalid request"},
        500: {"model": ApiError, "description": "Server error"},
    },
)
async def create_session(
    request: CreateSessionRequest | None = None,
    service: SessionService = Depends(get_session_service),
) -> Session:
    """Create a new collaborative coding session."""
    language = request.language if request else "javascript"
    return await service.create_session(language)


@router.get(
    "/{session_id}",
    response_model=Session,
    responses={
        404: {"model": ApiError, "description": "Session not found"},
        500: {"model": ApiError, "description": "Server error"},
    },
)
async def get_session(
    session_id: str,
    service: SessionService = Depends(get_session_service),
) -> Session:
    """Get session by ID."""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": f"Session with ID '{session_id}' not found",
                "code": "SESSION_NOT_FOUND",
                "status": 404,
            },
        )
    return session


@router.put(
    "/{session_id}/code",
    response_model=Session,
    responses={
        400: {"model": ApiError, "description": "Invalid request"},
        404: {"model": ApiError, "description": "Session not found"},
        500: {"model": ApiError, "description": "Server error"},
    },
)
async def update_code(
    session_id: str,
    request: UpdateCodeRequest,
    background_tasks: BackgroundTasks,
    service: SessionService = Depends(get_session_service),
    ws_manager: ConnectionManager = Depends(get_connection_manager),
) -> Session:
    """Update code in a session."""
    session = await service.update_code(session_id, request)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": f"Session with ID '{session_id}' not found",
                "code": "SESSION_NOT_FOUND",
                "status": 404,
            },
        )

    # Broadcast code update to all connected WebSocket clients
    background_tasks.add_task(
        ws_manager.broadcast_code_update,
        session_id,
        session.code,
        session.language,
    )

    return session


@router.post(
    "/{session_id}/execution-result",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        404: {"model": ApiError, "description": "Session not found"},
        500: {"model": ApiError, "description": "Server error"},
    },
)
async def broadcast_execution_result(
    session_id: str,
    result: ExecutionResult,
    background_tasks: BackgroundTasks,
    service: SessionService = Depends(get_session_service),
    ws_manager: ConnectionManager = Depends(get_connection_manager),
) -> None:
    """Broadcast execution result to all session participants."""
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": f"Session with ID '{session_id}' not found",
                "code": "SESSION_NOT_FOUND",
                "status": 404,
            },
        )

    # Broadcast execution result to all connected WebSocket clients
    background_tasks.add_task(
        ws_manager.broadcast_execution_result,
        session_id,
        result,
    )
