"""Tracing API endpoints for listing traces and fetching details."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from ..models.tracing import TraceSummary, TraceSpan
from ..services.tracing_service import tracing_service
from ..services.storage_service import storage_service


router = APIRouter(prefix="/api/tracing", tags=["tracing"])


@router.get("/traces", response_model=List[TraceSummary])
async def list_traces():
    try:
        return tracing_service.list_traces()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/traces/{trace_id}", response_model=List[TraceSpan])
async def get_trace(trace_id: str):
    try:
        return tracing_service.get_trace_spans(trace_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/summary")
async def get_sessions_with_first_messages():
    """Get sessions with their first user messages for better trace naming."""
    try:
        sessions = storage_service.get_all_sessions()
        session_summaries = []
        
        for session in sessions:
            records = storage_service.get_session_records(session.session_id)
            first_message = records[0].user_text if records else None
            
            # Create a meaningful title from first message
            if first_message:
                # Take first 50 chars and clean it up
                title = first_message[:50].strip()
                if len(first_message) > 50:
                    title += "..."
                # Remove newlines and extra spaces
                title = " ".join(title.split())
            else:
                title = session.title
                
            session_summaries.append({
                "session_id": session.session_id,
                "title": title,
                "original_title": session.title,
                "first_message": first_message,
                "created_at": session.created_at,
                "message_count": session.message_count
            })
        
        return session_summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


