import type { Session } from '../types';

export const mockSessions: Map<string, Session> = new Map();

export const defaultCodeSnippets = {
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

export const mockExecutionResults = {
  javascript: {
    success: true,
    output: 'Hello, World!\n',
    executionTime: 12,
  },
  python: {
    success: true,
    output: 'Hello, World!\n',
    executionTime: 45,
  },
};
