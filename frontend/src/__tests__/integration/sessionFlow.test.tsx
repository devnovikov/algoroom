import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Home } from '../../pages/Home';
import { Session } from '../../pages/Session';
import { ToastProvider } from '../../components/ui/Toast';
import { mockSessions } from '../../api/mocks/data';

// Mock CodeMirror
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock codeExecutor to avoid Pyodide loading in Node.js
vi.mock('../../services/codeExecutor', () => ({
  codeExecutor: {
    execute: vi.fn(async (code: string, language: string) => {
      // Simulate syntax error for specific test code
      if (code.includes('syntax_error')) {
        return {
          success: false,
          output: '',
          error: 'SyntaxError: Unexpected identifier',
          executionTime: 5,
        };
      }
      // Normal execution
      return {
        success: true,
        output: language === 'python' ? 'Python output' : 'JavaScript output',
        executionTime: 10,
      };
    }),
    preloadPython: vi.fn(),
    isPythonLoaded: vi.fn(() => false),
  },
}));

// Mock useNavigate for Home page
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Session Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  const renderSession = (sessionId: string) => {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/session/${sessionId}`]}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );
  };

  describe('session page flows', () => {
    it('should join existing session via URL', async () => {
      const sessionId = 'existing-session-123';
      renderSession(sessionId);

      // Should load the session
      await waitFor(() => {
        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      });

      // Session should be created in mock storage
      expect(mockSessions.has(sessionId)).toBe(true);
    });

    it('should execute code and display results', async () => {
      renderSession('test-session');

      await waitFor(() => {
        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      });

      // Execute code
      await userEvent.click(screen.getByRole('button', { name: /run/i }));

      // Wait for execution to complete
      await waitFor(() => {
        expect(screen.getByText(/execution time/i)).toBeInTheDocument();
      });
    });

    it('should change language and execute', async () => {
      renderSession('test-session');

      await waitFor(() => {
        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      });

      // Change to Python
      const languageSelect = screen.getByRole('combobox', { name: /select language/i });
      await userEvent.selectOptions(languageSelect, 'python');

      expect(languageSelect).toHaveValue('python');

      // Execute Python code
      await userEvent.click(screen.getByRole('button', { name: /run/i }));

      await waitFor(() => {
        expect(screen.getByText(/execution time/i)).toBeInTheDocument();
      });
    });

    it('should copy share link', async () => {
      renderSession('test-session');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument();
      });

      // Copy link
      await userEvent.click(screen.getByRole('button', { name: /share link/i }));

      // Verify clipboard was called
      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      // Should show copied state
      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should handle syntax error in code execution', async () => {
      renderSession('test-session');

      await waitFor(() => {
        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      });

      // Type code that will trigger error (update the mock session)
      const editor = screen.getByTestId('code-editor');
      await userEvent.clear(editor);
      await userEvent.type(editor, 'syntax_error code here');

      // Wait for debounce and code sync (500ms)
      await new Promise((r) => setTimeout(r, 600));

      // Execute
      await userEvent.click(screen.getByRole('button', { name: /run/i }));

      // Should show error (case insensitive)
      await waitFor(
        () => {
          expect(screen.getByText(/SyntaxError/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });
});
