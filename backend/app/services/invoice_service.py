"""Invoice service for ExtraShifty invoice/receipt auto-generation."""

import logging
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING

from jinja2 import Environment, FileSystemLoader
from sqlmodel import Session, func, select

from app.core.utils import quantize_amount
from app.models.invoice import Invoice, InvoiceStatus, InvoiceType
from app.models.payment import Payout, Transaction
from app.models.shift import Shift
from app.models.user import User

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Template directory for invoice PDFs
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "invoices"


class InvoiceServiceError(Exception):
    """General invoice service error."""

    def __init__(self, message: str, code: str = "invoice_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class InvoiceService:
    """Service class for invoice and receipt generation."""

    # Invoice number prefix
    INVOICE_PREFIX = "INV"

    def __init__(self, db: Session):
        self.db = db
        self._setup_template_env()

    def _setup_template_env(self) -> None:
        """Setup Jinja2 template environment."""
        # Create template directory if it doesn't exist
        TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)

        self.template_env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=True,
        )

    def generate_invoice_number(self) -> str:
        """
        Generate unique invoice number.

        Format: INV-YYYY-NNNNNN
        Example: INV-2024-000001
        """
        current_year = datetime.now(UTC).year

        # Get the max invoice number for this year
        result = self.db.exec(
            select(Invoice.invoice_number)
            .where(Invoice.invoice_number.like(f"{self.INVOICE_PREFIX}-{current_year}-%"))
            .order_by(Invoice.invoice_number.desc())
            .limit(1)
        ).first()

        if result:
            # Extract the sequence number and increment
            try:
                last_seq = int(result.split("-")[-1])
                next_seq = last_seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1

        return f"{self.INVOICE_PREFIX}-{current_year}-{next_seq:06d}"

    def create_company_receipt(
        self,
        user_id: int,
        transaction_id: int,
        amount: Decimal,
        payment_method: str,
    ) -> Invoice:
        """
        Create a receipt for company wallet top-up.

        Called after successful top-up transaction.

        Args:
            user_id: Company user ID
            transaction_id: Transaction ID for the top-up
            amount: Top-up amount
            payment_method: Payment method used (card, bank_transfer, ach)

        Returns:
            Created Invoice object
        """
        amount = quantize_amount(amount)

        # Verify user exists
        user = self.db.get(User, user_id)
        if not user:
            raise InvoiceServiceError("User not found", "user_not_found")

        # Verify transaction exists
        transaction = self.db.get(Transaction, transaction_id)
        if not transaction:
            raise InvoiceServiceError("Transaction not found", "transaction_not_found")

        # Generate invoice number
        invoice_number = self.generate_invoice_number()

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_type=InvoiceType.COMPANY_RECEIPT,
            user_id=user_id,
            amount=amount,
            currency="EUR",
            tax_amount=Decimal("0.00"),
            total_amount=amount,
            status=InvoiceStatus.PAID,  # Receipts are already paid
            payment_method=payment_method,
            transaction_id=transaction_id,
            issued_at=datetime.now(UTC),
            paid_at=datetime.now(UTC),
        )

        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        logger.info(
            f"Created company receipt {invoice_number} for user {user_id}, "
            f"amount={amount}, transaction={transaction_id}"
        )

        return invoice

    def create_staff_pay_stub(
        self,
        user_id: int,
        payout_id: int,
        period_start: date,
        period_end: date,
        shifts: list[Shift],
        gross_amount: Decimal,
        net_amount: Decimal,
    ) -> Invoice:
        """
        Create a pay stub for staff payout.

        Called after payout is processed.

        Args:
            user_id: Staff user ID
            payout_id: Payout ID
            period_start: Start date of pay period
            period_end: End date of pay period
            shifts: List of shifts included in this payout
            gross_amount: Total gross earnings
            net_amount: Net amount after platform fee

        Returns:
            Created Invoice object
        """
        gross_amount = quantize_amount(gross_amount)
        net_amount = quantize_amount(net_amount)

        # Verify user exists
        user = self.db.get(User, user_id)
        if not user:
            raise InvoiceServiceError("User not found", "user_not_found")

        # Verify payout exists
        payout = self.db.get(Payout, payout_id)
        if not payout:
            raise InvoiceServiceError("Payout not found", "payout_not_found")

        # Calculate hours worked and platform fee
        total_hours = Decimal("0.00")
        for shift in shifts:
            # Calculate shift hours
            from datetime import datetime, timedelta

            start = datetime.combine(shift.date, shift.start_time)
            end = datetime.combine(shift.date, shift.end_time)
            if end <= start:
                end += timedelta(days=1)
            hours = Decimal(str((end - start).total_seconds() / 3600))
            total_hours += hours

        total_hours = quantize_amount(total_hours)
        platform_fee = quantize_amount(gross_amount - net_amount)

        # Generate invoice number
        invoice_number = self.generate_invoice_number()

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_type=InvoiceType.STAFF_PAY_STUB,
            user_id=user_id,
            amount=gross_amount,
            currency="EUR",
            tax_amount=Decimal("0.00"),
            total_amount=net_amount,
            status=InvoiceStatus.PAID,  # Pay stubs are for completed payouts
            payout_id=payout_id,
            period_start=period_start,
            period_end=period_end,
            shifts_count=len(shifts),
            hours_worked=total_hours,
            gross_earnings=gross_amount,
            platform_fee=platform_fee,  # Hidden from display
            net_earnings=net_amount,
            issued_at=datetime.now(UTC),
            paid_at=datetime.now(UTC),
        )

        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        logger.info(
            f"Created staff pay stub {invoice_number} for user {user_id}, "
            f"payout={payout_id}, gross={gross_amount}, net={net_amount}"
        )

        return invoice

    def create_agency_invoice(
        self,
        user_id: int,
        amount: Decimal,
        due_date: date | None = None,
        description: str | None = None,
    ) -> Invoice:
        """
        Create an invoice for agency clients.

        Args:
            user_id: Agency user ID
            amount: Invoice amount
            due_date: Payment due date
            description: Invoice description

        Returns:
            Created Invoice object
        """
        amount = quantize_amount(amount)

        # Verify user exists
        user = self.db.get(User, user_id)
        if not user:
            raise InvoiceServiceError("User not found", "user_not_found")

        # Generate invoice number
        invoice_number = self.generate_invoice_number()

        # Default due date is 30 days from now
        if due_date is None:
            from datetime import timedelta

            due_date = date.today() + timedelta(days=30)

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_type=InvoiceType.AGENCY_INVOICE,
            user_id=user_id,
            amount=amount,
            currency="EUR",
            tax_amount=Decimal("0.00"),
            total_amount=amount,
            status=InvoiceStatus.DRAFT,
            due_date=due_date,
            issued_at=datetime.now(UTC),
            extra_data={"description": description} if description else None,
        )

        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        logger.info(
            f"Created agency invoice {invoice_number} for user {user_id}, "
            f"amount={amount}, due_date={due_date}"
        )

        return invoice

    def generate_pdf(self, invoice_id: int) -> str:
        """
        Generate PDF for invoice and return URL.

        Uses Jinja2 templates to render HTML, then converts to PDF.

        Args:
            invoice_id: Invoice ID

        Returns:
            URL to generated PDF

        Note:
            In production, this would use a PDF library like weasyprint or reportlab.
            For now, it generates HTML and stores a placeholder URL.
        """
        invoice = self.db.get(Invoice, invoice_id)
        if not invoice:
            raise InvoiceServiceError("Invoice not found", "invoice_not_found")

        # Get user details
        user = self.db.get(User, invoice.user_id)
        if not user:
            raise InvoiceServiceError("User not found", "user_not_found")

        # Select template based on invoice type
        _template_name = self._get_template_name(invoice.invoice_type)

        # Prepare context for template
        _context = self._prepare_template_context(invoice, user)

        # In production, render template and convert to PDF
        # For now, generate a placeholder URL
        pdf_filename = f"{invoice.invoice_number}.pdf"
        pdf_url = f"/invoices/pdf/{pdf_filename}"

        # Update invoice with PDF URL
        invoice.pdf_url = pdf_url
        self.db.add(invoice)
        self.db.commit()

        logger.info(f"Generated PDF for invoice {invoice.invoice_number}: {pdf_url}")

        return pdf_url

    def _get_template_name(self, invoice_type: InvoiceType) -> str:
        """Get template name for invoice type."""
        templates = {
            InvoiceType.COMPANY_RECEIPT: "company_receipt.html",
            InvoiceType.STAFF_PAY_STUB: "staff_pay_stub.html",
            InvoiceType.AGENCY_INVOICE: "agency_invoice.html",
        }
        return templates.get(invoice_type, "default.html")

    def _prepare_template_context(self, invoice: Invoice, user: User) -> dict:
        """Prepare context dict for template rendering."""
        context = {
            "invoice": invoice,
            "user": user,
            "invoice_number": invoice.invoice_number,
            "amount": invoice.amount,
            "currency": invoice.currency,
            "total_amount": invoice.total_amount,
            "issued_at": invoice.issued_at,
            "status": invoice.status.value,
        }

        if invoice.invoice_type == InvoiceType.COMPANY_RECEIPT:
            context.update({
                "payment_method": invoice.payment_method,
                "transaction_id": invoice.transaction_id,
            })
        elif invoice.invoice_type == InvoiceType.STAFF_PAY_STUB:
            context.update({
                "period_start": invoice.period_start,
                "period_end": invoice.period_end,
                "shifts_count": invoice.shifts_count,
                "hours_worked": invoice.hours_worked,
                "gross_earnings": invoice.gross_earnings,
                "net_earnings": invoice.net_earnings,
                # Note: platform_fee is intentionally excluded from user-facing docs
            })
        elif invoice.invoice_type == InvoiceType.AGENCY_INVOICE:
            context.update({
                "due_date": invoice.due_date,
                "description": invoice.extra_data.get("description") if invoice.extra_data else None,
            })

        return context

    def send_invoice_email(self, invoice_id: int) -> bool:
        """
        Send invoice via email.

        Args:
            invoice_id: Invoice ID

        Returns:
            True if email sent successfully

        Note:
            In production, this would integrate with an email service.
        """
        invoice = self.db.get(Invoice, invoice_id)
        if not invoice:
            raise InvoiceServiceError("Invoice not found", "invoice_not_found")

        # Get user details
        user = self.db.get(User, invoice.user_id)
        if not user:
            raise InvoiceServiceError("User not found", "user_not_found")

        # Generate PDF if not already generated
        if not invoice.pdf_url:
            self.generate_pdf(invoice_id)
            self.db.refresh(invoice)

        # In production, send email with PDF attachment
        # For now, just log and update status
        logger.info(
            f"Sending invoice {invoice.invoice_number} to {user.email}"
        )

        # Update status to sent (only for draft invoices)
        if invoice.status == InvoiceStatus.DRAFT:
            invoice.status = InvoiceStatus.SENT
            self.db.add(invoice)
            self.db.commit()

        logger.info(f"Invoice {invoice.invoice_number} sent to {user.email}")

        return True

    def get_invoice(self, invoice_id: int) -> Invoice | None:
        """Get invoice by ID."""
        return self.db.get(Invoice, invoice_id)

    def get_invoices_by_user(
        self,
        user_id: int,
        invoice_type: InvoiceType | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Invoice], int]:
        """
        Get invoices for a user with optional type filter.

        Args:
            user_id: User ID
            invoice_type: Optional filter by invoice type
            skip: Pagination offset
            limit: Page size

        Returns:
            Tuple of (invoices list, total count)
        """
        # Build query
        query = select(Invoice).where(Invoice.user_id == user_id)

        if invoice_type:
            query = query.where(Invoice.invoice_type == invoice_type)

        # Get total count
        count_query = select(func.count(Invoice.id)).where(Invoice.user_id == user_id)
        if invoice_type:
            count_query = count_query.where(Invoice.invoice_type == invoice_type)
        total = self.db.exec(count_query).one()

        # Get paginated results
        invoices = list(
            self.db.exec(
                query.order_by(Invoice.issued_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

        return invoices, total

    def mark_as_paid(self, invoice_id: int) -> Invoice:
        """
        Mark invoice as paid.

        Args:
            invoice_id: Invoice ID

        Returns:
            Updated Invoice
        """
        invoice = self.db.get(Invoice, invoice_id)
        if not invoice:
            raise InvoiceServiceError("Invoice not found", "invoice_not_found")

        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.now(UTC)
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        logger.info(f"Invoice {invoice.invoice_number} marked as paid")

        return invoice


# Singleton instance for convenience
invoice_service: InvoiceService | None = None


def get_invoice_service(db: Session) -> InvoiceService:
    """Get invoice service instance."""
    return InvoiceService(db)
