"""Stripe Pydantic schemas for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# =========================================================================
# Enums
# =========================================================================


class ConnectAccountType(str, Enum):
    """Stripe Connect account types."""

    STANDARD = "standard"
    EXPRESS = "express"
    CUSTOM = "custom"


class PaymentIntentStatus(str, Enum):
    """Payment intent status values."""

    REQUIRES_PAYMENT_METHOD = "requires_payment_method"
    REQUIRES_CONFIRMATION = "requires_confirmation"
    REQUIRES_ACTION = "requires_action"
    PROCESSING = "processing"
    REQUIRES_CAPTURE = "requires_capture"
    CANCELED = "canceled"
    SUCCEEDED = "succeeded"


class PayoutStatus(str, Enum):
    """Payout status values."""

    PAID = "paid"
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    CANCELED = "canceled"
    FAILED = "failed"


class TransferStatus(str, Enum):
    """Transfer status values (derived from Stripe behavior)."""

    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    CANCELED = "canceled"


# =========================================================================
# Account Schemas
# =========================================================================


class AccountCreateRequest(BaseModel):
    """Request schema for creating a Connect account."""

    email: str = Field(..., description="Email address for the account")
    country: str = Field(
        default="US",
        min_length=2,
        max_length=2,
        description="Two-letter ISO country code",
    )
    business_type: str = Field(
        default="individual",
        description="Type of business: 'individual' or 'company'",
    )
    company_name: str | None = Field(
        default=None,
        description="Company name (required for company business type)",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Additional metadata to store with the account",
    )


class AccountCapabilities(BaseModel):
    """Account capabilities status."""

    card_payments: str | None = None
    transfers: str | None = None


class AccountResponse(BaseModel):
    """Response schema for Connect account operations."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Stripe Connect account ID")
    object: str = Field(default="account")
    type: ConnectAccountType = Field(..., description="Account type")
    email: str | None = Field(default=None, description="Account email")
    country: str | None = Field(default=None, description="Account country")
    business_type: str | None = Field(default=None, description="Business type")
    charges_enabled: bool = Field(
        default=False,
        description="Whether the account can process charges",
    )
    payouts_enabled: bool = Field(
        default=False,
        description="Whether the account can receive payouts",
    )
    details_submitted: bool = Field(
        default=False,
        description="Whether account details have been submitted",
    )
    capabilities: AccountCapabilities | None = Field(
        default=None,
        description="Account capabilities status",
    )
    created: int | None = Field(
        default=None,
        description="Unix timestamp of account creation",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Account metadata",
    )


class AccountLinkRequest(BaseModel):
    """Request schema for creating an account link."""

    account_id: str = Field(..., description="Stripe Connect account ID")
    refresh_url: str = Field(
        ...,
        description="URL to redirect if the link expires",
    )
    return_url: str = Field(
        ...,
        description="URL to redirect after completion",
    )
    link_type: str = Field(
        default="account_onboarding",
        description="Type of link: 'account_onboarding' or 'account_update'",
    )


class AccountLinkResponse(BaseModel):
    """Response schema for account link creation."""

    object: str = Field(default="account_link")
    url: str = Field(..., description="The URL for the account link")
    created: int = Field(..., description="Unix timestamp of link creation")
    expires_at: int = Field(..., description="Unix timestamp when link expires")


# =========================================================================
# Payment Intent Schemas
# =========================================================================


class PaymentIntentRequest(BaseModel):
    """Request schema for creating a payment intent."""

    amount: int = Field(
        ...,
        gt=0,
        description="Amount in smallest currency unit (e.g., cents)",
    )
    currency: str = Field(
        default="eur",
        min_length=3,
        max_length=3,
        description="Three-letter ISO currency code",
    )
    customer_id: str | None = Field(
        default=None,
        description="Stripe Customer ID",
    )
    payment_method_id: str | None = Field(
        default=None,
        description="Stripe PaymentMethod ID to use",
    )
    destination_account_id: str | None = Field(
        default=None,
        description="Connect account ID to receive funds",
    )
    application_fee_amount: int | None = Field(
        default=None,
        ge=0,
        description="Platform fee in smallest currency unit",
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate charges",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Description for the payment",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Additional metadata",
    )


