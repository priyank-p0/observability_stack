import React from 'react';
import { TraceSpan, TraceSummary } from '../../types/tracing';
import { 
  Clock, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  Database, 
  Cpu, 
  Activity,
  CheckCircle,
  Timer,
  BarChart3
} from 'lucide-react';

interface ResponsiveMetricCardsProps {
  traces: TraceSummary[];
  spans: TraceSpan[];
}

interface Metrics {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  throughput: number;
  totalTokens: number;
  successRate: number;
  slowestTrace: number;
  modelBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export const ResponsiveMetricCards: React.FC<ResponsiveMetricCardsProps> = ({ traces, spans }) => {
  const metrics = React.useMemo<Metrics>(() => {
    if (!traces.length) {
      return {
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0,
        throughput: 0,
        totalTokens: 0,
        successRate: 0,
        slowestTrace: 0,
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
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    const p95Latency = sortedLatencies[p95Index] || 0;
    const p99Latency = sortedLatencies[p99Index] || 0;
    const slowestTrace = Math.max(...latencies);

    // Error rate and success rate
    const errorCount = spans.filter(s => s.status_code === 'ERROR').length;
    const errorRate = spans.length ? (errorCount / spans.length) * 100 : 0;
    const successRate = 100 - errorRate;

    // Throughput (traces per hour)
    const timeSpan = traces.length > 1 ? 
      new Date(traces[0].start_time).getTime() - new Date(traces[traces.length - 1].start_time).getTime()
      : 3600000;
    const throughput = (traces.length / Math.max(timeSpan, 3600000)) * 3600000;

    // Token usage
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
      p99Latency,
      errorRate,
      throughput,
      totalTokens,
      successRate,
      slowestTrace,
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
    trend?: 'up' | 'down' | 'stable';
    size?: 'sm' | 'md' | 'lg';
  }> = ({ title, value, icon, color = 'text-gray-600', subtitle, trend, size = 'md' }) => {
    const cardSizes = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };

    const valueSizes = {
      sm: 'text-lg',
      md: 'text-2xl',
      lg: 'text-3xl'
    };

    return (
      <div className={`bg-white ${cardSizes[size]} rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${color} opacity-70`}>
                {icon}
              </div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              {trend && (
                <div className={`text-xs px-1.5 py-0.5 rounded-full ${
                  trend === 'up' ? 'bg-green-100 text-green-700' :
                  trend === 'down' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                </div>
              )}
            </div>
            <p className={`font-bold ${color} ${valueSizes[size]} mb-1`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return 'text-green-600';
    if (latency < 3000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getErrorRateColor = (rate: number) => {
    if (rate < 1) return 'text-green-600';
    if (rate < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-4">
      {/* Primary Metrics - Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Average Latency"
          value={`${metrics.avgLatency.toFixed(0)}ms`}
          icon={<Clock className="w-5 h-5" />}
          color={getLatencyColor(metrics.avgLatency)}
          trend={metrics.avgLatency < 2000 ? 'stable' : 'up'}
          size="lg"
        />
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          color={metrics.successRate > 95 ? 'text-green-600' : 'text-red-600'}
          trend={metrics.successRate > 95 ? 'stable' : 'down'}
          size="lg"
        />
        <MetricCard
          title="P95 Latency"
          value={`${metrics.p95Latency.toFixed(0)}ms`}
          icon={<TrendingUp className="w-5 h-5" />}
          color={getLatencyColor(metrics.p95Latency)}
          size="lg"
        />
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput.toFixed(1)}`}
          icon={<Zap className="w-5 h-5" />}
          color="text-purple-600"
          subtitle="requests/hour"
          size="lg"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          title="P99 Latency"
          value={`${metrics.p99Latency.toFixed(0)}ms`}
          icon={<Timer className="w-4 h-4" />}
          color={getLatencyColor(metrics.p99Latency)}
          size="sm"
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(1)}%`}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={getErrorRateColor(metrics.errorRate)}
          size="sm"
        />
        <MetricCard
          title="Slowest Trace"
          value={`${metrics.slowestTrace.toFixed(0)}ms`}
          icon={<Activity className="w-4 h-4" />}
          color="text-orange-600"
          size="sm"
        />
        <MetricCard
          title="Total Tokens"
          value={metrics.totalTokens.toLocaleString()}
          icon={<Database className="w-4 h-4" />}
          color="text-blue-600"
          size="sm"
        />
        <MetricCard
          title="Active Models"
          value={Object.keys(metrics.modelBreakdown).length}
          icon={<Cpu className="w-4 h-4" />}
          color="text-indigo-600"
          size="sm"
        />
        <MetricCard
          title="Total Spans"
          value={spans.length.toLocaleString()}
          icon={<BarChart3 className="w-4 h-4" />}
          color="text-gray-600"
          size="sm"
        />
      </div>

      {/* Model Usage Breakdown */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          Model Usage Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(metrics.modelBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([model, count]) => {
              const percentage = (count / spans.length) * 100;
              return (
                <div key={model} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-700 truncate" title={model}>
                    {model}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-gray-600 text-right">
                    {count}
                  </div>
                  <div className="w-12 text-xs text-gray-500 text-right">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-600" />
          Span Status Distribution
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(metrics.statusBreakdown).map(([status, count]) => {
            let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
            if (status === 'OK') colorClass = 'bg-green-100 text-green-800 border-green-200';
            else if (status === 'ERROR') colorClass = 'bg-red-100 text-red-800 border-red-200';
            else if (status === 'TIMEOUT') colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
            
            const percentage = ((count / spans.length) * 100).toFixed(1);
            
            return (
              <div key={status} className={`px-3 py-2 rounded-lg text-sm font-medium border ${colorClass}`}>
                <div className="flex items-center gap-2">
                  <span>{status}</span>
                  <span className="text-xs opacity-75">({count})</span>
                  <span className="text-xs opacity-60">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Performance Insights
        </h3>
        <div className="space-y-2 text-sm">
          {metrics.errorRate > 10 && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              High error rate detected ({metrics.errorRate.toFixed(1)}%) - investigate failing spans
            </div>
          )}
          {metrics.p95Latency > 5000 && (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 p-2 rounded-lg">
              <Clock className="w-4 h-4" />
              P95 latency is high ({metrics.p95Latency.toFixed(0)}ms) - check for bottlenecks
            </div>
          )}
          {Object.keys(metrics.modelBreakdown).length > 3 && (
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2 rounded-lg">
              <Cpu className="w-4 h-4" />
              Multiple models in use ({Object.keys(metrics.modelBreakdown).length}) - consider consolidation
            </div>
          )}
          {metrics.errorRate === 0 && metrics.p95Latency < 2000 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              System performing optimally - all metrics within healthy ranges
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
