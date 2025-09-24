import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Document,
  UploadResponse,
  ChatRequest,
  ChatResponse,
  ChatHistory,
  Quiz,
  QuizScore,
} from '../types';

// Create axios instance
const api = axios.create({
  // Use env var if provided; fallback to Vite dev proxy path
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth/login', data);
  },
  
  register: (data: RegisterRequest): Promise<AxiosResponse<ApiResponse<AuthResponse>>> => {
    return api.post('/auth/register', data);
  },
  
  logout: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return api.post('/auth/logout');
  },
};

// Document API
export const documentAPI = {
  upload: (file: File): Promise<AxiosResponse<ApiResponse<UploadResponse>>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAll: (): Promise<AxiosResponse<ApiResponse<Document[]>>> => {
    return api.get('/upload/documents');
  },
  
  delete: (documentId: string): Promise<AxiosResponse<ApiResponse<any>>> => {
    return api.delete(`/upload/documents/${documentId}`);
  },
};

// Chat API
export const chatAPI = {
  sendMessage: (data: ChatRequest): Promise<AxiosResponse<ApiResponse<ChatResponse>>> => {
    return api.post('/chat', data);
  },
  
  getHistory: (limit?: number): Promise<AxiosResponse<ApiResponse<ChatHistory[]>>> => {
    return api.get('/chat/history', {
      params: { limit }
    });
  },
  
  clearHistory: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return api.delete('/chat/history');
  },
  
  getStats: (): Promise<AxiosResponse<ApiResponse<any>>> => {
    return api.get('/chat/stats');
  },
};

// Quiz API
export const quizAPI = {
  generate: (documentId: string, numQuestions: number): Promise<AxiosResponse<ApiResponse<Quiz>>> => {
    return api.post('/quiz', { documentId, numQuestions });
  },
  
  getDocuments: (): Promise<AxiosResponse<ApiResponse<Document[]>>> => {
    return api.get('/quiz/documents');
  },
  
  validate: (answers: number[], questions: any[]): Promise<AxiosResponse<ApiResponse<QuizScore>>> => {
    return api.post('/quiz/validate', { answers, questions });
  },
};

// Generic API error handler
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
};

export default api;
