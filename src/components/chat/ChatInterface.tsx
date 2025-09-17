import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { chatAPI } from '../../services/api';
import { ChatSession, ChatMessage, SendMessageRequest } from '../../types';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { connectSocket, getSocket } from '../../services/socket';

interface PipelineStep {
  type: string;
  ts: number;
  info?: any;
}

const ChatInterface: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]); // still tracked internally (debug)
  const [statusMessages, setStatusMessages] = useState<string[]>([]); // human readable narrative of pipeline
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
    // Connect socket
    const sock = connectSocket(localStorage.getItem('token') || undefined);
    const appendStatus = (line: string) => {
      setStatusMessages(prev => {
        if (prev[prev.length - 1] === line) return prev; // no duplicate consecutive lines
        return [...prev, line];
      });
    };

    const handleEvent = (type: string) => (payload: any) => {
      setPipelineSteps(prev => [...prev, { type, ts: payload.ts || Date.now(), info: payload }]);
      switch (type) {
        case 'embedding_start':
          appendStatus('Analyzing your question (building semantic vector)...');
          break;
        case 'embedding_done':
          appendStatus('Understanding captured. Searching knowledge base for matches...');
          break;
        case 'search_start':
          appendStatus('Scanning indexed content for relevant chunks...');
          break;
        case 'search_results': {
          const cnt = payload?.results?.length || payload?.resultCount || 0;
          appendStatus(`Found ${cnt} candidate passage${cnt === 1 ? '' : 's'}. Refining context...`);
          break; }
        case 'rag_context': {
          const ctxCnt = payload?.passages?.length || 0;
          appendStatus(`Selected top ${ctxCnt} passage${ctxCnt === 1 ? '' : 's'} to ground the answer.`);
          break; }
        case 'ai_start':
          appendStatus('Generating answer grounded in retrieved context...');
          setStreaming(true);
          break;
        case 'ai_done':
          appendStatus('Answer ready.');
          setStreaming(false);
          // clear statuses after short delay to reduce clutter
          setTimeout(() => setStatusMessages([]), 3000);
          break;
      }
    };
    ['embedding_start','embedding_done','search_start','search_results','rag_context','ai_start','ai_done'].forEach(evt => {
      sock.on(evt, handleEvent(evt));
    });
    return () => {
      ['embedding_start','embedding_done','search_start','search_results','rag_context','ai_start','ai_done'].forEach(evt => sock.off(evt));
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const sessionsData = await chatAPI.getSessions();
      setSessions(sessionsData);
      
      // If there are sessions and no current session, select the first one
      if (sessionsData.length > 0 && !currentSession) {
        await loadSession(sessionsData[0].id);
      }
    } catch (error: any) {
      setError('Failed to load chat sessions');
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const sessionData = await chatAPI.getSession(sessionId);
      setCurrentSession(sessionData);
      setMessages(sessionData.messages || []);
    } catch (error: any) {
      setError('Failed to load chat session');
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async (title?: string) => {
    try {
      const newSession = await chatAPI.createSession({ title });
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error: any) {
      setError('Failed to create new session');
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If the deleted session was the current one, clear current session
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        
        // Load the first available session if any
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          await loadSession(remainingSessions[0].id);
        }
      }
    } catch (error: any) {
      setError('Failed to delete session');
      console.error('Error deleting session:', error);
    }
  };

  const clearSession = async (sessionId: string) => {
    try {
      await chatAPI.clearSession(sessionId);
      if (currentSession?.id === sessionId) {
        setMessages([]);
      }
    } catch (error: any) {
      setError('Failed to clear session');
      console.error('Error clearing session:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!currentSession || !content.trim()) return;

    try {
      setIsSending(true);
      setError(null);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send message to API
      const request: SendMessageRequest = {
        message: content.trim(),
        sessionId: currentSession.id,
      };

  // Reset pipeline steps and status messages for new question
  setPipelineSteps([]);
  setStatusMessages([]);
  const response = await chatAPI.sendMessage(request);
      
      // Replace the temporary user message and add assistant response
      setMessages(prev => {
        const updatedMessages = prev.slice(0, -1); // Remove temporary message
        return [...updatedMessages, userMessage, response];
      });

    } catch (error: any) {
      setError('Failed to send message');
      console.error('Error sending message:', error);
      
      // Remove the temporary user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    loadSession(session.id);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ChatSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={handleSessionSelect}
        onNewSession={() => createNewSession()}
        onDeleteSession={deleteSession}
        onClearSession={clearSession}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <ChatHeader
          currentSession={currentSession}
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewSession={() => createNewSession()}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {currentSession ? (
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              isSending={isSending}
              statusMessages={statusMessages}
              streaming={streaming}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">Start a conversation</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create a new chat session to begin talking with our AI assistant about the latest news.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => createNewSession()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Message Input */}
        {currentSession && (
          <MessageInput
            onSendMessage={sendMessage}
            disabled={isSending}
            placeholder="Ask me about the latest news..."
          />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatInterface;
