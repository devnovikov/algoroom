import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionControls } from '../../components/SessionControls';

describe('SessionControls', () => {
  const defaultProps = {
    sessionId: 'test-session-123',
    language: 'javascript' as const,
    onLanguageChange: vi.fn(),
    onExecute: vi.fn(),
    isExecuting: false,
    participants: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render language selector', () => {
      render(<SessionControls {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /select language/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('javascript');
    });

    it('should render run button', () => {
      render(<SessionControls {...defaultProps} />);

      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    });

    it('should render share link button', () => {
      render(<SessionControls {...defaultProps} />);

      expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument();
    });

    it('should display participant count', () => {
      render(<SessionControls {...defaultProps} participants={3} />);

      expect(screen.getByText('3 participants')).toBeInTheDocument();
    });

    it('should display singular participant text for 1 participant', () => {
      render(<SessionControls {...defaultProps} participants={1} />);

      expect(screen.getByText('1 participant')).toBeInTheDocument();
    });
  });

  describe('language selection', () => {
    it('should call onLanguageChange when language is changed', async () => {
      render(<SessionControls {...defaultProps} />);

      const select = screen.getByRole('combobox', { name: /select language/i });
      await userEvent.selectOptions(select, 'python');

      expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('python');
    });

    it('should show correct language options', () => {
      render(<SessionControls {...defaultProps} />);

      expect(screen.getByRole('option', { name: 'JavaScript' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Python' })).toBeInTheDocument();
    });
  });

  describe('code execution', () => {
    it('should call onExecute when run button is clicked', async () => {
      render(<SessionControls {...defaultProps} />);

      await userEvent.click(screen.getByRole('button', { name: /run/i }));

      expect(defaultProps.onExecute).toHaveBeenCalled();
    });

    it('should disable run button when executing', () => {
      render(<SessionControls {...defaultProps} isExecuting={true} />);

      const button = screen.getByRole('button', { name: /running/i });
      expect(button).toBeDisabled();
    });

    it('should show running state', () => {
      render(<SessionControls {...defaultProps} isExecuting={true} />);

      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });
  });

  describe('share link', () => {
    it('should copy link to clipboard when share button is clicked', async () => {
      render(<SessionControls {...defaultProps} />);

      await userEvent.click(screen.getByRole('button', { name: /share link/i }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/session/test-session-123')
      );
    });

    it('should show copied state after clicking share', async () => {
      render(<SessionControls {...defaultProps} />);

      await userEvent.click(screen.getByRole('button', { name: /share link/i }));

      await waitFor(() => {
        expect(screen.getByText(/copied/i)).toBeInTheDocument();
      });
    });
  });
});
