# ExtraShifty Backend

FastAPI backend for the ExtraShifty hospitality shift marketplace platform.

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLModel ORM
- **Authentication**: JWT with bcrypt password hashing
- **Migrations**: Alembic

## Setup

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment file
cp .env.example .env

# Run development server
uvicorn app.main:app --reload
```

## API Documentation

Once running, access the API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/           # API routes
│   ├── core/          # Config, security, database
│   ├── crud/          # Database operations
│   ├── models/        # SQLModel database models
│   ├── schemas/       # Pydantic schemas
│   └── main.py        # FastAPI application
├── alembic/           # Database migrations
├── Dockerfile
└── pyproject.toml
```

## Environment Variables

See `.env.example` for required configuration.
