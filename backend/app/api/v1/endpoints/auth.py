"""Authentication endpoints."""

import logging
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.api.deps import ActiveUserDep, SessionDep
from app.core.cache import blacklist_jti, invalidate_cached_user, is_jti_blacklisted
from app.core.config import settings
from app.core.rate_limit import (
    AUTH_RATE_LIMIT,
    DEFAULT_RATE_LIMIT,
    LOGIN_RATE_LIMIT,
    PASSWORD_RESET_RATE_LIMIT,
    REGISTER_RATE_LIMIT,
    limiter,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_refresh_token,
)
from app.crud import user as user_crud
from app.email import send_verification_email
from app.email.send import send_password_reset_email
from app.models.user import User
from app.schemas.token import (
    AuthResponse,
    Message,
    PasswordResetRequest,
    RefreshTokenRequest,
    Token,
    UserInfo,
)
from app.schemas.user import UserCreate, UserRead

logger = logging.getLogger(__name__)
router = APIRouter()

# Token type for email verification
TOKEN_TYPE_VERIFICATION = "email_verification"
# Token type for password reset
TOKEN_TYPE_PASSWORD_RESET = "password_reset"
# Password reset token expiry (1 hour)
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1


class LogoutResponse(BaseModel):
    """Response model for logout endpoint."""

    message: str


class VerifyEmailResponse(BaseModel):
    """Response model for email verification endpoint."""

    message: str
    verified: bool


