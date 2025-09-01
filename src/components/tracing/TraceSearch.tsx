import React, { useState, useMemo } from 'react';
import { TraceSummary } from '../../types/tracing';
import { Search, Filter, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface TraceSearchProps {
  traces: TraceSummary[];
  onFilteredTracesChange: (traces: TraceSummary[]) => void;
}

interface Filters {
  searchTerm: string;
  minDuration: string;
  maxDuration: string;
  status: 'all' | 'success' | 'error';
  sessionId: string;
  dateRange: string;
}

export const TraceSearch: React.FC<TraceSearchProps> = ({ traces, onFilteredTracesChange }) => {
  const [filters, setFilters] = useState<Filters>({
    searchTerm: '',
    minDuration: '',
    maxDuration: '',
    status: 'all',
    sessionId: '',
    dateRange: 'all',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Get unique session IDs for filter dropdown
  const sessionIds = useMemo(() => {
    const ids = new Set<string>();
    traces.forEach(trace => {
      if (trace.session_id) ids.add(trace.session_id);
    });
    return Array.from(ids).sort();
  }, [traces]);

  // Apply filters
  const filteredTraces = useMemo(() => {
    let filtered = traces;

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

    // Status filter (simplified - would need span data for accurate status)
    if (filters.status !== 'all') {
      // For now, assume traces with very high duration might have errors
      if (filters.status === 'error') {
        filtered = filtered.filter(trace => {
          const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
          return duration > 10000; // > 10s might indicate error
        });
      } else if (filters.status === 'success') {
        filtered = filtered.filter(trace => {
          const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
          return duration <= 10000;
        });
      }
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
        case '1h':
          cutoff = new Date(now.getTime() - 60 * 60 * 1000);
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

    return filtered;
  }, [traces, filters]);

  // Update parent component when filtered traces change
  React.useEffect(() => {
    onFilteredTracesChange(filteredTraces);
  }, [filteredTraces, onFilteredTracesChange]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      minDuration: '',
      maxDuration: '',
      status: 'all',
      sessionId: '',
      dateRange: 'all',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'all');

  return (
    <div className="bg-white border rounded-lg">
      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search traces by name, ID, or session..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50 ${
              hasActiveFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {Object.values(filters).filter(v => v !== '' && v !== 'all').length}
              </span>
            )}
          </button>
        </div>

        {/* Results Summary */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredTraces.length} of {traces.length} traces
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Duration Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration Range (ms)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  value={filters.minDuration}
                  onChange={(e) => updateFilter('minDuration', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                  value={filters.maxDuration}
                  onChange={(e) => updateFilter('maxDuration', e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* Session */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session
              </label>
              <select
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                value={filters.dateRange}
                onChange={(e) => updateFilter('dateRange', e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {filteredTraces.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium">
                  {(filteredTraces.reduce((sum, trace) => {
                    return sum + (new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime());
                  }, 0) / filteredTraces.length).toFixed(0)}ms
                </div>
                <div className="text-gray-500">Avg Duration</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-medium">
                  {filteredTraces.filter(trace => {
                    const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
                    return duration <= 10000;
                  }).length}
                </div>
                <div className="text-gray-500">Successful</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <div className="font-medium">
                  {filteredTraces.filter(trace => {
                    const duration = new Date(trace.end_time).getTime() - new Date(trace.start_time).getTime();
                    return duration > 10000;
                  }).length}
                </div>
                <div className="text-gray-500">Slow/Error</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
