import { io, Socket } from 'socket.io-client';
import config from '../config';

let socket: Socket | null = null;

export interface PipelineEvent {
  sessionId?: string;
  query?: string;
  hits?: number;
  rawHits?: number;
  passages?: number;
  warning?: string;
  error?: string;
  ts: number;
}

export type PipelineEventType =
  | 'embedding_start'
  | 'embedding_done'
  | 'search_start'
  | 'search_results'
  | 'ai_start'
  | 'ai_token'
  | 'ai_done';

export function connectSocket(authToken?: string) {
  if (socket && socket.connected) return socket;
  socket = io(config.SOCKET_URL, {
    path: config.SOCKET_PATH,
    transports: ['websocket'],
    auth: authToken ? { token: authToken } : undefined,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
