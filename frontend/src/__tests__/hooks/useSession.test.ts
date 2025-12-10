import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from '../../hooks/useSession';
import { mockSessions } from '../../api/mocks/data';

describe('useSession', () => {
  beforeEach(() => {
    mockSessions.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state when no sessionId provided', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.executionResult).toBeNull();
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.session).toBeDefined();
      expect(result.current.session?.language).toBe('javascript');
    });

    it('should create session with specified language', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.createSession('python');
      });

      expect(result.current.session?.language).toBe('python');
    });
  });

  describe('loading existing session', () => {
    it('should load session when sessionId is provided', async () => {
      const { result } = renderHook(() => useSession({ sessionId: 'test-id' }));

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
        expect(result.current.session?.id).toBe('test-id');
      });
    });

    it('should create new session for non-existent ID (join via link)', async () => {
      const { result } = renderHook(() =>
        useSession({ sessionId: 'new-session-id' })
      );

      await waitFor(() => {
        expect(result.current.session).toBeDefined();
        expect(result.current.session?.id).toBe('new-session-id');
      });
    });
  });

  describe('updateCode', () => {
    it('should update code optimistically', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.createSession();
      });

      const newCode = 'console.log("test");';
      act(() => {
        result.current.updateCode(newCode);
      });

      expect(result.current.session?.code).toBe(newCode);
    });

    it('should not update if no session exists', () => {
      const { result } = renderHook(() => useSession());

      act(() => {
        result.current.updateCode('test code');
      });

      expect(result.current.session).toBeNull();
    });
  });

  describe('changeLanguage', () => {
    it('should change language', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.createSession('javascript');
      });

      act(() => {
        result.current.changeLanguage('python');
      });

      expect(result.current.session?.language).toBe('python');
    });
  });

  describe('executeCode', () => {
    it('should execute code and return result', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.executeCode();
      });

      expect(result.current.executionResult).toBeDefined();
      expect(result.current.executionResult?.success).toBe(true);
    });
  });
});
