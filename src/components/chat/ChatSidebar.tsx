import React from 'react';
import { ChatSession } from '../../types';
import { 
  PlusIcon, 
  ChatBubbleLeftIcon, 
  TrashIcon, 
  XMarkIcon,
  Bars3Icon 
} from '@heroicons/react/24/outline';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClearSession: (sessionId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onClearSession,
  isOpen,
  onToggle,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const sessionDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - sessionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return sessionDate.toLocaleDateString();
  };

  const getSessionTitle = (session: ChatSession) => {
    if (session.title) {
      const base = session.title.endsWith('...') ? session.title.slice(0, -3) : session.title;
      if (base.length > 8) return base.slice(0,8) + '...';
      return base;
    }
    return `Chat from ${formatDate(session.createdAt)}`;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:relative lg:translate-x-0 z-30 lg:z-0
        w-80 h-full bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chat Sessions</h2>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <button
            onClick={onNewSession}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No chat sessions yet</p>
              <p className="text-xs text-gray-400 mt-1">Start a new conversation</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative rounded-lg p-3 cursor-pointer transition-colors duration-200
                    ${currentSession?.id === session.id 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  onClick={() => onSessionSelect(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        text-sm font-medium truncate
                        ${currentSession?.id === session.id 
                          ? 'text-primary-700' 
                          : 'text-gray-900'
                        }
                      `} title={session.title || ''}>
                        {getSessionTitle(session)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(session.updatedAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearSession(session.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
                        title="Clear messages"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete session"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            <p>Powered by AI & Vector Search</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
