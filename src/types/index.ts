// Authentication Types
export interface User {
  id: number;
  email: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  name?: string;
  password: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  contextPassages?: ContextPassage[];
}

export interface ContextPassage {
  title: string;
  source: string;
  url: string;
  score?: number;
  excerpt?: string;
  matchedTerms?: string[];
}

export interface ChatSession {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: ChatMessage[];
}

export interface SendMessageRequest {
  message: string;
  sessionId: string;
}

export interface CreateChatSessionRequest {
  title?: string;
}

// News Types
export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt: Date;
}

export interface IngestNewsRequest {
  articles: NewsArticle[];
}

export interface IngestRSSRequest {
  rssUrl: string;
  sourceName: string;
}

// System Types
export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  components: {
    gemini: boolean;
    vectorDb: boolean;
    database: boolean;
  };
  timestamp: string;
  error?: string;
}

export interface SystemConfig {
  embeddingModel: string;
  embeddingDimensions: number;
  aiModel: string;
  vectorDatabase: string;
  features: string[];
}
