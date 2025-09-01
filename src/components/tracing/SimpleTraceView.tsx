import React, { useState, useMemo } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { useChatStore } from '../../store/chatStore';
import { Clock, Zap, AlertTriangle, CheckCircle, MessageSquare, Database, Cpu, ChevronDown, ChevronRight } from 'lucide-react';
import { TraceSpan, TraceSummary } from '../../types/tracing';

export const SimpleTraceView: React.FC = () => {
  const { traces, spans, selectedTraceId, selectTrace } = useTraceStore();
  const { conversations } = useChatStore();
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  // Debug logging
  console.log('SimpleTraceView render:', { traces: traces.length, spans: spans.length, conversations: conversations.length });

  // Group traces by conversation
  const groupedTraces = useMemo(() => {
    const groups: Record<string, { conversation: any; traces: TraceSummary[] }> = {};
    
    traces.forEach(trace => {
      const conversationId = trace.conversation_id || trace.session_id || 'unknown';
      
      if (!groups[conversationId]) {
        const conversation = conversations.find(c => c.id === conversationId);
        groups[conversationId] = {
          conversation: conversation || { 
            id: conversationId, 
            title: conversationId === 'unknown' ? 'Unknown Session' : `Session ${conversationId.slice(0, 8)}...`,
            created_at: trace.start_time
          },
          traces: []
        };
      }
      
      groups[conversationId].traces.push(trace);
    });
    
    // Sort traces within each group by time (newest first)
    Object.values(groups).forEach(group => {
      group.traces.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    });
    
    return groups;
  }, [traces, conversations]);

  // Auto-expand conversations with recent activity (last 5 minutes)
  React.useEffect(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentConversations = new Set<string>();
    
    Object.entries(groupedTraces).forEach(([conversationId, group]) => {
      const hasRecentActivity = group.traces.some(trace => 
        new Date(trace.start_time) > fiveMinutesAgo
      );
      if (hasRecentActivity) {
        recentConversations.add(conversationId);
      }
    });
    
    setExpandedConversations(recentConversations);
  }, [groupedTraces]);

  // Simple metrics
  const totalTraces = traces.length;
  const avgLatency = traces.length > 0 
    ? traces.reduce((sum, t) => sum + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()), 0) / traces.length
    : 0;
  const errorCount = spans.filter(s => s.status_code === 'ERROR').length;

  const toggleConversation = (conversationId: string) => {
    const newExpanded = new Set(expandedConversations);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedConversations(newExpanded);
  };

  const getSpanIcon = (span: TraceSpan) => {
    if (span.name.includes('openai')) return <Cpu className="w-4 h-4 text-purple-600" />;
    if (span.name.includes('google')) return <Cpu className="w-4 h-4 text-green-600" />;
    if (span.name.includes('anthropic')) return <Cpu className="w-4 h-4 text-orange-600" />;
    if (span.name.includes('storage')) return <Database className="w-4 h-4 text-blue-600" />;
    if (span.name.includes('chat')) return <MessageSquare className="w-4 h-4 text-gray-700" />;
    return <Zap className="w-4 h-4 text-gray-500" />;
  };

  const getSimpleSpanName = (name: string) => {
    if (name.includes('openai')) return 'OpenAI API Call';
    if (name.includes('google')) return 'Google API Call';
    if (name.includes('anthropic')) return 'Anthropic API Call';
    if (name.includes('storage')) return 'Database Operation';
    if (name.includes('chat.send_message')) return 'Chat Request';
    return name.replace(/\./g, ' ').replace(/_/g, ' ').split(' ').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Early return for loading state
  if (!traces && !spans) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading traces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white">
      {/* Simple Header */}
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Request Tracing</h2>
        
        {/* Quick Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span>{totalTraces} requests</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span>{formatDuration(avgLatency)} avg</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{errorCount} errors</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-full">
        {/* Left: Conversations with Traces */}
        <div className="w-80 border-r border-gray-200">
          <div className="p-3 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900">Conversations</h3>
            <div className="text-xs text-gray-500 mt-1">
              {Object.keys(groupedTraces).length} conversations • {totalTraces} requests
            </div>
          </div>
          <div className="overflow-auto h-full">
            {Object.keys(groupedTraces).length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No traces yet</p>
                  <p className="text-xs text-gray-400 mt-1">Send a chat message to see traces</p>
                </div>
              </div>
            ) : (
              Object.entries(groupedTraces)
                .sort(([,a], [,b]) => {
                  const aLatest = Math.max(...a.traces.map(t => new Date(t.start_time).getTime()));
                  const bLatest = Math.max(...b.traces.map(t => new Date(t.start_time).getTime()));
                  return bLatest - aLatest;
                })
                .map(([conversationId, group]) => {
                const isExpanded = expandedConversations.has(conversationId);
                const latestTrace = group.traces[0];
                const totalDuration = group.traces.reduce((sum, t) => 
                  sum + (new Date(t.end_time).getTime() - new Date(t.start_time).getTime()), 0
                );
                const hasErrors = group.traces.some(t => 
                  spans.filter(s => s.trace_id === t.trace_id).some(s => s.status_code === 'ERROR')
                );

                return (
                  <div key={conversationId} className="border-b border-gray-100">
                    {/* Conversation Header */}
                    <button
                      onClick={() => toggleConversation(conversationId)}
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900 truncate flex-1">
                          {group.conversation.title}
                        </span>
                        {hasErrors && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="ml-6 text-xs text-gray-500 flex items-center gap-3">
                        <span>{group.traces.length} requests</span>
                        <span>{formatDuration(totalDuration / group.traces.length)} avg</span>
                        <span>{new Date(latestTrace.start_time).toLocaleDateString()}</span>
                      </div>
                    </button>

                    {/* Traces in Conversation */}
                    {isExpanded && (
                      <div className="bg-gray-25">
                        {group.traces.map(trace => {
                          const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
                          const isSelected = trace.trace_id === selectedTraceId;
                          
                          return (
                            <button
                              key={trace.trace_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectTrace(trace.trace_id);
                              }}
                              className={`w-full text-left p-3 pl-8 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-900 text-sm truncate">
                                  {getSimpleSpanName(trace.root_span_name)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  duration > 5000 ? 'bg-red-100 text-red-700' :
                                  duration > 2000 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {formatDuration(duration)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(trace.start_time).toLocaleTimeString()} • {trace.span_count} operations
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Trace Details */}
        <div className="flex-1">
          {selectedTraceId ? (
            <div className="h-full">
              {/* Trace Header */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2">Request Breakdown</h3>
                <div className="text-sm text-gray-600">
                  {spans.length} operations • {formatDuration(
                    spans.length > 0 
                      ? Math.max(...spans.map(s => new Date(s.end_time).getTime())) - 
                        Math.min(...spans.map(s => new Date(s.start_time).getTime()))
                      : 0
                  )} total
                </div>
              </div>

              {/* Simple Span List */}
              <div className="overflow-auto h-full p-4">
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
                              ? 'border-blue-300 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getSpanIcon(span)}
                              <span className="font-medium text-gray-900">
                                {getSimpleSpanName(span.name)}
                              </span>
                              {span.status_code === 'ERROR' && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                              {span.status_code === 'OK' && duration < 1000 && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <span className="text-sm font-mono text-gray-600">
                              {formatDuration(duration)}
                            </span>
                          </div>

                          {/* Key Attributes */}
                          <div className="text-xs text-gray-500 space-y-1">
                            {span.attributes['model.name'] && (
                              <div>Model: {span.attributes['model.name']}</div>
                            )}
                            {span.attributes['usage.total_tokens'] && (
                              <div>Tokens: {span.attributes['usage.total_tokens']}</div>
                            )}
                            {span.status_message && (
                              <div className="text-red-600">Error: {span.status_message}</div>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-gray-500">Started:</span>
                                  <div className="font-mono">{new Date(span.start_time).toLocaleTimeString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Status:</span>
                                  <div className={`font-medium ${
                                    span.status_code === 'OK' ? 'text-green-600' : 
                                    span.status_code === 'ERROR' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {span.status_code}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Important Attributes Only */}
                              {Object.entries(span.attributes)
                                .filter(([key]) => 
                                  key.includes('model') || 
                                  key.includes('token') || 
                                  key.includes('temperature') ||
                                  key.includes('conversation')
                                )
                                .slice(0, 4)
                                .map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-500 capitalize">
                                      {key.split('.').pop()?.replace('_', ' ')}:
                                    </span>
                                    <span className="font-mono text-gray-700">
                                      {String(value).length > 20 ? String(value).slice(0, 20) + '...' : String(value)}
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
                <p className="text-lg font-medium mb-1">Select a Request</p>
                <p className="text-sm">Choose a request from the left to see its breakdown</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
