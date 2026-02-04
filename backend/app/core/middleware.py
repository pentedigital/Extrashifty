"""Security middleware for ExtraShifty."""

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Only add HSTS in production (when not in debug mode)
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        # Content Security Policy - adjust as needed for your frontend
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'"
        )

        return response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Redirect HTTP to HTTPS in production."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Only redirect in production and if request is HTTP
        if not settings.DEBUG:
            # Check X-Forwarded-Proto header (set by reverse proxies)
            forwarded_proto = request.headers.get("x-forwarded-proto")
            if forwarded_proto == "http":
                url = request.url.replace(scheme="https")
                return Response(
                    status_code=301,
                    headers={"Location": str(url)},
                )

        return await call_next(request)


def get_trusted_host_middleware() -> type[TrustedHostMiddleware]:
    """Get configured TrustedHostMiddleware."""
    return TrustedHostMiddleware


# Trusted hosts configuration
TRUSTED_HOSTS = ["localhost", "127.0.0.1", "*.extrashifty.com"]
