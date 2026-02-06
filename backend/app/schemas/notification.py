"""Notification schemas for ExtraShifty."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    """Schema for creating a notification."""

    user_id: int
    type: str = Field(max_length=50)
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    data: dict[str, Any] | None = None


class NotificationRead(BaseModel):
    """Schema for reading notification data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool
    data: dict[str, Any] | None
    created_at: datetime


class NotificationUpdate(BaseModel):
    """Schema for updating a notification."""

    is_read: bool | None = None


class NotificationPreferenceRead(BaseModel):
    """Schema for reading notification preferences."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    email_enabled: bool
    push_enabled: bool
    shift_updates: bool
    payment_updates: bool
    marketing: bool


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences."""

    email_enabled: bool | None = None
    push_enabled: bool | None = None
    shift_updates: bool | None = None
    payment_updates: bool | None = None
    marketing: bool | None = None


class NotificationListResponse(BaseModel):
    """Paginated notification list response."""

    items: list[NotificationRead]
    total: int
    unread_count: int
