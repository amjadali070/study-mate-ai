import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../types';
import { authAPI, handleApiError } from '../services/api';
import { getStoredToken, getStoredUser, setAuthData, clearAuthData } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = getStoredToken();
        const storedUser = getStoredUser();
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(data);
      const authData: AuthResponse = response.data.data;
      
      // Store auth data
      setAuthData(authData.token, authData.user);
      
      // Update state
      setToken(authData.token);
      setUser(authData.user);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.register(data);
      const authData: AuthResponse = response.data.data;
      
      // Store auth data
      setAuthData(authData.token, authData.user);
      
      // Update state
      setToken(authData.token);
      setUser(authData.user);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear storage
    clearAuthData();
    
    // Clear state
    setToken(null);
    setUser(null);
    setError(null);
    
    // Optional: call logout endpoint
    authAPI.logout().catch(console.error);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    register,
    logout,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
