import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  VerifyEmailRequest,
  ResendVerificationRequest
} from '../../../shared/src/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const { access_token, refresh_token: newRefreshToken } = response.data.data;

          setTokens(access_token, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        clearTokens();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Token management functions
export const setTokens = (access: string, refresh: string): void => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = (): void => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

// API methods
export const authApi = {
  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse> => {
    const response = await api.post('/auth/login', data);

    if (response.data.success && response.data.data.tokens) {
      const { access_token, refresh_token } = response.data.data.tokens;
      setTokens(access_token, refresh_token);
    }

    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    try {
      const response = await api.post('/auth/logout');
      clearTokens();
      return response.data;
    } catch (error) {
      clearTokens();
      throw error;
    }
  },

  refreshToken: async (): Promise<ApiResponse> => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (response.data.success) {
      const { access_token, refresh_token: newRefreshToken } = response.data.data;
      setTokens(access_token, newRefreshToken);
    }

    return response.data;
  },

  getMe: async (): Promise<ApiResponse> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<ApiResponse> => {
    const response = await api.post('/auth/verify-email', data);

    if (response.data.success && response.data.data.tokens) {
      const { access_token, refresh_token } = response.data.data.tokens;
      setTokens(access_token, refresh_token);
    }

    return response.data;
  },

  resendVerification: async (data: ResendVerificationRequest): Promise<ApiResponse> => {
    const response = await api.post('/auth/resend-verification', data);
    return response.data;
  },
};

export const messageApi = {
  sendMessage: async (data: any): Promise<ApiResponse> => {
    const response = await api.post('/messages', data);
    return response.data;
  },

  getMessages: async (chatId: string, params?: any): Promise<ApiResponse> => {
    const response = await api.get(`/messages/chat/${chatId}`, { params });
    return response.data;
  },

  editMessage: async (messageId: string, content: string): Promise<ApiResponse> => {
    const response = await api.put(`/messages/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  markAsRead: async (chatId: string): Promise<ApiResponse> => {
    const response = await api.post(`/messages/chat/${chatId}/read`);
    return response.data;
  },
};

export default api;
