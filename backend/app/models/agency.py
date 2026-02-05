"""Agency model for ExtraShifty."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel


class AgencyMode(str, Enum):
    """Agency operating mode enumeration."""

    STAFF_PROVIDER = "staff_provider"      # Mode A: Agency provides staff to other companies
    FULL_INTERMEDIARY = "full_intermediary"  # Mode B: Agency is client-facing, posts shifts for clients


class AgencyProfile(SQLModel, table=True):
    """Agency profile with mode-specific settings."""

    __tablename__ = "agency_profiles"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)

    # Agency mode determines operating behavior
    mode: AgencyMode = Field(default=AgencyMode.STAFF_PROVIDER)

    # Mode B (FULL_INTERMEDIARY) specific fields
    can_post_for_clients: bool = Field(default=False)
    client_markup_rate: Decimal | None = Field(
        default=None,
        max_digits=5,
        decimal_places=2,
        description="Percentage markup on shift rates for clients (0-100)"
    )

    # Verification and status
    is_verified: bool = Field(default=False)
    verification_date: datetime | None = Field(default=None)

    # Business information
    business_name: str | None = Field(default=None, max_length=255)
    business_registration_number: str | None = Field(default=None, max_length=100)
    tax_id: str | None = Field(default=None, max_length=100)

    # Contact information
    contact_phone: str | None = Field(default=None, max_length=50)
    contact_address: str | None = Field(default=None, max_length=500)
    contact_city: str | None = Field(default=None, max_length=100)

    # Mode B requirements tracking
    minimum_balance_required: Decimal = Field(
        default=Decimal("1000.00"),
        max_digits=12,
        decimal_places=2,
        description="Minimum wallet balance required for Mode B"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgencyModeChangeRequest(SQLModel, table=True):
    """Track agency mode change requests for audit purposes."""

    __tablename__ = "agency_mode_change_requests"

    id: int | None = Field(default=None, primary_key=True)
    agency_profile_id: int = Field(foreign_key="agency_profiles.id", index=True)

    from_mode: AgencyMode = Field()
    to_mode: AgencyMode = Field()

    status: str = Field(default="pending")  # pending, approved, rejected
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: datetime | None = Field(default=None)
    processed_by: int | None = Field(default=None)  # Admin user ID

    rejection_reason: str | None = Field(default=None, max_length=500)

    # Requirements check at time of request
    requirements_met: bool = Field(default=False)
    requirements_details: str | None = Field(default=None, max_length=2000)
