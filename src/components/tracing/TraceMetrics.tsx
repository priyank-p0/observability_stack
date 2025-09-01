import React, { useMemo } from 'react';
import { TraceSpan, TraceSummary } from '../../types/tracing';
import { Clock, Zap, AlertTriangle, TrendingUp, Database, Cpu } from 'lucide-react';

interface TraceMetricsProps {
  traces: TraceSummary[];
  spans: TraceSpan[];
}

interface Metrics {
  avgLatency: number;
  p95Latency: number;
  errorRate: number;
  throughput: number;
  totalTokens: number;
  modelBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export const TraceMetrics: React.FC<TraceMetricsProps> = ({ traces, spans }) => {
  const metrics = useMemo<Metrics>(() => {
    if (!traces.length) {
      return {
        avgLatency: 0,
        p95Latency: 0,
        errorRate: 0,
        throughput: 0,
        totalTokens: 0,
        modelBreakdown: {},
        statusBreakdown: {},
      };
    }

    // Calculate latencies
    const latencies = traces.map(t => 
      new Date(t.end_time).getTime() - new Date(t.start_time).getTime()
    );
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95Latency = sortedLatencies[p95Index] || 0;

    // Error rate
    const errorCount = spans.filter(s => s.status_code === 'ERROR').length;
    const errorRate = spans.length ? (errorCount / spans.length) * 100 : 0;

    // Throughput (traces per hour, rough estimate)
    const timeSpan = traces.length > 1 ? 
      new Date(traces[0].start_time).getTime() - new Date(traces[traces.length - 1].start_time).getTime()
      : 3600000; // 1 hour default
    const throughput = (traces.length / Math.max(timeSpan, 3600000)) * 3600000;

    // Token usage from span attributes
    let totalTokens = 0;
    spans.forEach(span => {
      const tokens = span.attributes['usage.total_tokens'] || 
                    span.attributes['total_tokens'] ||
                    span.attributes['completion_tokens'] ||
                    0;
      if (typeof tokens === 'number') totalTokens += tokens;
    });

    // Model breakdown
    const modelBreakdown: Record<string, number> = {};
    spans.forEach(span => {
      const model = span.attributes['model.name'] || span.attributes['model'] || 'unknown';
      if (typeof model === 'string') {
        modelBreakdown[model] = (modelBreakdown[model] || 0) + 1;
      }
    });

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    spans.forEach(span => {
      statusBreakdown[span.status_code] = (statusBreakdown[span.status_code] || 0) + 1;
    });

    return {
      avgLatency,
      p95Latency,
      errorRate,
      throughput,
      totalTokens,
      modelBreakdown,
      statusBreakdown,
    };
  }, [traces, spans]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
    subtitle?: string;
  }> = ({ title, value, icon, color = 'text-gray-600', subtitle }) => (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color} opacity-60`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Latency"
          value={`${metrics.avgLatency.toFixed(0)}ms`}
          icon={<Clock className="w-6 h-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="P95 Latency"
          value={`${metrics.p95Latency.toFixed(0)}ms`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(1)}%`}
          icon={<AlertTriangle className="w-6 h-6" />}
          color={metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}
        />
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput.toFixed(1)}`}
          icon={<Zap className="w-6 h-6" />}
          color="text-orange-600"
          subtitle="traces/hour"
        />
      </div>

      {/* Token Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-gray-900">Token Usage</h3>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {metrics.totalTokens.toLocaleString()}
          </div>
          <p className="text-sm text-gray-500">Total tokens consumed</p>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-green-600" />
            <h3 className="font-medium text-gray-900">Active Models</h3>
          </div>
          <div className="space-y-2">
            {Object.entries(metrics.modelBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([model, count]) => (
                <div key={model} className="flex justify-between text-sm">
                  <span className="text-gray-700 truncate">{model}</span>
                  <span className="font-medium text-green-600">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-medium text-gray-900 mb-3">Span Status Distribution</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(metrics.statusBreakdown).map(([status, count]) => {
            let color = 'bg-gray-100 text-gray-800';
            if (status === 'OK') color = 'bg-green-100 text-green-800';
            else if (status === 'ERROR') color = 'bg-red-100 text-red-800';
            else if (status === 'TIMEOUT') color = 'bg-yellow-100 text-yellow-800';
            
            return (
              <div key={status} className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                {status}: {count}
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-medium text-gray-900 mb-3">Performance Insights</h3>
        <div className="space-y-2 text-sm">
          {metrics.errorRate > 10 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              High error rate detected ({metrics.errorRate.toFixed(1)}%)
            </div>
          )}
          {metrics.p95Latency > 5000 && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Clock className="w-4 h-4" />
              P95 latency is high ({metrics.p95Latency.toFixed(0)}ms)
            </div>
          )}
          {Object.keys(metrics.modelBreakdown).length > 3 && (
            <div className="flex items-center gap-2 text-blue-600">
              <Cpu className="w-4 h-4" />
              Multiple models in use ({Object.keys(metrics.modelBreakdown).length})
            </div>
          )}
          {metrics.errorRate === 0 && metrics.p95Latency < 2000 && (
            <div className="flex items-center gap-2 text-green-600">
              <Zap className="w-4 h-4" />
              System performing well
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
