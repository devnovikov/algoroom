import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../../pages/Home';
import { mockSessions } from '../../api/mocks/data';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessions.clear();
  });

  const renderHome = () => {
    return render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );
  };

  describe('rendering', () => {
    it('should render the app title', () => {
      renderHome();

      expect(screen.getByText('AlgoRoom')).toBeInTheDocument();
    });

    it('should render language selection label', () => {
      renderHome();

      expect(screen.getByText(/select language/i)).toBeInTheDocument();
    });

    it('should render create session button', () => {
      renderHome();

      expect(
        screen.getByRole('button', { name: /create new session/i })
      ).toBeInTheDocument();
    });

    it('should render JavaScript option', () => {
      renderHome();

      expect(screen.getByRole('button', { name: /javascript/i })).toBeInTheDocument();
    });

    it('should render Python option', () => {
      renderHome();

      expect(screen.getByRole('button', { name: /python/i })).toBeInTheDocument();
    });
  });

  describe('language selection', () => {
    it('should allow selecting Python', async () => {
      renderHome();

      const pythonButton = screen.getByRole('button', { name: /python/i });
      await userEvent.click(pythonButton);

      // Python button should now have selected styling (border-cyan-500)
      expect(pythonButton.className).toContain('border-cyan');
    });
  });

  describe('session creation', () => {
    it('should create session and navigate on button click', async () => {
      renderHome();

      await userEvent.click(screen.getByRole('button', { name: /create new session/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringMatching(/^\/session\//)
        );
      });
    });

    it('should create session with selected language', async () => {
      renderHome();

      // Select Python
      const pythonButton = screen.getByRole('button', { name: /python/i });
      await userEvent.click(pythonButton);

      // Create session
      await userEvent.click(screen.getByRole('button', { name: /create new session/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Verify the session was created with Python
      const sessionId = mockNavigate.mock.calls[0][0].replace('/session/', '');
      const session = mockSessions.get(sessionId);
      expect(session?.language).toBe('python');
    });
  });
});
