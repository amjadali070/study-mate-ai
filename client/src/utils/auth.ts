import { User } from '../types';

// Auth utility functions
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('Error accessing localStorage for token:', error);
    return null;
  }
};

export const getStoredUser = (): User | null => {
  try {
    const userString = localStorage.getItem('user');
    if (!userString) return null;
    return JSON.parse(userString) as User;
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    return null;
  }
};

export const setAuthData = (token: string, user: User): void => {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing auth data:', error);
  }
};

export const clearAuthData = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    // Parse JWT token (simple implementation)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true; // Assume expired if we can't parse
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
