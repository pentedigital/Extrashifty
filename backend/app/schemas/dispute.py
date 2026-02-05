"""Dispute schemas for ExtraShifty dispute handling."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.payment import DisputeStatus


class DisputeResolutionType(str, Enum):
    """Resolution types for disputes."""

    FOR_RAISER = "for_raiser"
    AGAINST_RAISER = "against_raiser"
    SPLIT = "split"


class DisputeCreate(BaseModel):
    """Request schema for creating a dispute."""

    shift_id: int = Field(description="ID of the shift being disputed")
    reason: str = Field(
        min_length=20,
        max_length=1000,
        description="Detailed reason for the dispute",
    )
    disputed_amount: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Amount being disputed. If None, disputes full shift amount.",
    )


class EvidenceCreate(BaseModel):
    """Request schema for adding evidence to a dispute."""

    evidence: str = Field(
        min_length=10,
        max_length=5000,
        description="Evidence text supporting the dispute claim",
    )
    evidence_type: Optional[str] = Field(
        default="text",
        max_length=50,
        description="Type of evidence (text, screenshot_url, document_url, etc.)",
    )


class DisputeResolution(BaseModel):
    """Request schema for resolving a dispute (admin only)."""

    resolution: DisputeResolutionType = Field(
        description="Resolution decision"
    )
    admin_notes: str = Field(
        min_length=20,
        max_length=2000,
        description="Admin notes explaining the resolution",
    )
    split_percentage: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="Percentage to give to the raiser if resolution is 'split'. Worker gets this %, company gets (100 - this)%.",
    )


class DisputeUpdate(BaseModel):
    """Request schema for updating dispute status."""

    status: Optional[DisputeStatus] = None
    admin_notes: Optional[str] = Field(default=None, max_length=2000)


class EvidenceResponse(BaseModel):
    """Response schema for dispute evidence."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    dispute_id: int
    user_id: int
    user_name: str
    evidence: str
    evidence_type: str
    created_at: datetime


class DisputeResponse(BaseModel):
    """Response schema for a dispute."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    shift_id: int
    raised_by_user_id: int
    raised_by_user_name: str
    against_user_id: int
    against_user_name: str
    amount_disputed: Decimal
    reason: str
    status: DisputeStatus
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    deadline_at: datetime
    days_until_deadline: float
    evidence_count: int
    escrow_hold_id: Optional[int] = None


class DisputeListResponse(BaseModel):
    """Response schema for list of disputes."""

    items: list[DisputeResponse]
    total: int


class DisputeResolutionResponse(BaseModel):
    """Response schema for dispute resolution."""

    dispute_id: int
    resolution: DisputeResolutionType
    worker_amount: Decimal
    company_amount: Decimal
    status: str
    message: str
