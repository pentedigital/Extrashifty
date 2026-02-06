"""Penalty and Strike models for ExtraShifty no-show system."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Index, Relationship, SQLModel

from .appeal import AppealStatus

if TYPE_CHECKING:
    from .shift import Shift
    from .user import User


class PenaltyStatus(str, Enum):
    """Penalty status enumeration."""

    PENDING = "pending"        # Penalty not yet collected
    COLLECTED = "collected"    # Penalty has been deducted
    WAIVED = "waived"          # Penalty waived (first offense or appeal)
    WRITTEN_OFF = "written_off"  # Penalty written off after 6 months inactivity


class Strike(SQLModel, table=True):
    """
    Strike model for tracking worker no-show and policy violations.

    Strikes decay after 90 days. 3 active strikes in 90 days = 30-day suspension.
    Same-day cap: Multiple no-shows on the same day count as 1 strike max.
    """

    __tablename__ = "strikes"
    __table_args__ = (
        Index("ix_strikes_user_id_is_active", "user_id", "is_active"),
        Index("ix_strikes_user_id_created_at", "user_id", "created_at"),
        Index("ix_strikes_shift_id", "shift_id"),
        Index("ix_strikes_expires_at", "expires_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    shift_id: int | None = Field(default=None, foreign_key="shifts.id")
    reason: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # 90 days after created_at
    is_active: bool = Field(default=True)
    is_warning_only: bool = Field(default=False)  # First offense = warning, no strike

    # Relationships
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Strike.user_id]"}
    )
    shift: Optional["Shift"] = Relationship()


class Penalty(SQLModel, table=True):
    """
    Penalty model for tracking financial penalties from no-shows.

    Penalty collection priority:
    1. Deduct from pending earnings (next payout)
    2. Deduct from Staff Wallet balance
    3. Create negative balance (carried forward)

    Negative balance rules:
    - Carried forward indefinitely
    - Worker can still accept new shifts
    - All future earnings offset negative balance first
    - After 6 months with no activity: write-off, account suspended
    """

    __tablename__ = "penalties"
    __table_args__ = (
        Index("ix_penalties_user_id_status", "user_id", "status"),
        Index("ix_penalties_created_at", "created_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)  # 50% of shift value
    reason: str = Field(max_length=500)
    status: PenaltyStatus = Field(default=PenaltyStatus.PENDING)
    collected_at: datetime | None = Field(default=None)
    collected_amount: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    waived_at: datetime | None = Field(default=None)
    waived_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    waive_reason: str | None = Field(default=None, max_length=500)
    written_off_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Penalty.user_id]"}
    )
    shift: Optional["Shift"] = Relationship()
    waived_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Penalty.waived_by_user_id]"}
    )


class PenaltyAppeal(SQLModel, table=True):
    """
    Appeal model for workers to contest penalties.

    Appeals must be submitted within 7 days of penalty creation.
    """

    __tablename__ = "penalty_appeals"
    __table_args__ = (
        Index("ix_penalty_appeals_status", "status"),
    )

    id: int | None = Field(default=None, primary_key=True)
    penalty_id: int = Field(foreign_key="penalties.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    reason: str = Field(max_length=2000)
    evidence: str | None = Field(default=None, max_length=5000)
    status: AppealStatus = Field(default=AppealStatus.PENDING)
    reviewed_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    review_notes: str | None = Field(default=None, max_length=1000)
    reviewed_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    penalty: Optional["Penalty"] = Relationship()
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[PenaltyAppeal.user_id]"}
    )
    reviewed_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[PenaltyAppeal.reviewed_by_user_id]"}
    )


class UserSuspension(SQLModel, table=True):
    """
    Suspension model for tracking worker account suspensions.

    Triggers:
    - 3 strikes in 90 days = 30-day suspension
    - 6 months negative balance with no activity = account suspended
    """

    __tablename__ = "user_suspensions"
    __table_args__ = (
        Index("ix_user_suspensions_user_id_is_active", "user_id", "is_active"),
        Index("ix_user_suspensions_suspended_until", "suspended_until"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    reason: str = Field(max_length=500)
    suspended_at: datetime = Field(default_factory=datetime.utcnow)
    suspended_until: datetime | None = Field(default=None)  # None = indefinite
    is_active: bool = Field(default=True)
    lifted_at: datetime | None = Field(default=None)
    lifted_by_user_id: int | None = Field(default=None, foreign_key="users.id")
    lift_reason: str | None = Field(default=None, max_length=500)

    # Relationships
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[UserSuspension.user_id]"}
    )
    lifted_by: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[UserSuspension.lifted_by_user_id]"}
    )


class NegativeBalance(SQLModel, table=True):
    """
    Track negative balance for users who owe penalties but have no funds.

    Negative balance rules:
    - Carried forward indefinitely
    - Worker can still accept new shifts
    - All future earnings offset negative balance first
    - After 6 months with no activity: write-off, account suspended
    """

    __tablename__ = "negative_balances"
    __table_args__ = (
        Index("ix_negative_balances_last_activity_at", "last_activity_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    amount: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)  # Last shift or payment

    # Relationships
    user: Optional["User"] = Relationship()
