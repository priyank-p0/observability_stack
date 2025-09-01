import React, { useState, useMemo, useCallback } from 'react';
import { TraceSummary } from '../../types/tracing';
import { 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Calendar,
  Zap,
  Tag,
  TrendingUp
} from 'lucide-react';

interface AdvancedTraceSearchProps {
  traces: TraceSummary[];
  onFilteredTracesChange: (traces: TraceSummary[]) => void;
}

interface Filters {
  searchTerm: string;
  minDuration: string;
  maxDuration: string;
  status: 'all' | 'success' | 'error' | 'slow';
  sessionId: string;
  dateRange: string;
  sortBy: 'timestamp' | 'duration' | 'spans';
  sortOrder: 'asc' | 'desc';
}

const DURATION_PRESETS = [
  { label: 'Fast (< 1s)', min: 0, max: 1000 },
  { label: 'Normal (1-5s)', min: 1000, max: 5000 },
  { label: 'Slow (5-10s)', min: 5000, max: 10000 },
  { label: 'Very Slow (> 10s)', min: 10000, max: Infinity },
];

const DATE_PRESETS = [
  { label: 'Last 15 minutes', value: '15m' },
  { label: 'Last hour', value: '1h' },
  { label: 'Last 6 hours', value: '6h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'All time', value: 'all' },
];

export const AdvancedTraceSearch: React.FC<AdvancedTraceSearchProps> = ({ 
  traces, 
  onFilteredTracesChange 
}) => {
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sessionId: '',
    dateRange: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Get unique session IDs
  const sessionIds = useMemo(() => {
    const ids = new Set<string>();
    traces.forEach(trace => {
      if (trace.session_id) ids.add(trace.session_id);
    });
    return Array.from(ids).sort();
  }, [traces]);

  // Apply filters and sorting
  const filteredTraces = useMemo(() => {
    let filtered = [...traces];

    // Text search
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(trace =>
        trace.root_span_name.toLowerCase().includes(term) ||
        trace.trace_id.toLowerCase().includes(term) ||
        (trace.session_id && trace.session_id.toLowerCase().includes(term))
      );
    }

    // Duration filters
    if (filters.minDuration) {
      const minMs = parseFloat(filters.minDuration);
      filtered = filtered.filter(trace => {
        const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
        return duration >= minMs;
      });
    }

    if (filters.maxDuration) {
      const maxMs = parseFloat(filters.maxDuration);
      filtered = filtered.filter(trace => {
        const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
        return duration <= maxMs;
      });
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(trace => {
        const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
        if (filters.status === 'error') {
          return duration > 15000; // Assume very slow traces might have errors
        } else if (filters.status === 'success') {
          return duration <= 5000;
        } else if (filters.status === 'slow') {
          return duration > 5000 && duration <= 15000;
        }
        return true;
      });
    }

    // Session filter
    if (filters.sessionId) {
      filtered = filtered.filter(trace => trace.session_id === filters.sessionId);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      
      switch (filters.dateRange) {
        case '15m':
          cutoff = new Date(now.getTime() - 15 * 60 * 1000);
          break;
        case '1h':
          cutoff = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          cutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      
      filtered = filtered.filter(trace => new Date(trace.start_time) >= cutoff);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'timestamp':
          comparison = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          break;
        case 'duration':
          const aDuration = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
          const bDuration = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
          comparison = aDuration - bDuration;
          break;
        case 'spans':
          comparison = a.span_count - b.span_count;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [traces, filters]);

  // Update parent component
  React.useEffect(() => {
    onFilteredTracesChange(filteredTraces);
  }, [filteredTraces, onFilteredTracesChange]);

  const updateFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const applyDurationPreset = useCallback((preset: typeof DURATION_PRESETS[0]) => {
    setFilters(prev => ({
      ...prev,
      minDuration: preset.min.toString(),
      maxDuration: preset.max === Infinity ? '' : preset.max.toString(),
    }));
    setActivePreset(preset.label);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      minDuration: '',
      maxDuration: '',
      status: 'all',
      sessionId: '',
      dateRange: 'all',
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
    setActivePreset(null);
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 'all' && value !== 'timestamp' && value !== 'desc'
  );

  // Quick stats
  const stats = useMemo(() => {
    if (!filteredTraces.length) return null;

    const durations = filteredTraces.map(t => 
      new Date(t.end_time).getTime() - new Date(t.start_time).getTime()
    );
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowTraces = durations.filter(d => d > 5000).length;
    const totalSpans = filteredTraces.reduce((sum, trace) => sum + trace.span_count, 0);

    return {
      avgDuration,
      slowTraces,
      totalSpans,
    };
  }, [filteredTraces]);

  return (
    <div className="bg-white border rounded-xl shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center gap-3 mb-3">
          <Search className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Advanced Search & Filters</h3>
        </div>
        
        {/* Main Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by trace name, ID, or session..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition-colors ${
              hasActiveFilters || showAdvanced
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(v => v !== '' && v !== 'all' && v !== 'timestamp' && v !== 'desc').length}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 border-b bg-gray-50">
          {/* Duration Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration Filters</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyDurationPreset(preset)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    activePreset === preset.label
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Custom Duration Range */}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Min (ms)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.minDuration}
                  onChange={(e) => updateFilter('minDuration', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Max (ms)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.maxDuration}
                  onChange={(e) => updateFilter('maxDuration', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="slow">Slow</option>
                <option value="error">Error/Timeout</option>
              </select>
            </div>

            {/* Session Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.sessionId}
                onChange={(e) => updateFilter('sessionId', e.target.value)}
              >
                <option value="">All Sessions</option>
                {sessionIds.map(id => (
                  <option key={id} value={id}>
                    {id.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
              >
                {DATE_PRESETS.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex gap-1">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                >
                  <option value="timestamp">Time</option>
                  <option value="duration">Duration</option>
                  <option value="spans">Spans</option>
                </select>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  {filters.sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="font-medium">
              {filteredTraces.length} of {traces.length} traces
            </span>
            {stats && (
              <>
                <span className="text-gray-300">•</span>
                <span>{stats.avgDuration.toFixed(0)}ms avg</span>
                <span className="text-gray-300">•</span>
                <span>{stats.totalSpans.toLocaleString()} spans</span>
                {stats.slowTraces > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-amber-600">{stats.slowTraces} slow</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-semibold text-blue-900">{stats.avgDuration.toFixed(0)}ms</div>
                <div className="text-xs text-blue-600">Average Duration</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-semibold text-green-900">
                  {filteredTraces.length - stats.slowTraces}
                </div>
                <div className="text-xs text-green-600">Fast Traces</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <div>
                <div className="font-semibold text-amber-900">{stats.totalSpans.toLocaleString()}</div>
                <div className="text-xs text-amber-600">Total Spans</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
