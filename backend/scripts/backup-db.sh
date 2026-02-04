#!/bin/bash
# Database backup script for ExtraShifty
# Usage: ./backup-db.sh [backup_dir]

set -euo pipefail

# Configuration (can be overridden by environment variables)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-extrashifty}"
BACKUP_DIR="${1:-/var/backups/extrashifty}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/extrashifty_${TIMESTAMP}.sql.gz"

echo "Starting database backup..."
echo "Host: $POSTGRES_HOST:$POSTGRES_PORT"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"

# Perform backup using pg_dump with compression
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo "ERROR: Backup file was not created"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "extrashifty_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "extrashifty_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/extrashifty_*.sql.gz 2>/dev/null || echo "No backups found"

echo ""
echo "Backup completed at $(date)"
