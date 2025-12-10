#!/bin/bash
set -e

# Default port if not set (Render provides PORT)
export PORT=${PORT:-8080}

echo "Starting Algoroom on port $PORT..."

# Substitute PORT in nginx config
envsubst '${PORT}' < /etc/nginx/sites-enabled/algoroom > /tmp/algoroom.conf
mv /tmp/algoroom.conf /etc/nginx/sites-enabled/algoroom

# Run database migrations if using PostgreSQL
if [ "$REPOSITORY_TYPE" = "postgres" ] || [[ "$DATABASE_URL" == postgres* ]]; then
    echo "Running database migrations..."
    cd /app
    /app/.venv/bin/alembic upgrade head
    echo "Migrations complete."
fi

# Start supervisord (nginx + uvicorn)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
