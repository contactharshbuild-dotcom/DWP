import axios from 'axios';
import { attachAuthInterceptors } from './authInterceptor.ts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach centralized authentication interceptors
attachAuthInterceptors(api);

export default api;
