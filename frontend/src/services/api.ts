import axios from 'axios';
import { attachAuthInterceptors } from './authInterceptor.ts';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach centralized authentication interceptors
attachAuthInterceptors(api);

export default api;
