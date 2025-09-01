import React, { useState, useMemo, useEffect } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { tracingApi } from '../../services/api';
import { Clock, Zap, AlertTriangle, MessageSquare, Database, Cpu, TrendingUp } from 'lucide-react';
import { TraceSpan, TraceSummary } from '../../types/tracing';

interface SessionSummary {
  session_id: string;
  title: string;
  first_message: string;
  created_at: string;
  message_count: number;
}

export const ImprovedTraceView: React.FC = () => {
  const { traces, spans, selectedTraceId, selectTrace, loadTraces } = useTraceStore();
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadTraces();
        const summaries = await tracingApi.getSessionSummaries();
        setSessionSummaries(summaries);
      } catch (error) {
        console.error('Failed to load tracing data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadTraces]);

  // Group traces by session with proper titles
  const groupedTraces = useMemo(() => {
    const groups: Record<string, { session: SessionSummary; traces: TraceSummary[] }> = {};
    
    traces.forEach(trace => {
      const sessionId = trace.conversation_id || trace.session_id;
      if (!sessionId) return; // Skip traces without session IDs
      
      if (!groups[sessionId]) {
        const sessionSummary = sessionSummaries.find(s => s.session_id === sessionId);
        groups[sessionId] = {
          session: sessionSummary || {
            session_id: sessionId,
            title: `Session ${sessionId.slice(0, 8)}...`,
            first_message: '',
            created_at: trace.start_time,
            message_count: 0
          },
          traces: []
        };
      }
      
      groups[sessionId].traces.push(trace);
    });
    
    // Sort traces within each group by time (newest first)
    Object.values(groups).forEach(group => {
      group.traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    });
    
    return groups;
  }, [traces, sessionSummaries]);

  // Color scheme for different trace operation types
  const getTraceColor = (spanName: string, isSelected = false) => {
    const colors = {
      ai_response: { primary: '#8b5cf6', light: '#c4b5fd', bg: 'bg-purple-100', text: 'text-purple-700' },
      http_request: { primary: '#10b981', light: '#6ee7b7', bg: 'bg-emerald-100', text: 'text-emerald-700' },
      database: { primary: '#3b82f6', light: '#93c5fd', bg: 'bg-blue-100', text: 'text-blue-700' },
      processing: { primary: '#f59e0b', light: '#fcd34d', bg: 'bg-amber-100', text: 'text-amber-700' },
      validation: { primary: '#ef4444', light: '#fca5a5', bg: 'bg-red-100', text: 'text-red-700' },
      default: { primary: '#6b7280', light: '#d1d5db', bg: 'bg-gray-100', text: 'text-gray-700' }
    };

    let colorKey = 'default';
    
    // Classify by operation type, not provider
    if (spanName.includes('chat.completions') || spanName.includes('messages.create') || spanName.includes('send_message')) {
      colorKey = 'ai_response';
    } else if (spanName.includes('http') || spanName.includes('request') || spanName.includes('POST') || spanName.includes('GET')) {
      colorKey = 'http_request';
    } else if (spanName.includes('storage') || spanName.includes('store') || spanName.includes('save') || spanName.includes('database')) {
      colorKey = 'database';
    } else if (spanName.includes('chat.send_message') || spanName.includes('process') || spanName.includes('validate')) {
      colorKey = 'processing';
    } else if (spanName.includes('validation') || spanName.includes('check') || spanName.includes('verify')) {
      colorKey = 'validation';
    }

    return colors[colorKey as keyof typeof colors];
  };

  // Timeline data for selected trace (showing spans as line segments)
  const timelineData = useMemo(() => {
    if (!selectedTraceId || !spans.length) return [];
    
    // Get spans for the selected trace and sort by start time
    const traceSpans = spans
      .filter(span => span.trace_id === selectedTraceId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
    if (traceSpans.length === 0) return [];
    
    // Calculate relative timing from the first span
    const baseTime = new Date(traceSpans[0].start_time).getTime();
    
    return traceSpans.map((span, index) => {
      const startMs = new Date(span.start_time).getTime() - baseTime;
      const endMs = new Date(span.end_time).getTime() - baseTime;
      
      return {
        span,
        startX: startMs,
        endX: endMs,
        y: index,
        duration: endMs - startMs,
        order: index + 1,
        timestamp: new Date(span.start_time)
      };
    });
  }, [spans, selectedTraceId]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getSpanIcon = (span: TraceSpan) => {
    const colors = getTraceColor(span.name);
    
    // Icon based on operation type, not provider
    if (span.name.includes('chat.completions') || span.name.includes('messages.create') || span.name.includes('send_message')) {
      return <Cpu className={`w-4 h-4 ${colors.text}`} />; // AI Response
    } else if (span.name.includes('http') || span.name.includes('request') || span.name.includes('POST') || span.name.includes('GET')) {
      return <Zap className={`w-4 h-4 ${colors.text}`} />; // HTTP Request
    } else if (span.name.includes('storage') || span.name.includes('store') || span.name.includes('save') || span.name.includes('database')) {
      return <Database className={`w-4 h-4 ${colors.text}`} />; // Database
    } else if (span.name.includes('chat.send_message') || span.name.includes('process')) {
      return <MessageSquare className={`w-4 h-4 ${colors.text}`} />; // Processing
    } else if (span.name.includes('validation') || span.name.includes('check') || span.name.includes('verify')) {
      return <AlertTriangle className={`w-4 h-4 ${colors.text}`} />; // Validation
    }
    
    return <Clock className={`w-4 h-4 ${colors.text}`} />; // Default
  };

  const getSimpleSpanName = (name: string) => {
    // Operation-based naming
    if (name.includes('chat.completions') || name.includes('messages.create') || name.includes('send_message')) {
      return 'AI Response';
    } else if (name.includes('http') || name.includes('request') || name.includes('POST') || name.includes('GET')) {
      return 'HTTP Request';
    } else if (name.includes('storage') || name.includes('store') || name.includes('save') || name.includes('database')) {
      return 'Database Operation';
    } else if (name.includes('chat.send_message') || name.includes('process')) {
      return 'Process Request';
    } else if (name.includes('validation') || name.includes('check') || name.includes('verify')) {
      return 'Validation';
    }
    
    // Fallback: clean up the technical name
    return name.replace(/\./g, ' ').replace(/_/g, ' ').split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Timeline Graph Component
  const TimelineGraph: React.FC = () => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      const width = rect.width;
      const height = rect.height;
      const paddingLeft = 200; // Expanded for longer labels
      const paddingRight = 30;
      const paddingTop = 20;
      const paddingBottom = 30;
      
      ctx.clearRect(0, 0, width, height);
      
      if (timelineData.length === 0) {
        // Show message when no trace selected
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Select a trace to view span timeline', width / 2, height / 2);
        return;
      }
      
      const maxTime = Math.max(...timelineData.map(d => d.endX));
      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;
      const rowHeight = chartHeight / Math.max(1, timelineData.length);
      
      // Draw axes
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Y-axis
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, height - paddingBottom);
      // X-axis
      ctx.moveTo(paddingLeft, height - paddingBottom);
      ctx.lineTo(width - paddingRight, height - paddingBottom);
      ctx.stroke();
      
      // Draw grid lines and labels
      ctx.strokeStyle = '#f3f4f6';
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      
      // X-axis labels (time in ms)
      for (let i = 0; i <= 5; i++) {
        const x = paddingLeft + (i / 5) * chartWidth;
        const timeMs = (i / 5) * maxTime;
        
        // Grid line
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, height - paddingBottom);
        ctx.stroke();
        
        // Label
        ctx.fillText(`${timeMs.toFixed(0)}ms`, x, height - paddingBottom + 15);
      }
      
      // Draw span timeline bars (modern minimal style)
      timelineData.forEach((item, index) => {
        const y = paddingTop + index * rowHeight + rowHeight / 2;
        const startX = paddingLeft + (item.startX / maxTime) * chartWidth;
        const endX = paddingLeft + (item.endX / maxTime) * chartWidth;
        const barWidth = Math.max(3, endX - startX);
        
        // Get colors for this span type
        const colors = getTraceColor(item.span.name);
        const isSelected = item.span.span_id === selectedSpan?.span_id;
        
        // Draw background track (minimal)
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(paddingLeft, y - 2, chartWidth, 4);
        
        // Draw span bar (modern rounded style)
        const barHeight = isSelected ? 8 : 6;
        ctx.fillStyle = isSelected ? colors.primary : colors.light;
        
        // Rounded rectangle
        ctx.beginPath();
        ctx.roundRect(startX, y - barHeight/2, barWidth, barHeight, barHeight/2);
        ctx.fill();
        
        // Subtle shadow for selected
        if (isSelected) {
          ctx.shadowColor = colors.primary + '40';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
        }
        
        // Draw minimal label area on the left
        const labelX = 15;
        const labelWidth = paddingLeft - 30;
        
        // Background for selected item only
        if (isSelected) {
          ctx.fillStyle = colors.bg.includes('purple') ? '#f3e8ff' :
                         colors.bg.includes('emerald') ? '#ecfdf5' :
                         colors.bg.includes('orange') ? '#fff7ed' :
                         colors.bg.includes('blue') ? '#eff6ff' : '#f9fafb';
          ctx.fillRect(labelX, y - rowHeight/2 + 2, labelWidth, rowHeight - 4);
        }
        
        // Just show order number and duration
        ctx.fillStyle = isSelected ? '#111827' : '#6b7280';
        ctx.font = isSelected ? 'bold 13px system-ui' : '12px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText(`#${item.order}`, labelX + 10, y + 2);
        
        // Duration on the right side of label area
        ctx.fillStyle = colors.primary;
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText(`${item.duration.toFixed(0)}ms`, labelX + labelWidth - 10, y + 2);
        
        // Timestamp (only for selected items)
        if (isSelected) {
          ctx.fillStyle = '#6b7280';
          ctx.font = '10px system-ui';
          ctx.textAlign = 'left';
          ctx.fillText(item.timestamp.toLocaleTimeString(), labelX + 10, y - 8);
        }
      });
      
      // Axis labels
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Timeline (ms from start)', width / 2, height - 10);
      
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('Operations', 0, 0);
      ctx.restore();
      
    }, [timelineData, selectedSpan, spans]);
    
    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || timelineData.length === 0) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;
      
      const paddingLeft = 200;
      const paddingRight = 30;
      const paddingTop = 20;
      const paddingBottom = 30;
      const chartHeight = rect.height - paddingTop - paddingBottom;
      const chartWidth = rect.width - paddingLeft - paddingRight;
      const maxTime = Math.max(...timelineData.map(d => d.endX));
      const rowHeight = chartHeight / Math.max(1, timelineData.length);
      
      // Find clicked span
      let clickedSpan = null;
      let minDistance = Infinity;
      
      timelineData.forEach((item, index) => {
        const y = paddingTop + index * rowHeight + rowHeight / 2;
        const startX = paddingLeft + (item.startX / maxTime) * chartWidth;
        const endX = paddingLeft + (item.endX / maxTime) * chartWidth;
        
        // Check if click is within the span bar area
        if (clickX >= startX && clickX <= endX && Math.abs(clickY - y) < rowHeight / 2) {
          clickedSpan = item.span;
        }
      });
      
      if (clickedSpan) {
        setSelectedSpan(selectedSpan?.span_id === clickedSpan.span_id ? null : clickedSpan);
      }
    };
    
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-gray-900">
              {selectedTraceId ? 'Span Timeline' : 'Select a Request'}
            </h3>
          </div>
          {selectedTraceId && (
            <div className="text-xs text-gray-500">
              {timelineData.length} operations • Click bars to select
            </div>
          )}
        </div>
        <div className="border border-gray-100 rounded overflow-auto" style={{ height: '200px' }}>
          <canvas
            ref={canvasRef}
            className="w-full cursor-pointer"
            style={{ height: Math.max(200, timelineData.length * 40 + 60) }}
            onClick={handleCanvasClick}
          />
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>AI Response</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>HTTP Request</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Database</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Processing</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Validation</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Other</span>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Loading traces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-4 space-y-4">
      {/* Timeline Graph */}
      <TimelineGraph />
      
      {/* Sessions and Traces */}
      <div className="flex gap-4 h-96">
        {/* Left: Sessions */}
        <div className="w-80 bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-900">Chat Sessions</h3>
            <div className="text-xs text-gray-500 mt-1">
              {Object.keys(groupedTraces).length} sessions • {traces.length} requests
            </div>
          </div>
          <div className="overflow-auto" style={{ height: 'calc(100% - 80px)' }}>
            {Object.keys(groupedTraces).length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center p-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat sessions yet</p>
                  <p className="text-xs text-gray-400">Start a conversation to see traces</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {Object.entries(groupedTraces)
                  .sort(([,a], [,b]) => {
                    const aLatest = Math.max(...a.traces.map(t => new Date(t.start_time).getTime()));
                    const bLatest = Math.max(...b.traces.map(t => new Date(t.start_time).getTime()));
                    return bLatest - aLatest;
                  })
                  .map(([sessionId, group]) => {
                    const avgDuration = group.traces.reduce((sum, t) => 
                      sum + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()), 0
                    ) / group.traces.length;
                    
                    const hasSelectedTrace = group.traces.some(t => t.trace_id === selectedTraceId);

                    return (
                      <div
                        key={sessionId}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          hasSelectedTrace 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          // Select session and its most recent trace
                          setSelectedSessionId(sessionId);
                          const latestTrace = group.traces[0];
                          selectTrace(latestTrace.trace_id);
                        }}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {group.session.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {group.traces.length} requests • {formatDuration(avgDuration)} avg
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent traces preview */}
                        <div className="space-y-1">
                          {group.traces.slice(0, 2).map(trace => {
                            const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
                            return (
                              <div key={trace.trace_id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 truncate">
                                  {new Date(trace.start_time).toLocaleTimeString()}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-full ${
                                  duration > 5000 ? 'bg-red-100 text-red-700' :
                                  duration > 2000 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {formatDuration(duration)}
                                </span>
                              </div>
                            );
                          })}
                          {group.traces.length > 2 && (
                            <div className="text-xs text-gray-400 text-center">
                              +{group.traces.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Trace Details */}
        <div className="flex-1 bg-white border rounded-lg">
          {selectedTraceId ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b">
                <h3 className="font-medium text-gray-900 mb-2">Request Details</h3>
                <div className="text-sm text-gray-600">
                  {spans.length} operations • {formatDuration(
                    spans.length > 0 
                      ? Math.max(...spans.map(s => new Date(s.end_time).getTime())) - 
                        Math.min(...spans.map(s => new Date(s.start_time).getTime()))
                      : 0
                  )} total
                </div>
              </div>

              {/* Operations List */}
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {spans
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .map(span => {
                      const duration = new Date(span.end_time).getTime() - new Date(span.start_time).getTime();
                      const isSelected = span.span_id === selectedSpan?.span_id;
                      
                      return (
                        <button
                          key={span.span_id}
                          onClick={() => setSelectedSpan(isSelected ? null : span)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            isSelected 
                              ? `border-blue-300 ${getTraceColor(span.name).bg}` 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {getSpanIcon(span)}
                              <span className="font-medium text-gray-900">
                                {getSimpleSpanName(span.name)}
                              </span>
                              {span.status_code === 'ERROR' && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <span className={`text-sm font-mono ${getTraceColor(span.name).text}`}>
                              {formatDuration(duration)}
                            </span>
                          </div>

                          {/* Key info */}
                          <div className="text-xs text-gray-500">
                            {span.attributes['model.name'] && (
                              <span>Model: {span.attributes['model.name']} • </span>
                            )}
                            {span.attributes['usage.total_tokens'] && (
                              <span>Tokens: {span.attributes['usage.total_tokens']} • </span>
                            )}
                            <span>Status: {span.status_code}</span>
                          </div>

                          {/* Expanded details */}
                          {isSelected && span.attributes && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-xs">
                              {Object.entries(span.attributes)
                                .filter(([key]) => 
                                  key.includes('model') || 
                                  key.includes('token') || 
                                  key.includes('temperature')
                                )
                                .slice(0, 5)
                                .map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-500">
                                      {key.split('.').pop()?.replace('_', ' ')}:
                                    </span>
                                    <span className="font-mono text-gray-700">
                                      {String(value).length > 30 ? String(value).slice(0, 30) + '...' : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">Select a Session</p>
                <p className="text-sm">Click a chat session to see its request traces</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
