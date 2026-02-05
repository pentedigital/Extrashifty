"""Penalty and Strike schemas for ExtraShifty no-show system."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.penalty import AppealStatus, PenaltyStatus


# ==================== Strike Schemas ====================


class StrikeResponse(BaseModel):
    """Response schema for a strike."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    shift_id: Optional[int] = None
    reason: str
    created_at: datetime
    expires_at: datetime
    is_active: bool
    is_warning_only: bool
    days_until_expiry: Optional[int] = None


class StrikeListResponse(BaseModel):
    """Response schema for list of strikes."""

    items: list[StrikeResponse]
    total: int
    active_count: int
    warning_count: int


# ==================== Penalty Schemas ====================


class PenaltyResponse(BaseModel):
    """Response schema for a penalty."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    shift_id: int
    amount: Decimal
    reason: str
    status: PenaltyStatus
    collected_at: Optional[datetime] = None
    collected_amount: Optional[Decimal] = None
    waived_at: Optional[datetime] = None
    waived_by_user_id: Optional[int] = None
    waive_reason: Optional[str] = None
    written_off_at: Optional[datetime] = None
    created_at: datetime
    appeal_deadline: Optional[datetime] = None
    can_appeal: bool = False


class PenaltyListResponse(BaseModel):
    """Response schema for list of penalties."""

    items: list[PenaltyResponse]
    total: int
    pending_count: int
    collected_count: int
    total_amount: Decimal


# ==================== Appeal Schemas ====================


class PenaltyAppealRequest(BaseModel):
    """Request schema for appealing a penalty."""

    reason: str = Field(
        min_length=20,
        max_length=2000,
        description="Detailed reason for the appeal",
    )
    evidence: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Supporting evidence for the appeal",
    )


class AppealResponse(BaseModel):
    """Response schema for a penalty appeal."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    penalty_id: int
    user_id: int
    reason: str
    evidence: Optional[str] = None
    status: AppealStatus
    reviewed_by_user_id: Optional[int] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class AppealReviewRequest(BaseModel):
    """Request schema for admin reviewing an appeal."""

    approved: bool = Field(description="Whether to approve the appeal")
    review_notes: str = Field(
        min_length=10,
        max_length=1000,
        description="Notes explaining the review decision",
    )


class AppealReviewResponse(BaseModel):
    """Response schema for appeal review result."""

    appeal_id: int
    approved: bool
    penalty_waived: bool
    strike_removed: bool
    refund_amount: Optional[Decimal] = None
    message: str


# ==================== Suspension Schemas ====================


class SuspensionResponse(BaseModel):
    """Response schema for a user suspension."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    reason: str
    suspended_at: datetime
    suspended_until: Optional[datetime] = None
    is_active: bool
    lifted_at: Optional[datetime] = None
    lifted_by_user_id: Optional[int] = None
    lift_reason: Optional[str] = None
    days_remaining: Optional[int] = None


class LiftSuspensionRequest(BaseModel):
    """Request schema for lifting a suspension (admin)."""

    reason: str = Field(
        min_length=10,
        max_length=500,
        description="Reason for lifting the suspension",
    )


# ==================== Negative Balance Schemas ====================


class NegativeBalanceResponse(BaseModel):
    """Response schema for a user's negative balance."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    amount: Decimal
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime
    days_until_writeoff: Optional[int] = None


# ==================== Summary Schemas ====================


class PenaltySummaryResponse(BaseModel):
    """Response schema for user's penalty summary."""

    active_strikes: int
    strikes: list[StrikeResponse]
    strikes_until_suspension: int
    negative_balance: Decimal
    pending_penalties: int
    is_suspended: bool
    suspension: Optional[SuspensionResponse] = None
    can_accept_shifts: bool
    warning_message: Optional[str] = None


class AdminPenaltySummaryResponse(BaseModel):
    """Response schema for admin penalty dashboard."""

    total_pending_penalties: int
    total_pending_amount: Decimal
    total_pending_appeals: int
    active_suspensions: int
    users_with_negative_balance: int
    total_negative_balance: Decimal
    penalties_last_30_days: int
    writeoff_candidates: int


# ==================== History Schemas ====================


class PenaltyHistoryItem(BaseModel):
    """History item for penalty timeline."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str  # "penalty", "strike", "appeal", "suspension"
    shift_id: Optional[int] = None
    amount: Optional[Decimal] = None
    reason: str
    status: str
    created_at: datetime


class PenaltyHistoryResponse(BaseModel):
    """Response schema for penalty history timeline."""

    items: list[PenaltyHistoryItem]
    total: int
