export interface Session {
  id: string;
  code: string;
  language: 'javascript' | 'python';
  createdAt: string;
  participants: number;
}

export interface CreateSessionRequest {
  language?: 'javascript' | 'python';
}

export interface UpdateCodeRequest {
  code: string;
  language?: 'javascript' | 'python';
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface SessionUpdate {
  type: 'code_update' | 'participant_joined' | 'participant_left' | 'execution_result';
  sessionId: string;
  code?: string;
  language?: 'javascript' | 'python';
  participants?: number;
  executionResult?: ExecutionResult;
  timestamp: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
