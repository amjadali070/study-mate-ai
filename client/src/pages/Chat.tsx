import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChatHistory, Document } from '../types';
import { chatAPI, documentAPI, handleApiError } from '../services/api';
import { formatDate, truncateText } from '../utils/auth';
import ChatWindow from '../components/ChatWindow';
import LoadingSpinner from '../components/LoadingSpinner';

const Chat: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(true);

  // Load documents on component mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await documentAPI.getAll();
        setDocuments(response.data.data);
      } catch (error) {
        console.error('Error loading documents:', handleApiError(error));
      } finally {
        setLoadingDocuments(false);
      }
    };

    loadDocuments();
  }, []);

  // Load chat history when sidebar is opened
  const loadChatHistory = async () => {
    if (chatHistory.length > 0) return; // Already loaded
    
    try {
      setLoadingHistory(true);
      const response = await chatAPI.getHistory(20); // Load last 20 chats
      setChatHistory(response.data.data);
    } catch (error) {
      console.error('Error loading chat history:', handleApiError(error));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      loadChatHistory();
    }
  };

  const clearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      return;
    }

    try {
      await chatAPI.clearHistory();
      setChatHistory([]);
    } catch (error) {
      console.error('Error clearing chat history:', handleApiError(error));
    }
  };

  // Show message if no documents are uploaded
  if (!loadingDocuments && documents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-8xl text-gray-300 mb-6">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Documents Available
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            You need to upload some documents first before you can start chatting. 
            Upload PDF, DOCX, or TXT files to build your knowledge base.
          </p>
          <Link to="/dashboard" className="btn-primary">
            Upload Documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex">
      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 mr-4">
        <ChatWindow className="h-full" />
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        {/* Documents Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
            📚 Knowledge Base
            {loadingDocuments && <LoadingSpinner size="sm" text="" className="ml-2 p-0" />}
          </h3>
          
          {loadingDocuments ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-4 rounded"></div>
              ))}
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                {documents.length} documents with {documents.reduce((sum, doc) => sum + doc.chunksCount, 0)} knowledge chunks
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {documents.map((doc) => (
                  <div key={doc.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                    <div className="font-medium text-gray-900 truncate" title={doc.name}>
                      {truncateText(doc.name, 30)}
                    </div>
                    <div className="text-gray-500">
                      {doc.chunksCount} chunks
                    </div>
                  </div>
                ))}
              </div>
              <Link 
                to="/dashboard" 
                className="text-sm text-primary-600 hover:text-primary-700 block mt-2"
              >
                Manage Documents →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents uploaded yet</p>
          )}
        </div>

        {/* Chat History Toggle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <button
            onClick={handleShowHistory}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="font-semibold text-gray-900">💬 Chat History</h3>
            <svg 
              className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              {loadingHistory ? (
                <LoadingSpinner size="sm" text="Loading history..." />
              ) : chatHistory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {chatHistory.map((chat) => (
                    <div key={chat.id} className="bg-gray-50 rounded p-2 text-xs">
                      <div className="font-medium text-gray-900 mb-1 truncate" title={chat.query}>
                        {truncateText(chat.query, 50)}
                      </div>
                      <div className="text-gray-600 mb-1">
                        {truncateText(chat.answer, 80)}
                      </div>
                      <div className="text-gray-400">
                        {formatDate(chat.createdAt)}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={clearChatHistory}
                    className="text-sm text-red-600 hover:text-red-800 mt-2"
                  >
                    Clear History
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No chat history yet</p>
              )}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Chat Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Ask specific questions about your documents</li>
            <li>• Request summaries of topics or chapters</li>
            <li>• Ask for explanations of complex concepts</li>
            <li>• Use "Compare" or "What's the difference between..."</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Chat;
