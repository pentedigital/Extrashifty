"""Appeal models for penalty dispute resolution.

This module provides a unified appeal system that works with:
- Penalties (from penalty.py)
- Strikes (from penalty.py)
- Suspensions (from penalty.py)

It also provides emergency waiver tracking for one-time yearly exceptions.
"""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlmodel import Column, Field, Index, JSON, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class AppealType(str, Enum):
    """Types of appeals that can be submitted."""

    PENALTY = "penalty"  # Appeal against a financial penalty
    STRIKE = "strike"  # Appeal against a strike on record
    SUSPENSION = "suspension"  # Appeal against account suspension


class AppealStatus(str, Enum):
    """Status of an appeal."""

    PENDING = "pending"  # Awaiting review
    APPROVED = "approved"  # Appeal granted
    DENIED = "denied"  # Appeal rejected
    WITHDRAWN = "withdrawn"  # User withdrew the appeal


class EmergencyType(str, Enum):
    """Types of documented emergencies for waiver eligibility."""

    MEDICAL = "medical"  # Medical emergency (requires hospital documentation)
    FAMILY = "family"  # Family emergency (case-by-case review)
    NATURAL_DISASTER = "natural_disaster"  # Natural disaster
    TRANSIT = "transit"  # Public transit failure
    OTHER = "other"  # Other emergency (requires documentation)


class Appeal(SQLModel, table=True):
    """
    Unified appeal model for penalty dispute resolution.

    Appeal windows:
    - Penalties: 7 days from incident
    - Strikes: 7 days from incident
    - Suspensions: 72 hours from start of suspension

    Review timeline: Platform reviews within 3 business days.

    Outcomes:
    - Approved: Penalty waived, strike removed, or suspension lifted
    - Denied: Appeal rejected
    - Denied (frivolous): $25 appeal fee charged
    """

    __tablename__ = "appeals"
    __table_args__ = (
        Index("ix_appeals_user_id", "user_id"),
        Index("ix_appeals_status", "status"),
        Index("ix_appeals_appeal_type", "appeal_type"),
        Index("ix_appeals_created_at", "created_at"),
        Index("ix_appeals_appeal_deadline", "appeal_deadline"),
        Index("ix_appeals_related_type_id", "appeal_type", "related_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    appeal_type: AppealType = Field(default=AppealType.PENALTY)
    related_id: int = Field(
        description="ID of the related penalty, strike, or suspension"
    )
    reason: str = Field(max_length=2000, description="User's reason for appeal")
    evidence_urls: list[str] | None = Field(
        default=None,
        sa_column=Column(JSON),
        description="JSON array of evidence URLs/attachments",
    )
    emergency_type: EmergencyType | None = Field(
        default=None,
        description="Type of emergency if claiming emergency waiver",
    )
    status: AppealStatus = Field(default=AppealStatus.PENDING)
    reviewer_notes: str | None = Field(
        default=None,
        max_length=2000,
        description="Admin notes on the review decision",
    )
    reviewed_by: int | None = Field(
        default=None,
        foreign_key="users.id",
        description="Admin who reviewed the appeal",
    )
    reviewed_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    appeal_deadline: datetime = Field(
        description="Deadline by which appeal must be submitted"
    )
    frivolous_fee_charged: bool = Field(
        default=False,
        description="Whether the $25 frivolous appeal fee was charged",
    )
    emergency_waiver_used: bool = Field(
        default=False,
        description="Whether an emergency waiver was applied",
    )

    # Relationships
    user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Appeal.user_id]"}
    )
    reviewer: "User | None" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Appeal.reviewed_by]"}
    )


class EmergencyWaiver(SQLModel, table=True):
    """
    Tracks emergency waiver usage - one per user per year.

    Emergency exceptions allow penalties to be waived for documented emergencies:
    - Medical emergency (requires hospital documentation)
    - Family emergency (case-by-case review)
    - Natural disaster / public transit failure
    - One-time waiver per user per year
    """

    __tablename__ = "emergency_waivers"
    __table_args__ = (
        Index("ix_emergency_waivers_user_id_year", "user_id", "year", unique=True),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    year: int = Field(description="Calendar year the waiver was used")
    used_at: datetime = Field(default_factory=datetime.utcnow)
    appeal_id: int = Field(
        foreign_key="appeals.id",
        description="The appeal that used this waiver",
    )
    emergency_type: EmergencyType = Field(
        description="Type of emergency that was documented"
    )

    # Relationships
    user: "User" = Relationship()
    appeal: "Appeal" = Relationship()
