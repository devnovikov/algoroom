# AlgoRoom

Real-time collaborative coding interview platform with browser-based code execution.

## Overview

AlgoRoom is a web application that enables real-time collaborative coding sessions. Multiple participants can join a session, edit code together, and execute it directly in the browser - no server-side code execution required.

### Key Features

- **Real-time Collaboration**: Code changes sync instantly across all connected participants via WebSocket
- **Browser-based Execution**: Python (via Pyodide/WASM) and JavaScript code runs entirely in the browser
- **Shareable Sessions**: Create a session and share the link - anyone can join and collaborate
- **Syntax Highlighting**: Full syntax highlighting for JavaScript and Python using CodeMirror
- **Session Persistence**: Sessions stored in PostgreSQL for production or in-memory for development

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite 7** for fast development and building
- **TailwindCSS 4** for styling
- **CodeMirror** (`@uiw/react-codemirror`) for code editing with syntax highlighting
- **Pyodide** for Python execution in browser via WebAssembly
- **React Router** for navigation
- **Framer Motion** for animations

### Backend
- **FastAPI** with Python 3.13+
- **SQLAlchemy 2.x** async ORM with PostgreSQL
- **Alembic** for database migrations
- **WebSocket** for real-time communication
- **Pydantic** for data validation

### Infrastructure
- **Docker** multi-stage build (node:22-alpine + python:3.13-slim)
- **Nginx** as reverse proxy
- **Supervisor** for process management
- **Render.com** for deployment with managed PostgreSQL

## Project Structure

```
algoroom/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── api/             # API client and WebSocket management
│   │   ├── components/      # React components (CodeEditor, OutputPanel, etc.)
│   │   ├── hooks/           # Custom hooks (useSession)
│   │   ├── pages/           # Page components (Home, Session)
│   │   └── services/        # Code execution service
│   └── package.json
│
├── backend/                  # FastAPI backend application
│   ├── app/
│   │   ├── config.py        # Settings and configuration
│   │   ├── main.py          # FastAPI app with lifespan
│   │   ├── models.py        # Pydantic models
│   │   ├── db/              # Database layer (SQLAlchemy models, session)
│   │   ├── repositories/    # Repository pattern (memory, postgres)
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   └── websocket.py     # WebSocket connection manager
│   ├── alembic/             # Database migrations
│   ├── tests/               # Backend tests
│   └── pyproject.toml
│
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local development with PostgreSQL
├── nginx.conf               # Nginx reverse proxy config
├── supervisord.conf         # Process manager config
├── entrypoint.sh            # Container entrypoint
├── render.yaml              # Render.com deployment config
└── package.json             # Root package with dev/test scripts
```

## Getting Started

### Prerequisites

- Node.js 22+
- Python 3.13+
- [uv](https://docs.astral.sh/uv/) for Python dependency management
- Docker (optional, for containerized development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/algoroom.git
cd algoroom
```

2. Install frontend dependencies:
```bash
npm run install:all
```

3. Install backend dependencies:
```bash
cd backend && uv sync
```

### Development

Run both frontend and backend in development mode:

```bash
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:8000

#### With PostgreSQL (optional)

For persistent sessions using PostgreSQL:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
cd backend && uv run alembic upgrade head

# Start with PostgreSQL
DATABASE_URL="postgresql+asyncpg://algoroom:algoroom@localhost:5432/algoroom" \
REPOSITORY_TYPE=postgres \
npm run dev:backend
```

### Testing

Run all tests:
```bash
npm test
```

Run backend tests only:
```bash
npm run test:backend
# or
cd backend && uv run pytest
```

Run frontend tests only:
```bash
npm run test:frontend
# or
cd frontend && npm run test
```

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create a new session |
| GET | `/sessions/{id}` | Get session details |
| PUT | `/sessions/{id}/code` | Update session code |
| POST | `/sessions/{id}/execution-result` | Broadcast execution result |
| GET | `/health` | Health check |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://host/ws/sessions/{id}` | Real-time session updates |

#### WebSocket Message Types

- `code_update` - Code changed by another participant
- `participant_joined` - New participant connected
- `participant_left` - Participant disconnected
- `execution_result` - Code execution result from another participant

## Docker Deployment

### Build the image:
```bash
docker build -t algoroom .
```

### Run locally:
```bash
docker run -p 8080:8080 algoroom
```

### With PostgreSQL:
```bash
docker-compose up
```

## Deployment to Render

The project includes `render.yaml` for one-click deployment to Render.com:

1. Create a new Blueprint on Render
2. Connect your GitHub repository
3. Render will automatically:
   - Build the Docker image
   - Create a PostgreSQL database
   - Run migrations on deploy
   - Start the application

Environment variables are automatically configured via `render.yaml`.

## Architecture

### Repository Pattern

The backend uses a repository pattern to abstract data storage:

- **InMemorySessionRepository**: Fast, no-persistence (used in tests and development)
- **PostgresSessionRepository**: SQLAlchemy-based persistence for production

Switch between them via `REPOSITORY_TYPE` environment variable (`memory` or `postgres`).

### Real-time Synchronization

1. User edits code in CodeMirror editor
2. Changes debounced and sent via REST API
3. Backend broadcasts update to all WebSocket connections
4. All participants receive update and sync their editors

### Code Execution

Code runs entirely in the browser:
- **JavaScript**: Sandboxed execution using `Function` constructor
- **Python**: Pyodide (CPython compiled to WebAssembly)

Execution results are broadcast to all session participants.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `memory://` | Database connection string |
| `REPOSITORY_TYPE` | `memory` | Storage backend (`memory` or `postgres`) |
| `PORT` | `8080` | Server port (for container) |
| `VITE_API_URL` | `` | API base URL (empty for same origin) |
| `VITE_WS_URL` | `` | WebSocket base URL (empty for same origin) |

## License

MIT