def create_verification_token(user_id: int, email: str) -> str:
    """
    Create a JWT token for email verification.

    Args:
        user_id: The user's ID.
        email: The user's email address.

    Returns:
        Encoded JWT verification token.
    """
    expire = datetime.now(UTC) + timedelta(hours=24)
    to_encode = {
        "exp": expire,
        "sub": str(user_id),
        "email": email,
        "type": TOKEN_TYPE_VERIFICATION,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_verification_token(token: str) -> dict[str, Any] | None:
    """
    Verify an email verification token and return its payload.

    Args:
        token: The verification token to verify.

    Returns:
        Token payload dict if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != TOKEN_TYPE_VERIFICATION:
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def create_password_reset_token(user_id: int, email: str) -> str:
    """
    Create a JWT token for password reset.

    Args:
        user_id: The user's ID.
        email: The user's email address.

    Returns:
        Encoded JWT password reset token.
    """
    expire = datetime.now(UTC) + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "exp": expire,
        "sub": str(user_id),
        "email": email,
        "type": TOKEN_TYPE_PASSWORD_RESET,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> dict[str, Any] | None:
    """
    Verify a password reset token and return its payload.

    Args:
        token: The password reset token to verify.

    Returns:
        Token payload dict if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        if payload.get("type") != TOKEN_TYPE_PASSWORD_RESET:
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def create_tokens(user_id: int, token_version: int = 0) -> Token:
    """Create access and refresh tokens for a user."""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    access_token = create_access_token(
        subject=str(user_id),
        expires_delta=access_token_expires,
        token_version=token_version,
    )
    refresh_token = create_refresh_token(
        subject=str(user_id),
        expires_delta=refresh_token_expires,
        token_version=token_version,
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


class LoginResponse(Token):
    """Response model for login endpoint with optional warning."""

    warning: str | None = None


@router.post("/login", response_model=LoginResponse)
@limiter.limit(LOGIN_RATE_LIMIT)
def login(
    request: Request,
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> LoginResponse:
    """Login and get access and refresh tokens."""
    user = user_crud.get_by_email(session, email=form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    valid, updated_hash = verify_password(form_data.password, user.hashed_password)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Transparently upgrade legacy bcrypt hashes to Argon2
    if updated_hash:
        user.hashed_password = updated_hash
        session.add(user)
        session.commit()
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    tokens = create_tokens(user.id, user.token_version)

    # Warn if user email is not verified (but allow login)
    warning = None
    if not user.is_verified:
        logger.warning(f"Unverified user logged in: {user.email}")
        warning = "Please verify your email address to access all features."

    return LoginResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        warning=warning,
    )


@router.post("/refresh", response_model=Token)
@limiter.limit(AUTH_RATE_LIMIT)
def refresh_token(
    request: Request,
    session: SessionDep,
    token_request: RefreshTokenRequest,
) -> Token:
    """
    Refresh access token using refresh token.

    Implements one-time-use refresh tokens with replay detection:
    - Each refresh token can only be used once (JTI is blacklisted after use).
    - If a blacklisted refresh token is reused, this indicates potential token
      theft. All tokens for the user are immediately revoked by incrementing
      token_version.
    """
    payload = verify_refresh_token(token_request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Replay detection: if this refresh token was already used, someone
    # may have stolen the token. Revoke ALL tokens for this user.
    if jti and is_jti_blacklisted(jti):
        logger.warning(f"Refresh token replay detected for user {user_id}, jti={jti}")
        user = user_crud.get(session, id=int(user_id))
        if user:
            user.token_version += 1
            session.add(user)
            session.commit()
            invalidate_cached_user(user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_crud.get(session, id=int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Check token version matches (rejects tokens from before password change)
    token_ver = payload.get("ver", 0)
    if token_ver != user.token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Blacklist this refresh token's JTI (one-time use enforcement)
    if jti:
        blacklist_jti(jti)

    # Issue new tokens (token rotation)
    return create_tokens(user.id, user.token_version)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(REGISTER_RATE_LIMIT)
def register(
    request: Request,
    session: SessionDep,
    user_in: UserCreate,
) -> AuthResponse:
    """Register a new user and return tokens with user data."""
    existing_user = user_crud.get_by_email(session, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = user_crud.create(session, obj_in=user_in)

    # Send verification email
    verification_token = create_verification_token(user.id, user.email)
    email_sent = send_verification_email(
        email_to=user.email,
        verification_token=verification_token,
        full_name=user.full_name,
    )
    if not email_sent:
        logger.warning(f"Failed to send verification email to {user.email}")

    # Generate tokens for immediate login after registration
    tokens = create_tokens(user.id)

    # Build user info for response
    user_info = UserInfo(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        user_type=user.user_type,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )

    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        user=user_info,
    )


@router.get("/me", response_model=UserRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_me(request: Request, current_user: ActiveUserDep) -> User:
    """Get current user."""
    return current_user


@router.post("/logout", response_model=LogoutResponse)
@limiter.limit(AUTH_RATE_LIMIT)
def logout(request: Request, session: SessionDep, current_user: ActiveUserDep) -> LogoutResponse:
    """
    Logout the current user.

    Increments token_version to invalidate all existing access and refresh tokens.
    """
    current_user.token_version += 1
    session.add(current_user)
    session.commit()
    invalidate_cached_user(current_user.id)
    return LogoutResponse(message="Successfully logged out")


@router.post("/verify-email/{token}", response_model=VerifyEmailResponse)
@limiter.limit(AUTH_RATE_LIMIT)
def verify_email(
    request: Request,
    session: SessionDep,
    token: str,
) -> VerifyEmailResponse:
    """
    Verify user's email address using the verification token.

    Args:
        token: The email verification token sent to the user's email.

    Returns:
        Success message and verification status.
    """
    payload = verify_verification_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload",
        )

    user = user_crud.get(session, id=int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify the email matches
    if user.email != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not match user email",
        )

    # Check if already verified
    if user.is_verified:
        return VerifyEmailResponse(
            message="Email is already verified",
            verified=True,
        )

    # Update user verification status
    user.is_verified = True
    session.add(user)
    session.commit()

    logger.info(f"Email verified for user: {user.email}")

    return VerifyEmailResponse(
        message="Email successfully verified",
        verified=True,
    )


@router.post("/password-recovery/{email}", response_model=Message)
@limiter.limit(PASSWORD_RESET_RATE_LIMIT)
def request_password_recovery(
    request: Request,
    session: SessionDep,
    email: str,
) -> Message:
    """
    Request password recovery for a user.

    Generates a password reset token and sends it to the user's email.
    For security reasons, always returns success even if the email is not found.
    """
    user = user_crud.get_by_email(session, email=email)

    if user:
        # Generate password reset token
        reset_token = create_password_reset_token(user.id, user.email)

        # Send password reset email
        email_sent = send_password_reset_email(
            email_to=user.email,
            reset_token=reset_token,
            full_name=user.full_name,
        )
        if email_sent:
            logger.info(f"Password reset email sent to: {user.email}")
        else:
            logger.warning(f"Failed to send password reset email to: {user.email}")
    else:
        # Log for security monitoring but don't reveal to client
        logger.info(f"Password recovery requested for non-existent email: {email}")

    # Always return success to prevent email enumeration
    return Message(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=Message)
@limiter.limit(PASSWORD_RESET_RATE_LIMIT)
def reset_password(
    request: Request,
    session: SessionDep,
    reset_request: PasswordResetRequest,
) -> Message:
    """
    Reset user password using a valid reset token.

    Args:
        reset_request: Contains the reset token and new password.

    Returns:
        Success message if password was reset.

    Raises:
        HTTPException: If token is invalid, expired, or user not found.
    """
    # Verify the reset token
    payload = verify_password_reset_token(reset_request.token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token",
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token payload",
        )

    # Fetch the user
    user = user_crud.get(session, id=int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify the email matches (additional security check)
    if user.email != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not match user",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    # Update the password and invalidate existing tokens
    user.hashed_password = get_password_hash(reset_request.new_password)
    user.password_changed_at = datetime.now(UTC)
    user.token_version += 1
    session.add(user)
    session.commit()
    invalidate_cached_user(user.id)

    logger.info(f"Password reset successful for user: {user.email}")

    return Message(message="Password has been reset successfully")
