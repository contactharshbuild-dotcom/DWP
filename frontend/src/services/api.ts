import axios from 'axios';
import { attachAuthInterceptors } from './authInterceptor.ts';

const DEFAULT_BACKEND_URL = 'https://dwp-075c.onrender.com';

// Helper to determine the API base URL
export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  // Default fallback for both development and production if VITE_API_URL is not provided
  return `${DEFAULT_BACKEND_URL}/api`;
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

  return DEFAULT_BACKEND_URL;
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
