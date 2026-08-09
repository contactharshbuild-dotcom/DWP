import type { InternalAxiosRequestConfig, AxiosInstance } from 'axios';

// Request interceptor to automatically attach authorization token
export const authInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Response error interceptor to handle token expiration / unauthorized responses
export const authErrorInterceptor = (error: any) => {
  if (error.response && error.response.status === 401) {
    // Clear storage on unauthorized responses
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');

    // Force redirect to login if session expired to prevent infinite 401 request loops
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
};

// Helper function to attach interceptors to any custom axios instance
export const attachAuthInterceptors = (instance: AxiosInstance): AxiosInstance => {
  instance.interceptors.request.use(authInterceptor, (err) => Promise.reject(err));
  instance.interceptors.response.use((res) => res, authErrorInterceptor);
  return instance;
};
