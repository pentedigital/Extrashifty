# Contributing to ExtraShifty

Thank you for your interest in contributing to ExtraShifty! This document provides guidelines and instructions for contributing.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)

## Code of Conduct
[Standard code of conduct - be respectful, inclusive, professional]

## Getting Started
1. Fork the repository
2. Clone your fork
3. Set up development environment

## Development Setup
### Prerequisites
- Docker and Docker Compose
- Node.js 22+
- Python 3.11+

### Quick Start
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/extrashifty.git
cd extrashifty

# Copy environment files
cp .env.example .env

# Start development environment
make dev

# Or without Make:
docker compose up -d
```

## Making Changes
1. Create a feature branch from main
2. Make your changes
3. Write/update tests
4. Run linters and tests
5. Commit with conventional commit messages

## Pull Request Process
1. Update documentation if needed
2. Ensure all tests pass
3. Request review from maintainers
4. Address feedback
5. Squash commits if requested

## Coding Standards

### Backend (Python)
- Follow PEP 8 style guide
- Use type hints for all functions
- Run `ruff check` and `ruff format`
- Run `mypy` for type checking

### Frontend (TypeScript/React)
- Use functional components with hooks
- Follow React best practices
- Run `npm run lint` and `npm run format`
- Use TypeScript strict mode

## Testing

### Backend Tests
```bash
make test-backend
# Or: cd backend && pytest
```

### Frontend Tests
```bash
make test-frontend
# Or: cd frontend && npm run test:unit
```

### E2E Tests
```bash
make test-e2e
# Or: cd frontend && npm run test
```

## Commit Messages
Use conventional commits format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build/config changes

Example: `feat: add user notification preferences`

## Questions?
Open an issue or reach out to the maintainers.
