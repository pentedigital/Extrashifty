"""Agency model for ExtraShifty."""

from datetime import date, datetime
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


class StaffInvitation(SQLModel, table=True):
    """Model for pending staff invitations."""

    __tablename__ = "staff_invitations"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    email: str = Field(max_length=255, index=True)
    message: str | None = Field(default=None, max_length=1000)
    status: str = Field(default="pending")  # pending, accepted, expired
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime | None = Field(default=None)


class AgencyStaffMember(SQLModel, table=True):
    """Model for agency staff members."""

    __tablename__ = "agency_staff_members"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    staff_user_id: int = Field(index=True)
    status: str = Field(default="active")  # active, inactive, pending
    is_available: bool = Field(default=True)
    shifts_completed: int = Field(default=0)
    total_hours: float = Field(default=0.0)
    notes: str | None = Field(default=None, max_length=2000)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgencyClient(SQLModel, table=True):
    """Model for agency client relationships."""

    __tablename__ = "agency_clients"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    business_email: str = Field(max_length=255, index=True)
    billing_rate_markup: float | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=2000)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgencyClientInvoice(SQLModel, table=True):
    """Model for agency client invoices (separate from payment invoices)."""

    __tablename__ = "agency_client_invoices"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    client_id: int = Field(index=True)
    invoice_number: str = Field(max_length=50, unique=True, index=True)
    status: str = Field(default="draft")  # draft, sent, paid, overdue
    amount: float = Field(default=0.0)
    currency: str = Field(default="EUR", max_length=3)
    period_start: date = Field()
    period_end: date = Field()
    due_date: date = Field()
    paid_date: date | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PayrollEntry(SQLModel, table=True):
    """Model for staff payroll entries."""

    __tablename__ = "payroll_entries"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    staff_member_id: int = Field(index=True)
    period_start: date = Field()
    period_end: date = Field()
    status: str = Field(default="pending")  # pending, approved, paid
    hours_worked: float = Field(default=0.0)
    gross_amount: float = Field(default=0.0)
    deductions: float = Field(default=0.0)
    net_amount: float = Field(default=0.0)
    currency: str = Field(default="EUR", max_length=3)
    paid_at: datetime | None = Field(default=None)
    notes: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgencyShiftAssignment(SQLModel, table=True):
    """Model for tracking agency staff assignments to shifts."""

    __tablename__ = "agency_shift_assignments"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    shift_id: int = Field(index=True)
    staff_member_id: int = Field(index=True)  # References AgencyStaffMember.id
    assigned_at: datetime = Field(default_factory=datetime.utcnow)


class AgencyShift(SQLModel, table=True):
    """Model for tracking shifts posted by agencies for their clients."""

    __tablename__ = "agency_shifts"

    id: int | None = Field(default=None, primary_key=True)
    agency_id: int = Field(index=True)
    shift_id: int = Field(index=True, unique=True)  # References Shift.id
    client_id: int = Field(index=True)  # References AgencyClient.id
    created_at: datetime = Field(default_factory=datetime.utcnow)
