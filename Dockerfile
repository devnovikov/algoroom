# Multi-stage Dockerfile for Algoroom
# Combines React frontend + FastAPI backend in a single container

# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files for dependency caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./

# Build for production - API calls will go to same origin
ENV VITE_API_URL=""
ENV VITE_WS_URL=""

RUN npm run build

# ============================================
# Stage 2: Python Backend + Nginx
# ============================================
FROM python:3.13-slim AS production

# Install nginx, supervisor, curl for healthcheck, and gettext for envsubst
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    curl \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy backend dependencies and install
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend source code
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/frontend/dist /app/static

# Configure nginx
RUN rm /etc/nginx/sites-enabled/default
COPY nginx.conf /etc/nginx/sites-enabled/algoroom

# Configure supervisor to manage nginx + uvicorn
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /var/lib/nginx && \
    chown -R appuser:appuser /run

# Expose port (Render provides PORT env var, default 8080 for local)
EXPOSE 8080

# Environment variable for port (Render sets this)
ENV PORT=8080

# Health check (uses PORT)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start with entrypoint (runs migrations then supervisord)
CMD ["/app/entrypoint.sh"]
