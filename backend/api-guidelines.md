# Algoroom API Guidelines

## Overview

This document defines conventions and standards for the Algoroom REST API and WebSocket interface.

## Base URLs

| Environment | REST API | WebSocket |
|-------------|----------|-----------|
| Development | `http://localhost:8000` | `ws://localhost:8000` |
| Production  | `https://api.algoroom.dev` | `wss://api.algoroom.dev` |

## Versioning Strategy

**Current:** No explicit versioning (v1 implicit)

**Future:** URI-based versioning when breaking changes are introduced:
- `/v1/sessions` (current, default)
- `/v2/sessions` (future breaking changes)

**Policy:** Maintain backward compatibility within a major version. Deprecation notices provided 6 months before removal.

---

## Naming Conventions

### Resources
- Use plural nouns: `/sessions` not `/session`
- Lowercase, kebab-case for multi-word resources: `/execution-results`
- Hierarchical relationships: `/sessions/{id}/executions`

### Query Parameters
- camelCase: `?maxResults=10&sortBy=createdAt`
- Boolean flags: `?includeOutput=true`

### JSON Properties
- camelCase: `createdAt`, `executionTime`, `sessionId`
- ISO 8601 for timestamps: `2025-12-10T10:30:00Z`
- Enums in lowercase: `javascript`, `python`, `code_update`

---

## Request/Response Format

### Content Type
```http
Content-Type: application/json
Accept: application/json
```

### Request Headers
```http
Content-Type: application/json
X-Request-ID: unique-client-generated-id (optional, for tracing)
```

### Response Headers
```http
Content-Type: application/json
X-Request-ID: echoed-request-id (if provided)
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702214400
```

---

## HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Retrieve resource(s) | Yes |
| `POST` | Create resource, execute action | No |
| `PUT` | Replace entire resource | Yes |
| `PATCH` | Partial update (future) | No |
| `DELETE` | Remove resource (future) | Yes |

**Current Endpoints:**
- `POST /sessions` - Create session
- `GET /sessions/{id}` - Retrieve session
- `PUT /sessions/{id}/code` - Replace code
- `POST /sessions/{id}/execute` - Execute code (non-idempotent action)

---

## Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PUT, action completion |
| `201` | Created | Successful POST creating new resource |
| `204` | No Content | Successful DELETE (future) |
| `400` | Bad Request | Invalid JSON, missing required fields, validation errors |
| `401` | Unauthorized | Missing/invalid auth token (future) |
| `403` | Forbidden | Valid auth but insufficient permissions (future) |
| `404` | Not Found | Session doesn't exist |
| `409` | Conflict | Concurrent modification conflict (future) |
| `422` | Unprocessable Entity | Valid JSON but business logic error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server failure |
| `503` | Service Unavailable | Temporary unavailability, maintenance |

---

## Error Response Format

All errors follow RFC 9457 Problem Details structure via `ApiError`:

```json
{
  "message": "Human-readable description",
  "code": "MACHINE_READABLE_CODE",
  "status": 400
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_JSON` | 400 | Malformed JSON request body |
| `MISSING_FIELD` | 400 | Required field omitted |
| `INVALID_LANGUAGE` | 400 | Language not in [javascript, python] |
| `INVALID_UUID` | 400 | sessionId not valid UUID format |
| `SESSION_NOT_FOUND` | 404 | Session ID doesn't exist |
| `EXECUTION_TIMEOUT` | 422 | Code execution exceeded time limit |
| `EXECUTION_SERVICE_ERROR` | 500 | Sandbox runtime unavailable |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server failure |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from client |

### Example Error Responses

**400 Bad Request:**
```json
{
  "message": "Field 'code' is required",
  "code": "MISSING_FIELD",
  "status": 400
}
```

**404 Not Found:**
```json
{
  "message": "Session with ID 'a1b2c3d4-...' not found",
  "code": "SESSION_NOT_FOUND",
  "status": 404
}
```

**500 Internal Server Error:**
```json
{
  "message": "Code execution service unavailable",
  "code": "EXECUTION_SERVICE_ERROR",
  "status": 500
}
```

---

## Pagination

**Current:** Not implemented (single-session focus)

**Future:** Cursor-based pagination for session lists:

```
GET /sessions?cursor=eyJpZCI6Imxhc3QtaWQifQ&limit=20
```

Response includes:
```json
{
  "data": [ /* sessions */ ],
  "pagination": {
    "nextCursor": "eyJpZCI6Im5leHQtaWQifQ",
    "hasMore": true
  }
}
```

---

## Rate Limiting

**Strategy:** Token bucket per client IP

**Limits:**
- Anonymous clients: 100 requests/minute
- Authenticated clients: 500 requests/minute
- WebSocket connections: 5 concurrent per client

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702214400
```

**429 Response:**
```json
{
  "message": "Rate limit exceeded. Try again in 42 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429
}
```

---

## Authentication

**Current:** None (public sessions)

**Future Plans:**

### API Key (Server-to-Server)
```http
X-API-Key: sk_live_abc123xyz789
```

### JWT Bearer Token (User Sessions)
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Claims:**
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "exp": 1702214400,
  "scope": "session:create session:read session:write"
}
```

---

## WebSocket Protocol

### Connection

**Endpoint:** `ws://localhost:8000/ws/sessions/{sessionId}`

**Lifecycle:**
1. Client initiates WebSocket handshake
2. Server validates sessionId (404 if invalid → close code 1008)
3. Server increments participant count
4. Server broadcasts `participant_joined` to all clients
5. Client receives JSON messages as they occur
6. On disconnect, server decrements count and broadcasts `participant_left`

