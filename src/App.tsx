import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/sidebar/Sidebar';
import { Header } from './components/layout/Header';
import { ChatArea } from './components/chat/ChatArea';
import { useChatStore } from './store/chatStore';
import { useTraceStore } from './store/traceStore';
import { TraceDetail } from './components/tracing/TraceDetail';

function App() {
  const { sidebarOpen } = useChatStore();
  const { showInMain, selectedTraceId } = useTraceStore();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Main Area: Chat or Trace */}
        <div className="flex-1 overflow-hidden">
          {showInMain && selectedTraceId ? (
            <TraceDetail />
          ) : (
            <ChatArea />
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
