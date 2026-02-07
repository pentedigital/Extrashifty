"""Token schemas for ExtraShifty."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.user import UserType


class Token(BaseModel):
    """Schema for authentication token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""

    sub: Optional[int] = None
    exp: Optional[datetime] = None
    type: Optional[str] = None
    iat: Optional[datetime] = None
    jti: Optional[str] = None
    ver: Optional[int] = None


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str


class UserInfo(BaseModel):
    """Minimal user info returned with registration."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    user_type: UserType
    is_active: bool
    is_verified: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    """Schema for auth response with tokens and user data."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo


class PasswordRecoveryRequest(BaseModel):
    """Schema for password recovery request."""

    email: EmailStr


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""

    token: str
    new_password: str = Field(min_length=8, max_length=100)


class Message(BaseModel):
    """Generic message response."""

    message: str
