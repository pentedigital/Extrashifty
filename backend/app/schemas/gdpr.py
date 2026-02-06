"""GDPR schemas for ExtraShifty."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..models.gdpr import DeletionRequestStatus


class DeletionRequestCreate(BaseModel):
    """Schema for creating a deletion request."""

    reason: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional reason for account deletion",
    )


class DeletionRequestResponse(BaseModel):
    """Schema for deletion request response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: DeletionRequestStatus
    requested_at: datetime
    reason: str | None
    processing_started_at: datetime | None
    completed_at: datetime | None
    wallet_closed: bool
    wallet_balance_at_deletion: str | None
    pending_payouts_cancelled: int
    transactions_anonymized: int
    shifts_anonymized: int
    reviews_anonymized: int
    notifications_deleted: int
    data_export_url: str | None
    data_export_expires_at: datetime | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class DeletionStatusResponse(BaseModel):
    """Schema for checking deletion status."""

    model_config = ConfigDict(from_attributes=True)

    has_pending_request: bool
    request: DeletionRequestResponse | None = None
    grace_period_ends_at: datetime | None = None
    can_cancel: bool = False
    deletion_scheduled_for: datetime | None = None


class DataExportResponse(BaseModel):
    """Schema for data export response."""

    export_id: int
    status: str
    download_url: str | None = None
    expires_at: datetime | None = None
    message: str


class DataExportDownloadResponse(BaseModel):
    """Schema for data export download."""

    download_url: str
    expires_at: datetime
    file_size_bytes: int | None = None


class DeletionRequestListResponse(BaseModel):
    """Schema for paginated deletion request list (admin)."""

    items: list[DeletionRequestResponse]
    total: int


class AdminDeletionRequestResponse(BaseModel):
    """Extended response for admin viewing deletion requests."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_email: str | None = None
    user_full_name: str | None = None
    status: DeletionRequestStatus
    requested_at: datetime
    reason: str | None
    processing_started_at: datetime | None
    completed_at: datetime | None
    wallet_closed: bool
    wallet_balance_at_deletion: str | None
    pending_payouts_cancelled: int
    transactions_anonymized: int
    shifts_anonymized: int
    reviews_anonymized: int
    notifications_deleted: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime
