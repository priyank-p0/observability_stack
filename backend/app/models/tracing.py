"""Tracing data models for OpenTelemetry-backed UI."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TraceEvent(BaseModel):
    name: str
    timestamp: datetime
    attributes: Dict[str, Any] = Field(default_factory=dict)


class TraceSpan(BaseModel):
    span_id: str
    trace_id: str
    parent_span_id: Optional[str] = None
    name: str
    start_time: datetime
    end_time: datetime
    status_code: str = "UNSET"
    status_message: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    events: List[TraceEvent] = Field(default_factory=list)
    kind: str = "INTERNAL"


class TraceSummary(BaseModel):
    trace_id: str
    root_span_name: str
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    span_count: int


class TraceSessionSummary(BaseModel):
    session_id: str
    title: Optional[str] = None
    first_trace_at: Optional[datetime] = None
    last_trace_at: Optional[datetime] = None
    trace_count: int = 0


