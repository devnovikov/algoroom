import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { sessionsApi } from '../api';
import type { Session, ExecutionResult, SessionUpdate } from '../api';
import type { WebSocketState } from '../api/client';
import { codeExecutor } from '../services';

interface UseSessionOptions {
  sessionId?: string;
  onSyncError?: (error: Error) => void;
  onConnectionChange?: (state: WebSocketState) => void;
}

interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  executionResult: ExecutionResult | null;
  isExecuting: boolean;
  isSyncing: boolean;
  connectionState: WebSocketState;
  createSession: (language?: 'javascript' | 'python') => Promise<Session>;
  updateCode: (code: string) => void;
  changeLanguage: (language: 'javascript' | 'python') => void;
  executeCode: () => Promise<void>;
}

// Debounce delay for code sync (500ms)
const CODE_SYNC_DELAY = 500;

// Default code snippets for each language
const DEFAULT_CODE: Record<'javascript' | 'python', string> = {
  javascript: `// Welcome to the coding interview!
// Write your JavaScript code here

function solution(input) {
  // Your code here
  return input;
}

console.log(solution("Hello, World!"));
`,
  python: `# Welcome to the coding interview!
# Write your Python code here

def solution(input):
    # Your code here
    return input

print(solution("Hello, World!"))
`,
};

export function useSession({
  sessionId,
  onSyncError,
  onConnectionChange,
}: UseSessionOptions = {}): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected');

  // Refs for tracking pending syncs and last known code
  const pendingCodeRef = useRef<string | null>(null);
  const lastSyncedCodeRef = useRef<string | null>(null);

  // Cache code separately for each language to enable isolation
  const codeByLanguageRef = useRef<Record<'javascript' | 'python', string>>({
    javascript: DEFAULT_CODE.javascript,
    python: DEFAULT_CODE.python,
  });

  // Load session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.id) return;

    const unsubscribe = sessionsApi.subscribeToSession(
      session.id,
      handleSessionUpdate,
      handleConnectionChange
    );
    return () => unsubscribe();
  }, [session?.id]);

  const loadSession = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedSession = await sessionsApi.get(id);
      setSession(loadedSession);
      lastSyncedCodeRef.current = loadedSession.code;
      // Initialize the cache with the loaded session's code for its language
      codeByLanguageRef.current[loadedSession.language] = loadedSession.code;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectionChange = useCallback(
    (state: WebSocketState) => {
      setConnectionState(state);
      onConnectionChange?.(state);
    },
    [onConnectionChange]
  );

  const handleSessionUpdate = useCallback((update: SessionUpdate) => {
    switch (update.type) {
      case 'code_update':
        setSession((prev) => {
          if (!prev) return prev;
          // Only update if the incoming code is different from what we just synced
          // This prevents overwriting our own pending changes
          if (
            update.code !== undefined &&
            update.code !== pendingCodeRef.current &&
            update.code !== lastSyncedCodeRef.current
          ) {
            // Determine which language this update is for
            const updateLang = update.language ?? prev.language;

            // Always update the cache for the appropriate language
            codeByLanguageRef.current[updateLang] = update.code;

            // Only update the visible code if the update is for the CURRENT language
            // This prevents switching languages unexpectedly when another participant
            // is working in a different language
            if (updateLang === prev.language) {
              return {
                ...prev,
                code: update.code,
              };
            }
            // For updates in a different language, just update the cache (done above)
            // but don't change the current view
          }
          return prev;
        });
        break;
      case 'participant_joined':
      case 'participant_left':
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: update.participants ?? prev.participants,
          };
        });
        break;
      case 'execution_result':
        // Update execution result from another participant
        if (update.executionResult) {
          setExecutionResult(update.executionResult);
        }
        break;
    }
  }, []);

  const createSession = useCallback(
    async (language: 'javascript' | 'python' = 'javascript'): Promise<Session> => {
      setIsLoading(true);
      setError(null);
      try {
        const newSession = await sessionsApi.create({ language });
        setSession(newSession);
        lastSyncedCodeRef.current = newSession.code;
        // Initialize the cache with the new session's code for its language
        codeByLanguageRef.current[newSession.language] = newSession.code;
        return newSession;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounced sync function
  const debouncedSyncCode = useDebouncedCallback(
    async (sessionId: string, code: string, language?: 'javascript' | 'python') => {
      setIsSyncing(true);
      try {
        await sessionsApi.updateCode(sessionId, { code, language });
        lastSyncedCodeRef.current = code;
        pendingCodeRef.current = null;
      } catch (err) {
        console.error('Failed to sync code:', err);
        onSyncError?.(err instanceof Error ? err : new Error('Sync failed'));
        // Don't clear pendingCodeRef - we'll retry on next change
      } finally {
        setIsSyncing(false);
      }
    },
    CODE_SYNC_DELAY
  );

  const updateCode = useCallback(
    (code: string) => {
      if (!session) return;

      // Optimistic update
      setSession((prev) => (prev ? { ...prev, code } : prev));
      pendingCodeRef.current = code;

      // Update the cache for the current language
      codeByLanguageRef.current[session.language] = code;

      // Debounced sync with server
      debouncedSyncCode(session.id, code);
    },
    [session, debouncedSyncCode]
  );

  const changeLanguage = useCallback(
    (language: 'javascript' | 'python') => {
      if (!session) return;

      // Don't do anything if already on this language
      if (session.language === language) return;

      // Save current code to cache before switching
      codeByLanguageRef.current[session.language] = session.code;

      // Restore code from cache for the new language
      const newCode = codeByLanguageRef.current[language];

      // Update session with new language and restored code
      setSession((prev) => (prev ? { ...prev, language, code: newCode } : prev));
      setExecutionResult(null);

      // Sync immediately with the new language's code
      sessionsApi.updateCode(session.id, { code: newCode, language }).catch((err) => {
        console.error('Failed to sync language:', err);
        onSyncError?.(err instanceof Error ? err : new Error('Language sync failed'));
      });
    },
    [session, onSyncError]
  );

  const executeCode = useCallback(async () => {
    if (!session) return;

    setIsExecuting(true);
    setExecutionResult(null);
    try {
      // Execute code locally in the browser using WASM (Python) or Function (JavaScript)
      const result = await codeExecutor.execute(session.code, session.language);
      setExecutionResult(result);

      // Broadcast result to other participants
      sessionsApi.broadcastExecutionResult(session.id, result).catch((err) => {
        console.error('Failed to broadcast execution result:', err);
      });
    } catch (err) {
      const errorResult = {
        success: false,
        output: '',
        error: err instanceof Error ? err.message : 'Execution failed',
        executionTime: 0,
      };
      setExecutionResult(errorResult);

      // Broadcast error result to other participants
      sessionsApi.broadcastExecutionResult(session.id, errorResult).catch((broadcastErr) => {
        console.error('Failed to broadcast execution error:', broadcastErr);
      });
    } finally {
      setIsExecuting(false);
    }
  }, [session]);

  return {
    session,
    isLoading,
    error,
    executionResult,
    isExecuting,
    isSyncing,
    connectionState,
    createSession,
    updateCode,
    changeLanguage,
    executeCode,
  };
}
