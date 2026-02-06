"""Notification models for ExtraShifty."""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlmodel import Column, Field, JSON, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class Notification(SQLModel, table=True):
    """Notification model for user notifications."""

    __tablename__ = "notifications"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: str = Field(max_length=50)  # 'shift_accepted', 'application_received', 'payment', etc.
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    is_read: bool = Field(default=False)
    data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))  # JSON payload for deep linking
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="notifications")


class NotificationPreference(SQLModel, table=True):
    """Notification preference settings for users."""

    __tablename__ = "notification_preferences"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    email_enabled: bool = Field(default=True)
    push_enabled: bool = Field(default=True)
    shift_updates: bool = Field(default=True)
    payment_updates: bool = Field(default=True)
    marketing: bool = Field(default=False)

    # Relationships
    user: "User" = Relationship(back_populates="notification_preference")
