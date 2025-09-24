import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRequest, ChatResponse } from '../types';
import { chatAPI, handleApiError } from '../services/api';
import { formatDate } from '../utils/auth';
import LoadingSpinner from './LoadingSpinner';

interface ChatWindowProps {
  className?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      query: input.trim(),
      answer: '',
      references: [],
      createdAt: new Date().toISOString(),
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const chatRequest: ChatRequest = { query: input.trim() };
      const response = await chatAPI.sendMessage(chatRequest);
      const chatResponse: ChatResponse = response.data.data;

      const assistantMessage: ChatMessage = {
        id: chatResponse.chatId,
        query: userMessage.query,
        answer: chatResponse.answer,
        references: chatResponse.references,
        createdAt: new Date().toISOString(),
        isUser: false
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        query: userMessage.query,
        answer: `Sorry, I encountered an error: ${errorMessage}`,
        references: [],
        createdAt: new Date().toISOString(),
        isUser: false
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (messages.length > 0 && confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      setError(null);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">💬 AI Assistant</h2>
          <p className="text-sm text-gray-500">Ask questions about your uploaded documents</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl text-gray-300 mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to help you learn!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              I can answer questions based on your uploaded documents. 
              Try asking about specific topics, concepts, or requesting summaries.
            </p>
            <div className="mt-6 grid gap-2 max-w-lg mx-auto text-sm">
              <div className="bg-white border border-gray-200 rounded p-3 text-left">
                <strong>Example:</strong> "What are the main topics covered in the document?"
              </div>
              <div className="bg-white border border-gray-200 rounded p-3 text-left">
                <strong>Example:</strong> "Can you explain the concept of..."
              </div>
              <div className="bg-white border border-gray-200 rounded p-3 text-left">
                <strong>Example:</strong> "Summarize the key points about..."
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl ${message.isUser ? 'bg-primary-600 text-white' : 'bg-white text-gray-900'} rounded-lg px-4 py-3 shadow-sm border border-gray-200`}>
                  {message.isUser ? (
                    <p>{message.query}</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{message.answer}</p>
                      </div>
                      
                      {message.references.length > 0 && (
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                            References
                          </h4>
                          <div className="space-y-1">
                            {message.references.map((reference, index) => (
                              <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                {reference}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`text-xs mt-2 ${message.isUser ? 'text-primary-200' : 'text-gray-500'}`}>
                    {formatDate(message.createdAt)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
                  <LoadingSpinner size="sm" text="Thinking..." />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        {error && (
          <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question about your documents... (Press Enter to send, Shift+Enter for new line)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" text="" className="p-0" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          Answers are based on your uploaded documents. For best results, ensure your documents are clear and well-structured.
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
