"""Agency billing service for Mode B client invoicing in ExtraShifty.

When agency is in FULL_INTERMEDIARY mode (Mode B):
- Agency posts shifts on behalf of clients
- Need to track what's owed from each client
- Generate invoices for clients (off-platform billing reference)
"""

import logging
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from sqlmodel import Session, func, select

from app.core.utils import calculate_shift_cost
from app.models.shift import Shift, ShiftStatus

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class AgencyBillingError(Exception):
    """General agency billing error."""

    def __init__(self, message: str, code: str = "billing_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class AgencyBillingService:
    """Service class handling Mode B client invoicing for agencies."""

    # Default payment terms
    DEFAULT_PAYMENT_TERMS_DAYS = 30
    DEFAULT_CURRENCY = "EUR"

    def __init__(self, db: Session):
        self.db = db

    def _quantize_amount(self, amount: Decimal) -> Decimal:
        """Ensure amount has exactly 2 decimal places."""
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _generate_invoice_number(self, agency_id: int) -> str:
        """Generate a unique invoice number for an agency."""
        from app.api.v1.endpoints.agency import AgencyClientInvoice

        # Count existing invoices for this agency to create sequential number
        count = self.db.exec(
            select(func.count()).select_from(AgencyClientInvoice).where(
                AgencyClientInvoice.agency_id == agency_id
            )
        ).one() or 0

        # Format: INV-{agency_id}-{YYYYMM}-{sequence}
        year_month = datetime.utcnow().strftime("%Y%m")
        sequence = str(count + 1).zfill(4)
        return f"INV-{agency_id}-{year_month}-{sequence}"

    def _calculate_shift_hours(self, shift: Shift) -> Decimal:
        """Calculate the total hours for a shift."""
        start = datetime.combine(shift.date, shift.start_time)
        end = datetime.combine(shift.date, shift.end_time)

        # Handle overnight shifts
        if end <= start:
            end += timedelta(days=1)

        hours = (end - start).total_seconds() / 3600
        return Decimal(str(hours))

    def _calculate_shift_value(self, shift: Shift) -> Decimal:
        """Calculate the total value of a shift based on hours and rate."""
        hours = self._calculate_shift_hours(shift)
        return calculate_shift_cost(hours, shift.hourly_rate)

    async def create_client_invoice(
        self,
        agency_id: int,
        client_id: int,
        period_start: date,
        period_end: date,
        include_markup: bool = True,
        custom_due_date: date | None = None,
        notes: str | None = None,
    ) -> dict:
        """
        Generate an invoice for a client covering completed shifts in a period.

        For Mode B (FULL_INTERMEDIARY) agencies:
        - Finds all completed shifts for this client in the specified period
        - Calculates total including agency markup (if configured)
        - Creates an invoice record for off-platform billing reference

        Args:
            agency_id: The ID of the agency generating the invoice
            client_id: The ID of the client being invoiced
            period_start: Start date of the billing period
            period_end: End date of the billing period
            include_markup: Whether to apply agency markup (default True)
            custom_due_date: Custom due date (default: period_end + payment terms)
            notes: Optional notes for the invoice

        Returns:
            dict with invoice details
        """
        from app.api.v1.endpoints.agency import (
            AgencyClient,
            AgencyClientInvoice,
            AgencyShift,
        )
        from app.models.agency import AgencyMode, AgencyProfile

        # Verify agency exists and is in Mode B
        agency_profile = self.db.exec(
            select(AgencyProfile).where(AgencyProfile.user_id == agency_id)
        ).first()

        if agency_profile and agency_profile.mode != AgencyMode.FULL_INTERMEDIARY:
            logger.warning(
                f"Agency {agency_id} is not in FULL_INTERMEDIARY mode but generating client invoice"
            )
            # Allow anyway for flexibility, but log the warning

        # Verify client relationship exists
        client = self.db.exec(
            select(AgencyClient).where(
                AgencyClient.id == client_id,
                AgencyClient.agency_id == agency_id,
            )
        ).first()

        if not client:
            raise AgencyBillingError("Client not found or not associated with agency", "client_not_found")

        # Find all completed shifts for this client in the period
        # Agency shifts are tracked in AgencyShift table
        agency_shift_records = self.db.exec(
            select(AgencyShift).where(
                AgencyShift.agency_id == agency_id,
                AgencyShift.client_id == client_id,
            )
        ).all()

        shift_ids = [as_.shift_id for as_ in agency_shift_records]

        if not shift_ids:
            raise AgencyBillingError(
                "No shifts found for this client",
                "no_shifts_found"
            )

        # Get completed shifts in the period
        completed_shifts = list(self.db.exec(
            select(Shift).where(
                Shift.id.in_(shift_ids),
                Shift.status == ShiftStatus.COMPLETED,
                Shift.date >= period_start,
                Shift.date <= period_end,
            )
        ).all())

        if not completed_shifts:
            raise AgencyBillingError(
                f"No completed shifts found for this client between {period_start} and {period_end}",
                "no_completed_shifts"
            )

        # Calculate totals
        subtotal = Decimal("0.00")
        total_hours = Decimal("0.00")
        shift_details = []

        for shift in completed_shifts:
            shift_value = self._calculate_shift_value(shift)
            shift_hours = self._calculate_shift_hours(shift)
            subtotal += shift_value
            total_hours += shift_hours

            shift_details.append({
                "shift_id": shift.id,
                "date": shift.date.isoformat(),
                "title": shift.title,
                "hours": float(shift_hours),
                "hourly_rate": float(shift.hourly_rate),
                "amount": float(shift_value),
            })

        # Apply markup if configured
        markup_amount = Decimal("0.00")
        markup_rate = Decimal("0.00")

        if include_markup:
            # Check for client-specific markup first, then agency default
            if client.billing_rate_markup is not None:
                markup_rate = Decimal(str(client.billing_rate_markup)) / Decimal("100")
            elif agency_profile and agency_profile.client_markup_rate is not None:
                markup_rate = agency_profile.client_markup_rate / Decimal("100")

            if markup_rate > 0:
                markup_amount = self._quantize_amount(subtotal * markup_rate)

        total_amount = self._quantize_amount(subtotal + markup_amount)

        # Calculate due date
        if custom_due_date:
            due_date = custom_due_date
        else:
            due_date = period_end + timedelta(days=self.DEFAULT_PAYMENT_TERMS_DAYS)

        # Generate invoice number
        invoice_number = self._generate_invoice_number(agency_id)

        # Create invoice record
        invoice = AgencyClientInvoice(
            agency_id=agency_id,
            client_id=client_id,
            invoice_number=invoice_number,
            status="draft",
            amount=float(total_amount),
            currency=self.DEFAULT_CURRENCY,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            notes=notes,
        )
        self.db.add(invoice)
        self.db.commit()
        self.db.refresh(invoice)

        logger.info(
            f"Agency {agency_id} created invoice {invoice_number} for client {client_id}: "
            f"{len(completed_shifts)} shifts, {total_amount} {self.DEFAULT_CURRENCY}"
        )

        return {
            "invoice_id": invoice.id,
            "invoice_number": invoice_number,
            "agency_id": agency_id,
            "client_id": client_id,
            "client_email": client.business_email,
            "status": "draft",
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "due_date": due_date.isoformat(),
            "currency": self.DEFAULT_CURRENCY,
            "subtotal": float(subtotal),
            "markup_rate": float(markup_rate * 100),
            "markup_amount": float(markup_amount),
            "total_amount": float(total_amount),
            "total_hours": float(total_hours),
            "shift_count": len(completed_shifts),
            "shift_details": shift_details,
            "notes": notes,
        }

    def get_client_invoice_summary(
        self,
        agency_id: int,
        client_id: int,
    ) -> dict:
        """
        Get billing summary for a client including outstanding and paid amounts.

        Args:
            agency_id: The ID of the agency
            client_id: The ID of the client

        Returns:
            dict with summary: outstanding_amount, paid_amount, total_invoiced, etc.
        """
        from app.api.v1.endpoints.agency import AgencyClient, AgencyClientInvoice

        # Verify client relationship
        client = self.db.exec(
            select(AgencyClient).where(
                AgencyClient.id == client_id,
                AgencyClient.agency_id == agency_id,
            )
        ).first()

        if not client:
            raise AgencyBillingError("Client not found", "client_not_found")

        # Get all invoices for this client
        invoices = list(self.db.exec(
            select(AgencyClientInvoice).where(
                AgencyClientInvoice.agency_id == agency_id,
                AgencyClientInvoice.client_id == client_id,
            ).order_by(AgencyClientInvoice.created_at.desc())
        ).all())

        # Calculate totals by status
        total_invoiced = Decimal("0.00")
        paid_amount = Decimal("0.00")
        outstanding_amount = Decimal("0.00")
        overdue_amount = Decimal("0.00")
        draft_amount = Decimal("0.00")

        invoice_count_by_status = {
            "draft": 0,
            "sent": 0,
            "paid": 0,
            "overdue": 0,
        }

        today = date.today()

        for invoice in invoices:
            amount = Decimal(str(invoice.amount))
            total_invoiced += amount
            invoice_count_by_status[invoice.status] = invoice_count_by_status.get(invoice.status, 0) + 1

            if invoice.status == "paid":
                paid_amount += amount
            elif invoice.status == "draft":
                draft_amount += amount
            elif invoice.status == "sent":
                outstanding_amount += amount
                # Check if overdue
                if invoice.due_date < today:
                    overdue_amount += amount
            elif invoice.status == "overdue":
                outstanding_amount += amount
                overdue_amount += amount

        # Get uninvoiced shifts (completed but not yet invoiced)
        from app.api.v1.endpoints.agency import AgencyShift

        agency_shift_records = self.db.exec(
            select(AgencyShift).where(
                AgencyShift.agency_id == agency_id,
                AgencyShift.client_id == client_id,
            )
        ).all()

        shift_ids = [as_.shift_id for as_ in agency_shift_records]

        uninvoiced_shifts = []
        uninvoiced_amount = Decimal("0.00")

        if shift_ids:
            # Find completed shifts
            completed_shifts = list(self.db.exec(
                select(Shift).where(
                    Shift.id.in_(shift_ids),
                    Shift.status == ShiftStatus.COMPLETED,
                )
            ).all())

            # Get all invoiced period ranges
            invoiced_periods = [
                (inv.period_start, inv.period_end)
                for inv in invoices
                if inv.status != "draft"  # Draft invoices can be modified
            ]

            for shift in completed_shifts:
                # Check if shift falls within any invoiced period
                is_invoiced = False
                for period_start, period_end in invoiced_periods:
                    if period_start <= shift.date <= period_end:
                        is_invoiced = True
                        break

                if not is_invoiced:
                    shift_value = self._calculate_shift_value(shift)
                    uninvoiced_amount += shift_value
                    uninvoiced_shifts.append({
                        "shift_id": shift.id,
                        "date": shift.date.isoformat(),
                        "amount": float(shift_value),
                    })

        return {
            "agency_id": agency_id,
            "client_id": client_id,
            "client_email": client.business_email,
            "total_invoiced": float(total_invoiced),
            "paid_amount": float(paid_amount),
            "outstanding_amount": float(outstanding_amount),
            "overdue_amount": float(overdue_amount),
            "draft_amount": float(draft_amount),
            "uninvoiced_amount": float(uninvoiced_amount),
            "uninvoiced_shift_count": len(uninvoiced_shifts),
            "invoice_count": len(invoices),
            "invoice_count_by_status": invoice_count_by_status,
            "recent_invoices": [
                {
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "status": inv.status,
                    "amount": inv.amount,
                    "due_date": inv.due_date.isoformat(),
                    "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
                }
                for inv in invoices[:5]  # Most recent 5
            ],
        }

    def get_client_unbilled_shifts(
        self,
        agency_id: int,
        client_id: int,
    ) -> list[dict]:
        """
        Get all completed shifts for a client that haven't been invoiced yet.

        Args:
            agency_id: The ID of the agency
            client_id: The ID of the client

        Returns:
            list of shift details that haven't been invoiced
        """
        from app.api.v1.endpoints.agency import (
            AgencyClient,
            AgencyClientInvoice,
            AgencyShift,
        )

        # Verify client relationship
        client = self.db.exec(
            select(AgencyClient).where(
                AgencyClient.id == client_id,
                AgencyClient.agency_id == agency_id,
            )
        ).first()

        if not client:
            raise AgencyBillingError("Client not found", "client_not_found")

        # Get all shift IDs for this client
        agency_shift_records = self.db.exec(
            select(AgencyShift).where(
                AgencyShift.agency_id == agency_id,
                AgencyShift.client_id == client_id,
            )
        ).all()

        shift_ids = [as_.shift_id for as_ in agency_shift_records]

        if not shift_ids:
            return []

        # Get completed shifts
        completed_shifts = list(self.db.exec(
            select(Shift).where(
                Shift.id.in_(shift_ids),
                Shift.status == ShiftStatus.COMPLETED,
            ).order_by(Shift.date.desc())
        ).all())

        # Get all invoiced period ranges (non-draft)
        invoices = list(self.db.exec(
            select(AgencyClientInvoice).where(
                AgencyClientInvoice.agency_id == agency_id,
                AgencyClientInvoice.client_id == client_id,
                AgencyClientInvoice.status != "draft",
            )
        ).all())

        invoiced_periods = [(inv.period_start, inv.period_end) for inv in invoices]

        unbilled_shifts = []
        for shift in completed_shifts:
            # Check if shift falls within any invoiced period
            is_invoiced = False
            for period_start, period_end in invoiced_periods:
                if period_start <= shift.date <= period_end:
                    is_invoiced = True
                    break

            if not is_invoiced:
                shift_hours = self._calculate_shift_hours(shift)
                shift_value = self._calculate_shift_value(shift)
                unbilled_shifts.append({
                    "shift_id": shift.id,
                    "date": shift.date.isoformat(),
                    "title": shift.title,
                    "location": shift.location,
                    "hours": float(shift_hours),
                    "hourly_rate": float(shift.hourly_rate),
                    "amount": float(shift_value),
                })

        return unbilled_shifts

    async def generate_monthly_invoices(
        self,
        agency_id: int,
        year: int,
        month: int,
        auto_send: bool = False,
    ) -> list[dict]:
        """
        Generate invoices for all clients for a specific month.

        Useful for batch invoice generation at month-end.

        Args:
            agency_id: The ID of the agency
            year: The year for the billing period
            month: The month for the billing period (1-12)
            auto_send: Whether to automatically mark invoices as sent

        Returns:
            list of created invoices
        """
        from app.api.v1.endpoints.agency import AgencyClient, AgencyClientInvoice

        # Calculate period dates
        period_start = date(year, month, 1)
        if month == 12:
            period_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            period_end = date(year, month + 1, 1) - timedelta(days=1)

        # Get all active clients
        clients = list(self.db.exec(
            select(AgencyClient).where(
                AgencyClient.agency_id == agency_id,
                AgencyClient.is_active == True,
            )
        ).all())

        created_invoices = []
        skipped_clients = []

        for client in clients:
            try:
                invoice_data = await self.create_client_invoice(
                    agency_id=agency_id,
                    client_id=client.id,
                    period_start=period_start,
                    period_end=period_end,
                )

                if auto_send and invoice_data.get("invoice_id"):
                    # Mark as sent
                    invoice = self.db.get(AgencyClientInvoice, invoice_data["invoice_id"])
                    if invoice:
                        invoice.status = "sent"
                        invoice.updated_at = datetime.utcnow()
                        self.db.add(invoice)
                        self.db.commit()
                        invoice_data["status"] = "sent"

                created_invoices.append(invoice_data)

            except AgencyBillingError as e:
                # Skip clients with no completed shifts
                skipped_clients.append({
                    "client_id": client.id,
                    "client_email": client.business_email,
                    "reason": e.message,
                })
                logger.debug(
                    f"Skipped invoice for client {client.id}: {e.message}"
                )

        logger.info(
            f"Agency {agency_id} monthly invoice generation for {year}-{month:02d}: "
            f"{len(created_invoices)} invoices created, {len(skipped_clients)} clients skipped"
        )

        return created_invoices

    def mark_overdue_invoices(self, agency_id: int) -> list[int]:
        """
        Mark sent invoices that are past due date as overdue.

        Args:
            agency_id: The ID of the agency

        Returns:
            list of invoice IDs marked as overdue
        """
        from app.api.v1.endpoints.agency import AgencyClientInvoice

        today = date.today()

        # Find sent invoices past due date
        overdue_invoices = list(self.db.exec(
            select(AgencyClientInvoice).where(
                AgencyClientInvoice.agency_id == agency_id,
                AgencyClientInvoice.status == "sent",
                AgencyClientInvoice.due_date < today,
            )
        ).all())

        marked_ids = []
        for invoice in overdue_invoices:
            invoice.status = "overdue"
            invoice.updated_at = datetime.utcnow()
            self.db.add(invoice)
            marked_ids.append(invoice.id)

        if marked_ids:
            self.db.commit()
            logger.info(
                f"Agency {agency_id}: Marked {len(marked_ids)} invoices as overdue"
            )

        return marked_ids


# Singleton instance for convenience
def get_agency_billing_service(db: Session) -> AgencyBillingService:
    """Get an AgencyBillingService instance with the given database session."""
    return AgencyBillingService(db)
