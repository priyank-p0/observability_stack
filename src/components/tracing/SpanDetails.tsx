import React from 'react';
import { TraceSpan } from '../../types/tracing';
import { Clock, Tag, AlertCircle, Info, Database, Cpu, MessageSquare } from 'lucide-react';

interface SpanDetailsProps {
  span: TraceSpan | null;
}

export const SpanDetails: React.FC<SpanDetailsProps> = ({ span }) => {
  if (!span) {
    return (
      <div className="h-full bg-white border rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a span to view details</p>
        </div>
      </div>
    );
  }

  const startTime = new Date(span.start_time);
  const endTime = new Date(span.end_time);
  const duration = endTime.getTime() - startTime.getTime();

  const getSpanIcon = () => {
    if (span.name.includes('openai')) return <Cpu className="w-4 h-4 text-purple-600" />;
    if (span.name.includes('google')) return <Cpu className="w-4 h-4 text-green-600" />;
    if (span.name.includes('anthropic')) return <Cpu className="w-4 h-4 text-orange-600" />;
    if (span.name.includes('storage')) return <Database className="w-4 h-4 text-blue-600" />;
    if (span.name.includes('chat')) return <MessageSquare className="w-4 h-4 text-gray-700" />;
    return <Info className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'text-green-600 bg-green-50';
      case 'ERROR': return 'text-red-600 bg-red-50';
      case 'TIMEOUT': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatAttributeValue = (value: any): string => {
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  const attributeGroups = React.useMemo(() => {
    const groups: Record<string, Record<string, any>> = {
      'Model': {},
      'Chat': {},
      'Session': {},
      'Tool': {},
      'HTTP': {},
      'Other': {}
    };

    Object.entries(span.attributes).forEach(([key, value]) => {
      if (key.startsWith('model.')) groups['Model'][key] = value;
      else if (key.startsWith('chat.') || key.includes('token') || key.includes('temperature')) groups['Chat'][key] = value;
      else if (key.startsWith('session.') || key.startsWith('conversation.')) groups['Session'][key] = value;
      else if (key.startsWith('tool.')) groups['Tool'][key] = value;
      else if (key.startsWith('http.') || key.includes('url') || key.includes('status')) groups['HTTP'][key] = value;
      else groups['Other'][key] = value;
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([, attrs]) => Object.keys(attrs).length > 0)
    );
  }, [span.attributes]);

  return (
    <div className="h-full bg-white border rounded-lg overflow-auto">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 sticky top-0">
        <div className="flex items-start gap-3">
          {getSpanIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{span.name}</h3>
            <p className="text-sm text-gray-600">Span ID: {span.span_id}</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(span.status_code)}`}>
            {span.status_code}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Timing Information */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timing
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Start Time:</span>
              <div className="font-mono text-gray-900">{startTime.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">End Time:</span>
              <div className="font-mono text-gray-900">{endTime.toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <span className="text-gray-600">Duration:</span>
              <div className="font-mono text-gray-900 text-lg">{duration.toFixed(2)}ms</div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {span.status_message && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Status Message
            </h4>
            <div className="bg-gray-50 p-3 rounded-md text-sm font-mono">
              {span.status_message}
            </div>
          </div>
        )}

        {/* Events */}
        {span.events.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Events</h4>
            <div className="space-y-2">
              {span.events.map((event, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{event.name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {Object.keys(event.attributes).length > 0 && (
                    <div className="text-sm">
                      {Object.entries(event.attributes).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="text-gray-600 w-24 flex-shrink-0">{key}:</span>
                          <span className="font-mono text-gray-900">{formatAttributeValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attributes */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Attributes
          </h4>
          <div className="space-y-4">
            {Object.entries(attributeGroups).map(([groupName, attributes]) => (
              <div key={groupName}>
                <h5 className="text-sm font-medium text-gray-700 mb-2">{groupName}</h5>
                <div className="bg-gray-50 rounded-md p-3 space-y-1">
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="flex text-sm">
                      <span className="text-gray-600 w-32 flex-shrink-0 truncate" title={key}>
                        {key}:
                      </span>
                      <span className="font-mono text-gray-900 flex-1 break-all">
                        {formatAttributeValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trace Context */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Trace Context</h4>
          <div className="bg-gray-50 rounded-md p-3 space-y-1 text-sm">
            <div className="flex">
              <span className="text-gray-600 w-24 flex-shrink-0">Trace ID:</span>
              <span className="font-mono text-gray-900">{span.trace_id}</span>
            </div>
            <div className="flex">
              <span className="text-gray-600 w-24 flex-shrink-0">Span ID:</span>
              <span className="font-mono text-gray-900">{span.span_id}</span>
            </div>
            {span.parent_span_id && (
              <div className="flex">
                <span className="text-gray-600 w-24 flex-shrink-0">Parent ID:</span>
                <span className="font-mono text-gray-900">{span.parent_span_id}</span>
              </div>
            )}
            <div className="flex">
              <span className="text-gray-600 w-24 flex-shrink-0">Kind:</span>
              <span className="font-mono text-gray-900">{span.kind}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
