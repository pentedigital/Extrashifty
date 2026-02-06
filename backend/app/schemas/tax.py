"""Tax compliance schemas for ExtraShifty 1099-NEC tracking."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaxStatusResponse(BaseModel):
    """Response schema for user's tax status."""

    model_config = ConfigDict(from_attributes=True)

    tax_year: int
    total_earnings: Decimal
    threshold: Decimal = Field(default=Decimal("600.00"))
    threshold_reached: bool
    threshold_reached_at: datetime | None = None
    w9_required: bool
    w9_submitted: bool
    w9_submitted_at: datetime | None = None
    status: str
    form_generated: bool = False
    form_sent: bool = False


class W9SubmitRequest(BaseModel):
    """Request schema for W9 submission."""

    legal_name: str = Field(min_length=1, max_length=255)
    business_name: str | None = Field(default=None, max_length=255)
    tax_classification: str = Field(
        description="Tax classification: individual, sole_proprietor, llc_single, llc_c, llc_s, llc_partnership, c_corp, s_corp, partnership, trust, other"
    )
    ssn: str = Field(
        min_length=9,
        max_length=11,
        description="SSN or EIN (format: 123-45-6789 or 123456789)",
    )
    address_line1: str = Field(min_length=1, max_length=255)
    address_line2: str | None = Field(default=None, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=2, max_length=2, description="US state code (e.g., CA, NY)")
    zip_code: str = Field(min_length=5, max_length=10)
    certification: bool = Field(
        description="Certify that the information provided is correct"
    )

    @field_validator("ssn")
    @classmethod
    def validate_ssn(cls, v: str) -> str:
        """Validate SSN format."""
        # Remove dashes and spaces
        cleaned = v.replace("-", "").replace(" ", "")
        if len(cleaned) != 9 or not cleaned.isdigit():
            raise ValueError("SSN must be 9 digits")
        return cleaned

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        """Validate US state code."""
        valid_states = {
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
            "DC", "PR", "VI", "GU", "AS", "MP",
        }
        if v.upper() not in valid_states:
            raise ValueError("Invalid US state code")
        return v.upper()

    @field_validator("tax_classification")
    @classmethod
    def validate_classification(cls, v: str) -> str:
        """Validate tax classification."""
        valid_classifications = {
            "individual",
            "sole_proprietor",
            "llc_single",
            "llc_c",
            "llc_s",
            "llc_partnership",
            "c_corp",
            "s_corp",
            "partnership",
            "trust",
            "other",
        }
        if v.lower() not in valid_classifications:
            raise ValueError("Invalid tax classification")
        return v.lower()


class W9SubmitResponse(BaseModel):
    """Response schema for W9 submission."""

    success: bool
    message: str
    tax_year: int
    status: str
    ssn_last_four: str


class TaxDocumentResponse(BaseModel):
    """Response schema for a tax document."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    tax_year: int
    document_type: str
    file_name: str | None
    created_at: datetime


class TaxDocumentListResponse(BaseModel):
    """Response schema for list of tax documents."""

    documents: list[TaxDocumentResponse]
    total: int


class TaxYearSummary(BaseModel):
    """Summary of a tax year for admin views."""

    model_config = ConfigDict(from_attributes=True)

    tax_year_id: int
    user_id: int
    user_email: str
    user_name: str
    tax_year: int
    total_earnings: Decimal
    threshold_reached: bool
    status: str
    w9_submitted: bool
    form_generated: bool
    form_filed: bool
    form_sent: bool


class PendingW9Response(BaseModel):
    """Response schema for users needing W9 submission."""

    users: list[TaxYearSummary]
    total: int


class Generate1099Request(BaseModel):
    """Request schema for batch 1099 generation."""

    tax_year: int = Field(description="Tax year to generate 1099s for")
    user_ids: list[int] | None = Field(
        default=None,
        description="Specific user IDs to generate for (None = all eligible)",
    )


class Generate1099Response(BaseModel):
    """Response schema for batch 1099 generation."""

    success: bool
    message: str
    generated_count: int
    failed_count: int
    errors: list[str] = Field(default_factory=list)
