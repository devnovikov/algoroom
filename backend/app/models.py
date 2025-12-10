from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Language = Literal["javascript", "python"]
UpdateType = Literal["code_update", "participant_joined", "participant_left", "execution_result"]


class Session(BaseModel):
    id: str = Field(..., description="Unique session identifier (UUID)")
    code: str = Field(default="", description="Current code content")
    language: Language = Field(default="javascript", description="Programming language")
    createdAt: datetime = Field(..., description="Session creation timestamp")
    participants: int = Field(default=0, ge=0, description="Connected participant count")


class CreateSessionRequest(BaseModel):
    language: Language = Field(default="javascript", description="Programming language")


class UpdateCodeRequest(BaseModel):
    code: str = Field(..., description="New code content")
    language: Language | None = Field(default=None, description="Optional language change")


class ExecutionResult(BaseModel):
    success: bool = Field(..., description="Whether execution succeeded")
    output: str = Field(default="", description="Standard output")
    error: str | None = Field(default=None, description="Error message if failed")
    executionTime: int = Field(..., ge=0, description="Execution time in milliseconds")


class SessionUpdate(BaseModel):
    type: UpdateType = Field(..., description="Update event type")
    sessionId: str = Field(..., description="Session ID")
    code: str | None = Field(default=None, description="New code (for code_update)")
    language: Language | None = Field(default=None, description="New language (for code_update)")
    participants: int | None = Field(default=None, description="Participant count")
    executionResult: ExecutionResult | None = Field(default=None, description="Execution result (for execution_result)")
    timestamp: datetime = Field(..., description="Event timestamp")


class ApiError(BaseModel):
    message: str = Field(..., description="Human-readable error message")
    code: str = Field(..., description="Machine-readable error code")
    status: int = Field(..., description="HTTP status code")
