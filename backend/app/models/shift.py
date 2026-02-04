"""Shift model for ExtraShifty."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlmodel import Column, Field, JSON, Relationship, SQLModel

if TYPE_CHECKING:
    from .application import Application
    from .user import User


class ShiftStatus(str, Enum):
    """Shift status enumeration."""

    DRAFT = "draft"
    OPEN = "open"
    FILLED = "filled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Shift(SQLModel, table=True):
    """Shift model representing available work shifts."""

    __tablename__ = "shifts"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)
    company_id: int = Field(foreign_key="users.id", index=True)
    shift_type: str = Field(max_length=100)
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(max_digits=10, decimal_places=2)
    location: str = Field(max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(max_length=100)
    spots_total: int = Field(default=1, ge=1)
    spots_filled: int = Field(default=0, ge=0)
    status: ShiftStatus = Field(default=ShiftStatus.DRAFT)
    requirements: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    company: Optional["User"] = Relationship(back_populates="shifts")
    applications: list["Application"] = Relationship(back_populates="shift")
