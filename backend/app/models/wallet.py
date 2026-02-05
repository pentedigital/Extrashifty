"""Wallet and payment models for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class TransactionType(str, Enum):
    """Transaction type enumeration."""

    EARNING = "earning"
    WITHDRAWAL = "withdrawal"
    TOP_UP = "top_up"
    PAYMENT = "payment"


class TransactionStatus(str, Enum):
    """Transaction status enumeration."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class PaymentMethodType(str, Enum):
    """Payment method type enumeration."""

    CARD = "card"
    BANK_ACCOUNT = "bank_account"


class Wallet(SQLModel, table=True):
    """Wallet model for user balances."""

    __tablename__ = "wallets"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    balance: float = Field(default=0.0)
    currency: str = Field(default="EUR", max_length=3)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship()
    transactions: list["Transaction"] = Relationship(back_populates="wallet")


class Transaction(SQLModel, table=True):
    """Transaction model for wallet transactions."""

    __tablename__ = "transactions"

    id: int | None = Field(default=None, primary_key=True)
    wallet_id: int = Field(foreign_key="wallets.id", index=True)
    type: TransactionType = Field(default=TransactionType.EARNING)
    amount: float = Field(default=0.0)
    description: str = Field(max_length=500)
    status: TransactionStatus = Field(default=TransactionStatus.PENDING)
    reference_id: str | None = Field(default=None, max_length=100)  # External reference (e.g., Stripe ID)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    wallet: Wallet = Relationship(back_populates="transactions")


class PaymentMethod(SQLModel, table=True):
    """Payment method model for saved payment methods."""

    __tablename__ = "payment_methods"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: PaymentMethodType = Field(default=PaymentMethodType.CARD)
    last_four: str = Field(max_length=4)
    brand: str | None = Field(default=None, max_length=50)  # e.g., "Visa", "Mastercard"
    is_default: bool = Field(default=False)
    external_id: str | None = Field(default=None, max_length=255)  # External reference (e.g., Stripe payment method ID)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship()
