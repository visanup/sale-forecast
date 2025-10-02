#!/bin/bash

# Database backup script for production

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
POSTGRES_HOST=${POSTGRES_HOST:-postgres}
POSTGRES_DB=${POSTGRES_DB:-postgres}
POSTGRES_USER=${POSTGRES_USER:-postgres}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting backup process at $(date)"

# Database backup
echo "Backing up PostgreSQL database..."
pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --no-password --verbose --clean --no-acl --no-owner \
  --format=custom \
  --file="$BACKUP_DIR/postgres_backup_$DATE.dump"

# Redis backup
echo "Backing up Redis data..."
redis-cli -h redis --rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

# Application logs backup
echo "Backing up application logs..."
if [ -d "/var/log/app" ]; then
  tar -czf "$BACKUP_DIR/logs_backup_$DATE.tar.gz" /var/log/app
fi

# Compress backups
echo "Compressing backups..."
gzip "$BACKUP_DIR/postgres_backup_$DATE.dump"
gzip "$BACKUP_DIR/redis_backup_$DATE.rdb"

# Upload to cloud storage (if configured)
if [ ! -z "$AWS_S3_BUCKET" ]; then
  echo "Uploading backups to S3..."
  aws s3 cp "$BACKUP_DIR/postgres_backup_$DATE.dump.gz" \
    "s3://$AWS_S3_BUCKET/backups/postgres/"
  aws s3 cp "$BACKUP_DIR/redis_backup_$DATE.rdb.gz" \
    "s3://$AWS_S3_BUCKET/backups/redis/"
  if [ -f "$BACKUP_DIR/logs_backup_$DATE.tar.gz" ]; then
    aws s3 cp "$BACKUP_DIR/logs_backup_$DATE.tar.gz" \
      "s3://$AWS_S3_BUCKET/backups/logs/"
  fi
fi

# Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup process completed at $(date)"
echo "Backup files created:"
ls -la "$BACKUP_DIR"/*_$DATE*
