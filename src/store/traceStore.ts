import { create } from 'zustand';
import type { TraceSummary, TraceSpan } from '../types/tracing';
import { tracingApi } from '../services/api';

interface TraceState {
  traces: TraceSummary[];
  selectedTraceId: string | null;
  spans: TraceSpan[];
  isLoading: boolean;
  error: string | null;
  selectedSessionId: string | null;
  showInMain: boolean;
  viewMode: 'tree' | 'graph';

  loadTraces: () => Promise<void>;
  selectTrace: (traceId: string | null) => Promise<void>;
  clear: () => void;
  selectSession: (sessionId: string | null) => Promise<void>;
  setShowInMain: (value: boolean) => void;
  setViewMode: (mode: 'tree' | 'graph') => void;
}

export const useTraceStore = create<TraceState>((set, get) => ({
  traces: [],
  selectedTraceId: null,
  spans: [],
  isLoading: false,
  error: null,
  selectedSessionId: null,
  showInMain: false,
  viewMode: 'tree',

  loadTraces: async () => {
    try {
      set({ isLoading: true, error: null });
      const traces = await tracingApi.listTraces();
      set({ traces, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  selectTrace: async (traceId: string | null) => {
    if (!traceId) {
      set({ selectedTraceId: null, spans: [] });
      return;
    }
    try {
      set({ isLoading: true, error: null, selectedTraceId: traceId, showInMain: true });
      const spans = await tracingApi.getTrace(traceId);
      set({ spans, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  clear: () => set({ traces: [], selectedTraceId: null, spans: [] }),

  selectSession: async (sessionId: string | null) => {
    // Ensure traces are loaded
    if (get().traces.length === 0) {
      await get().loadTraces();
    }
    set({ selectedSessionId: sessionId });
    if (!sessionId) {
      set({ showInMain: false });
      return;
    }
    // Pick most recent trace for the session
    const tracesForSession = get().traces.filter(t => t.session_id === sessionId);
    if (tracesForSession.length > 0) {
      const latest = tracesForSession.sort((a, b) => b.start_time.localeCompare(a.start_time))[0];
      await get().selectTrace(latest.trace_id);
      set({ showInMain: true });
    } else {
      set({ selectedTraceId: null, spans: [], showInMain: true });
    }
  },

  setShowInMain: (value: boolean) => set({ showInMain: value }),
  setViewMode: (mode: 'tree' | 'graph') => set({ viewMode: mode }),
}));


