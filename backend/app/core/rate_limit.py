"""Rate limiting configuration for ExtraShifty."""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create limiter instance with IP-based rate limiting
limiter = Limiter(key_func=get_remote_address)

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
