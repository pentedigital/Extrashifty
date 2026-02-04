#!/bin/bash
# Database restore script for ExtraShifty
# Usage: ./restore-db.sh <backup_file>

set -euo pipefail

# Check for backup file argument
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /var/backups/extrashifty/extrashifty_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Configuration (can be overridden by environment variables)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-extrashifty}"

echo "========================================="
echo "  ExtraShifty Database Restore"
echo "========================================="
echo ""
echo "WARNING: This will REPLACE the current database!"
echo ""
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
echo ""

# Confirm restore
read -p "Are you sure you want to restore? (type 'yes' to confirm): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting restore..."

# Drop existing connections to the database
echo "Terminating existing database connections..."
PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"

PGPASSWORD="${POSTGRES_PASSWORD:-}" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "CREATE DATABASE $POSTGRES_DB;"

# Restore from backup
echo "Restoring from backup..."
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_restore \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --verbose \
    --no-owner \
    --no-privileges \
    "$BACKUP_FILE"

echo ""
echo "Restore completed successfully at $(date)"
echo ""
echo "Note: You may need to run migrations if the backup is from an older schema version."
