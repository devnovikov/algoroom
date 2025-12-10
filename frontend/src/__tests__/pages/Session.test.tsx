import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Session } from '../../pages/Session';
import { ToastProvider } from '../../components/ui/Toast';
import { mockSessions } from '../../api/mocks/data';

// Mock CodeMirror to avoid complexity in tests
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (val: string) => void }) => (
    <textarea
      data-testid="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('Session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  const renderSession = (sessionId = 'test-session-id') => {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/session/${sessionId}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
            <Route path="/" element={<div>Home</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );
  };

  describe('loading state', () => {
    it('should show loading state initially', () => {
      renderSession();

      expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    });

    it('should load session and display editor', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.queryByText(/loading session/i)).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    });
  });

  describe('session controls', () => {
    it('should display language selector', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select language/i })).toBeInTheDocument();
      });
    });

    it('should display run button', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
      });
    });

    it('should display share link button', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument();
      });
    });
  });

  describe('code editing', () => {
    it('should allow editing code', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      });

      const editor = screen.getByTestId('code-editor');
      await userEvent.clear(editor);
      await userEvent.type(editor, 'console.log("test");');

      expect(editor).toHaveValue('console.log("test");');
    });
  });

  describe('language change', () => {
    it('should allow changing language', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select language/i })).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox', { name: /select language/i });
      await userEvent.selectOptions(select, 'python');

      expect(select).toHaveValue('python');
    });
  });

  describe('code execution', () => {
    it('should execute code when run button is clicked', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /run/i }));

      // Should show result after execution
      await waitFor(() => {
        expect(screen.queryByText(/execution time/i)).toBeInTheDocument();
      });
    });
  });

  describe('output panel', () => {
    it('should display output panel', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByText('Output')).toBeInTheDocument();
      });
    });

    it('should show initial instruction in output panel', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByText(/click "run" to execute/i)).toBeInTheDocument();
      });
    });
  });

  describe('participant count', () => {
    it('should display participant count', async () => {
      renderSession();

      await waitFor(() => {
        expect(screen.getByText(/participant/i)).toBeInTheDocument();
      });
    });
  });
});