### Message Format

All messages are JSON strings matching `SessionUpdate` schema:

```typescript
{
  type: 'code_update' | 'participant_joined' | 'participant_left',
  sessionId: string,
  code?: string,
  language?: 'javascript' | 'python',
  participants?: number,
  timestamp: string  // ISO 8601
}
```

### Client Example

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sessions/a1b2c3d4-...');

ws.onopen = () => console.log('Connected');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);

  switch (update.type) {
    case 'code_update':
      editor.setValue(update.code);
      break;
    case 'participant_joined':
      updateParticipantCount(update.participants);
      break;
    case 'participant_left':
      updateParticipantCount(update.participants);
      break;
  }
};

ws.onerror = (error) => console.error('WS Error:', error);
ws.onclose = () => console.log('Disconnected');
```

### Close Codes

| Code | Reason |
|------|--------|
| 1000 | Normal closure |
| 1001 | Server going away (shutdown) |
| 1008 | Policy violation (invalid session) |
| 1011 | Internal server error |

### No Client-to-Server Messages

The WebSocket is **receive-only** for clients. Code updates are sent via REST API (`PUT /sessions/{id}/code`), which then triggers WebSocket broadcasts.

---

## Example Request/Response Flows

### 1. Create Session → Execute Code

**Request:**
```http
POST /sessions HTTP/1.1
Content-Type: application/json

{
  "language": "javascript"
}
```

**Response (201):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "",
  "language": "javascript",
  "createdAt": "2025-12-10T10:30:00Z",
  "participants": 1
}
```

**Update Code:**
```http
PUT /sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/code HTTP/1.1
Content-Type: application/json

{
  "code": "console.log('Hello, World!');"
}
```

**Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "console.log('Hello, World!');",
  "language": "javascript",
  "createdAt": "2025-12-10T10:30:00Z",
  "participants": 1
}
```

**Execute:**
```http
POST /sessions/a1b2c3d4-e5f6-7890-abcd-ef1234567890/execute HTTP/1.1
```

**Response (200):**
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "executionTime": 42
}
```

### 2. Real-Time Collaboration

**User A:** Creates session and connects WebSocket

**User B:** Connects to same WebSocket endpoint

**WebSocket broadcast to all:**
```json
{
  "type": "participant_joined",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "participants": 2,
  "timestamp": "2025-12-10T10:32:00Z"
}
```

**User B:** Updates code via REST API

**WebSocket broadcast to all:**
```json
{
  "type": "code_update",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "code": "console.log('Hello from User B!');",
  "language": "javascript",
  "timestamp": "2025-12-10T10:33:00Z"
}
```

---

## Security Considerations

### Input Validation
- Validate `language` enum strictly
- Sanitize code before execution (sandboxed environment)
- Reject payloads >1MB
- UUID format validation for sessionId

### Code Execution Sandbox
- Time limit: 5 seconds
- Memory limit: 128MB
- No network access
- No file system write access
- Process isolation per execution

### WebSocket Security
- Validate session existence before accepting connection
- Rate limit connections per IP
- Disconnect idle connections after 10 minutes
- Implement heartbeat/ping-pong (future)

### Rate Limiting
- Per-IP tracking
- Exponential backoff for repeated violations
- WebSocket connection limits

---

## Testing & Validation

### OpenAPI Validation
```bash
# Validate spec
spectral lint backend/openapi.yaml

# Generate server stubs
openapi-generator generate -i backend/openapi.yaml -g python-fastapi -o backend/generated
```

### Contract Testing
Use Prism or similar mock server:
```bash
prism mock backend/openapi.yaml
```

### Integration Tests
Verify frontend API client against spec:
```bash
npm test -- frontend/src/api/sessions.test.ts
```

---

## Deprecation Policy

When introducing breaking changes:

1. **Announce:** 6 months advance notice in changelog
2. **Version:** Release new version (`/v2/...`)
3. **Parallel Run:** Support both versions for 12 months
4. **Sunset:** Remove old version with final 3-month warning
5. **Document:** Migration guide with code examples

**Example Deprecation Header:**
```http
Deprecation: Sat, 1 Jun 2026 00:00:00 GMT
Sunset: Sat, 1 Dec 2026 00:00:00 GMT
Link: </docs/migration-v2>; rel="deprecation"
```

---

## Future Enhancements

### Planned Features
- [ ] Session persistence (database storage)
- [ ] User authentication (OAuth 2.0)
- [ ] Session sharing permissions
- [ ] Execution history (`GET /sessions/{id}/executions`)
- [ ] Language runtime selection (Node.js version, Python version)
- [ ] File upload for multi-file projects
- [ ] Collaborative cursor positions
- [ ] Session forking (`POST /sessions/{id}/fork`)
- [ ] Webhook notifications for long-running executions

### API Expansion
```
POST /sessions/{id}/fork           # Duplicate session
GET /sessions/{id}/executions      # Execution history
POST /sessions/{id}/share          # Generate share link
DELETE /sessions/{id}              # Delete session
PATCH /sessions/{id}               # Partial update
GET /users/me/sessions             # User's sessions
```

---

## Support & Contact

- **Documentation:** https://docs.algoroom.dev
- **API Status:** https://status.algoroom.dev
- **GitHub Issues:** https://github.com/algoroom/algoroom/issues
- **Email:** api-support@algoroom.dev

---

**Last Updated:** 2025-12-10
**Spec Version:** 1.0.0
