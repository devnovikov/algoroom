# Algoroom Backend

Real-time collaborative code execution platform API built with FastAPI.

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager

## Quick Start

```bash
# Install dependencies
uv sync

# Start development server
uv run uvicorn app.main:app --reload

# Server runs at http://localhost:8000
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI spec: http://localhost:8000/openapi.json

## Available Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sessions` | Create a new coding session |
| `GET` | `/sessions/{sessionId}` | Get session by ID |
| `PUT` | `/sessions/{sessionId}/code` | Update code in a session |
| `POST` | `/sessions/{sessionId}/execute` | Execute code in a session |
| `GET` | `/health` | Health check |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://localhost:8000/ws/sessions/{sessionId}` | Real-time session updates |

#### WebSocket Message Types

```typescript
// Server → Client messages
{
  type: 'code_update' | 'participant_joined' | 'participant_left',
  sessionId: string,
  code?: string,           // for code_update
  language?: string,       // for code_update
  participants?: number,   // for participant events
  timestamp: string
}
```

## Testing

```bash
# Run all tests
uv run pytest

# Run with verbose output
uv run pytest -v

# Run specific test file
uv run pytest tests/test_sessions.py -v

# Run only unit tests (REST endpoints)
uv run pytest tests/test_sessions.py -v

# Run only WebSocket tests
uv run pytest tests/test_websocket.py -v

# Run only integration tests
uv run pytest tests/test_integration.py -v

# Run tests by marker/class name
uv run pytest -k "TestSessionLifecycle" -v

# Run with coverage
uv run pytest --cov=app --cov-report=term-missing
```

### Test Structure

- `tests/test_sessions.py` - Unit tests for REST endpoints (16 tests)
- `tests/test_websocket.py` - WebSocket connection and broadcast tests (7 tests)
- `tests/test_integration.py` - End-to-end client-server interaction tests (10 tests)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # Pydantic models
│   ├── database.py          # In-memory session repository
│   ├── websocket.py         # WebSocket connection manager
│   ├── routers/
│   │   └── sessions.py      # Session endpoints
│   └── services/
│       ├── session_service.py   # Session business logic
│       └── executor_service.py  # Code execution (mock)
├── tests/
│   ├── conftest.py          # Pytest fixtures
│   ├── test_sessions.py
│   ├── test_websocket.py
│   └── test_integration.py
├── openapi.yaml             # API specification
├── pyproject.toml           # Project dependencies
├── pytest.ini               # Pytest configuration
└── README.md
```

## Development

### Adding Dependencies

```bash
uv add <package-name>
```

### Code Style

The project uses Python 3.13+ features including:
- Type hints with `|` union syntax
- Pydantic v2 for validation
- Async/await for all endpoints

## Configuration

### CORS

Allowed origins (configured in `app/main.py`):
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Server host |
| `PORT` | `8000` | Server port |

## Mock Services

Currently using mock implementations for:

- **Database**: In-memory dictionary (`app/database.py`)
- **Code Executor**: Returns fake output (`app/services/executor_service.py`)

These will be replaced with real implementations:
- Database → PostgreSQL/Redis
- Executor → Sandboxed subprocess execution

## API Examples

### Create Session

```bash
curl -X POST http://localhost:8000/sessions \
  -H "Content-Type: application/json" \
  -d '{"language": "python"}'
```

### Update Code

```bash
curl -X PUT http://localhost:8000/sessions/{sessionId}/code \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello, World!\")"}'
```

### Execute Code

```bash
curl -X POST http://localhost:8000/sessions/{sessionId}/execute
```

### WebSocket Connection (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sessions/{sessionId}');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Update:', update.type, update);
};
```
