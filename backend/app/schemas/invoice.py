"""Invoice schemas for ExtraShifty invoice/receipt endpoints."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class InvoiceType(str, Enum):
    """Invoice type for API."""

    COMPANY_RECEIPT = "company_receipt"
    STAFF_PAY_STUB = "staff_pay_stub"
    AGENCY_INVOICE = "agency_invoice"


class InvoiceStatus(str, Enum):
    """Invoice status for API."""

    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"


class InvoiceBase(BaseModel):
    """Base invoice schema."""

    invoice_number: str
    invoice_type: InvoiceType
    amount: Decimal
    currency: str = "EUR"
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    status: InvoiceStatus


class InvoiceCreate(BaseModel):
    """Schema for creating agency invoices."""

    amount: Decimal = Field(gt=0, description="Invoice amount")
    due_date: date | None = Field(default=None, description="Payment due date")
    description: str | None = Field(default=None, max_length=500, description="Invoice description")


class InvoiceResponse(InvoiceBase):
    """Response schema for invoice details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    issued_at: datetime
    due_date: date | None = None
    paid_at: datetime | None = None
    pdf_url: str | None = None
    created_at: datetime

    # Company receipt fields
    payment_method: str | None = None
    transaction_id: int | None = None

    # Staff pay stub fields
    payout_id: int | None = None
    period_start: date | None = None
    period_end: date | None = None
    shifts_count: int | None = None
    hours_worked: Decimal | None = None
    gross_earnings: Decimal | None = None
    net_earnings: Decimal | None = None
    # Note: platform_fee is intentionally excluded from response


class InvoiceListItem(BaseModel):
    """Simplified invoice item for list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    invoice_type: InvoiceType
    amount: Decimal
    total_amount: Decimal
    currency: str
    status: InvoiceStatus
    issued_at: datetime
    pdf_url: str | None = None


class InvoiceListResponse(BaseModel):
    """Response schema for invoice list."""

    items: list[InvoiceListItem]
    total: int


class InvoiceResendResponse(BaseModel):
    """Response schema for resending invoice email."""

    success: bool
    message: str


class CompanyReceiptDetails(BaseModel):
    """Detailed company receipt information."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    amount: Decimal
    currency: str
    status: InvoiceStatus
    payment_method: str | None
    transaction_id: int | None
    issued_at: datetime
    paid_at: datetime | None
    pdf_url: str | None = None


class StaffPayStubDetails(BaseModel):
    """Detailed staff pay stub information."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    period_start: date | None
    period_end: date | None
    shifts_count: int | None
    hours_worked: Decimal | None
    gross_earnings: Decimal | None
    net_earnings: Decimal | None
    currency: str
    status: InvoiceStatus
    payout_id: int | None
    issued_at: datetime
    paid_at: datetime | None
    pdf_url: str | None = None
