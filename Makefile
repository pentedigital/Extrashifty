.PHONY: help dev dev-build down logs test test-backend test-frontend lint format migrate shell clean

# Default target
help:
	@echo "ExtraShifty Development Commands"
	@echo "================================"
	@echo "make dev          - Start development environment"
	@echo "make dev-build    - Build and start development environment"
	@echo "make down         - Stop all services"
	@echo "make logs         - View logs (use SERVICE=name for specific service)"
	@echo "make test         - Run all tests"
	@echo "make test-backend - Run backend tests"
	@echo "make test-frontend- Run frontend tests"
	@echo "make lint         - Run linters"
	@echo "make format       - Format code"
	@echo "make migrate      - Run database migrations"
	@echo "make shell        - Open shell in backend container"
	@echo "make clean        - Remove containers, volumes, and build artifacts"

# Development
dev:
	docker compose up -d

dev-build:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f $(SERVICE)

# Testing
test: test-backend test-frontend

test-backend:
	docker compose exec backend pytest

test-frontend:
	cd frontend && npm run test:unit:run

test-e2e:
	cd frontend && npm run test

# Code quality
lint:
	cd backend && ruff check .
	cd frontend && npm run lint

format:
	cd backend && ruff format .
	cd frontend && npm run format

# Database
migrate:
	docker compose exec backend alembic upgrade head

migrate-create:
	@read -p "Migration message: " msg; \
	docker compose exec backend alembic revision --autogenerate -m "$$msg"

# Utilities
shell:
	docker compose exec backend bash

psql:
	docker compose exec db psql -U postgres -d app

clean:
	docker compose down -v --remove-orphans
	rm -rf frontend/node_modules frontend/dist
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true

# Installation
install:
	cd frontend && npm install

# Build for production
build:
	docker compose -f compose.yml build