class PaymentIntentResponse(BaseModel):
    """Response schema for payment intent operations."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Payment intent ID")
    object: str = Field(default="payment_intent")
    amount: int = Field(..., description="Amount in smallest currency unit")
    amount_received: int = Field(
        default=0,
        description="Amount received so far",
    )
    currency: str = Field(..., description="Currency code")
    status: PaymentIntentStatus = Field(..., description="Payment intent status")
    client_secret: str | None = Field(
        default=None,
        description="Client secret for frontend confirmation",
    )
    customer: str | None = Field(default=None, description="Customer ID")
    payment_method: str | None = Field(
        default=None,
        description="Payment method ID",
    )
    description: str | None = Field(default=None, description="Description")
    created: int = Field(..., description="Unix timestamp of creation")
    metadata: dict[str, str] | None = Field(default=None, description="Metadata")
    transfer_data: dict[str, Any] | None = Field(
        default=None,
        description="Transfer data for Connect",
    )
    application_fee_amount: int | None = Field(
        default=None,
        description="Application fee amount",
    )


# =========================================================================
# Transfer Schemas
# =========================================================================


class TransferRequest(BaseModel):
    """Request schema for creating a transfer."""

    amount: int = Field(
        ...,
        gt=0,
        description="Amount in smallest currency unit",
    )
    destination_account_id: str = Field(
        ...,
        description="Connect account ID to receive funds",
    )
    currency: str = Field(
        default="eur",
        min_length=3,
        max_length=3,
        description="Three-letter ISO currency code",
    )
    source_transaction: str | None = Field(
        default=None,
        description="Charge ID to transfer funds from",
    )
    transfer_group: str | None = Field(
        default=None,
        description="Group ID for related transfers",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Description of the transfer",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Additional metadata",
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate transfers",
    )


class TransferResponse(BaseModel):
    """Response schema for transfer operations."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Transfer ID")
    object: str = Field(default="transfer")
    amount: int = Field(..., description="Amount transferred")
    amount_reversed: int = Field(default=0, description="Amount reversed")
    currency: str = Field(..., description="Currency code")
    destination: str = Field(..., description="Destination account ID")
    destination_payment: str | None = Field(
        default=None,
        description="Payment ID on the destination account",
    )
    source_transaction: str | None = Field(
        default=None,
        description="Source charge ID",
    )
    transfer_group: str | None = Field(default=None, description="Transfer group")
    description: str | None = Field(default=None, description="Description")
    created: int = Field(..., description="Unix timestamp of creation")
    reversed: bool = Field(default=False, description="Whether fully reversed")
    metadata: dict[str, str] | None = Field(default=None, description="Metadata")


# =========================================================================
# Payout Schemas
# =========================================================================


class PayoutRequest(BaseModel):
    """Request schema for creating a payout."""

    amount: int = Field(
        ...,
        gt=0,
        description="Amount in smallest currency unit",
    )
    connected_account_id: str = Field(
        ...,
        description="Connect account ID to payout from",
    )
    currency: str = Field(
        default="eur",
        min_length=3,
        max_length=3,
        description="Three-letter ISO currency code",
    )
    destination: str | None = Field(
        default=None,
        description="External account ID (bank or card)",
    )
    description: str | None = Field(
        default=None,
        max_length=500,
        description="Description of the payout",
    )
    method: str = Field(
        default="standard",
        description="Payout method: 'standard' or 'instant'",
    )
    metadata: dict[str, str] | None = Field(
        default=None,
        description="Additional metadata",
    )
    idempotency_key: str | None = Field(
        default=None,
        max_length=255,
        description="Unique key to prevent duplicate payouts",
    )


class PayoutResponse(BaseModel):
    """Response schema for payout operations."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Payout ID")
    object: str = Field(default="payout")
    amount: int = Field(..., description="Amount in smallest currency unit")
    currency: str = Field(..., description="Currency code")
    status: PayoutStatus = Field(..., description="Payout status")
    arrival_date: int = Field(..., description="Expected arrival date")
    destination: str | None = Field(
        default=None,
        description="Destination bank account or card",
    )
    method: str = Field(..., description="Payout method")
    description: str | None = Field(default=None, description="Description")
    created: int = Field(..., description="Unix timestamp of creation")
    failure_code: str | None = Field(
        default=None,
        description="Failure code if payout failed",
    )
    failure_message: str | None = Field(
        default=None,
        description="Failure message if payout failed",
    )
    metadata: dict[str, str] | None = Field(default=None, description="Metadata")


# =========================================================================
# Webhook Schemas
# =========================================================================


class WebhookEventData(BaseModel):
    """Data object within a webhook event."""

    object: dict[str, Any] = Field(..., description="The event object data")
    previous_attributes: dict[str, Any] | None = Field(
        default=None,
        description="Previous values for updated attributes",
    )


class WebhookEvent(BaseModel):
    """Schema for Stripe webhook events."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique event ID")
    object: str = Field(default="event")
    api_version: str | None = Field(default=None, description="API version")
    type: str = Field(..., description="Event type (e.g., 'payment_intent.succeeded')")
    created: int = Field(..., description="Unix timestamp of event creation")
    livemode: bool = Field(..., description="Whether this is a live mode event")
    pending_webhooks: int = Field(
        default=0,
        description="Number of pending webhooks for this event",
    )
    data: WebhookEventData = Field(..., description="Event data")
    request: dict[str, Any] | None = Field(
        default=None,
        description="Request that triggered the event",
    )
    account: str | None = Field(
        default=None,
        description="Connect account ID if applicable",
    )


class WebhookResponse(BaseModel):
    """Response schema for webhook processing."""

    received: bool = Field(default=True, description="Whether event was received")
    event_id: str = Field(..., description="The processed event ID")
    event_type: str = Field(..., description="The event type")
    processed_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp of processing",
    )
    message: str | None = Field(
        default=None,
        description="Optional message about processing",
    )


# =========================================================================
# Balance Schemas
# =========================================================================


class BalanceAmount(BaseModel):
    """Balance amount for a specific currency."""

    amount: int = Field(..., description="Amount in smallest currency unit")
    currency: str = Field(..., description="Currency code")
    source_types: dict[str, int] | None = Field(
        default=None,
        description="Breakdown by source type",
    )


class BalanceResponse(BaseModel):
    """Response schema for balance retrieval."""

    object: str = Field(default="balance")
    available: list[BalanceAmount] = Field(
        default_factory=list,
        description="Available balance",
    )
    pending: list[BalanceAmount] = Field(
        default_factory=list,
        description="Pending balance",
    )
    livemode: bool = Field(..., description="Whether this is live mode")
