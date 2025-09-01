import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TraceList } from './TraceList';
import { TraceDetail } from './TraceDetail';
import { TraceMetrics } from './TraceMetrics';
import { TraceSearch } from './TraceSearch';
import { useTraceStore } from '../../store/traceStore';
import { TraceSummary } from '../../types/tracing';
import { BarChart3, Search, List } from 'lucide-react';

export const TracingPanel: React.FC = () => {
  const { traces, spans } = useTraceStore();
  const [activeView, setActiveView] = useState<'overview' | 'traces' | 'search'>('overview');
  const [filteredTraces, setFilteredTraces] = useState<TraceSummary[]>(traces);
  const [sidebarWidth, setSidebarWidth] = useState<number>(400);
  const isDraggingRef = useRef(false);

  // Update filtered traces when traces change
  useEffect(() => {
    setFilteredTraces(traces);
  }, [traces]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const min = 300;
    const max = 800;
    // Calculate width relative to the container, not viewport
    const containerRect = document.querySelector('[data-tracing-container]')?.getBoundingClientRect();
    if (!containerRect) return;
    const relativeX = e.clientX - containerRect.left;
    const newWidth = Math.min(max, Math.max(min, relativeX));
    setSidebarWidth(newWidth);
  }, []);

  const onMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    // Re-enable text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [onMouseMove]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    // Disable text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onMouseMove, onMouseUp]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const renderSidebarContent = () => {
    switch (activeView) {
      case 'overview':
        return <TraceMetrics traces={filteredTraces} spans={spans} />;
      case 'traces':
        return <TraceList />;
      case 'search':
        return <TraceSearch traces={traces} onFilteredTracesChange={setFilteredTraces} />;
      default:
        return <TraceList />;
    }
  };

  return (
    <div className="flex h-full bg-gray-50 w-full" data-tracing-container>
      {/* Left Panel */}
      <div 
        className="bg-white border-r border-gray-200 flex flex-col flex-shrink-0" 
        style={{ width: sidebarWidth }}
      >
        {/* Panel Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Observability</h2>
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setActiveView('overview')}
              className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-1 ${
                activeView === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              Overview
            </button>
            <button
              onClick={() => setActiveView('traces')}
              className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-1 ${
                activeView === 'traces'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-3 h-3" />
              Traces
            </button>
            <button
              onClick={() => setActiveView('search')}
              className={`flex-1 px-3 py-2 text-sm flex items-center justify-center gap-1 ${
                activeView === 'search'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Search className="w-3 h-3" />
              Search
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-auto">
          {renderSidebarContent()}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startDrag}
        className="w-2 cursor-col-resize bg-gray-200 hover:bg-blue-300 active:bg-blue-400 transition-colors flex items-center justify-center group flex-shrink-0"
        aria-label="Resize trace panel"
        role="separator"
        style={{ userSelect: 'none' }}
      >
        <div className="w-0.5 h-8 bg-gray-400 group-hover:bg-blue-500 transition-colors"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <TraceDetail />
      </div>
    </div>
  );
};


