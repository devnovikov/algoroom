from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import get_repository
from app.models import ApiError
from app.routers import sessions
from app.services.session_service import SessionService
from app.websocket import connection_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    settings = get_settings()

    # Startup - initialize database if using PostgreSQL
    if settings.is_postgres:
        from app.db.session import init_db

        await init_db()

    yield

    # Shutdown - clean up database connections if using PostgreSQL
    if settings.is_postgres:
        from app.db.session import close_db

        await close_db()


app = FastAPI(
    title="Algoroom API",
    version="1.0.0",
    description="Real-time collaborative code execution platform API",
    lifespan=lifespan,
)

# CORS configuration for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert HTTPExceptions to ApiError format."""
    if isinstance(exc.detail, dict):
        # Already formatted as ApiError
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    error = ApiError(
        message=str(exc.detail),
        code="HTTP_ERROR",
        status=exc.status_code,
    )
    return JSONResponse(status_code=exc.status_code, content=error.model_dump())


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    error = ApiError(
        message="An unexpected error occurred",
        code="INTERNAL_SERVER_ERROR",
        status=500,
    )
    return JSONResponse(status_code=500, content=error.model_dump())


# Include REST routers
app.include_router(sessions.router)


@app.websocket("/ws/sessions/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    """
    WebSocket endpoint for real-time session updates.

    Handles:
    - Connection lifecycle
    - Participant count broadcasting
    - Code update notifications (triggered by REST API)
    """
    # Check if session exists (short-lived repo usage)
    async with get_repository() as repo:
        service = SessionService(repo)
        session = await service.get_session(session_id)

    if not session:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Accept connection and track participant
    await connection_manager.connect(websocket, session_id)

    # Increment participant count
    async with get_repository() as repo:
        service = SessionService(repo)
        await service.add_participant(session_id)
        updated_session = await service.get_session(session_id)
        participant_count = updated_session.participants if updated_session else 0

    await connection_manager.broadcast_participant_joined(session_id, participant_count)

    try:
        # Keep connection alive and handle incoming messages
        while True:
            # We don't expect client messages, but need to keep connection alive
            # and detect disconnections
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        # Clean up on disconnect
        connection_manager.disconnect(websocket, session_id)

        # Decrement participant count
        async with get_repository() as repo:
            service = SessionService(repo)
            await service.remove_participant(session_id)
            updated_session = await service.get_session(session_id)
            participant_count = updated_session.participants if updated_session else 0

        await connection_manager.broadcast_participant_left(session_id, participant_count)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}
