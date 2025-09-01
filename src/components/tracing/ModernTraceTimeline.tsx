import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { TraceSpan } from '../../types/tracing';
import { Clock, Zap, AlertTriangle, CheckCircle, Info, ChevronRight, ChevronDown } from 'lucide-react';

interface ModernTraceTimelineProps {
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

export const ModernTraceTimeline: React.FC<ModernTraceTimelineProps> = ({ 
  spans, 
  onSpanSelect, 
  selectedSpanId 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());
  const [hoveredSpan, setHoveredSpan] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Responsive container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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

  const getSpanColor = useCallback((span: TimelineSpan) => {
    if (span.status_code === 'ERROR') return '#ef4444';
    if (span.name.includes('openai')) return '#7c3aed';
    if (span.name.includes('google')) return '#059669';
    if (span.name.includes('anthropic')) return '#ea580c';
    if (span.name.includes('storage')) return '#2563eb';
    if (span.name.includes('chat')) return '#374151';
    return '#6b7280';
  }, []);

  const getSpanIcon = useCallback((span: TimelineSpan) => {
    if (span.status_code === 'ERROR') return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (span.status_code === 'OK') return <CheckCircle className="w-3 h-3 text-green-500" />;
    return <Info className="w-3 h-3 text-gray-400" />;
  }, []);

  const toggleCollapse = (spanId: string) => {
    const newCollapsed = new Set(collapsedSpans);
    if (newCollapsed.has(spanId)) {
      newCollapsed.delete(spanId);
    } else {
      newCollapsed.add(spanId);
    }
    setCollapsedSpans(newCollapsed);
  };

  const leftPanelWidth = Math.max(300, containerWidth * 0.4);
  const timelineWidth = containerWidth - leftPanelWidth - 20;

  return (
    <div className="h-full bg-white border rounded-lg shadow-sm" ref={containerRef}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Trace Timeline</h3>
              <p className="text-sm text-gray-600">Interactive span visualization</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-full shadow-sm">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="font-medium">{spans.length} spans</span>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-white rounded-full shadow-sm">
              <Clock className="w-3 h-3 text-blue-500" />
              <span className="font-medium">{maxTime.toFixed(1)}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        {flattenedSpans.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No spans to display</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Time Grid Header */}
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <div className="flex">
                <div className="bg-gray-100 border-r border-gray-200" style={{ width: leftPanelWidth }}>
                  <div className="p-3 text-sm font-medium text-gray-700">Span Details</div>
                </div>
                <div className="flex-1 relative" style={{ width: timelineWidth }}>
                  <div className="p-3 text-sm font-medium text-gray-700">Timeline</div>
                  {/* Time markers */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200">
                    {Array.from({ length: 6 }, (_, i) => {
                      const timeMs = (i / 5) * maxTime;
                      const x = (i / 5) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-2 border-l border-gray-300"
                          style={{ left: `${x}%` }}
                        >
                          <div className="absolute -top-6 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                            {timeMs.toFixed(0)}ms
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Spans */}
            <div className="divide-y divide-gray-100">
              {flattenedSpans.map((span, index) => {
                const isSelected = span.span_id === selectedSpanId;
                const isHovered = span.span_id === hoveredSpan;
                const color = getSpanColor(span);
                const barWidth = Math.max(2, (span.durationMs / maxTime) * 100);
                const barLeft = (span.startMs / maxTime) * 100;

                return (
                  <div
                    key={span.span_id}
                    className={`flex transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                        : isHovered 
                        ? 'bg-gray-50' 
                        : 'hover:bg-gray-25'
                    }`}
                    onMouseEnter={() => setHoveredSpan(span.span_id)}
                    onMouseLeave={() => setHoveredSpan(null)}
                    onClick={() => onSpanSelect?.(span)}
                  >
                    {/* Left Panel - Span Info */}
                    <div 
                      className="flex items-center p-3 border-r border-gray-200 bg-white"
                      style={{ width: leftPanelWidth }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Indentation */}
                        <div style={{ width: span.depth * 16 }} />
                        
                        {/* Collapse/Expand Button */}
                        {span.children.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCollapse(span.span_id);
                            }}
                            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                          >
                            {collapsedSpans.has(span.span_id) ? (
                              <ChevronRight className="w-3 h-3 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-gray-500" />
                            )}
                          </button>
                        )}
                        
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {getSpanIcon(span)}
                        </div>
                        
                        {/* Span Name */}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {span.name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{span.durationMs.toFixed(1)}ms</span>
                            <span className="text-gray-300">•</span>
                            <span className="uppercase text-[10px]">{span.kind}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Panel - Timeline Bar */}
                    <div 
                      className="flex-1 relative py-3 px-2"
                      style={{ width: timelineWidth }}
                    >
                      {/* Timeline Bar */}
                      <div className="relative h-6 bg-gray-100 rounded">
                        <div
                          className="absolute top-0 h-full rounded shadow-sm transition-all duration-200"
                          style={{
                            left: `${barLeft}%`,
                            width: `${barWidth}%`,
                            backgroundColor: color,
                            opacity: isSelected ? 1 : isHovered ? 0.8 : 0.7,
                          }}
                        >
                          {/* Duration Label */}
                          {barWidth > 10 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-medium text-white drop-shadow-sm">
                                {span.durationMs < 1 ? '< 1ms' : `${span.durationMs.toFixed(0)}ms`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Error Indicator */}
                        {span.status_code === 'ERROR' && (
                          <div className="absolute -left-1 top-0 w-2 h-full bg-red-500 rounded-l" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
