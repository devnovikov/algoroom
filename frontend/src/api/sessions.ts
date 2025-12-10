import { apiClient, USE_MOCKS, WS_BASE_URL, WebSocketManager, type WebSocketState } from './client';
import { mockHandlers } from './mocks/handlers';
import type {
  Session,
  CreateSessionRequest,
  UpdateCodeRequest,
  ExecutionResult,
  SessionUpdate,
} from './types';

export interface BroadcastExecutionResultRequest {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export const sessionsApi = {
  /**
   * Create a new coding session
   */
  create: async (request?: CreateSessionRequest): Promise<Session> => {
    if (USE_MOCKS) {
      return mockHandlers.createSession(request);
    }
    return apiClient.post<Session>('/sessions', request);
  },

  /**
   * Get an existing session by ID
   */
  get: async (sessionId: string): Promise<Session> => {
    if (USE_MOCKS) {
      return mockHandlers.getSession(sessionId);
    }
    return apiClient.get<Session>(`/sessions/${sessionId}`);
  },

  /**
   * Update code in a session
   */
  updateCode: async (sessionId: string, request: UpdateCodeRequest): Promise<Session> => {
    if (USE_MOCKS) {
      return mockHandlers.updateCode(sessionId, request);
    }
    return apiClient.put<Session>(`/sessions/${sessionId}/code`, request);
  },

  /**
   * Broadcast execution result to all session participants
   */
  broadcastExecutionResult: async (
    sessionId: string,
    result: BroadcastExecutionResultRequest
  ): Promise<void> => {
    if (USE_MOCKS) {
      // For mocks, just return - no need to broadcast
      return;
    }
    await apiClient.post(`/sessions/${sessionId}/execution-result`, result);
  },

  /**
   * Subscribe to real-time session updates
   * Returns an unsubscribe function
   */
  subscribeToSession: (
    sessionId: string,
    onUpdate: (data: SessionUpdate) => void,
    onStateChange?: (state: WebSocketState) => void
  ): (() => void) => {
    if (USE_MOCKS) {
      // For mocks, simulate connected state
      onStateChange?.('connected');
      return mockHandlers.subscribeToSession(sessionId, onUpdate);
    }

    // Use WebSocketManager for production with auto-reconnection
    const wsManager = new WebSocketManager<SessionUpdate>({
      url: `${WS_BASE_URL}/ws/sessions/${sessionId}`,
      onMessage: onUpdate,
      onStateChange,
    });

    wsManager.connect();

    return () => {
      wsManager.disconnect();
    };
  },
};

export type { Session, CreateSessionRequest, UpdateCodeRequest, ExecutionResult, SessionUpdate };
