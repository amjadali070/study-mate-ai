import React, { useState, useRef } from 'react';
import { documentAPI, handleApiError } from '../services/api';
import { UploadResponse } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { formatFileSize } from '../utils/auth';

interface FileUploaderProps {
  onUploadComplete: (response: UploadResponse) => void;
  onError: (error: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'application/pdf':
        return '📄';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      case 'text/plain':
        return '📄';
      default:
        return '📎';
    }
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, DOCX, or TXT files only.';
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return 'File size too large. Please upload files smaller than 10MB.';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      const response = await documentAPI.upload(selectedFile);
      onUploadComplete(response.data.data);
      setSelectedFile(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-primary-400 bg-primary-50' 
            : selectedFile 
            ? 'border-green-400 bg-green-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <span className="text-3xl">{getFileIcon(selectedFile.type)}</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            
            <div className="flex space-x-3 justify-center">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="btn-primary disabled:opacity-50 flex items-center"
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size="sm" text="" className="mr-2 p-0" />
                    Processing...
                  </>
                ) : (
                  'Upload & Process'
                )}
              </button>
              
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-6xl text-gray-400">📁</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Drop your file here, or click to select
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF, DOCX, and TXT files (max 10MB)
              </p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Supported file types */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400 text-lg">ℹ️</div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Supported File Types
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• PDF documents (.pdf)</li>
              <li>• Word documents (.docx)</li>
              <li>• Text files (.txt)</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              Files will be processed to extract text and generate embeddings for AI chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
