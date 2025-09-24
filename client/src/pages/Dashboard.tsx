import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Document, UploadResponse } from '../types';
import { documentAPI, quizAPI, handleApiError } from '../services/api';
import { formatDate } from '../utils/auth';
import FileUploader from '../components/FileUploader';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentAPI.getAll();
      setDocuments(response.data.data);
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadComplete = (uploadResponse: UploadResponse) => {
    setSuccess(`Successfully processed "${uploadResponse.documentName}" with ${uploadResponse.chunksCreated} text chunks`);
    
    // Add new document to the list
    const newDocument: Document = {
      id: uploadResponse.documentId,
      name: uploadResponse.documentName,
      createdAt: uploadResponse.processedAt,
      chunksCount: uploadResponse.chunksCreated
    };
    
    setDocuments(prev => [newDocument, ...prev]);
    
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(documentId);
      await documentAPI.delete(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setSuccess('Document deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerateQuiz = (document: Document) => {
    // For now, we'll navigate to a quiz page or implement quiz generation here
    alert(`Quiz generation for "${document.name}" will be implemented in the quiz section`);
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to StudyMate AI
        </h1>
        <p className="text-lg text-gray-600">
          Upload your documents and start chatting with your knowledge base
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex justify-between items-start">
            <p>{error}</p>
            <button onClick={clearMessages} className="text-red-400 hover:text-red-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <div className="flex justify-between items-start">
            <p>{success}</p>
            <button onClick={clearMessages} className="text-green-400 hover:text-green-600">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📤 Upload Documents
          </h2>
          <FileUploader 
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            💬 Quick Start
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600">
              Ready to start chatting with your documents?
            </p>
            
            <div className="space-y-3">
              <Link 
                to="/chat" 
                className="block w-full btn-primary text-center"
              >
                Start Chatting
              </Link>
              
              <div className="text-sm text-gray-500">
                <p>📊 {documents.length} documents uploaded</p>
                <p>🧠 {documents.reduce((sum, doc) => sum + doc.chunksCount, 0)} knowledge chunks available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            📚 Your Documents
          </h2>
          {documents.length > 0 && (
            <button 
              onClick={fetchDocuments}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Refresh
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner text="Loading your documents..." />
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl text-gray-300 mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No documents uploaded yet
            </h3>
            <p className="text-gray-600 mb-4">
              Upload your first document to start building your knowledge base
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {document.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {document.chunksCount} chunks • Uploaded {formatDate(document.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleGenerateQuiz(document)}
                      className="text-sm btn-outline px-3 py-1"
                      title="Generate Quiz"
                    >
                      🧠 Quiz
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDocument(document.id, document.name)}
                      disabled={deletingId === document.id}
                      className="text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded disabled:opacity-50"
                      title="Delete Document"
                    >
                      {deletingId === document.id ? (
                        <LoadingSpinner size="sm" text="" className="p-0" />
                      ) : (
                        '🗑️'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 How it works
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="font-medium">1. Upload Documents</div>
            <p>Upload PDF, DOCX, or TXT files containing your study material or knowledge base.</p>
          </div>
          <div className="space-y-2">
            <div className="font-medium">2. AI Processing</div>
            <p>Our AI breaks down your documents into chunks and creates searchable embeddings.</p>
          </div>
          <div className="space-y-2">
            <div className="font-medium">3. Chat & Learn</div>
            <p>Ask questions about your documents and get accurate, context-aware answers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
