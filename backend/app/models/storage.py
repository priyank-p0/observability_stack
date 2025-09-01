"""Storage data models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ChatRecord(BaseModel):
    """Chat record model for storage."""
    record_id: str
    session_id: str
    user_text: str
    response_text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)


class ChatSession(BaseModel):
    """Chat session model for storage."""
    session_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    message_count: int = 0
    metadata: dict = Field(default_factory=dict)
