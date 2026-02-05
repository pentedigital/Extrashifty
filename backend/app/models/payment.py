"""Payment, transaction, and dispute models for ExtraShifty."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlmodel import JSON, Column, Field, Index, Relationship, SQLModel

if TYPE_CHECKING:
    from .shift import Shift
    from .user import User
    from .wallet import Wallet


class TransactionType(str, Enum):
    """Transaction type enumeration for all payment flows."""

    TOPUP = "topup"                      # Adding funds to wallet
    RESERVE = "reserve"                  # Reserving funds for accepted shift
    RELEASE = "release"                  # Releasing reserved funds back to available
    SETTLEMENT = "settlement"            # Paying staff after shift completion
    COMMISSION = "commission"            # Platform commission fee
    PAYOUT = "payout"                    # Withdrawal to bank account
    REFUND = "refund"                    # Refund to company wallet
    CANCELLATION_FEE = "cancellation_fee"  # Fee for late cancellation
    PENALTY = "penalty"                  # Penalty deduction (e.g., no-show by agency worker)


class TransactionStatus(str, Enum):
    """Transaction status enumeration."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FundsHoldStatus(str, Enum):
    """Status for fund holds."""

    ACTIVE = "active"
    RELEASED = "released"
    SETTLED = "settled"
    EXPIRED = "expired"


class PayoutType(str, Enum):
    """Payout type enumeration."""

    WEEKLY = "weekly"    # Standard weekly payout
    INSTANT = "instant"  # Instant payout with 1.5% fee


class PayoutStatus(str, Enum):
    """Payout status enumeration."""

    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DisputeStatus(str, Enum):
    """Dispute status enumeration."""

    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED_FOR_RAISER = "resolved_for_raiser"
    RESOLVED_AGAINST_RAISER = "resolved_against_raiser"
    CLOSED = "closed"


