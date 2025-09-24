// User and Auth types
export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Document types
export interface Document {
  id: string;
  name: string;
  createdAt: string;
  chunksCount: number;
}

export interface UploadResponse {
  documentId: string;
  documentName: string;
  chunksCreated: number;
  storageMethod: string;
  fileExtension: string;
  textLength: number;
  processedAt: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  query: string;
  answer: string;
  references: string[];
  createdAt: string;
  isUser?: boolean;
}

export interface ChatRequest {
  query: string;
}

export interface ChatResponse {
  answer: string;
  references: string[];
  chatId: string;
}

export interface ChatHistory {
  id: string;
  query: string;
  answer: string;
  createdAt: string;
}

// Quiz types
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
  documentName: string;
}

export interface QuizResult {
  questionIndex: number;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string | null;
}

export interface QuizScore {
  score: number;
  totalQuestions: number;
  percentage: number;
  results: QuizResult[];
}

// API response wrapper
export interface ApiResponse<T> {
  message: string;
  data: T;
}

// Error types
export interface ApiError {
  message: string;
  error?: string;
}

// App state types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface AppState {
  auth: AuthState;
  documents: Document[];
  currentChat: ChatMessage[];
  chatHistory: ChatHistory[];
  loading: boolean;
  error: string | null;
}
