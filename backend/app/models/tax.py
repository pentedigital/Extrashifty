"""Tax compliance models for ExtraShifty (1099-NEC for US contractors)."""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Index, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class TaxFormType(str, Enum):
    """Tax form type enumeration."""

    FORM_1099_NEC = "1099_nec"
    FORM_W9 = "w9"


class TaxFormStatus(str, Enum):
    """Tax form status enumeration for tracking 1099-NEC workflow."""

    NOT_REQUIRED = "not_required"      # Under $600 threshold
    PENDING_W9 = "pending_w9"          # Need W9 from user
    W9_RECEIVED = "w9_received"        # W9 submitted
    FORM_GENERATED = "form_generated"  # 1099 ready
    FORM_FILED = "form_filed"          # Filed with IRS
    FORM_SENT = "form_sent"            # Sent to recipient


class TaxYear(SQLModel, table=True):
    """Track earnings per user per tax year for 1099-NEC compliance."""

    __tablename__ = "tax_years"
    __table_args__ = (
        Index("ix_tax_years_user_id_tax_year", "user_id", "tax_year", unique=True),
        Index("ix_tax_years_status", "status"),
        Index("ix_tax_years_threshold_reached", "threshold_reached"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    tax_year: int  # e.g., 2024
    country: str = Field(default="US", max_length=2)

    # Earnings tracking
    total_earnings: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=12,
        decimal_places=2,
    )
    threshold_amount: Decimal = Field(
        default=Decimal("600.00"),
        max_digits=10,
        decimal_places=2,
    )
    threshold_reached: bool = Field(default=False)
    threshold_reached_at: datetime | None = Field(default=None)

    # Status workflow
    status: TaxFormStatus = Field(default=TaxFormStatus.NOT_REQUIRED)

    # W9 information (collected when threshold reached)
    w9_submitted_at: datetime | None = Field(default=None)
    legal_name: str | None = Field(default=None, max_length=255)
    business_name: str | None = Field(default=None, max_length=255)
    tax_classification: str | None = Field(default=None, max_length=50)  # individual, llc, corporation
    ssn_last_four: str | None = Field(default=None, max_length=4)  # Only store last 4 for reference
    ssn_token: str | None = Field(default=None, max_length=255)  # Stripe Identity or secure vault token
    address_line1: str | None = Field(default=None, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=2)  # US state code
    zip_code: str | None = Field(default=None, max_length=10)

    # 1099-NEC details
    form_generated_at: datetime | None = Field(default=None)
    form_filed_at: datetime | None = Field(default=None)
    form_sent_at: datetime | None = Field(default=None)
    irs_confirmation: str | None = Field(default=None, max_length=255)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="tax_years")
    documents: list["TaxDocument"] = Relationship(back_populates="tax_year")


class TaxDocument(SQLModel, table=True):
    """Store tax documents (W9, 1099-NEC)."""

    __tablename__ = "tax_documents"
    __table_args__ = (
        Index("ix_tax_documents_tax_year_id", "tax_year_id"),
        Index("ix_tax_documents_document_type", "document_type"),
    )

    id: int | None = Field(default=None, primary_key=True)
    tax_year_id: int = Field(foreign_key="tax_years.id", index=True)
    document_type: TaxFormType
    file_url: str | None = Field(default=None, max_length=500)  # Secure storage URL
    file_name: str | None = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    tax_year: TaxYear = Relationship(back_populates="documents")
