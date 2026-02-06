"""Appeal schemas for penalty dispute resolution."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.appeal import AppealStatus, AppealType, EmergencyType


class AppealCreate(BaseModel):
    """Request schema for creating an appeal."""

    appeal_type: AppealType = Field(description="Type of appeal (penalty, strike, suspension)")
    related_id: int = Field(description="ID of the penalty, strike, or suspension being appealed")
    reason: str = Field(
        min_length=20,
        max_length=2000,
        description="Detailed reason for the appeal",
    )
    evidence_urls: Optional[list[str]] = Field(
        default=None,
        description="List of URLs to supporting evidence/documentation",
    )
    emergency_type: Optional[EmergencyType] = Field(
        default=None,
        description="Type of emergency if claiming emergency waiver",
    )

    @field_validator("evidence_urls")
    @classmethod
    def validate_evidence_urls(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        """Validate evidence URLs."""
        if v is not None:
            if len(v) > 10:
                raise ValueError("Maximum 10 evidence URLs allowed")
            for url in v:
                if len(url) > 500:
                    raise ValueError("Each evidence URL must be under 500 characters")
        return v


class AppealResponse(BaseModel):
    """Response schema for an appeal."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    appeal_type: AppealType
    related_id: int
    reason: str
    evidence_urls: Optional[list[str]] = None
    emergency_type: Optional[EmergencyType] = None
    status: AppealStatus
    reviewer_notes: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    appeal_deadline: datetime
    days_until_deadline: float
    frivolous_fee_charged: bool = False
    emergency_waiver_used: bool = False


class AppealListResponse(BaseModel):
    """Response schema for list of appeals."""

    items: list[AppealResponse]
    total: int


class AppealReviewRequest(BaseModel):
    """Request schema for reviewing an appeal (admin only)."""

    approved: bool = Field(description="Whether to approve or deny the appeal")
    reviewer_notes: str = Field(
        min_length=20,
        max_length=2000,
        description="Admin notes explaining the decision",
    )
    is_frivolous: bool = Field(
        default=False,
        description="Whether to charge the $25 frivolous appeal fee (only if denied)",
    )
    use_emergency_waiver: bool = Field(
        default=False,
        description="Whether to use the user's emergency waiver (only if approved with emergency_type)",
    )


class AppealReviewResponse(BaseModel):
    """Response schema for appeal review."""

    appeal_id: int
    status: AppealStatus
    reviewer_notes: str
    frivolous_fee_charged: bool = False
    emergency_waiver_used: bool = False
    penalty_waived: bool = False
    strike_removed: bool = False
    suspension_lifted: bool = False
    message: str


class AppealWithdrawResponse(BaseModel):
    """Response schema for withdrawing an appeal."""

    appeal_id: int
    status: AppealStatus
    message: str


class EmergencyWaiverStatusResponse(BaseModel):
    """Response schema for emergency waiver eligibility status."""

    user_id: int
    year: int
    waiver_available: bool
    waiver_used_at: Optional[datetime] = None
    waiver_appeal_id: Optional[int] = None
    waiver_emergency_type: Optional[EmergencyType] = None


class SuspensionResponse(BaseModel):
    """Response schema for a suspension."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    reason: str
    strike_count: int
    status: str
    starts_at: datetime
    ends_at: datetime
    appeal_deadline: datetime
    can_appeal: bool
    lifted_at: Optional[datetime] = None
    lifted_by: Optional[int] = None
    probation_ends_at: Optional[datetime] = None
    is_on_probation: bool = False
    days_remaining: float


class SuspensionListResponse(BaseModel):
    """Response schema for list of suspensions."""

    items: list[SuspensionResponse]
    total: int


class AdminAppealFilters(BaseModel):
    """Query filters for admin appeal listing."""

    status: Optional[AppealStatus] = None
    appeal_type: Optional[AppealType] = None
    emergency_only: bool = False
    user_id: Optional[int] = None


class AdminPendingAppealsResponse(BaseModel):
    """Response schema for admin pending appeals dashboard."""

    total_pending: int
    penalty_appeals: int
    strike_appeals: int
    suspension_appeals: int
    emergency_appeals: int
    appeals_approaching_deadline: int
    items: list[AppealResponse]
