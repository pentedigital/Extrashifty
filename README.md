# ExtraShifty

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-Proprietary-blue)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-19-61dafb)

A modern gig work platform and shift marketplace connecting hospitality businesses with workers for shift-based employment.

## Overview

ExtraShifty streamlines the process of filling shifts in the hospitality industry by creating a real-time marketplace where businesses can post shifts and qualified workers can pick them up instantly.

### User Types

- **Workers (Staff)** - Find and claim available shifts, manage schedules, receive payments
- **Businesses (Companies)** - Post shifts, manage workforce needs, handle payments
- **Agencies** - Manage worker pools and facilitate placements (Mode A & B support)

## Key Features

- **Real-time Shift Marketplace** - Live shift posting and claiming with instant updates
- **Instant Worker Matching** - Smart matching based on skills, location, and availability
- **Secure Payment Processing** - Integrated Stripe payments with automated payouts
- **Agency Management** - Flexible agency modes (A & B) for different operational models
- **Background Verification** - Built-in worker verification and compliance checks
- **Reviews and Ratings** - Two-way rating system for workers and businesses
- **Real-time Notifications** - WebSocket-powered instant notifications
- **GDPR Compliant** - Full data protection and privacy compliance

## Tech Stack

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11
- **ORM:** SQLModel
- **Database:** PostgreSQL
- **Migrations:** Alembic

### Frontend
- **Framework:** React 19
- **Language:** TypeScript
- **Routing:** TanStack Router
- **Data Fetching:** TanStack Query
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

### Infrastructure
- **Containerization:** Docker
- **CI/CD:** GitHub Actions

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/pentedigital/extrashifty.git
cd extrashifty

# Copy environment configuration
cp .env.example .env

# Start all services
docker compose up -d
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/docs

## Project Structure

```
extrashifty/
├── backend/           # FastAPI backend application
│   ├── app/           # Application code
│   ├── alembic/       # Database migrations
│   └── tests/         # Backend tests
├── frontend/          # React frontend application
│   ├── src/           # Source code
│   └── public/        # Static assets
├── docs/              # Documentation
├── docker-compose.yml # Container orchestration
└── README.md          # This file
```

## Documentation

- [Development Guide](docs/development.md) - Local development setup and workflows
- [Deployment Guide](docs/deployment.md) - Production deployment instructions
- [API Documentation](http://localhost:8001/docs) - Interactive API docs (Swagger UI)

## Contributing

We welcome contributions to ExtraShifty. Please read our contributing guidelines before submitting pull requests.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on:
- Code style and standards
- Pull request process
- Development workflow

## License

This project is proprietary software. All rights reserved.

---

Built with care by the ExtraShifty Team
