"""Tracing service built on OpenTelemetry with JSON persistence for UI."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    SimpleSpanProcessor,
    BatchSpanProcessor,
    SpanExporter,
)
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

from ..models.tracing import TraceSpan, TraceSummary


class JsonSpanExporter(SpanExporter):
    """Custom exporter that mirrors spans into a JSON file for the UI."""

    def __init__(self, export_dir: str = "data/traces"):
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.spans_file = self.export_dir / "spans.json"
        self.traces_file = self.export_dir / "traces.json"
        # Init files if missing
        if not self.spans_file.exists():
            self._write_json(self.spans_file, [])
        if not self.traces_file.exists():
            self._write_json(self.traces_file, {})

    def _read_json(self, path: Path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return [] if path == self.spans_file else {}

    def _write_json(self, path: Path, data: Any):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str, ensure_ascii=False)

    def export(self, spans: List[ReadableSpan]) -> "opentelemetry.sdk.trace.export.SpanExportResult":
        data = self._read_json(self.spans_file)
        traces_index = self._read_json(self.traces_file)

        for span in spans:
            ctx = span.get_span_context()
            trace_id_hex = ctx.trace_id.hex if hasattr(ctx.trace_id, "hex") else f"{ctx.trace_id:032x}"
            span_id_hex = ctx.span_id.hex if hasattr(ctx.span_id, "hex") else f"{ctx.span_id:016x}"
            parent_hex = (
                span.parent.span_id.hex
                if span.parent and hasattr(span.parent.span_id, "hex")
                else (f"{span.parent.span_id:016x}" if span.parent else None)
            )

            span_model = TraceSpan(
                span_id=span_id_hex,
                trace_id=trace_id_hex,
                parent_span_id=parent_hex,
                name=span.name,
                start_time=datetime.fromtimestamp(span.start_time / 1e9),
                end_time=datetime.fromtimestamp(span.end_time / 1e9),
                status_code=str(span.status.status_code.name if span.status else "UNSET"),
                status_message=span.status.description if span.status else None,
                attributes=dict(span.attributes or {}),
                events=[
                    {
                        "name": e.name,
                        "timestamp": datetime.fromtimestamp(e.timestamp / 1e9),
                        "attributes": dict(e.attributes or {}),
                    }
                    for e in span.events
                ],
                kind=str(span.kind.name) if span.kind else "INTERNAL",
            )

            span_dict = span_model.model_dump()
            # Normalize timestamps to ISO strings for stable comparisons
            if isinstance(span_dict.get("start_time"), datetime):
                span_dict["start_time"] = span_dict["start_time"].isoformat()
            if isinstance(span_dict.get("end_time"), datetime):
                span_dict["end_time"] = span_dict["end_time"].isoformat()
            for ev in span_dict.get("events", []):
                if isinstance(ev.get("timestamp"), datetime):
                    ev["timestamp"] = ev["timestamp"].isoformat()

            data.append(span_dict)

            # Update traces index
            trace_id = span_dict["trace_id"]
            entry = traces_index.get(trace_id) or {
                "trace_id": trace_id,
                "root_span_name": span_dict["name"],
                "start_time": span_dict["start_time"],
                "end_time": span_dict["end_time"],
                "span_count": 0,
            }
            entry["span_count"] = int(entry.get("span_count", 0)) + 1
            # Expand start/end bounds (ISO strings comparable lexicographically)
            prev_start = entry.get("start_time")
            prev_end = entry.get("end_time")
            new_start = span_dict["start_time"]
            new_end = span_dict["end_time"]
            if not prev_start or new_start < prev_start:
                entry["start_time"] = new_start
                entry["root_span_name"] = span_dict["name"]
            else:
                entry["start_time"] = prev_start
            if not prev_end or new_end > prev_end:
                entry["end_time"] = new_end
            else:
                entry["end_time"] = prev_end

            # Optional conversation/session linkage
            conv_id = span_dict["attributes"].get("conversation.id")
            sess_id = span_dict["attributes"].get("session.id")
            if conv_id:
                entry["conversation_id"] = conv_id
            if sess_id:
                entry["session_id"] = sess_id

            traces_index[trace_id] = entry

        self._write_json(self.spans_file, data)
        self._write_json(self.traces_file, traces_index)

        from opentelemetry.sdk.trace.export import SpanExportResult
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        return None


class TracingService:
    """Initialize instrumentation and provide accessors for stored traces."""

    def __init__(self) -> None:
        self._initialized = False
        self._exporter = JsonSpanExporter()
        self._provider: Optional[TracerProvider] = None

    def init_app(self, app) -> None:
        if self._initialized:
            return

        resource = Resource.create({
            "service.name": "observability-stack-backend",
            "service.namespace": "chat",
        })

        self._provider = TracerProvider(resource=resource)
        # Use batch processor for efficiency
        self._provider.add_span_processor(BatchSpanProcessor(self._exporter))
        trace.set_tracer_provider(self._provider)

        # Instrument frameworks/clients
        FastAPIInstrumentor.instrument_app(app)
        HTTPXClientInstrumentor().instrument()
        RequestsInstrumentor().instrument()

        self._initialized = True

    @property
    def tracer(self):
        return trace.get_tracer("observability.chat")

    # Data accessors
    def list_traces(self) -> List[TraceSummary]:
        traces_path = self._exporter.traces_file
        if not traces_path.exists():
            return []
        with open(traces_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        summaries: List[TraceSummary] = []
        for entry in items.values():
            try:
                summaries.append(TraceSummary(**entry))
            except Exception:
                # Fallback to raw dict if parsing fails
                summaries.append(TraceSummary(
                    trace_id=entry.get("trace_id"),
                    root_span_name=entry.get("root_span_name", "trace"),
                    session_id=entry.get("session_id"),
                    conversation_id=entry.get("conversation_id"),
                    start_time=datetime.fromisoformat(entry.get("start_time")),
                    end_time=datetime.fromisoformat(entry.get("end_time")),
                    span_count=int(entry.get("span_count", 0)),
                ))
        # Sort newest first
        return sorted(summaries, key=lambda s: s.start_time, reverse=True)

    def get_trace_spans(self, trace_id: str) -> List[TraceSpan]:
        spans_path = self._exporter.spans_file
        if not spans_path.exists():
            return []
        with open(spans_path, "r", encoding="utf-8") as f:
            items = json.load(f)
        spans: List[TraceSpan] = []
        for item in items:
            if item.get("trace_id") == trace_id:
                try:
                    spans.append(TraceSpan(**item))
                except Exception:
                    # Attempt coerce timestamps
                    item["start_time"] = item.get("start_time")
                    item["end_time"] = item.get("end_time")
                    spans.append(TraceSpan(**item))
        # Order by start_time
        spans.sort(key=lambda s: s.start_time)
        return spans


tracing_service = TracingService()


