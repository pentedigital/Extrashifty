"""Agency schemas for ExtraShifty."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.agency import AgencyMode


# ==================== Agency Profile Schemas ====================


class AgencyProfileBase(BaseModel):
    """Base schema for agency profile."""

    business_name: Optional[str] = Field(default=None, max_length=255)
    business_registration_number: Optional[str] = Field(default=None, max_length=100)
    tax_id: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=50)
    contact_address: Optional[str] = Field(default=None, max_length=500)
    contact_city: Optional[str] = Field(default=None, max_length=100)


class AgencyProfileCreate(AgencyProfileBase):
    """Schema for creating an agency profile."""

    mode: AgencyMode = AgencyMode.STAFF_PROVIDER


class AgencyProfileUpdate(AgencyProfileBase):
    """Schema for updating an agency profile."""

    client_markup_rate: Optional[Decimal] = Field(
        default=None,
        ge=0,
        le=100,
        description="Percentage markup on shift rates for clients (0-100)"
    )


class AgencyProfileRead(AgencyProfileBase):
    """Schema for reading agency profile data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    mode: AgencyMode
    can_post_for_clients: bool
    client_markup_rate: Optional[Decimal]
    is_verified: bool
    verification_date: Optional[datetime]
    minimum_balance_required: Decimal
    created_at: datetime
    updated_at: datetime


# ==================== Agency Mode Schemas ====================


class AgencyModeUpdateRequest(BaseModel):
    """Request schema for updating agency mode."""

    mode: AgencyMode


class AgencyModeRequirements(BaseModel):
    """Response showing requirements for mode change."""

    target_mode: AgencyMode
    is_eligible: bool
    requirements: list[dict[str, Any]]
    message: str


class AgencyModeUpdateResponse(BaseModel):
    """Response for agency mode update."""

    mode: AgencyMode
    can_post_for_clients: bool
    message: str
    requirements_checked: list[dict[str, Any]]


# ==================== Agency Dashboard Schemas ====================


class AgencyDashboardResponse(BaseModel):
    """Response schema for agency dashboard."""

    mode: AgencyMode
    staff_count: int
    active_staff_count: int
    client_count: Optional[int] = None  # Only for Mode B
    active_shifts: int
    completed_shifts_this_month: int
    pending_payouts: Decimal
    total_earnings_this_month: Decimal
    wallet_balance: Decimal
    wallet_reserved: Decimal

    # Mode-specific stats
    mode_a_stats: Optional[dict[str, Any]] = None  # Staff placements, etc.
    mode_b_stats: Optional[dict[str, Any]] = None  # Client billing, etc.


class AgencyEarningsSummary(BaseModel):
    """Summary of agency earnings."""

    period_start: date
    period_end: date
    gross_revenue: Decimal
    platform_fees: Decimal
    net_earnings: Decimal
    pending_settlements: Decimal
    shifts_completed: int
    total_hours_worked: Decimal


# ==================== Agency Shift Schemas (Mode B) ====================


class AgencyShiftCreateForClient(BaseModel):
    """Schema for creating a shift on behalf of a client (Mode B)."""

    client_id: int
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    shift_type: str = Field(min_length=1, max_length=100)
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    location: str = Field(min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    spots_total: int = Field(default=1, ge=1)
    requirements: Optional[dict[str, Any]] = None


class AgencyShiftResponse(BaseModel):
    """Response schema for agency-managed shift."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    company_id: int
    posted_by_agency_id: Optional[int]
    client_company_id: Optional[int]
    is_agency_managed: bool
    shift_type: str
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal
    location: str
    address: Optional[str]
    city: str
    spots_total: int
    spots_filled: int
    status: str
    requirements: Optional[dict[str, Any]]
    created_at: datetime

    # Computed fields
    client_name: Optional[str] = None
    assigned_staff_count: int = 0


class AgencyShiftListResponse(BaseModel):
    """Response for listing agency shifts."""

    items: list[AgencyShiftResponse]
    total: int


# ==================== Agency Client Schemas (Mode B) ====================


class AgencyClientForShift(BaseModel):
    """Simplified client info for shift creation."""

    id: int
    business_email: str
    business_name: Optional[str] = None
    billing_rate_markup: Optional[float] = None


class AgencyClientListForShifts(BaseModel):
    """Response for listing clients available for shift creation."""

    items: list[AgencyClientForShift]
    total: int


# ==================== Agency Settlement Schemas ====================


class AgencySettlementPreview(BaseModel):
    """Preview of settlement calculation for agency mode."""

    shift_id: int
    gross_amount: Decimal
    platform_fee: Decimal  # 15%
    net_to_agency: Decimal  # 85%
    mode: AgencyMode

    # Mode A: Agency gets 85%, pays staff off-platform
    # Mode B: Agency gets 85%, handles all payments


class AgencyPaymentSummary(BaseModel):
    """Summary of payments for agency dashboard."""

    total_received_this_period: Decimal
    total_pending: Decimal
    total_paid_to_staff: Decimal  # Mode A: tracked off-platform, Mode B: through platform
    platform_fees_paid: Decimal
    net_profit: Decimal