class ScheduledReserveStatus(str, Enum):
    """Status for scheduled reserve operations."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Transaction(SQLModel, table=True):
    """Transaction model for all wallet transactions."""

    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_wallet_id_created_at", "wallet_id", "created_at"),
        Index("ix_transactions_type_status", "transaction_type", "status"),
        Index("ix_transactions_stripe_payment_intent_id", "stripe_payment_intent_id"),
        Index("ix_transactions_stripe_transfer_id", "stripe_transfer_id"),
        Index("ix_transactions_idempotency_key", "idempotency_key", unique=True),
        Index("ix_transactions_related_shift_id", "related_shift_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    wallet_id: int = Field(foreign_key="wallets.id", index=True)
    transaction_type: TransactionType = Field(default=TransactionType.TOPUP)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    fee: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    net_amount: Decimal = Field(max_digits=12, decimal_places=2)
    status: TransactionStatus = Field(default=TransactionStatus.PENDING)
    stripe_payment_intent_id: str | None = Field(default=None, max_length=255)
    stripe_transfer_id: str | None = Field(default=None, max_length=255)
    idempotency_key: str = Field(max_length=255)  # Required for all Stripe calls
    related_shift_id: int | None = Field(default=None, foreign_key="shifts.id")
    description: str = Field(max_length=500)
    extra_data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = Field(default=None)

    # Relationships
    related_shift: "Shift | None" = Relationship()


class FundsHold(SQLModel, table=True):
    """Represents reserved funds for accepted shifts."""

    __tablename__ = "funds_holds"
    __table_args__ = (
        Index("ix_funds_holds_wallet_id_status", "wallet_id", "status"),
        Index("ix_funds_holds_shift_id", "shift_id"),
        Index("ix_funds_holds_expires_at", "expires_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    wallet_id: int = Field(foreign_key="wallets.id", index=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    status: FundsHoldStatus = Field(default=FundsHoldStatus.ACTIVE)
    expires_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    released_at: datetime | None = Field(default=None)

    # Relationships
    wallet: "Wallet" = Relationship(back_populates="funds_holds")
    shift: "Shift" = Relationship()


class Payout(SQLModel, table=True):
    """Payout model for withdrawals to bank accounts."""

    __tablename__ = "payouts"
    __table_args__ = (
        Index("ix_payouts_wallet_id_status", "wallet_id", "status"),
        Index("ix_payouts_scheduled_date", "scheduled_date"),
        Index("ix_payouts_stripe_payout_id", "stripe_payout_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    wallet_id: int = Field(foreign_key="wallets.id", index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    fee: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)  # 1.5% for instant payouts
    net_amount: Decimal = Field(max_digits=12, decimal_places=2)
    payout_type: PayoutType = Field(default=PayoutType.WEEKLY)
    stripe_payout_id: str | None = Field(default=None, max_length=255)
    status: PayoutStatus = Field(default=PayoutStatus.PENDING)
    scheduled_date: date
    paid_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    wallet: "Wallet" = Relationship(back_populates="payouts")


class Dispute(SQLModel, table=True):
    """Dispute model for payment conflicts between users."""

    __tablename__ = "disputes"
    __table_args__ = (
        Index("ix_disputes_shift_id", "shift_id"),
        Index("ix_disputes_raised_by_user_id", "raised_by_user_id"),
        Index("ix_disputes_against_user_id", "against_user_id"),
        Index("ix_disputes_status", "status"),
        Index("ix_disputes_created_at", "created_at"),
        Index("ix_disputes_resolution_deadline", "resolution_deadline"),
        Index("ix_disputes_stripe_dispute_id", "stripe_dispute_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    raised_by_user_id: int = Field(foreign_key="users.id", index=True)
    against_user_id: int = Field(foreign_key="users.id", index=True)
    amount_disputed: Decimal = Field(max_digits=12, decimal_places=2)
    reason: str = Field(max_length=1000)
    evidence: str | None = Field(default=None, max_length=5000)
    status: DisputeStatus = Field(default=DisputeStatus.OPEN)
    resolution_notes: str | None = Field(default=None, max_length=2000)
    resolved_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolution_deadline: datetime | None = Field(
        default=None,
        description="Deadline for platform arbitration (3 business days from creation)",
    )
    stripe_dispute_id: str | None = Field(
        default=None,
        max_length=255,
        description="Stripe dispute ID for disputes originating from Stripe chargebacks",
    )

    # Relationships
    shift: "Shift" = Relationship()
    raised_by_user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Dispute.raised_by_user_id]"}
    )
    against_user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Dispute.against_user_id]"}
    )

    @property
    def is_overdue(self) -> bool:
        """Check if the dispute is past its resolution deadline and still unresolved."""
        if self.resolution_deadline is None:
            return False
        if self.status not in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            return False
        return datetime.utcnow() > self.resolution_deadline

    @property
    def is_approaching_deadline(self) -> bool:
        """Check if the dispute is within 24 hours of its resolution deadline."""
        if self.resolution_deadline is None:
            return False
        if self.status not in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            return False
        now = datetime.utcnow()
        hours_until_deadline = (self.resolution_deadline - now).total_seconds() / 3600
        return 0 < hours_until_deadline <= 24


class ScheduledReserve(SQLModel, table=True):
    """Scheduled reserve for multi-day shift subsequent days."""

    __tablename__ = "scheduled_reserves"
    __table_args__ = (
        Index("ix_scheduled_reserves_shift_id", "shift_id"),
        Index("ix_scheduled_reserves_wallet_id", "wallet_id"),
        Index("ix_scheduled_reserves_status_execute_at", "status", "execute_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    wallet_id: int = Field(foreign_key="wallets.id", index=True)
    shift_date: date  # The specific day this reserve is for
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    execute_at: datetime  # When to execute this reserve (48hrs before day starts)
    status: ScheduledReserveStatus = Field(default=ScheduledReserveStatus.PENDING)
    executed_at: datetime | None = Field(default=None)
    failure_reason: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    shift: "Shift" = Relationship()
    wallet: "Wallet" = Relationship()


class ProcessedWebhookEvent(SQLModel, table=True):
    """Stores processed webhook event IDs for idempotency checking.

    This table prevents duplicate processing of Stripe webhook events
    that may be delivered multiple times due to retries.
    """

    __tablename__ = "processed_webhook_events"
    __table_args__ = (
        Index("ix_processed_webhook_events_event_id", "event_id", unique=True),
        Index("ix_processed_webhook_events_processed_at", "processed_at"),
    )

    id: int | None = Field(default=None, primary_key=True)
    event_id: str = Field(max_length=255, description="Stripe event ID (e.g., evt_...)")
    event_type: str = Field(max_length=100, description="Event type (e.g., payment_intent.succeeded)")
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    result: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
