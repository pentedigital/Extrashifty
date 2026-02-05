"""FastAPI application entry point for ExtraShifty."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.middleware import (
    TRUSTED_HOSTS,
    HTTPSRedirectMiddleware,
    SecurityHeadersMiddleware,
)
from app.core.rate_limit import limiter
from app.core.scheduler import start_scheduler, stop_scheduler

# Initialize Sentry for error tracking
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Handles startup and shutdown events for the application.
    """
    # Startup
    # Initialize database tables (in development only)
    # In production, use Alembic migrations
    # from app.core.db import init_db
    # init_db()

    # Start background scheduler for payment jobs
    await start_scheduler()

    yield

    # Shutdown
    # Stop the scheduler gracefully
    stop_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ExtraShifty - Shift Management API",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Security middleware (order matters - added in reverse order of execution)
# 1. Security headers on all responses
app.add_middleware(SecurityHeadersMiddleware)

# 2. HTTPS redirect in production
if not settings.DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)

# 3. Trusted hosts (prevent host header attacks)
if not settings.DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """
    Health check endpoint.

    Returns a simple status indicating the API is running.
    """
    return {"status": "healthy", "service": settings.PROJECT_NAME}


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """
    Root endpoint.

    Returns basic API information.
    """
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "health": "/health",
    }


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
