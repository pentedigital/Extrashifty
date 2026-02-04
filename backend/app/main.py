"""FastAPI application entry point for ExtraShifty."""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router


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
    yield
    # Shutdown
    # Add cleanup logic here if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="ExtraShifty - Shift Management API",
    version="0.1.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

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
