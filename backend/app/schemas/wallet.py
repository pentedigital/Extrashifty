"""Wallet schemas for ExtraShifty."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from ..models.payment import TransactionStatus, TransactionType
from ..models.wallet import PaymentMethodType


class WalletRead(BaseModel):
    """Schema for reading wallet data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    balance: float
    currency: str
    created_at: datetime
    updated_at: datetime


class TransactionRead(BaseModel):
    """Schema for reading transaction data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    wallet_id: int
    type: TransactionType
    amount: float
    description: str
    status: TransactionStatus
    reference_id: str | None
    created_at: datetime


class TransactionListResponse(BaseModel):
    """Paginated transaction list response."""

    items: list[TransactionRead]
    total: int


class WithdrawRequest(BaseModel):
    """Schema for withdrawal request."""

    amount: float = Field(gt=0, description="Amount to withdraw")
    payment_method_id: int = Field(description="Payment method to withdraw to")


class WithdrawResponse(BaseModel):
    """Schema for withdrawal response."""

    transaction_id: int
    amount: float
    status: TransactionStatus
    message: str


class TopUpRequest(BaseModel):
    """Schema for top-up request."""

    amount: float = Field(gt=0, description="Amount to add to wallet")
    payment_method_id: int = Field(description="Payment method to charge")


class TopUpResponse(BaseModel):
    """Schema for top-up response."""

    transaction_id: int
    amount: float
    status: TransactionStatus
    new_balance: float
    message: str


class PaymentMethodRead(BaseModel):
    """Schema for reading payment method data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: PaymentMethodType
    last_four: str
    brand: str | None
    is_default: bool
    created_at: datetime


class PaymentMethodCreate(BaseModel):
    """Schema for creating a payment method."""

    type: PaymentMethodType
    last_four: str = Field(min_length=4, max_length=4)
    brand: str | None = None
    is_default: bool = False
    external_id: str | None = None


class PaymentMethodListResponse(BaseModel):
    """Payment method list response."""

    items: list[PaymentMethodRead]
    total: int
