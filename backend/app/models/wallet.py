"""Wallet and payment models for ExtraShifty."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Index, Relationship, SQLModel

if TYPE_CHECKING:
    from .payment import FundsHold, Payout
    from .user import User


class WalletType(str, Enum):
    """Wallet type enumeration based on Stripe Connect account types."""

    COMPANY = "company"    # Custom Connect - full control
    STAFF = "staff"        # Express Connect - simplified onboarding
    AGENCY = "agency"      # Standard Connect - self-managed
    PLATFORM = "platform"  # Platform account for ExtraShifty


class PaymentMethodType(str, Enum):
    """Payment method type enumeration."""

    CARD = "card"
    BANK_ACCOUNT = "bank_account"


class Wallet(SQLModel, table=True):
    """Wallet model for user balances and Stripe Connect integration."""

    __tablename__ = "wallets"
    __table_args__ = (
        Index("ix_wallets_stripe_account_id", "stripe_account_id"),
        Index("ix_wallets_wallet_type", "wallet_type"),
        Index("ix_wallets_is_active", "is_active"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    wallet_type: WalletType = Field(default=WalletType.STAFF)
    stripe_account_id: str | None = Field(default=None, max_length=255)  # Stripe Connect account ID
    balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    reserved_balance: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)  # Funds on hold
    currency: str = Field(default="EUR", max_length=3)
    is_active: bool = Field(default=True)
    auto_topup_enabled: bool = Field(default=False)
    auto_topup_threshold: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    auto_topup_amount: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    stripe_onboarding_complete: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship()
    funds_holds: list["FundsHold"] = Relationship(back_populates="wallet")
    payouts: list["Payout"] = Relationship(back_populates="wallet")

    @property
    def available_balance(self) -> Decimal:
        """Calculate available balance (total balance minus reserved funds)."""
        return self.balance - self.reserved_balance


class PaymentMethod(SQLModel, table=True):
    """Payment method model for saved payment methods."""

    __tablename__ = "payment_methods"
    __table_args__ = (
        Index("ix_payment_methods_user_id_is_default", "user_id", "is_default"),
        Index("ix_payment_methods_external_id", "external_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: PaymentMethodType = Field(default=PaymentMethodType.CARD)
    last_four: str = Field(max_length=4)
    brand: str | None = Field(default=None, max_length=50)  # e.g., "Visa", "Mastercard"
    is_default: bool = Field(default=False)
    external_id: str | None = Field(default=None, max_length=255)  # Stripe payment method ID
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship()
