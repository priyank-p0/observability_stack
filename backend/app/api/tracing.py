"""Tracing API endpoints for listing traces and fetching details."""

from typing import List
from fastapi import APIRouter, HTTPException

from ..models.tracing import TraceSummary, TraceSpan
from ..services.tracing_service import tracing_service


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


