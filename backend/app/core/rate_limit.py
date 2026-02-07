"""Rate limiting configuration for ExtraShifty."""

import logging
import os

import jwt
from slowapi import Limiter

from app.core.config import settings

logger = logging.getLogger(__name__)

# Check if we're in a test environment
TESTING = os.environ.get("TESTING", "").lower() in ("true", "1", "yes")

# Redis URL for distributed rate limiting (falls back to in-memory)
REDIS_URL = os.environ.get("RATE_LIMIT_REDIS_URL") or settings.RATE_LIMIT_REDIS_URL


def _get_forwarded_ip(request) -> str:
    """Extract the real client IP from X-Forwarded-For, or fall back to request.client.host."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # First IP in the chain is the original client
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"


def get_user_or_ip_key(request) -> str | None:
    """
    Rate limit key function.

    - During testing: returns None (disables rate limiting).
    - For authenticated requests: returns 'user:{id}' extracted from the JWT.
    - Fallback: returns the client IP address (respecting X-Forwarded-For).
    """
    if TESTING:
        return None

    # Try to extract user ID from JWT in Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},
            )
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except (jwt.InvalidTokenError, Exception):
            pass  # Fall through to IP-based limiting

    return _get_forwarded_ip(request)


# Build storage URI (Redis if available, otherwise in-memory)
_storage_uri = REDIS_URL if REDIS_URL else "memory://"

limiter = Limiter(
    key_func=get_user_or_ip_key,
    default_limits=["100/minute"],
    enabled=not TESTING,
    storage_uri=_storage_uri,
    headers_enabled=True,
)

# Rate limit configurations
# These can be customized per endpoint using decorators

# Default limits
DEFAULT_RATE_LIMIT = "100/minute"

# Auth endpoints - more restrictive to prevent brute force
AUTH_RATE_LIMIT = "5/minute"

# Login specifically - very restrictive
LOGIN_RATE_LIMIT = "3/minute"

# Registration - moderate restriction
REGISTER_RATE_LIMIT = "10/hour"

# Password reset - very restrictive
PASSWORD_RESET_RATE_LIMIT = "3/hour"

# Payment endpoints
PAYMENT_RATE_LIMIT = "10/minute"

# Webhook endpoint
WEBHOOK_RATE_LIMIT = "60/minute"

# GDPR endpoints
GDPR_RATE_LIMIT = "5/hour"

# Admin endpoints
ADMIN_RATE_LIMIT = "30/minute"
