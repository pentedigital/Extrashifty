"""Rate limiting configuration for ExtraShifty."""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# Check if we're in a test environment
TESTING = os.environ.get("TESTING", "").lower() in ("true", "1", "yes")


def get_rate_limit_key(request):
    """Get the key for rate limiting. Returns None during testing to disable limits."""
    if TESTING:
        return None  # Disables rate limiting
    return get_remote_address(request)


# Create limiter instance with IP-based rate limiting
limiter = Limiter(key_func=get_rate_limit_key, enabled=not TESTING)

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
