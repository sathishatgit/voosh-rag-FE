import React from 'react';
import { ChatMessage } from '../../types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  statusMessages?: string[]; // narrative of pipeline status
  streaming?: boolean; // whether model is currently streaming answer
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, isSending, statusMessages = [], streaming }) => {
  const [showSources, setShowSources] = React.useState(true);
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
  <div className="h-full overflow-y-auto p-4 space-y-4 scrollbar-thin">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <div className="mx-auto h-16 w-16 mb-4 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to chat!</h3>
            <p className="text-gray-500">
              Ask me anything about the latest news. I can help you stay updated with current events from around the world.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-3xl px-4 py-3 rounded-lg
                  ${message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                  }
                `}
              >
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  {/* Context passages for assistant messages */}
                  {message.role === 'assistant' && message.contextPassages && message.contextPassages.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowSources(s => !s)}
                        className="flex items-center text-xs font-medium text-gray-600 hover:text-gray-800"
                      >
                        <span className="mr-1">Sources / Evidence</span>
                        <svg className={`h-3 w-3 transition-transform ${showSources ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6L14 10L6 14V6Z" /></svg>
                      </button>
                      {showSources && (
                        <div className="mt-2 space-y-2">
                          {message.contextPassages.map((passage, idx) => {
                            const score = passage.score ?? 0;
                            const barWidth = Math.min(100, Math.max(5, Math.round(score * 100)));
                            return (
                              <div key={idx} className="bg-gray-50 rounded p-2 border border-gray-100">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-gray-700 block truncate" title={passage.title}>{passage.title}</span>
                                    <div className="mt-1 h-1.5 w-full bg-gray-200 rounded overflow-hidden">
                                      <div style={{ width: `${barWidth}%` }} className="h-full bg-primary-500"></div>
                                    </div>
                                  </div>
                                  {passage.url && (
                                    <a
                                      href={passage.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-primary-600 hover:text-primary-700 shrink-0"
                                    >Open</a>
                                  )}
                                </div>
                                {passage.excerpt && (
                                  <p className="mt-1 text-[11px] leading-snug text-gray-600 line-clamp-4" title={passage.excerpt}>{passage.excerpt}</p>
                                )}
                                {passage.matchedTerms && passage.matchedTerms.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {passage.matchedTerms.map(term => (
                                      <span key={term} className="bg-yellow-100 text-yellow-800 px-1 rounded text-[10px]">{term}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`
                    text-xs ${message.role === 'user' ? 'text-primary-100' : 'text-gray-500'}
                  `}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Inline explanatory status (replaces separate pipeline UI) */}
          {(isSending || statusMessages.length > 0) && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 text-gray-900 max-w-3xl px-4 py-3 rounded-lg w-full">
                <div className="space-y-1">
                  {statusMessages.map((line, idx) => (
                    <div key={idx} className="text-[11px] text-gray-600 flex items-start">
                      <span className="mt-1 mr-1 h-1.5 w-1.5 rounded-full bg-primary-500 flex-shrink-0"></span>
                      <span>{line}</span>
                    </div>
                  ))}
                  {streaming && (
                    <div className="text-[11px] text-primary-600 animate-pulse flex items-center">
                      <span className="mr-1">Streaming answer...</span>
                      <span className="flex space-x-0.5">
                        <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }}></span>
                        <span className="w-1 h-1 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }}></span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessageList;
