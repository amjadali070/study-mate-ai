import { Request } from 'express';

// Auth types
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

// Document types
export interface DocumentUpload {
  name: string;
  buffer: Buffer;
  mimetype: string;
}

export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  documentId: string;
}

// Chat types
export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  answer: string;
  references: string[];
  chatId: string;
}

export interface ChatContext {
  text: string;
  similarity?: number;
}

// Quiz types
export interface QuizRequest {
  documentId: string;
  numQuestions: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface QuizResponse {
  questions: QuizQuestion[];
  documentName: string;
}

// Vector search types
export interface VectorSearchResult {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

// OpenAI types
export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

// Error types
export interface ApiError extends Error {
  status: number;
  message: string;
}
