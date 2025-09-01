import React, { useState } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { ModernTraceTimeline } from './ModernTraceTimeline';
import { SpanDetails } from './SpanDetails';
import { TraceSpan } from '../../types/tracing';
import { BarChart3, List, Info, Activity } from 'lucide-react';

export const TraceDetail: React.FC = () => {
  const { spans, selectedTraceId } = useTraceStore();
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'tree'>('timeline');

  if (!selectedTraceId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <Activity className="w-10 h-10 text-blue-600" />
          </div>
          <div className="text-xl font-semibold mb-2 text-gray-900">No trace selected</div>
          <div className="text-gray-600 max-w-sm">
            Select a trace from the left panel to view detailed span analysis and timeline visualization
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Trace Analysis</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">Trace ID:</span>
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">
                {selectedTraceId}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
              <BarChart3 className="w-3 h-3" />
              {spans.length} spans
            </div>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 text-sm flex items-center gap-2 font-medium transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-2 text-sm flex items-center gap-2 font-medium transition-colors ${
                  viewMode === 'tree' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
                Tree
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex gap-4">
          {/* Main Trace View */}
          <div className="flex-1 min-w-0">
            {viewMode === 'timeline' ? (
              <ModernTraceTimeline 
                spans={spans} 
                onSpanSelect={setSelectedSpan}
                selectedSpanId={selectedSpan?.span_id}
              />
            ) : (
              <div className="h-full bg-white border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <List className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Span Tree View</h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Tree view coming soon</p>
                    <p className="text-xs text-gray-400 mt-1">Use Timeline view for now</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Span Details Panel */}
          <div className="w-96 flex-shrink-0">
            <SpanDetails span={selectedSpan} />
          </div>
        </div>
      </div>
    </div>
  );
};


