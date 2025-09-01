import React, { useState } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { TraceTimeline } from './TraceTimeline';
import { SpanDetails } from './SpanDetails';
import { TraceSpan } from '../../types/tracing';
import { BarChart3, List, Info } from 'lucide-react';

export const TraceDetail: React.FC = () => {
  const { spans, selectedTraceId } = useTraceStore();
  const [selectedSpan, setSelectedSpan] = useState<TraceSpan | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'tree'>('timeline');

  if (!selectedTraceId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <div className="text-lg font-medium mb-1">No trace selected</div>
          <div className="text-sm">Select a trace to view detailed analysis</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Trace Analysis</h2>
            <p className="text-sm text-gray-600">Trace ID: {selectedTraceId}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Timeline
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${
                  viewMode === 'tree' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <List className="w-3 h-3" />
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
          <div className="flex-1">
            {viewMode === 'timeline' ? (
              <TraceTimeline 
                spans={spans} 
                onSpanSelect={setSelectedSpan}
                selectedSpanId={selectedSpan?.span_id}
              />
            ) : (
              <div className="h-full bg-white border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Span Tree View</h3>
                <div className="text-sm text-gray-500">Tree view coming soon...</div>
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


