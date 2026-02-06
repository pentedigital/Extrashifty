"""Profile and clock record models for ExtraShifty."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import JSON, Column, Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .shift import Shift


class StaffProfile(SQLModel, table=True):
    """Extended profile information for staff users."""

    __tablename__ = "staff_profiles"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)

    # Profile fields
    avatar_url: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    bio: str | None = Field(default=None, max_length=2000)
    skills: list[str] | None = Field(default=None, sa_column=Column(JSON))
    hourly_rate: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    is_available: bool = Field(default=True)

    # Location
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CompanyProfile(SQLModel, table=True):
    """Extended profile information for company users."""

    __tablename__ = "company_profiles"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)

    # Business info
    business_type: str | None = Field(default=None, max_length=100)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)

    # Contact info
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ClockRecord(SQLModel, table=True):
    """Clock in/out records for tracking actual work hours."""

    __tablename__ = "clock_records"

    id: int | None = Field(default=None, primary_key=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    staff_user_id: int = Field(foreign_key="users.id", index=True)

    # Clock times
    clock_in: datetime = Field(default_factory=datetime.utcnow)
    clock_out: datetime | None = Field(default=None)

    # Notes
    clock_in_notes: str | None = Field(default=None, max_length=500)
    clock_out_notes: str | None = Field(default=None, max_length=500)

    # Calculated hours (updated on clock out)
    hours_worked: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)

    # Status
    status: str = Field(default="clocked_in", max_length=50)  # clocked_in, clocked_out, approved, disputed

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    shift: Optional["Shift"] = Relationship()


class Venue(SQLModel, table=True):
    """Venue/location model for companies."""

    __tablename__ = "venues"

    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="users.id", index=True)

    # Location info
    name: str = Field(max_length=255)
    address: str = Field(max_length=500)
    city: str = Field(max_length=100)

    # Flags
    is_primary: bool = Field(default=False)
    is_active: bool = Field(default=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
