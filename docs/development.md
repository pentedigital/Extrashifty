# ExtraShifty Development Guide

## Prerequisites

- Python 3.11+
- Node.js 22+
- PostgreSQL 16+
- Docker and Docker Compose (optional, recommended)

## Quick Start with Docker Compose

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/pentedigital/extrashifty.git
cd extrashifty

# Copy environment files
cp .env.example .env

# Start all services (development mode)
docker compose --profile dev up -d

# Run database migrations
docker compose --profile migrate up migrate
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Local Development (Without Docker)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env
# Edit .env with your local PostgreSQL settings

# Run database migrations
alembic upgrade head

# Create first superuser
python -m app.initial_data

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment configuration (if not exists)
echo "VITE_API_URL=http://localhost:8000" > .env

# Start development server
npm run dev
```

## Code Quality Tools

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install
pre-commit install --hook-type commit-msg

# Run all hooks manually
pre-commit run --all-files
```

### Backend Linting and Formatting

```bash
cd backend

# Run linter
ruff check .

# Auto-fix linting issues
ruff check . --fix

# Format code
ruff format .

# Type checking
mypy app --ignore-missing-imports
```

### Frontend Linting

```bash
cd frontend

# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/api/test_auth.py -v

# View coverage report
open htmlcov/index.html
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm run test:unit

# Run unit tests with UI
npm run test:unit:ui

# Run E2E tests (requires dev server)
npm run test

# Run E2E tests with UI
npm run test:ui

# Run all tests
npm run test:all
```

## Database Migrations

### Creating a New Migration

```bash
cd backend

# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Create empty migration for custom SQL
alembic revision -m "description"
```

### Running Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history
```

## API Client Generation

Generate TypeScript client from backend OpenAPI spec:

```bash
cd frontend

# Ensure backend is running, then:
npm run sync-api
```

This fetches the OpenAPI spec and generates typed clients in `src/client/generated/`.

## Project Structure

```
extrashifty/
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   └── dependabot.yml      # Dependency updates
├── backend/
│   ├── app/
│   │   ├── api/            # API routes (v1)
│   │   ├── core/           # Config, security, database
│   │   ├── crud/           # Database operations
│   │   ├── email/          # Email templates
│   │   ├── models/         # SQLModel database models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── main.py         # FastAPI application
│   ├── alembic/            # Database migrations
│   ├── scripts/            # Utility scripts
│   ├── tests/              # Backend tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── client/         # API client
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities
│   │   ├── routes/         # TanStack Router pages
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
│   ├── tests/              # E2E and unit tests
│   └── Dockerfile
├── docs/                   # Documentation
├── compose.yml             # Docker Compose
└── .pre-commit-config.yaml # Pre-commit hooks
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_SERVER` | Database host | `localhost` |
| `POSTGRES_PORT` | Database port | `5432` |
| `POSTGRES_USER` | Database user | `postgres` |
| `POSTGRES_PASSWORD` | Database password | `postgres` |
| `POSTGRES_DB` | Database name | `extrashifty` |
| `SECRET_KEY` | JWT signing key | (change in prod) |
| `VITE_API_URL` | Backend URL for frontend | `http://localhost:8000` |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps db

# View database logs
docker compose logs db

# Connect manually
docker compose exec db psql -U postgres -d extrashifty
```

### Frontend Build Issues

```bash
# Clear and reinstall
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend && npm install
```

### Backend Import Errors

```bash
# Ensure virtual environment is active
source backend/.venv/bin/activate

# Reinstall dependencies
pip install -e ".[dev]"
```
