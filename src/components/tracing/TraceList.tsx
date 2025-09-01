import React, { useEffect } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { useChatStore } from '../../store/chatStore';

export const TraceList: React.FC = () => {
  const { traces, isLoading, error, loadTraces, selectTrace, selectedTraceId, selectSession } = useTraceStore();
  const { conversations, currentConversationId } = useChatStore();

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Traces</h3>
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">Filter by session</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            value={currentConversationId || ''}
            onChange={(e) => selectSession(e.target.value || null)}
          >
            <option value="">All sessions</option>
            {conversations.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading && <div className="p-4 text-sm text-gray-500">Loading traces…</div>}
        {error && <div className="p-4 text-sm text-red-600">{error}</div>}
        <ul className="divide-y divide-gray-100">
          {traces.map(t => (
            <li key={t.trace_id}>
              <button
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedTraceId === t.trace_id ? 'bg-blue-50' : ''}`}
                onClick={() => selectTrace(t.trace_id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t.root_span_name}</div>
                    <div className="text-xs text-gray-500">{new Date(t.start_time).toLocaleString()} · {t.span_count} spans</div>
                  </div>
                  {t.session_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">session {t.session_id.slice(0, 6)}</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};


