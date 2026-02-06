"""Invoice and receipt models for ExtraShifty."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlmodel import JSON, Column, Field, Index, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class InvoiceType(str, Enum):
    """Invoice type enumeration."""

    COMPANY_RECEIPT = "company_receipt"  # Receipt for company top-ups
    STAFF_PAY_STUB = "staff_pay_stub"    # Pay stub for staff payouts
    AGENCY_INVOICE = "agency_invoice"    # Invoice to agency clients


class InvoiceStatus(str, Enum):
    """Invoice status enumeration."""

    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"


class Invoice(SQLModel, table=True):
    """Invoice model for receipts, pay stubs, and agency invoices."""

    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_invoice_number", "invoice_number", unique=True),
        Index("ix_invoices_user_id_type", "user_id", "invoice_type"),
        Index("ix_invoices_issued_at", "issued_at"),
        Index("ix_invoices_status", "status"),
        Index("ix_invoices_transaction_id", "transaction_id"),
        Index("ix_invoices_payout_id", "payout_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    invoice_number: str = Field(max_length=50)  # Format: INV-YYYY-NNNNNN (unique index in __table_args__)
    invoice_type: InvoiceType = Field(default=InvoiceType.COMPANY_RECEIPT)
    user_id: int = Field(foreign_key="users.id", index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    currency: str = Field(default="EUR", max_length=3)
    tax_amount: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    total_amount: Decimal = Field(max_digits=12, decimal_places=2)
    status: InvoiceStatus = Field(default=InvoiceStatus.DRAFT)

    # For company receipts
    payment_method: str | None = Field(default=None, max_length=50)  # card, bank_transfer, ach
    transaction_id: int | None = Field(default=None, foreign_key="transactions.id")

    # For staff pay stubs
    payout_id: int | None = Field(default=None, foreign_key="payouts.id")
    period_start: date | None = Field(default=None)
    period_end: date | None = Field(default=None)
    shifts_count: int | None = Field(default=None, ge=0)
    hours_worked: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    gross_earnings: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    platform_fee: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)  # Hidden from user display
    net_earnings: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)

    # PDF storage
    pdf_url: str | None = Field(default=None, max_length=500)

    # Timestamps
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: date | None = Field(default=None)
    paid_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Extra metadata
    extra_data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    # Relationships
    user: "User" = Relationship()
