"""User schemas for ExtraShifty."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..models.user import UserType


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)
    user_type: UserType = UserType.STAFF


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=100)
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class UserRead(BaseModel):
    """Schema for reading user data."""

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


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str
