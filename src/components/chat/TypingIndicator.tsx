import React from 'react';
import { Bot } from 'lucide-react';
import { ReasoningDisplay } from './ReasoningDisplay';
import { useChatStore } from '../../store/chatStore';

export const TypingIndicator: React.FC = () => {
  const { settings } = useChatStore();
  const isReasoningModel = settings.model_name.startsWith('gpt-5');

  return (
    <div className="flex gap-3 p-4 animate-fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      
      {/* Typing indicator */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">Assistant</span>
          <span className="text-xs text-gray-500">
            {isReasoningModel ? 'thinking...' : 'typing...'}
          </span>
        </div>
        
        {/* Show reasoning indicator for GPT-5 models */}
        {isReasoningModel ? (
          <div className="space-y-2">
            <ReasoningDisplay reasoning="" isThinking={true} />
            <div className="text-xs text-blue-600 italic">
              This model is reasoning through your request step by step...
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
