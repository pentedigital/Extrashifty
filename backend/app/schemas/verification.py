"""Verification schemas for ExtraShifty shift verification flow."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.shift import ShiftStatus


class ShiftApprovalRequest(BaseModel):
    """Request schema for manager approving a shift."""

    actual_hours: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Actual hours worked (for pro-rating). If None, uses scheduled hours.",
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional notes about the approval",
    )


class ShiftRejectionRequest(BaseModel):
    """Request schema for manager rejecting a shift."""

    reason: str = Field(
        min_length=10,
        max_length=1000,
        description="Reason for rejection (required)",
    )


class HoursAdjustmentRequest(BaseModel):
    """Request schema for adjusting actual hours worked."""

    actual_hours: Decimal = Field(
        ge=0,
        description="Actual hours worked",
    )
    reason: str = Field(
        min_length=5,
        max_length=500,
        description="Reason for adjustment",
    )


class PendingShiftResponse(BaseModel):
    """Response schema for a shift pending approval."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: datetime
    scheduled_hours: Decimal
    clock_in_time: Optional[datetime] = None
    clock_out_time: Optional[datetime] = None
    actual_hours: Optional[Decimal] = None
    hourly_rate: Decimal
    total_amount: Decimal
    worker_id: int
    worker_name: str
    status: ShiftStatus
    hours_since_clock_out: Optional[float] = None
    auto_approve_at: Optional[datetime] = None


class PendingShiftsListResponse(BaseModel):
    """Response schema for list of pending shifts."""

    items: list[PendingShiftResponse]
    total: int


class ShiftApprovalResponse(BaseModel):
    """Response schema for shift approval."""

    shift_id: int
    status: str
    approved_hours: Decimal
    gross_amount: Decimal
    settlement_triggered: bool
    message: str


class ShiftRejectionResponse(BaseModel):
    """Response schema for shift rejection."""

    shift_id: int
    status: str
    dispute_id: int
    reason: str
    message: str
