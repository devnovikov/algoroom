import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutputPanel } from '../../components/OutputPanel';
import type { ExecutionResult } from '../../api';

describe('OutputPanel', () => {
  describe('initial state', () => {
    it('should show instruction when no result and not executing', () => {
      render(<OutputPanel result={null} isExecuting={false} />);

      expect(screen.getByText(/click "run" to execute/i)).toBeInTheDocument();
    });

    it('should render output header', () => {
      render(<OutputPanel result={null} isExecuting={false} />);

      expect(screen.getByText('Output')).toBeInTheDocument();
    });
  });

  describe('executing state', () => {
    it('should show executing message when isExecuting is true', () => {
      render(<OutputPanel result={null} isExecuting={true} />);

      expect(screen.getByText(/executing code/i)).toBeInTheDocument();
    });

    it('should not show result while executing', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'Hello World',
        executionTime: 10,
      };

      render(<OutputPanel result={result} isExecuting={true} />);

      expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
      expect(screen.getByText(/executing code/i)).toBeInTheDocument();
    });
  });

  describe('successful execution', () => {
    it('should display output for successful execution', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'Hello World\n',
        executionTime: 15,
      };

      render(<OutputPanel result={result} isExecuting={false} />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should display execution time', () => {
      const result: ExecutionResult = {
        success: true,
        output: 'output',
        executionTime: 42,
      };

      render(<OutputPanel result={result} isExecuting={false} />);

      expect(screen.getByText(/execution time: 42ms/i)).toBeInTheDocument();
    });

    it('should show "(no output)" for empty output', () => {
      const result: ExecutionResult = {
        success: true,
        output: '',
        executionTime: 5,
      };

      render(<OutputPanel result={result} isExecuting={false} />);

      expect(screen.getByText('(no output)')).toBeInTheDocument();
    });
  });

  describe('failed execution', () => {
    it('should display error for failed execution', () => {
      const result: ExecutionResult = {
        success: false,
        output: '',
        error: 'SyntaxError: Unexpected token',
        executionTime: 3,
      };

      render(<OutputPanel result={result} isExecuting={false} />);

      expect(screen.getByText(/syntaxerror/i)).toBeInTheDocument();
    });

    it('should still show execution time for failed execution', () => {
      const result: ExecutionResult = {
        success: false,
        output: '',
        error: 'Error',
        executionTime: 8,
      };

      render(<OutputPanel result={result} isExecuting={false} />);

      expect(screen.getByText(/execution time: 8ms/i)).toBeInTheDocument();
    });
  });
});
