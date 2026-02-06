# ExtraShifty Deployment Guide

## Overview

ExtraShifty consists of:
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React SPA served via Nginx
- **Database**: PostgreSQL 16

## Deployment Options

### Option 1: Docker Compose (Single Server)

Suitable for small deployments or staging:

```bash
# On deployment server
git clone https://github.com/pentedigital/extrashifty.git
cd extrashifty

# Create production environment
cp .env.example .env
# Edit .env with production values (see below)

# Build and start services
docker compose --profile production up -d --build

# Run migrations
docker compose --profile migrate up migrate

# View logs
docker compose logs -f
```

### Option 2: Kubernetes

For scalable deployments, create Kubernetes manifests based on the Docker Compose services.

### Option 3: Cloud Platforms

#### AWS (ECS/Fargate)

```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY

docker build -t extrashifty-backend ./backend
docker tag extrashifty-backend:latest $ECR_REGISTRY/extrashifty-backend:latest
docker push $ECR_REGISTRY/extrashifty-backend:latest

docker build -t extrashifty-frontend ./frontend \
  --build-arg VITE_API_URL=https://api.extrashifty.com
docker tag extrashifty-frontend:latest $ECR_REGISTRY/extrashifty-frontend:latest
docker push $ECR_REGISTRY/extrashifty-frontend:latest
```

#### Google Cloud Run

```bash
# Backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/extrashifty-backend ./backend
gcloud run deploy extrashifty-backend \
  --image gcr.io/$PROJECT_ID/extrashifty-backend \
  --platform managed

# Frontend
gcloud builds submit --tag gcr.io/$PROJECT_ID/extrashifty-frontend ./frontend \
  --build-arg VITE_API_URL=https://api.extrashifty.com
gcloud run deploy extrashifty-frontend \
  --image gcr.io/$PROJECT_ID/extrashifty-frontend \
  --platform managed
```

## Production Configuration

### Required Environment Variables

```bash
# Security - REQUIRED: Generate unique value!
# openssl rand -hex 32
SECRET_KEY=<unique-32-byte-hex-string>

# Database
POSTGRES_SERVER=<database-host>
POSTGRES_PORT=5432
POSTGRES_USER=<database-user>
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=extrashifty

# CORS
BACKEND_CORS_ORIGINS=https://extrashifty.com,https://www.extrashifty.com

# Initial admin (change after first login!)
FIRST_SUPERUSER_EMAIL=admin@extrashifty.com
FIRST_SUPERUSER_PASSWORD=<strong-password>

# Frontend
VITE_API_URL=https://api.extrashifty.com
```

### Security Checklist

- [ ] Generate unique `SECRET_KEY` with `openssl rand -hex 32`
- [ ] Use strong database password
- [ ] Enable HTTPS for all endpoints
- [ ] Configure CORS to allow only your domains
- [ ] Change superuser credentials after first login
- [ ] Set up database backups
- [ ] Configure rate limiting (via reverse proxy)
- [ ] Enable container security scanning

### Database Setup

```sql
-- Create production database
CREATE USER extrashifty WITH PASSWORD 'secure-password';
CREATE DATABASE extrashifty OWNER extrashifty;
GRANT ALL PRIVILEGES ON DATABASE extrashifty TO extrashifty;
```

Run migrations:
```bash
docker compose --profile migrate up migrate
```

### SSL/TLS Configuration

Always use HTTPS in production. Options:
- **Cloudflare** (recommended for simplicity)
- **AWS ALB/CloudFront** with ACM certificates
- **Let's Encrypt** with Certbot
- **Traefik** reverse proxy with auto-certificates

## CI/CD Pipeline

### Automatic Deployments

Tag-based releases trigger automatic deployment:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Manual Deployment

1. Go to Actions > Deploy > Run workflow
2. Select environment (staging/production)

### Required GitHub Secrets

```
PRODUCTION_API_URL      # https://api.extrashifty.com
AWS_ACCESS_KEY_ID       # For AWS deployments
AWS_SECRET_ACCESS_KEY   # For AWS deployments
```

## Monitoring

### Health Checks

- **Backend**: `GET /health` returns `{"status": "healthy"}`
- **Frontend**: Nginx returns 200 on `/`

### Logging

```yaml
# Docker Compose logging
services:
  backend:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

For production, consider:
- AWS CloudWatch
- Google Cloud Logging
- Datadog
- Grafana Loki

## Backup and Recovery

### Database Backups

```bash
# Manual backup
docker compose exec db pg_dump -U postgres extrashifty > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260204.sql | docker compose exec -T db psql -U postgres extrashifty
```

### Automated Backups

Set up cron job or use managed database with automatic backups.

## Scaling

### Horizontal Scaling

```yaml
# compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

Use a load balancer (Nginx, Traefik, HAProxy) to distribute traffic.

## Rollback

### Docker Compose

```bash
# Tag current before deploying
docker tag extrashifty-backend:latest extrashifty-backend:previous

# Rollback if needed
docker compose down
docker tag extrashifty-backend:previous extrashifty-backend:latest
docker compose up -d
```

### Database Migrations

```bash
# Rollback last migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>
```
