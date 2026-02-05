"""Invoice API endpoints for ExtraShifty."""

import logging

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse, JSONResponse

from app.api.deps import ActiveUserDep, SessionDep
from app.core.errors import raise_not_found, raise_forbidden, raise_bad_request, require_found, require_permission
from app.models.invoice import InvoiceType as ModelInvoiceType
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceListItem,
    InvoiceListResponse,
    InvoiceResendResponse,
    InvoiceResponse,
    InvoiceType,
)
from app.services.invoice_service import InvoiceService, InvoiceServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_type: InvoiceType | None = Query(
        default=None,
        description="Filter by invoice type",
    ),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=20, le=100, description="Page size"),
) -> InvoiceListResponse:
    """
    List user's invoices with optional type filter.

    Returns paginated list of invoices (receipts, pay stubs, or agency invoices)
    belonging to the current user.
    """
    invoice_service = InvoiceService(session)

    # Convert API enum to model enum if provided
    model_invoice_type = None
    if invoice_type:
        model_invoice_type = ModelInvoiceType(invoice_type.value)

    invoices, total = invoice_service.get_invoices_by_user(
        user_id=current_user.id,
        invoice_type=model_invoice_type,
        skip=skip,
        limit=limit,
    )

    items = [
        InvoiceListItem(
            id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_type=InvoiceType(inv.invoice_type.value),
            amount=inv.amount,
            total_amount=inv.total_amount,
            currency=inv.currency,
            status=inv.status.value,
            issued_at=inv.issued_at,
            pdf_url=inv.pdf_url,
        )
        for inv in invoices
    ]

    return InvoiceListResponse(items=items, total=total)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> InvoiceResponse:
    """
    Get invoice details by ID.

    Returns full invoice details including type-specific fields.
    Only the invoice owner can access their invoices.
    """
    invoice_service = InvoiceService(session)

    invoice = invoice_service.get_invoice(invoice_id)
    require_found(invoice, "Invoice")

    # Verify ownership
    require_permission(invoice.user_id == current_user.id, "Not authorized to access this invoice")

    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        invoice_type=InvoiceType(invoice.invoice_type.value),
        user_id=invoice.user_id,
        amount=invoice.amount,
        currency=invoice.currency,
        tax_amount=invoice.tax_amount,
        total_amount=invoice.total_amount,
        status=invoice.status.value,
        issued_at=invoice.issued_at,
        due_date=invoice.due_date,
        paid_at=invoice.paid_at,
        pdf_url=invoice.pdf_url,
        created_at=invoice.created_at,
        # Company receipt fields
        payment_method=invoice.payment_method,
        transaction_id=invoice.transaction_id,
        # Staff pay stub fields
        payout_id=invoice.payout_id,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        shifts_count=invoice.shifts_count,
        hours_worked=invoice.hours_worked,
        gross_earnings=invoice.gross_earnings,
        net_earnings=invoice.net_earnings,
        # Note: platform_fee is intentionally excluded
    )


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> JSONResponse:
    """
    Download invoice PDF.

    Returns the PDF file for the invoice. Generates the PDF if not already created.
    Only the invoice owner can download their invoices.
    """
    invoice_service = InvoiceService(session)

    invoice = invoice_service.get_invoice(invoice_id)
    require_found(invoice, "Invoice")

    # Verify ownership
    require_permission(invoice.user_id == current_user.id, "Not authorized to access this invoice")

    try:
        # Generate PDF if not already generated
        if not invoice.pdf_url:
            pdf_url = invoice_service.generate_pdf(invoice_id)
        else:
            pdf_url = invoice.pdf_url

        # In production, this would return the actual PDF file
        # For now, return a redirect URL response
        return JSONResponse(
            content={
                "pdf_url": pdf_url,
                "invoice_number": invoice.invoice_number,
                "message": "PDF generated successfully",
            }
        )

    except InvoiceServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post("/{invoice_id}/resend", response_model=InvoiceResendResponse)
def resend_invoice_email(
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> InvoiceResendResponse:
    """
    Resend invoice email.

    Sends the invoice email again to the invoice owner.
    Only the invoice owner can request a resend.
    """
    invoice_service = InvoiceService(session)

    invoice = invoice_service.get_invoice(invoice_id)
    require_found(invoice, "Invoice")

    # Verify ownership
    require_permission(invoice.user_id == current_user.id, "Not authorized to access this invoice")

    try:
        success = invoice_service.send_invoice_email(invoice_id)

        return InvoiceResendResponse(
            success=success,
            message="Invoice email sent successfully" if success else "Failed to send invoice email",
        )

    except InvoiceServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
