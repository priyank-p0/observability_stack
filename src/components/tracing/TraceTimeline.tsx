import React, { useEffect, useRef, useMemo, useState } from 'react';
import { TraceSpan } from '../../types/tracing';
import { ChevronDown, ChevronRight, Clock, Zap } from 'lucide-react';

interface TraceTimelineProps {
  spans: TraceSpan[];
  onSpanSelect?: (span: TraceSpan | null) => void;
  selectedSpanId?: string;
}

interface TimelineSpan extends TraceSpan {
  depth: number;
  children: TimelineSpan[];
  startMs: number;
  durationMs: number;
  collapsed?: boolean;
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ 
  spans, 
  onSpanSelect, 
  selectedSpanId 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());
  const [hoveredSpan, setHoveredSpan] = useState<string | null>(null);

  // Build hierarchical span tree with timing
  const spanTree = useMemo(() => {
    if (!spans.length) return [];

    const spanMap = new Map<string, TimelineSpan>();
    const rootSpans: TimelineSpan[] = [];
    
    // Convert to timeline spans with timing
    const minTime = Math.min(...spans.map(s => new Date(s.start_time).getTime()));
    
    spans.forEach(span => {
      const startMs = new Date(span.start_time).getTime() - minTime;
      const endMs = new Date(span.end_time).getTime() - minTime;
      
      const timelineSpan: TimelineSpan = {
        ...span,
        depth: 0,
        children: [],
        startMs,
        durationMs: endMs - startMs,
      };
      spanMap.set(span.span_id, timelineSpan);
    });

    // Build tree structure
    spanMap.forEach(span => {
      if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
        const parent = spanMap.get(span.parent_span_id)!;
        parent.children.push(span);
        span.depth = parent.depth + 1;
      } else {
        rootSpans.push(span);
      }
    });

    // Sort children by start time
    const sortChildren = (spans: TimelineSpan[]) => {
      spans.sort((a, b) => a.startMs - b.startMs);
      spans.forEach(span => sortChildren(span.children));
    };
    sortChildren(rootSpans);

    return rootSpans;
  }, [spans]);

  // Flatten tree for rendering (respecting collapsed state)
  const flattenedSpans = useMemo(() => {
    const result: TimelineSpan[] = [];
    
    const flatten = (spans: TimelineSpan[]) => {
      spans.forEach(span => {
        result.push(span);
        if (!collapsedSpans.has(span.span_id)) {
          flatten(span.children);
        }
      });
    };
    
    flatten(spanTree);
    return result;
  }, [spanTree, collapsedSpans]);

  const maxTime = useMemo(() => {
    if (!spans.length) return 1;
    const minTime = Math.min(...spans.map(s => new Date(s.start_time).getTime()));
    return Math.max(...spans.map(s => new Date(s.end_time).getTime())) - minTime;
  }, [spans]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !flattenedSpans.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const rowHeight = 32;
    const leftMargin = 300;
    const rightMargin = 20;
    const timelineWidth = width - leftMargin - rightMargin;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Timeline grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Vertical grid lines (time markers)
    const timeSteps = 5;
    for (let i = 0; i <= timeSteps; i++) {
      const x = leftMargin + (i / timeSteps) * timelineWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      const timeMs = (i / timeSteps) * maxTime;
      ctx.fillText(`${timeMs.toFixed(0)}ms`, x, 15);
    }

    // Render spans
    flattenedSpans.forEach((span, index) => {
      const y = 25 + index * rowHeight;
      const x = leftMargin + (span.startMs / maxTime) * timelineWidth;
      const w = Math.max(2, (span.durationMs / maxTime) * timelineWidth);
      
      // Span background
      const isSelected = span.span_id === selectedSpanId;
      const isHovered = span.span_id === hoveredSpan;
      
      // Color by span type
      let color = '#6b7280';
      if (span.name.includes('openai')) color = '#7c3aed';
      else if (span.name.includes('google')) color = '#059669';
      else if (span.name.includes('anthropic')) color = '#ea580c';
      else if (span.name.includes('storage')) color = '#2563eb';
      else if (span.name.includes('chat')) color = '#374151';
      
      // Span bar
      ctx.fillStyle = isSelected ? color : (isHovered ? `${color}cc` : `${color}99`);
      ctx.fillRect(x, y + 8, w, 16);
      
      // Span border
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, y + 8, w, 16);
      
      // Error indicator
      if (span.status_code === 'ERROR') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 2, y + 6, 4, 20);
      }
    });

    // Span labels (on left side)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    flattenedSpans.forEach((span, index) => {
      const y = 25 + index * rowHeight + 16;
      const indent = span.depth * 16 + 8;
      
      // Collapse/expand icon for parent spans
      if (span.children.length > 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px system-ui';
        ctx.fillText(
          collapsedSpans.has(span.span_id) ? '▶' : '▼',
          indent,
          y
        );
      }
      
      // Span name
      ctx.fillStyle = span.span_id === selectedSpanId ? '#1f2937' : '#374151';
      ctx.font = span.span_id === selectedSpanId ? 'bold 12px system-ui' : '12px system-ui';
      const nameX = indent + (span.children.length > 0 ? 20 : 8);
      const truncatedName = span.name.length > 35 ? span.name.slice(0, 32) + '...' : span.name;
      ctx.fillText(truncatedName, nameX, y);
      
      // Duration
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(`${span.durationMs.toFixed(1)}ms`, leftMargin - 8, y);
      ctx.textAlign = 'left';
    });

  }, [flattenedSpans, maxTime, selectedSpanId, hoveredSpan, collapsedSpans]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const rowHeight = 32;
    const clickedIndex = Math.floor((y - 25) / rowHeight);
    
    if (clickedIndex >= 0 && clickedIndex < flattenedSpans.length) {
      const span = flattenedSpans[clickedIndex];
      
      // Check if clicked on collapse/expand icon
      const x = event.clientX - rect.left;
      const indent = span.depth * 16 + 8;
      
      if (span.children.length > 0 && x >= indent && x <= indent + 16) {
        // Toggle collapse
        const newCollapsed = new Set(collapsedSpans);
        if (newCollapsed.has(span.span_id)) {
          newCollapsed.delete(span.span_id);
        } else {
          newCollapsed.add(span.span_id);
        }
        setCollapsedSpans(newCollapsed);
      } else {
        // Select span
        onSpanSelect?.(span);
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const rowHeight = 32;
    const hoveredIndex = Math.floor((y - 25) / rowHeight);
    
    if (hoveredIndex >= 0 && hoveredIndex < flattenedSpans.length) {
      setHoveredSpan(flattenedSpans[hoveredIndex].span_id);
    } else {
      setHoveredSpan(null);
    }
  };

  return (
    <div className="h-full bg-white border rounded-lg">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Trace Timeline
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {spans.length} spans
            </span>
            <span>{maxTime.toFixed(1)}ms total</span>
          </div>
        </div>
      </div>
      
      <div className="h-96 overflow-auto">
        <canvas
          ref={canvasRef}
          className="w-full cursor-pointer"
          style={{ height: Math.max(400, flattenedSpans.length * 32 + 50) }}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredSpan(null)}
        />
      </div>
    </div>
  );
};
