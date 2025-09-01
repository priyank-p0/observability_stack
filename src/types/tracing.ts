export interface TraceEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, any>;
}

export interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string | null;
  name: string;
  start_time: string;
  end_time: string;
  status_code: string;
  status_message?: string | null;
  attributes: Record<string, any>;
  events: TraceEvent[];
  kind: string;
}

export interface TraceSummary {
  trace_id: string;
  root_span_name: string;
  session_id?: string;
  conversation_id?: string;
  start_time: string;
  end_time: string;
  span_count: number;
}


