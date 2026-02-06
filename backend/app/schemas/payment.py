"""Payment schemas for ExtraShifty payment flow."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from ..models.payment import PayoutStatus
from ..models.wallet import PaymentMethodType


class TopupRequest(BaseModel):
    """Request schema for wallet topup."""

    amount: Decimal = Field(gt=0, description="Amount to add to wallet")
    payment_method_id: int = Field(description="Payment method to charge")
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate charges",
    )


class TopupResponse(BaseModel):
    """Response schema for wallet topup."""

    transaction_id: int
    amount: Decimal
    new_balance: Decimal
    status: str
    message: str


class AutoTopupConfigRequest(BaseModel):
    """Request schema for auto-topup configuration."""

    enabled: bool = Field(description="Enable or disable auto-topup")
    threshold: Decimal | None = Field(
        default=None,
        ge=0,
        description="Balance threshold that triggers auto-topup",
    )
    topup_amount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Amount to add when auto-topup triggers",
    )
    payment_method_id: int | None = Field(
        default=None,
        description="Payment method to use for auto-topup",
    )


class AutoTopupConfigResponse(BaseModel):
    """Response schema for auto-topup configuration."""

    enabled: bool
    threshold: Decimal | None
    topup_amount: Decimal | None
    payment_method_id: int | None
    message: str


class BalanceResponse(BaseModel):
    """Response schema for wallet balance."""

    model_config = ConfigDict(from_attributes=True)

    wallet_id: int
    available: Decimal = Field(description="Available balance for new reservations")
    reserved: Decimal = Field(description="Funds held for active shifts")
    pending_payout: Decimal = Field(description="Earnings pending payout")
    total: Decimal = Field(description="Total balance (available + reserved)")
    currency: str = Field(default="EUR")


class ReserveRequest(BaseModel):
    """Request schema for reserving shift funds."""

    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate reservations",
    )


class ReserveResponse(BaseModel):
    """Response schema for fund reservation."""

    hold_id: int
    shift_id: int
    amount_reserved: Decimal
    remaining_balance: Decimal
    expires_at: datetime
    message: str


class InsufficientFundsResponse(BaseModel):
    """Response for insufficient funds (HTTP 402)."""

    error: str = "insufficient_funds"
    required_amount: Decimal
    available_amount: Decimal
    shortfall: Decimal
    minimum_balance: Decimal | None = None
    message: str


class MinimumBalanceRequest(BaseModel):
    """Request schema for setting minimum balance."""

    minimum_balance: Decimal = Field(
        ge=0,
        description="Minimum balance that must remain after accepting a shift",
    )


class MinimumBalanceResponse(BaseModel):
    """Response schema for minimum balance update."""

    wallet_id: int
    minimum_balance: Decimal
    available_balance: Decimal
    message: str


class SettlementSplit(BaseModel):
    """Details of settlement split."""

    gross_amount: Decimal
    platform_fee: Decimal
    platform_fee_rate: Decimal
    worker_amount: Decimal
    agency_fee: Decimal | None = None


class SettlementResponse(BaseModel):
    """Response schema for shift settlement."""

    shift_id: int
    settlement_id: int
    actual_hours: Decimal
    gross_amount: Decimal
    split: SettlementSplit
    transactions: list[dict]
    message: str


class CancellationPolicy(str, Enum):
    """Cancellation policy types."""

    FULL_REFUND = "full_refund"
    PARTIAL_REFUND = "partial_refund"
    NO_REFUND = "no_refund"
    WORKER_COMPENSATION = "worker_compensation"


class CancelledBy(str, Enum):
    """Who cancelled the shift."""

    COMPANY = "company"
    WORKER = "worker"
    PLATFORM = "platform"


class CancellationRequest(BaseModel):
    """Request schema for shift cancellation."""

    cancelled_by: CancelledBy
    reason: str | None = Field(default=None, max_length=500)
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate cancellations",
    )


class CancellationResponse(BaseModel):
    """Response schema for shift cancellation."""

    shift_id: int
    cancelled_by: CancelledBy
    policy_applied: CancellationPolicy
    refund_amount: Decimal
    worker_compensation: Decimal
    transactions: list[dict]
    message: str


class PayoutRequest(BaseModel):
    """Request schema for instant payout."""

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Amount to withdraw (None = full available balance)",
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate payouts",
    )


class PayoutResponse(BaseModel):
    """Response schema for payout."""

    model_config = ConfigDict(from_attributes=True)

    payout_id: int
    amount: Decimal
    fee: Decimal
    net_amount: Decimal
    status: PayoutStatus
    estimated_arrival: datetime | None = None
    message: str


class PayoutScheduleItem(BaseModel):
    """Single scheduled payout item."""

    scheduled_date: datetime
    estimated_amount: Decimal
    status: str


class PayoutScheduleResponse(BaseModel):
    """Response schema for payout schedule."""

    next_payout_date: datetime | None
    minimum_threshold: Decimal
    current_balance: Decimal
    scheduled_payouts: list[PayoutScheduleItem]


class PayoutHistoryItem(BaseModel):
    """Single payout history item."""

    model_config = ConfigDict(from_attributes=True)

    payout_id: int
    amount: Decimal
    fee: Decimal
    net_amount: Decimal
    status: PayoutStatus
    payout_type: str  # "instant" or "weekly"
    created_at: datetime
    completed_at: datetime | None = None


class PayoutHistoryResponse(BaseModel):
    """Response schema for payout history."""

    items: list[PayoutHistoryItem]
    total: int
