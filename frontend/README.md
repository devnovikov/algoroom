# AlgoRoom Frontend

Real-time collaborative coding interview platform built with React, TypeScript, and Vite.

## Features

- **Session Management**: Create and share coding sessions via unique links
- **Collaborative Code Editor**: Real-time code editing with syntax highlighting (CodeMirror)
- **Multi-language Support**: JavaScript and Python
- **Code Execution**: Run code and view output (mock implementation, ready for WASM)
- **Real-time Updates**: Simulated WebSocket updates for participant changes

## Tech Stack

- React 19 + TypeScript
- Vite 7
- TailwindCSS 4
- CodeMirror 6 (syntax highlighting)
- React Router 7
- Vitest + React Testing Library

## Project Structure

```
frontend/
├── src/
│   ├── api/                 # Centralized API layer
│   │   ├── client.ts        # HTTP/WebSocket client config
│   │   ├── sessions.ts      # Session API functions
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── mocks/           # Mock implementations
│   ├── components/
│   │   ├── CodeEditor/      # CodeMirror wrapper
│   │   ├── SessionControls/ # Language selector, run button, share
│   │   └── OutputPanel/     # Execution results display
│   ├── pages/
│   │   ├── Home.tsx         # Landing page
│   │   └── Session.tsx      # Coding session page
│   ├── hooks/
│   │   └── useSession.ts    # Session state management
│   └── __tests__/           # Test files
```

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |

## API Configuration

The frontend uses mock implementations by default. To connect to a real backend:

1. Set `USE_MOCKS = false` in `src/api/client.ts`
2. Configure environment variables:
   ```
   VITE_API_URL=http://localhost:8000
   VITE_WS_URL=ws://localhost:8000
   ```

## Mock API

The mock implementation (`src/api/mocks/`) provides:
- Session creation and retrieval
- Code updates
- Simulated code execution
- Real-time participant updates (WebSocket simulation)

Toggle between mock and real API with the `USE_MOCKS` flag in `src/api/client.ts`.
