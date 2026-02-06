"""Shift model for ExtraShifty."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlmodel import JSON, Column, Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .application import Application
    from .review import Review
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

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    description: str | None = Field(default=None)
    company_id: int = Field(foreign_key="users.id", index=True)
    shift_type: str = Field(max_length=100)
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(max_digits=10, decimal_places=2)
    location: str = Field(max_length=255)
    address: str | None = Field(default=None, max_length=500)
    city: str = Field(max_length=100)
    spots_total: int = Field(default=1, ge=1)
    spots_filled: int = Field(default=0, ge=0)
    status: ShiftStatus = Field(default=ShiftStatus.DRAFT)
    requirements: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Time tracking fields for actual work hours
    clock_in_at: datetime | None = Field(default=None, index=True)
    clock_out_at: datetime | None = Field(default=None, index=True)
    actual_hours_worked: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)

    # Agency Mode B (Full Intermediary) fields
    # If agency posted for a client, this is the agency's user ID
    posted_by_agency_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    # The actual client company (for Mode B shifts)
    client_company_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    # True for Mode B shifts where agency manages the full workflow
    is_agency_managed: bool = Field(default=False, index=True)

    # Relationships
    company: Optional["User"] = Relationship(
        back_populates="shifts",
        sa_relationship_kwargs={"foreign_keys": "[Shift.company_id]"}
    )
    applications: list["Application"] = Relationship(back_populates="shift")
    reviews: list["Review"] = Relationship(back_populates="shift")
