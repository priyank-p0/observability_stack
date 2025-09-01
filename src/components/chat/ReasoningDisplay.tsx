import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Brain, Clock, Eye, EyeOff } from 'lucide-react';

interface ReasoningDisplayProps {
  reasoning: string;
  isThinking?: boolean;
  showAfterResponse?: boolean;
}

export const ReasoningDisplay: React.FC<ReasoningDisplayProps> = ({ 
  reasoning, 
  isThinking = false,
  showAfterResponse = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [wasThinking, setWasThinking] = useState(false);

  // Track if this was previously in thinking state
  useEffect(() => {
    if (isThinking) {
      setWasThinking(true);
    }
  }, [isThinking]);

  // Don't show if no reasoning and not thinking
  if (!reasoning && !isThinking && !wasThinking) return null;

  // For completed responses, show collapsed by default
  const hasReasoning = reasoning && reasoning.trim().length > 0;
  const shouldShow = isThinking || hasReasoning || showAfterResponse;

  if (!shouldShow) return null;

  const getButtonText = () => {
    if (isThinking) return 'Thinking...';
    if (hasReasoning) return isExpanded ? 'Hide reasoning' : 'Show reasoning';
    return 'Reasoning unavailable';
  };

  const getButtonIcon = () => {
    if (isThinking) return <Brain className="w-4 h-4 text-blue-600 animate-pulse" />;
    if (hasReasoning) {
      return isExpanded ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-blue-600" />;
    }
    return <Brain className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        disabled={isThinking || !hasReasoning}
        className={`flex items-center gap-2 text-sm transition-colors group ${
          isThinking 
            ? 'text-blue-600 cursor-default' 
            : hasReasoning 
            ? 'text-gray-600 hover:text-blue-700 cursor-pointer' 
            : 'text-gray-400 cursor-not-allowed'
        }`}
      >
        {!isThinking && hasReasoning && (
          isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )
        )}
        
        {getButtonIcon()}
        
        <span className="font-medium">
          {getButtonText()}
        </span>
        
        {isThinking && (
          <div className="flex items-center gap-1 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
          </div>
        )}
        
        {hasReasoning && !isThinking && (
          <span className="text-xs text-gray-500 ml-1">
            ({reasoning.length} chars)
          </span>
        )}
      </button>

      {/* Thinking Process - Always show when thinking, show when expanded if reasoning exists */}
      {(isThinking || (isExpanded && hasReasoning)) && (
        <div className="mt-3 ml-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">
              {isThinking ? 'Live Reasoning Process' : 'Model Reasoning'}
            </span>
          </div>
          
          {isThinking ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Analyzing your request and context...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span>Considering multiple approaches...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span>Formulating comprehensive response...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                <span>Refining and optimizing output...</span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-inner">
              <div className="font-mono text-sm text-gray-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {reasoning}
              </div>
              
              {/* Reasoning Stats */}
              <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-4 text-xs text-blue-600">
                <span>Words: {reasoning.split(/\s+/).length}</span>
                <span>Characters: {reasoning.length}</span>
                <span>Lines: {reasoning.split('\n').length}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
