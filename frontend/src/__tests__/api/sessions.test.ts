import { describe, it, expect, beforeEach } from 'vitest';
import { sessionsApi } from '../../api/sessions';
import { mockSessions } from '../../api/mocks/data';

describe('sessionsApi', () => {
  beforeEach(() => {
    // Clear mock sessions before each test
    mockSessions.clear();
  });

  describe('create', () => {
    it('should create a new session with default language', async () => {
      const session = await sessionsApi.create();

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.language).toBe('javascript');
      expect(session.code).toContain('JavaScript');
      expect(session.participants).toBe(1);
      expect(session.createdAt).toBeDefined();
    });

    it('should create a session with specified language', async () => {
      const session = await sessionsApi.create({ language: 'python' });

      expect(session.language).toBe('python');
      expect(session.code).toContain('Python');
    });

    it('should store session in mock storage', async () => {
      const session = await sessionsApi.create();

      expect(mockSessions.has(session.id)).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve an existing session', async () => {
      const created = await sessionsApi.create({ language: 'javascript' });
      const retrieved = await sessionsApi.get(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.language).toBe('javascript');
    });

    it('should create a new session if ID does not exist (join via link)', async () => {
      const session = await sessionsApi.get('non-existent-id');

      expect(session.id).toBe('non-existent-id');
      expect(session.language).toBe('javascript');
    });

    it('should increment participants when getting existing session', async () => {
      const created = await sessionsApi.create();
      const retrieved = await sessionsApi.get(created.id);

      expect(retrieved.participants).toBe(created.participants + 1);
    });
  });

  describe('updateCode', () => {
    it('should update code in a session', async () => {
      const session = await sessionsApi.create();
      const newCode = 'console.log("updated");';

      const updated = await sessionsApi.updateCode(session.id, { code: newCode });

      expect(updated.code).toBe(newCode);
    });

    it('should update language along with code', async () => {
      const session = await sessionsApi.create({ language: 'javascript' });

      const updated = await sessionsApi.updateCode(session.id, {
        code: 'print("hello")',
        language: 'python',
      });

      expect(updated.language).toBe('python');
    });

    it('should throw error for non-existent session', async () => {
      await expect(
        sessionsApi.updateCode('non-existent', { code: 'test' })
      ).rejects.toThrow('Session not found');
    });
  });

  // Note: executeCode tests removed - code execution now happens client-side via codeExecutor service

  describe('subscribeToSession', () => {
    it('should return an unsubscribe function', async () => {
      const session = await sessionsApi.create();
      const onUpdate = () => {};

      const unsubscribe = sessionsApi.subscribeToSession(session.id, onUpdate);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Clean up
    });

    it('should call onUpdate when participant joins', async () => {
      const session = await sessionsApi.create();
      let updateReceived = false;

      const unsubscribe = sessionsApi.subscribeToSession(session.id, (update) => {
        if (update.type === 'participant_joined') {
          updateReceived = true;
        }
      });

      // Wait for the mock participant join (2 seconds in mock)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(updateReceived).toBe(true);
      unsubscribe();
    });
  });
});
