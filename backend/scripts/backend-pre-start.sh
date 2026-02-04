#!/usr/bin/env bash
set -e

echo "========================================"
echo "ExtraShifty Backend Pre-start Script"
echo "========================================"

# Wait for PostgreSQL to be ready
echo ""
echo "Waiting for PostgreSQL..."

MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

while [ $RETRIES -lt $MAX_RETRIES ]; do
    if python -c "
from app.core.db import engine
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text('SELECT 1'))
" 2>/dev/null; then
        echo "PostgreSQL is ready!"
        break
    fi

    RETRIES=$((RETRIES + 1))
    echo "PostgreSQL not ready yet... Retry $RETRIES/$MAX_RETRIES"
    sleep $RETRY_INTERVAL
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo "ERROR: Could not connect to PostgreSQL after $MAX_RETRIES attempts"
    exit 1
fi

# Run Alembic migrations
echo ""
echo "Running database migrations..."
alembic upgrade head
echo "Migrations complete!"

# Initialize first superuser
echo ""
echo "Initializing first superuser..."
python -m app.initial_data

echo ""
echo "========================================"
echo "Pre-start complete!"
echo "========================================"
