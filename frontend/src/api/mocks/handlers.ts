import { v4 as uuidv4 } from 'uuid';
import type {
  Session,
  CreateSessionRequest,
  UpdateCodeRequest,
  ExecutionResult,
  SessionUpdate,
} from '../types';
import { mockSessions, defaultCodeSnippets, mockExecutionResults } from './data';

// Simulated network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockHandlers = {
  createSession: async (request?: CreateSessionRequest): Promise<Session> => {
    await delay(100);

    const language = request?.language || 'javascript';
    const session: Session = {
      id: uuidv4(),
      code: defaultCodeSnippets[language],
      language,
      createdAt: new Date().toISOString(),
      participants: 1,
    };

    mockSessions.set(session.id, session);
    return session;
  },

  getSession: async (sessionId: string): Promise<Session> => {
    await delay(50);

    const session = mockSessions.get(sessionId);
    if (!session) {
      // Create a new session if it doesn't exist (simulating join via link)
      const newSession: Session = {
        id: sessionId,
        code: defaultCodeSnippets.javascript,
        language: 'javascript',
        createdAt: new Date().toISOString(),
        participants: 1,
      };
      mockSessions.set(sessionId, newSession);
      return newSession;
    }

    return { ...session, participants: session.participants + 1 };
  },

  updateCode: async (sessionId: string, request: UpdateCodeRequest): Promise<Session> => {
    await delay(30);

    const session = mockSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession: Session = {
      ...session,
      code: request.code,
      language: request.language || session.language,
    };

    mockSessions.set(sessionId, updatedSession);
    return updatedSession;
  },

  executeCode: async (sessionId: string): Promise<ExecutionResult> => {
    await delay(200);

    const session = mockSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check for syntax errors in mock
    if (session.code.includes('syntax_error')) {
      return {
        success: false,
        output: '',
        error: 'SyntaxError: Unexpected token',
        executionTime: 5,
      };
    }

    return {
      ...mockExecutionResults[session.language],
      executionTime: Math.floor(Math.random() * 100) + 10,
    };
  },

  subscribeToSession: (
    sessionId: string,
    onUpdate: (data: SessionUpdate) => void
  ): (() => void) => {
    // Simulate real-time updates with periodic checks
    const interval = setInterval(() => {
      const session = mockSessions.get(sessionId);
      if (session) {
        // In a real implementation, this would receive WebSocket messages
        // For mock, we just periodically send the current state
      }
    }, 1000);

    // Simulate a participant joining after 2 seconds
    const joinTimeout = setTimeout(() => {
      const session = mockSessions.get(sessionId);
      if (session) {
        onUpdate({
          type: 'participant_joined',
          sessionId,
          participants: session.participants + 1,
          timestamp: new Date().toISOString(),
        });
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(joinTimeout);
    };
  },

  // Helper to broadcast code updates (used by useSession hook)
  broadcastCodeUpdate: (sessionId: string, code: string, language: 'javascript' | 'python'): SessionUpdate => {
    return {
      type: 'code_update',
      sessionId,
      code,
      language,
      timestamp: new Date().toISOString(),
    };
  },
};
