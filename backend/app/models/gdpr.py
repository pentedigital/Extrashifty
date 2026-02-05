"""GDPR data deletion models for ExtraShifty."""

from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class DeletionRequestStatus(str, Enum):
    """Status for GDPR deletion requests."""

    PENDING = "pending"           # Request received
    PROCESSING = "processing"     # Deletion in progress
    COMPLETED = "completed"       # Fully deleted
    FAILED = "failed"            # Error during deletion
    CANCELLED = "cancelled"       # User cancelled request


class DeletionRequest(SQLModel, table=True):
    """Track GDPR deletion requests."""

    __tablename__ = "deletion_requests"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    status: DeletionRequestStatus = Field(default=DeletionRequestStatus.PENDING)

    # Request details
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    reason: str | None = Field(default=None, max_length=1000)

    # Processing details
    processing_started_at: datetime | None = Field(default=None)
    completed_at: datetime | None = Field(default=None)

    # What was deleted
    wallet_closed: bool = Field(default=False)
    wallet_balance_at_deletion: str | None = Field(default=None, max_length=500)  # JSON of final balances
    pending_payouts_cancelled: int = Field(default=0)
    transactions_anonymized: int = Field(default=0)
    shifts_anonymized: int = Field(default=0)
    reviews_anonymized: int = Field(default=0)
    notifications_deleted: int = Field(default=0)

    # Data export
    data_export_url: str | None = Field(default=None, max_length=500)  # Temporary URL for data export
    data_export_expires_at: datetime | None = Field(default=None)

    # Error tracking
    error_message: str | None = Field(default=None, max_length=2000)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
