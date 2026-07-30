import axios from 'axios';
import { attachAuthInterceptors } from './authInterceptor.ts';

// Helper to determine the API base URL
export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  // Fallback for development vs production deployment
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  // Relative path in production if VITE_API_URL is not explicitly set at build time
  return '/api';
};

// Helper to determine the backend server root URL (for uploaded media/files)
export const getServerUrl = (): string => {
  const envServerUrl = import.meta.env.VITE_SERVER_URL;
  if (envServerUrl && envServerUrl.trim() !== '') {
    return envServerUrl.replace(/\/+$/, '');
  }

  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    return envApiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach centralized authentication interceptors
attachAuthInterceptors(api);

export default api;
