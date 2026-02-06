"""Security utilities for JWT tokens and password hashing."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

# Token types
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# Password hashing: Argon2 (primary) + Bcrypt (legacy fallback)
# This allows transparent migration from bcrypt to Argon2:
# - New passwords are hashed with Argon2
# - Old bcrypt hashes still verify successfully
# - verify_password() returns an updated Argon2 hash when a bcrypt hash is used
password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        subject: The subject of the token (typically user ID).
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT token string.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": TOKEN_TYPE_ACCESS,
    }
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def create_refresh_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT refresh token.

    Args:
        subject: The subject of the token (typically user ID).
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT refresh token string.
    """
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": TOKEN_TYPE_REFRESH,
    }
    encoded_jwt = jwt.encode(
        to_encode,
        settings.REFRESH_SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def verify_refresh_token(token: str) -> dict[str, Any] | None:
    """
    Verify a refresh token and return its payload.

    Args:
        token: The refresh token to verify.

    Returns:
        Token payload dict if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token,
            settings.REFRESH_SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        if payload.get("type") != TOKEN_TYPE_REFRESH:
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> tuple[bool, str | None]:
    """
    Verify a plain password against a hashed password.

    Returns a tuple of (is_valid, updated_hash). If the hash algorithm is
    outdated (e.g., bcrypt when Argon2 is preferred), updated_hash contains
    the new Argon2 hash that should be saved to the database.

    Args:
        plain_password: The plain text password to verify.
        hashed_password: The hashed password to compare against.

    Returns:
        Tuple of (bool, Optional[str]) - (match result, new hash if rehash needed).
    """
    valid, updated_hash = password_hash.verify_and_update(plain_password, hashed_password)
    return valid, updated_hash


def get_password_hash(password: str) -> str:
    """
    Hash a password using Argon2 (current best practice).

    Args:
        password: The plain text password to hash.

    Returns:
        The hashed password string.
    """
    return password_hash.hash(password)
