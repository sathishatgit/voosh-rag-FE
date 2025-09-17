import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  AuthResponse, 
  LoginRequest, 
  SignupRequest,
  ChatSession,
  ChatMessage,
  SendMessageRequest,
  CreateChatSessionRequest,
  SystemHealth,
  SystemConfig,
  IngestNewsRequest,
  IngestRSSRequest
} from '../types';
import config from '../config';

// Create axios instance with base configuration
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: config.API_BASE_URL,
    timeout: config.API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle auth errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const api = createApiInstance();

// Authentication API
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/users/login', data);
    return response.data;
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/users/signup', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },
};

// Chat API
export const chatAPI = {
  // Session management
  createSession: async (data: CreateChatSessionRequest): Promise<ChatSession> => {
    const response: AxiosResponse<ChatSession> = await api.post('/chat/sessions', data);
    return response.data;
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const response: AxiosResponse<ChatSession[]> = await api.get('/chat/sessions');
    return response.data;
  },

  getSession: async (sessionId: string): Promise<ChatSession> => {
    const response: AxiosResponse<ChatSession> = await api.get(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/chat/sessions/${sessionId}`);
    return response.data;
  },

  clearSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await api.post(`/chat/sessions/${sessionId}/clear`);
    return response.data;
  },

  // Messaging
  sendMessage: async (data: SendMessageRequest): Promise<ChatMessage> => {
    const response: AxiosResponse<ChatMessage> = await api.post('/chat/message', data);
    return response.data;
  },

  // News ingestion
  ingestNews: async (data: IngestNewsRequest): Promise<{ success: number; failed: number; errors: string[] }> => {
    const response = await api.post('/chat/news/ingest', data);
    return response.data;
  },

  ingestRSS: async (data: IngestRSSRequest): Promise<{ success: number; failed: number; errors: string[] }> => {
    const response = await api.post('/chat/news/ingest/rss', data);
    return response.data;
  },

  // Preview RSS feed
  previewRSS: async (data: IngestRSSRequest): Promise<{
    articles: Array<{
      title: string;
      link: string;
      description: string;
      pubDate: string;
      source: string;
      selected: boolean;
    }>;
    total: number;
    source: string;
  }> => {
    const response = await api.post('/chat/news/preview/rss', data);
    return response.data;
  },

  // Ingest selected articles
  ingestSelected: async (articles: any[]): Promise<{ success: number; failed: number; errors: string[] }> => {
    const response = await api.post('/chat/news/ingest/selected', { articles });
    return response.data;
  },

  processEmbeddings: async (): Promise<{ processed: number; failed: number }> => {
    const response = await api.post('/chat/news/process-embeddings');
    return response.data;
  },

  getNewsStats: async (): Promise<{
    total: number;
    embedded: number;
    unembedded: number;
    sources: { source: string; count: number }[];
  }> => {
    const response = await api.get('/chat/news/stats');
    return response.data;
  },
};

// Content Management API
export const contentAPI = {
  // File upload endpoints
  uploadFile: async (file: File, metadata?: any): Promise<{
    documentIds: string[];
    chunkCount: number;
    sourceType: string;
    message: string;
    metadata?: any;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await api.post('/ingest/file/auto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // URL/RSS ingestion
  ingestFromUrl: async (url: string, metadata?: any): Promise<{
    documentIds: string[];
    chunkCount: number;
    sourceType: string;
    message: string;
    metadata?: any;
  }> => {
    const response = await api.post('/ingest/url', {
      url,
      metadata: metadata || {}
    });
    return response.data;
  },

  // Preview URL content
  previewUrl: async (url: string): Promise<{
    title: string;
    content: string;
    url: string;
    links: Array<{ title: string; url: string; description: string }>;
  }> => {
    const response = await api.post('/ingest/url/preview', { url });
    return response.data;
  },

  // Text ingestion
  ingestText: async (text: string, metadata?: any): Promise<{
    documentIds: string[];
    chunkCount: number;
    sourceType: string;
    message: string;
    metadata?: any;
  }> => {
    const response = await api.post('/ingest/text', {
      text,
      metadata: metadata || {}
    });
    return response.data;
  },

  // Get ingestion statistics
  getStats: async (): Promise<{
    totalDocuments: number;
    totalChunks: number;
    sources: { source: string; count: number }[];
    recentActivity: any[];
  }> => {
    const response = await api.get('/ingest/stats');
    return response.data;
  },

  // Get articles/documents list
  getDocuments: async (): Promise<{
    total: number;
    embedded: number;
    unembedded: number;
    documents: Array<{
      id: string;
      title: string;
      source: string;
      url?: string;
      publishedAt: string;
      createdAt: string;
      isEmbedded: boolean;
      vectorId?: string;
    }>;
  }> => {
    const response = await api.get('/ingest/documents');
    return response.data;
  },

  // Delete document
  deleteDocument: async (docId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/ingest/documents/${docId}`);
    return response.data;
  },
};

// System API
export const systemAPI = {
  getHealth: async (): Promise<SystemHealth> => {
    const response: AxiosResponse<SystemHealth> = await api.get('/chat/health');
    return response.data;
  },

  getConfig: async (): Promise<SystemConfig> => {
    const response: AxiosResponse<SystemConfig> = await api.get('/chat/config');
    return response.data;
  },
};

export default api;
