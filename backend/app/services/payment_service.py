"""Payment service for ExtraShifty payment flows."""

import logging
import uuid
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from sqlmodel import Session, select

from app.models.payment import (
    Dispute,
    FundsHold,
    FundsHoldStatus,
    Payout,
    PayoutStatus,
    PayoutType,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from app.models.shift import Shift, ShiftStatus
from app.models.wallet import PaymentMethod, Wallet, WalletStatus

if TYPE_CHECKING:
    from app.models.user import User

logger = logging.getLogger(__name__)


class InsufficientFundsError(Exception):
    """Raised when wallet has insufficient funds."""

    def __init__(
        self,
        required: Decimal,
        available: Decimal,
        message: str = "Insufficient funds",
        minimum_balance: Decimal | None = None,
    ):
        self.required = required
        self.available = available
        self.shortfall = required - available
        self.minimum_balance = minimum_balance
        self.message = message
        super().__init__(message)


class PaymentError(Exception):
    """General payment error."""

    def __init__(self, message: str, code: str = "payment_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class PaymentService:
    """Service class handling all payment-related business logic."""

    # Commission and fee rates
    PLATFORM_COMMISSION_RATE = Decimal("0.15")  # 15%
    INSTANT_PAYOUT_FEE_RATE = Decimal("0.015")  # 1.5%
    INSTANT_PAYOUT_MINIMUM = Decimal("10.00")
    WEEKLY_PAYOUT_MINIMUM = Decimal("50.00")

    # Cancellation policy thresholds
    FULL_REFUND_HOURS = 48  # Full refund if cancelled >= 48 hours before shift
    PARTIAL_REFUND_HOURS = 24  # 50% refund if cancelled >= 24 hours before shift
    WORKER_COMPENSATION_HOURS = 24  # Worker gets 2 hours pay if <24hr company cancellation

    # Grace period settings
    GRACE_PERIOD_HOURS = 48  # Hours until wallet is suspended after failed top-up
    SUSPENSION_WARNING_HOURS = 24  # Hours before suspension to send warning email

    def __init__(self, db: Session):
        self.db = db

    def _generate_idempotency_key(self, prefix: str = "pay") -> str:
        """Generate a unique idempotency key."""
        return f"{prefix}_{uuid.uuid4().hex}"

    def _quantize_amount(self, amount: Decimal) -> Decimal:
        """Ensure amount has exactly 2 decimal places."""
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # ==================== Wallet Operations ====================

    def get_wallet_balance(self, user_id: int) -> dict:
        """
        Get detailed wallet balance breakdown.

        Returns available, reserved, and pending payout amounts.
        """
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            # Create wallet if doesn't exist
            wallet = Wallet(user_id=user_id)
            self.db.add(wallet)
            self.db.commit()
            self.db.refresh(wallet)

        # Calculate pending payout (sum of pending payouts)
        pending_payouts = self.db.exec(
            select(Payout).where(
                Payout.wallet_id == wallet.id,
                Payout.status.in_([PayoutStatus.PENDING, PayoutStatus.IN_TRANSIT]),
            )
        ).all()
        pending_payout = sum(p.amount for p in pending_payouts)

        return {
            "wallet_id": wallet.id,
            "available": self._quantize_amount(wallet.available_balance),
            "reserved": self._quantize_amount(wallet.reserved_balance),
            "pending_payout": self._quantize_amount(pending_payout),
            "total": self._quantize_amount(wallet.balance),
            "currency": wallet.currency,
        }

    async def topup_wallet(
        self,
        user_id: int,
        amount: Decimal,
        payment_method_id: int,
        idempotency_key: str | None = None,
    ) -> Transaction:
        """
        Add funds to company wallet.

        In production, this integrates with Stripe to charge the payment method.
        On Stripe failure, places wallet in grace period and sends alert email.
        """
        amount = self._quantize_amount(amount)

        # Get or create wallet
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            wallet = Wallet(user_id=user_id)
            self.db.add(wallet)
            self.db.commit()
            self.db.refresh(wallet)

        # Verify payment method
        payment_method = self.db.exec(
            select(PaymentMethod).where(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id,
            )
        ).first()

        if not payment_method:
            raise PaymentError("Payment method not found", "invalid_payment_method")

        # Generate idempotency key if not provided
        if not idempotency_key:
            idempotency_key = self._generate_idempotency_key("topup")

        # Check for existing transaction with this idempotency key
        existing = self.db.exec(
            select(Transaction).where(Transaction.idempotency_key == idempotency_key)
        ).first()

        if existing:
            logger.info(f"Duplicate topup request with key {idempotency_key}")
            return existing

        # Process payment with Stripe
        # In production, this calls stripe.PaymentIntent.create()
        stripe_success, stripe_error = await self._process_stripe_payment(
            amount=amount,
            payment_method_external_id=payment_method.external_id,
            idempotency_key=idempotency_key,
        )

        if not stripe_success:
            # Handle failed payment - place wallet in grace period
            logger.warning(
                f"Stripe payment failed for wallet {wallet.id}: {stripe_error}"
            )

            # Create failed transaction record
            failed_transaction = Transaction(
                wallet_id=wallet.id,
                transaction_type=TransactionType.TOPUP,
                amount=amount,
                fee=Decimal("0.00"),
                net_amount=amount,
                status=TransactionStatus.FAILED,
                idempotency_key=idempotency_key,
                description=f"Failed wallet top-up via {payment_method.type.value} ending in {payment_method.last_four}",
                metadata={"failure_reason": stripe_error},
            )
            self.db.add(failed_transaction)
            self.db.commit()
            self.db.refresh(failed_transaction)

            # Trigger grace period handling
            await self.handle_failed_topup(
                wallet_id=wallet.id,
                amount=amount,
                reason=stripe_error or "Payment declined",
            )

            raise PaymentError(
                f"Payment failed: {stripe_error}",
                "stripe_payment_failed",
            )

        # Payment successful - create completed transaction
        transaction = Transaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.TOPUP,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            description=f"Wallet top-up via {payment_method.type.value} ending in {payment_method.last_four}",
            completed_at=datetime.utcnow(),
        )
        self.db.add(transaction)

        # Update wallet balance
        wallet.balance += amount
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)

        self.db.commit()
        self.db.refresh(transaction)

        # Create company receipt for the top-up
        try:
            from app.services.invoice_service import InvoiceService

            invoice_service = InvoiceService(self.db)
            invoice_service.create_company_receipt(
                user_id=user_id,
                transaction_id=transaction.id,
                amount=amount,
                payment_method=payment_method.type.value,
            )
            logger.info(f"Created company receipt for transaction {transaction.id}")
        except Exception as e:
            # Don't fail the top-up if invoice creation fails
            logger.error(f"Failed to create company receipt for transaction {transaction.id}: {e}")

        logger.info(f"Topped up wallet {wallet.id} with {amount} ({idempotency_key})")
        return transaction

    async def _process_stripe_payment(
        self,
        amount: Decimal,
        payment_method_external_id: str | None,
        idempotency_key: str,
    ) -> tuple[bool, str | None]:
        """
        Process payment through Stripe.

        In production, this would call stripe.PaymentIntent.create() and confirm().
        Returns (success: bool, error_message: str | None).
        """
        # In production, replace with actual Stripe integration:
        #
        # import stripe
        # try:
        #     intent = stripe.PaymentIntent.create(
        #         amount=int(amount * 100),  # Stripe uses cents
        #         currency="eur",
        #         payment_method=payment_method_external_id,
        #         confirm=True,
        #         idempotency_key=idempotency_key,
        #     )
        #     if intent.status == "succeeded":
        #         return True, None
        #     else:
        #         return False, f"Payment status: {intent.status}"
        # except stripe.error.CardError as e:
        #     return False, e.user_message
        # except stripe.error.StripeError as e:
        #     return False, str(e)

        # Development/testing: simulate success
        # To test failure handling, uncomment the following:
        # return False, "Card declined: insufficient funds"

        return True, None

    def configure_auto_topup(
        self,
        user_id: int,
        enabled: bool,
        threshold: Decimal | None = None,
        topup_amount: Decimal | None = None,
        payment_method_id: int | None = None,
    ) -> Wallet:
        """Configure auto-topup settings for a wallet."""
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        if enabled:
            if threshold is None or topup_amount is None or payment_method_id is None:
                raise PaymentError(
                    "threshold, topup_amount, and payment_method_id required when enabling auto-topup",
                    "invalid_config",
                )

            # Verify payment method
            payment_method = self.db.exec(
                select(PaymentMethod).where(
                    PaymentMethod.id == payment_method_id,
                    PaymentMethod.user_id == user_id,
                )
            ).first()

            if not payment_method:
                raise PaymentError("Payment method not found", "invalid_payment_method")

            wallet.auto_topup_enabled = True
            wallet.auto_topup_threshold = self._quantize_amount(threshold)
            wallet.auto_topup_amount = self._quantize_amount(topup_amount)
        else:
            wallet.auto_topup_enabled = False

        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)
        self.db.commit()
        self.db.refresh(wallet)

        logger.info(f"Auto-topup {'enabled' if enabled else 'disabled'} for wallet {wallet.id}")
        return wallet

    # ==================== Shift Payment Flow ====================

    async def reserve_shift_funds(
        self,
        shift_id: int,
        company_wallet_id: int | None = None,
        idempotency_key: str | None = None,
    ) -> FundsHold:
        """
        Reserve funds when accepting a worker for a shift.

        For multi-day shifts, only reserve the first day's cost.
        Returns HTTP 402 equivalent if insufficient funds.

        For agency-managed shifts (Mode B):
        - Funds are reserved from the AGENCY's wallet, not the client's
        """
        # Get shift details
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PaymentError("Shift not found", "shift_not_found")

        # Determine which wallet to use based on agency mode
        # Mode B: Reserve from agency wallet
        if shift.is_agency_managed and shift.posted_by_agency_id:
            wallet = self.db.exec(
                select(Wallet).where(Wallet.user_id == shift.posted_by_agency_id)
            ).first()
            if not wallet:
                # Create wallet for agency if doesn't exist
                wallet = Wallet(user_id=shift.posted_by_agency_id)
                self.db.add(wallet)
                self.db.commit()
                self.db.refresh(wallet)
            logger.info(f"Mode B shift {shift_id}: reserving from agency wallet {wallet.id}")
        elif company_wallet_id:
            # Mode A or direct: Use provided wallet ID
            wallet = self.db.get(Wallet, company_wallet_id)
        else:
            # Fallback: Use company's wallet
            wallet = self.db.exec(
                select(Wallet).where(Wallet.user_id == shift.company_id)
            ).first()

        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        # Check wallet status - suspended wallets cannot accept shifts
        if wallet.status == WalletStatus.SUSPENDED:
            raise PaymentError(
                "Wallet is suspended. Please resolve payment issues to accept shifts.",
                "wallet_suspended",
            )

        # Calculate shift cost
        shift_cost = self._calculate_shift_cost(shift)

        # Check for sufficient funds including minimum balance requirement
        available = wallet.available_balance
        minimum_balance = wallet.minimum_balance or Decimal("0.00")
        total_required = shift_cost + minimum_balance

        if available < total_required:
            shortfall = total_required - available
            if minimum_balance > Decimal("0.00"):
                message = (
                    f"Insufficient funds to reserve shift. "
                    f"Need {shift_cost} for shift + {minimum_balance} minimum balance = {total_required}. "
                    f"Available: {available}. Shortfall: {shortfall}"
                )
            else:
                message = f"Insufficient funds to reserve shift. Need {shift_cost}, have {available}"
            raise InsufficientFundsError(
                required=total_required,
                available=available,
                message=message,
                minimum_balance=minimum_balance,
            )

        # Check for existing hold (idempotency)
        if idempotency_key:
            existing_hold = self.db.exec(
                select(FundsHold).where(
                    FundsHold.shift_id == shift_id,
                    FundsHold.wallet_id == company_wallet_id,
                    FundsHold.status == FundsHoldStatus.ACTIVE,
                )
            ).first()
            if existing_hold:
                logger.info(f"Returning existing hold {existing_hold.id} for shift {shift_id}")
                return existing_hold

        # Create funds hold
        # Hold expires 24 hours after shift end time
        shift_end = datetime.combine(shift.date, shift.end_time)
        expires_at = shift_end + timedelta(hours=24)

        hold = FundsHold(
            wallet_id=company_wallet_id,
            shift_id=shift_id,
            amount=shift_cost,
            status=FundsHoldStatus.ACTIVE,
            expires_at=expires_at,
        )
        self.db.add(hold)

        # Update wallet reserved balance
        wallet.reserved_balance += shift_cost
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)

        # Create reserve transaction
        transaction = Transaction(
            wallet_id=company_wallet_id,
            transaction_type=TransactionType.RESERVE,
            amount=shift_cost,
            fee=Decimal("0.00"),
            net_amount=shift_cost,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key or self._generate_idempotency_key("reserve"),
            related_shift_id=shift_id,
            description=f"Funds reserved for shift {shift_id}",
            completed_at=datetime.utcnow(),
        )
        self.db.add(transaction)

        self.db.commit()
        self.db.refresh(hold)

        logger.info(f"Reserved {shift_cost} for shift {shift_id} (hold {hold.id})")
        return hold

    async def settle_shift(
        self,
        shift_id: int,
        actual_hours: Decimal | None = None,
        approved_by: int | None = None,  # None = auto-approved after 24hr
    ) -> list[Transaction]:
        """
        Settle payment after shift completion.

        Triggered by clock-out + manager approval OR 24hr auto-approve.
        Splits payment: 15% platform fee, 85% to worker/agency.

        For agency-managed shifts (Mode B):
        - 15% to platform, 85% to agency
        - Agency handles staff payment off-platform

        Args:
            shift_id: The shift to settle
            actual_hours: Hours worked. If None, uses shift.actual_hours_worked
                         (calculated from clock_in/clock_out) or scheduled hours.
            approved_by: Manager ID if manually approved, None if auto-approved.
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PaymentError("Shift not found", "shift_not_found")

        # Get the active funds hold
        hold = self.db.exec(
            select(FundsHold).where(
                FundsHold.shift_id == shift_id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()

        if not hold:
            raise PaymentError("No active funds hold for this shift", "no_hold_found")

        # Determine actual hours worked:
        # 1. Use provided actual_hours if given
        # 2. Otherwise use shift.actual_hours_worked (from clock-in/clock-out)
        # 3. Fall back to scheduled hours if neither available
        if actual_hours is not None:
            hours_to_use = self._quantize_amount(actual_hours)
        elif shift.actual_hours_worked is not None:
            hours_to_use = self._quantize_amount(shift.actual_hours_worked)
        else:
            # Fall back to scheduled hours
            hours_to_use = Decimal(str(self._calculate_shift_cost(shift) / shift.hourly_rate))

        gross_amount = self._quantize_amount(hours_to_use * shift.hourly_rate)

        # Calculate settlement split
        platform_fee, recipient_amount = await self.calculate_settlement_split(gross_amount)

        # Get the wallet that holds the funds (company or agency for Mode B)
        payer_wallet = self.db.get(Wallet, hold.wallet_id)
        if not payer_wallet:
            raise PaymentError("Payer wallet not found", "wallet_not_found")

        # Determine recipient based on agency mode
        # Mode B: Pay to agency wallet (agency pays staff off-platform)
        if shift.is_agency_managed and shift.posted_by_agency_id:
            # In Mode B, agency receives the 85% - they pay staff off-platform
            recipient_wallet = self.db.exec(
                select(Wallet).where(Wallet.user_id == shift.posted_by_agency_id)
            ).first()

            if not recipient_wallet:
                recipient_wallet = Wallet(user_id=shift.posted_by_agency_id)
                self.db.add(recipient_wallet)

            settlement_description = f"Agency payment for shift {shift_id} ({hours_to_use} hours) - Mode B"
            is_agency_managed = True
            logger.info(f"Mode B settlement: paying agency {shift.posted_by_agency_id}")
        else:
            # Mode A or direct: Pay to worker wallet
            from app.models.application import Application, ApplicationStatus

            accepted_app = self.db.exec(
                select(Application).where(
                    Application.shift_id == shift_id,
                    Application.status == ApplicationStatus.ACCEPTED,
                )
            ).first()

            if not accepted_app:
                raise PaymentError("No accepted worker for this shift", "no_worker_found")

            recipient_wallet = self.db.exec(
                select(Wallet).where(Wallet.user_id == accepted_app.applicant_id)
            ).first()

            if not recipient_wallet:
                # Create wallet for worker
                recipient_wallet = Wallet(user_id=accepted_app.applicant_id)
                self.db.add(recipient_wallet)

            settlement_description = f"Payment for shift {shift_id} ({hours_to_use} hours)"
            is_agency_managed = False

        transactions = []
        idempotency_base = self._generate_idempotency_key("settle")

        # 1. Release the hold
        hold.status = FundsHoldStatus.SETTLED
        hold.released_at = datetime.utcnow()
        self.db.add(hold)

        # Update payer reserved balance
        payer_wallet.reserved_balance -= hold.amount
        payer_wallet.updated_at = datetime.utcnow()

        # 2. If actual is less than reserved, refund the difference
        refund_amount = hold.amount - gross_amount
        if refund_amount > 0:
            payer_wallet.balance += refund_amount  # Add back unused portion
            refund_tx = Transaction(
                wallet_id=payer_wallet.id,
                transaction_type=TransactionType.REFUND,
                amount=refund_amount,
                fee=Decimal("0.00"),
                net_amount=refund_amount,
                status=TransactionStatus.COMPLETED,
                idempotency_key=f"{idempotency_base}_refund",
                related_shift_id=shift_id,
                description=f"Partial refund for shift {shift_id} (actual hours: {hours_to_use})",
                completed_at=datetime.utcnow(),
            )
            self.db.add(refund_tx)
            transactions.append(refund_tx)

        # 3. Pay the recipient (worker or agency)
        recipient_wallet.balance += recipient_amount
        recipient_wallet.updated_at = datetime.utcnow()
        self.db.add(recipient_wallet)

        recipient_tx = Transaction(
            wallet_id=recipient_wallet.id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=gross_amount,
            fee=platform_fee,
            net_amount=recipient_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=f"{idempotency_base}_recipient",
            related_shift_id=shift_id,
            description=settlement_description,
            completed_at=datetime.utcnow(),
            metadata={
                "gross_amount": str(gross_amount),
                "platform_fee": str(platform_fee),
                "hourly_rate": str(shift.hourly_rate),
                "hours_worked": str(hours_to_use),
                "approved_by": approved_by,
                "is_agency_managed": is_agency_managed,
                "agency_id": shift.posted_by_agency_id if is_agency_managed else None,
            },
        )
        self.db.add(recipient_tx)
        transactions.append(recipient_tx)

        # 4. Record platform commission
        commission_tx = Transaction(
            wallet_id=payer_wallet.id,  # Logged against payer for tracking
            transaction_type=TransactionType.COMMISSION,
            amount=platform_fee,
            fee=Decimal("0.00"),
            net_amount=platform_fee,
            status=TransactionStatus.COMPLETED,
            idempotency_key=f"{idempotency_base}_commission",
            related_shift_id=shift_id,
            description=f"Platform commission for shift {shift_id}",
            completed_at=datetime.utcnow(),
        )
        self.db.add(commission_tx)
        transactions.append(commission_tx)

        # Update payer balance (deduct actual amount from balance, not reserved)
        payer_wallet.balance -= gross_amount
        self.db.add(payer_wallet)

        self.db.commit()

        for tx in transactions:
            self.db.refresh(tx)

        mode_str = "Mode B (agency)" if is_agency_managed else "Mode A/direct"
        logger.info(
            f"Settled shift {shift_id} ({mode_str}): gross={gross_amount}, "
            f"platform={platform_fee}, recipient={recipient_amount}"
        )
        return transactions

    async def process_cancellation(
        self,
        shift_id: int,
        cancelled_by: str,  # "company", "worker", "platform"
        cancellation_time: datetime | None = None,
        reason: str | None = None,
    ) -> list[Transaction]:
        """
        Handle shift cancellation with appropriate policy.

        Cancellation policy based on timing and who cancelled:
        - >= 48 hours: Full refund
        - >= 24 hours: 50% refund
        - < 24 hours (company cancels): Worker gets 2 hours pay
        - < 24 hours (worker cancels): Full refund to company
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PaymentError("Shift not found", "shift_not_found")

        cancellation_time = cancellation_time or datetime.utcnow()
        shift_start = datetime.combine(shift.date, shift.start_time)
        hours_until_shift = (shift_start - cancellation_time).total_seconds() / 3600

        # Get active hold
        hold = self.db.exec(
            select(FundsHold).where(
                FundsHold.shift_id == shift_id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()

        if not hold:
            # No hold means no money to process
            logger.info(f"No active hold for cancelled shift {shift_id}")
            return []

        company_wallet = self.db.get(Wallet, hold.wallet_id)
        if not company_wallet:
            raise PaymentError("Company wallet not found", "wallet_not_found")

        transactions = []
        idempotency_base = self._generate_idempotency_key("cancel")

        # Determine refund amount and worker compensation
        refund_amount = Decimal("0.00")
        worker_compensation = Decimal("0.00")

        if cancelled_by == "worker":
            # Worker cancels: full refund to company
            refund_amount = hold.amount
        elif hours_until_shift >= self.FULL_REFUND_HOURS:
            # 48+ hours: full refund
            refund_amount = hold.amount
        elif hours_until_shift >= self.PARTIAL_REFUND_HOURS:
            # 24-48 hours: 50% refund
            refund_amount = self._quantize_amount(hold.amount * Decimal("0.50"))
        else:
            # < 24 hours company cancellation: worker gets 2 hours pay
            worker_compensation = self._quantize_amount(
                shift.hourly_rate * Decimal("2.00") * (1 - self.PLATFORM_COMMISSION_RATE)
            )
            refund_amount = hold.amount - (shift.hourly_rate * Decimal("2.00"))

        # Release hold
        hold.status = FundsHoldStatus.RELEASED
        hold.released_at = datetime.utcnow()
        self.db.add(hold)

        # Update company wallet
        company_wallet.reserved_balance -= hold.amount
        company_wallet.updated_at = datetime.utcnow()

        # Process refund
        if refund_amount > 0:
            company_wallet.balance += refund_amount
            refund_tx = Transaction(
                wallet_id=company_wallet.id,
                transaction_type=TransactionType.REFUND,
                amount=refund_amount,
                fee=Decimal("0.00"),
                net_amount=refund_amount,
                status=TransactionStatus.COMPLETED,
                idempotency_key=f"{idempotency_base}_refund",
                related_shift_id=shift_id,
                description=f"Cancellation refund for shift {shift_id}",
                completed_at=datetime.utcnow(),
                metadata={
                    "cancelled_by": cancelled_by,
                    "hours_until_shift": hours_until_shift,
                    "reason": reason,
                },
            )
            self.db.add(refund_tx)
            transactions.append(refund_tx)

        # Pay worker compensation if applicable
        if worker_compensation > 0:
            from app.models.application import Application, ApplicationStatus
            from app.services.penalty_service import PenaltyService

            accepted_app = self.db.exec(
                select(Application).where(
                    Application.shift_id == shift_id,
                    Application.status == ApplicationStatus.ACCEPTED,
                )
            ).first()

            if accepted_app:
                # Check if worker was agency-supplied
                penalty_service = PenaltyService(self.db)
                is_agency_supplied, agency_id = penalty_service.is_agency_supplied_worker(
                    shift_id=shift_id,
                    worker_id=accepted_app.applicant_id,
                )

                if is_agency_supplied and agency_id:
                    # Agency-supplied worker: Pay 50% to Agency Wallet (not Staff Wallet)
                    # Agency is responsible for distributing to worker per their internal policy
                    # Platform neutral: Does not enforce agency-worker split
                    agency_wallet = self.db.exec(
                        select(Wallet).where(Wallet.user_id == agency_id)
                    ).first()

                    if not agency_wallet:
                        from app.models.wallet import WalletType
                        agency_wallet = Wallet(
                            user_id=agency_id,
                            wallet_type=WalletType.AGENCY,
                        )
                        self.db.add(agency_wallet)

                    agency_wallet.balance += worker_compensation
                    agency_wallet.updated_at = datetime.utcnow()
                    self.db.add(agency_wallet)

                    agency_tx = Transaction(
                        wallet_id=agency_wallet.id,
                        transaction_type=TransactionType.SETTLEMENT,
                        amount=worker_compensation,
                        fee=Decimal("0.00"),
                        net_amount=worker_compensation,
                        status=TransactionStatus.COMPLETED,
                        idempotency_key=f"{idempotency_base}_agency",
                        related_shift_id=shift_id,
                        description=f"Late cancellation compensation for shift {shift_id} - Agency responsible for worker distribution",
                        completed_at=datetime.utcnow(),
                        metadata={
                            "cancelled_by": cancelled_by,
                            "compensation_type": "late_cancellation_agency",
                            "agency_id": agency_id,
                            "worker_id": accepted_app.applicant_id,
                            "distribution_note": "Agency responsible for distributing to worker per internal policy",
                        },
                    )
                    self.db.add(agency_tx)
                    transactions.append(agency_tx)

                    logger.info(
                        f"Late cancellation: Paid {worker_compensation} to agency {agency_id} "
                        f"(not worker {accepted_app.applicant_id}) for shift {shift_id}. "
                        f"Agency responsible for distribution."
                    )
                else:
                    # Direct worker (not agency-supplied): Pay to Staff Wallet
                    worker_wallet = self.db.exec(
                        select(Wallet).where(Wallet.user_id == accepted_app.applicant_id)
                    ).first()

                    if not worker_wallet:
                        worker_wallet = Wallet(user_id=accepted_app.applicant_id)
                        self.db.add(worker_wallet)

                    worker_wallet.balance += worker_compensation
                    worker_wallet.updated_at = datetime.utcnow()
                    self.db.add(worker_wallet)

                    worker_tx = Transaction(
                        wallet_id=worker_wallet.id,
                        transaction_type=TransactionType.SETTLEMENT,
                        amount=worker_compensation,
                        fee=Decimal("0.00"),
                        net_amount=worker_compensation,
                        status=TransactionStatus.COMPLETED,
                        idempotency_key=f"{idempotency_base}_worker",
                        related_shift_id=shift_id,
                        description=f"Cancellation compensation for shift {shift_id}",
                        completed_at=datetime.utcnow(),
                        metadata={
                            "cancelled_by": cancelled_by,
                            "compensation_type": "late_cancellation",
                        },
                    )
                    self.db.add(worker_tx)
                    transactions.append(worker_tx)

        self.db.add(company_wallet)
        self.db.commit()

        for tx in transactions:
            self.db.refresh(tx)

        logger.info(
            f"Processed cancellation for shift {shift_id}: "
            f"refund={refund_amount}, worker_comp={worker_compensation}"
        )
        return transactions

    async def calculate_settlement_split(
        self,
        gross_amount: Decimal,
    ) -> tuple[Decimal, Decimal]:
        """
        Calculate the settlement split between platform and worker.

        Returns (platform_fee, worker_amount).
        """
        platform_fee = self._quantize_amount(gross_amount * self.PLATFORM_COMMISSION_RATE)
        worker_amount = self._quantize_amount(gross_amount - platform_fee)
        return platform_fee, worker_amount

    def _calculate_shift_cost(self, shift: Shift) -> Decimal:
        """
        Calculate total cost of a shift.

        For multi-day shifts, only calculate first day.
        """
        # Calculate hours
        start = datetime.combine(shift.date, shift.start_time)
        end = datetime.combine(shift.date, shift.end_time)

        # Handle overnight shifts
        if end <= start:
            end += timedelta(days=1)

        hours = Decimal(str((end - start).total_seconds() / 3600))
        return self._quantize_amount(hours * shift.hourly_rate)

    # ==================== Payout Operations ====================

    async def process_instant_payout(
        self,
        wallet_id: int,
        amount: Decimal | None = None,
        idempotency_key: str | None = None,
    ) -> Payout:
        """
        Process instant payout with 1.5% fee.

        Minimum payout: $10

        Penalty integration:
        - First offsets any negative balance from penalties
        - Remaining amount is paid out to user
        """
        from app.services.penalty_service import PenaltyService

        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        available = wallet.available_balance

        # Use full balance if amount not specified
        if amount is None:
            amount = available
        else:
            amount = self._quantize_amount(amount)

        # First, offset any negative balance from penalties
        penalty_service = PenaltyService(self.db)
        offset_result = await penalty_service.offset_negative_balance(
            user_id=wallet.user_id,
            earnings=amount,
        )

        penalty_offset = offset_result["offset_amount"]
        effective_amount = offset_result["remaining_earnings"]

        if penalty_offset > 0:
            logger.info(
                f"Payout for user {wallet.user_id}: {penalty_offset} applied to negative balance, "
                f"{effective_amount} remaining for payout"
            )

        # If all funds went to negative balance, nothing to pay out
        if effective_amount <= Decimal("0.00"):
            raise PaymentError(
                f"Entire payout of {amount} was applied to negative balance. "
                f"Remaining negative balance: {offset_result['remaining_negative']}",
                "applied_to_negative_balance",
            )

        # Validate minimum with effective amount
        if effective_amount < self.INSTANT_PAYOUT_MINIMUM:
            raise PaymentError(
                f"After penalty offset, payout amount ({effective_amount}) is below minimum "
                f"({self.INSTANT_PAYOUT_MINIMUM}). Original amount: {amount}, penalty offset: {penalty_offset}",
                "below_minimum_after_penalty",
            )

        # Check sufficient balance
        if amount > available:
            raise InsufficientFundsError(
                required=amount,
                available=available,
                message="Insufficient funds for payout",
            )

        # Calculate fee based on effective amount (after penalty offset)
        fee = self._quantize_amount(effective_amount * self.INSTANT_PAYOUT_FEE_RATE)
        net_amount = self._quantize_amount(effective_amount - fee)

        # Create payout with effective amount (after penalty offset)
        payout = Payout(
            wallet_id=wallet_id,
            amount=effective_amount,
            fee=fee,
            net_amount=net_amount,
            payout_type=PayoutType.INSTANT,
            status=PayoutStatus.PENDING,  # Would be IN_TRANSIT after Stripe processes
            scheduled_date=date.today(),
        )
        self.db.add(payout)

        # Deduct full amount from wallet (original amount, not effective)
        # because the penalty offset was already applied to the negative balance
        wallet.balance -= amount
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)

        # Create payout transaction record
        payout_description = f"Instant payout (1.5% fee: {fee})"
        if penalty_offset > 0:
            payout_description += f" | Penalty offset: {penalty_offset}"

        transaction = Transaction(
            wallet_id=wallet_id,
            transaction_type=TransactionType.PAYOUT,
            amount=effective_amount,
            fee=fee,
            net_amount=net_amount,
            status=TransactionStatus.PENDING,
            idempotency_key=idempotency_key or self._generate_idempotency_key("payout"),
            description=payout_description,
        )
        self.db.add(transaction)

        self.db.commit()
        self.db.refresh(payout)

        # Record earnings for tax tracking (1099-NEC compliance)
        try:
            from app.services.tax_service import TaxService

            tax_service = TaxService(self.db)
            await tax_service.record_earnings(
                user_id=wallet.user_id,
                amount=net_amount,
                tax_year=datetime.utcnow().year,
            )
            logger.info(f"Recorded earnings for tax tracking: user {wallet.user_id}, amount {net_amount}")
        except Exception as e:
            # Don't fail the payout if tax tracking fails
            logger.error(f"Failed to record earnings for tax tracking: {e}")

        # Create staff pay stub for the payout
        try:
            from app.services.invoice_service import InvoiceService

            invoice_service = InvoiceService(self.db)

            # Get the shifts associated with this payout period
            # For instant payout, use current date as period
            from app.models.application import Application, ApplicationStatus

            # Find completed shifts for this user
            completed_shifts = list(
                self.db.exec(
                    select(Shift)
                    .join(Application, Application.shift_id == Shift.id)
                    .where(
                        Application.applicant_id == wallet.user_id,
                        Application.status == ApplicationStatus.ACCEPTED,
                        Shift.status == ShiftStatus.COMPLETED,
                    )
                    .order_by(Shift.date.desc())
                ).all()
            )

            invoice_service.create_staff_pay_stub(
                user_id=wallet.user_id,
                payout_id=payout.id,
                period_start=date.today(),
                period_end=date.today(),
                shifts=completed_shifts[:10] if completed_shifts else [],  # Limit to recent shifts
                gross_amount=amount,
                net_amount=net_amount,
            )
            logger.info(f"Created staff pay stub for payout {payout.id}")
        except Exception as e:
            # Don't fail the payout if invoice creation fails
            logger.error(f"Failed to create staff pay stub for payout {payout.id}: {e}")

        logger.info(f"Processed instant payout {payout.id}: amount={amount}, fee={fee}")
        return payout

    async def process_weekly_payouts(self) -> list[Payout]:
        """
        Process weekly payouts for all eligible wallets.

        Called by scheduler every Friday.
        Minimum payout: $50 (no fee for weekly payouts).

        Penalty integration:
        - First offsets any negative balance from penalties
        - Only pays out remaining amount after penalty offset
        """
        from app.services.penalty_service import PenaltyService

        payouts = []
        penalty_service = PenaltyService(self.db)

        # Find all wallets with balance >= minimum
        eligible_wallets = self.db.exec(
            select(Wallet).where(
                Wallet.balance >= self.WEEKLY_PAYOUT_MINIMUM,
                Wallet.is_active == True,
            )
        ).all()

        for wallet in eligible_wallets:
            available = wallet.available_balance
            if available < self.WEEKLY_PAYOUT_MINIMUM:
                continue

            try:
                # First, offset any negative balance from penalties
                offset_result = await penalty_service.offset_negative_balance(
                    user_id=wallet.user_id,
                    earnings=available,
                )

                penalty_offset = offset_result["offset_amount"]
                effective_amount = offset_result["remaining_earnings"]

                if penalty_offset > 0:
                    logger.info(
                        f"Weekly payout for user {wallet.user_id}: {penalty_offset} applied to negative balance, "
                        f"{effective_amount} remaining for payout"
                    )

                # Skip if effective amount is below minimum after penalty offset
                if effective_amount < self.WEEKLY_PAYOUT_MINIMUM:
                    logger.info(
                        f"Skipping weekly payout for wallet {wallet.id}: effective amount "
                        f"({effective_amount}) below minimum after penalty offset"
                    )
                    # Still deduct from wallet for penalty offset
                    if penalty_offset > 0:
                        wallet.balance -= penalty_offset
                        wallet.updated_at = datetime.utcnow()
                        self.db.add(wallet)
                    continue

                payout_description = "Weekly payout"
                if penalty_offset > 0:
                    payout_description += f" | Penalty offset: {penalty_offset}"

                payout = Payout(
                    wallet_id=wallet.id,
                    amount=effective_amount,
                    fee=Decimal("0.00"),  # No fee for weekly payouts
                    net_amount=effective_amount,
                    payout_type=PayoutType.WEEKLY,
                    status=PayoutStatus.PENDING,
                    scheduled_date=date.today(),
                )
                self.db.add(payout)

                # Deduct full original amount from wallet (penalty offset already applied)
                wallet.balance -= available
                wallet.updated_at = datetime.utcnow()
                self.db.add(wallet)

                # Create transaction
                transaction = Transaction(
                    wallet_id=wallet.id,
                    transaction_type=TransactionType.PAYOUT,
                    amount=effective_amount,
                    fee=Decimal("0.00"),
                    net_amount=effective_amount,
                    status=TransactionStatus.PENDING,
                    idempotency_key=self._generate_idempotency_key("weekly"),
                    description=payout_description,
                )
                self.db.add(transaction)

                payouts.append(payout)

            except Exception as e:
                logger.error(f"Failed to process weekly payout for wallet {wallet.id}: {e}")
                continue

        self.db.commit()

        for payout in payouts:
            self.db.refresh(payout)

        # Record earnings for tax tracking and create pay stubs for each payout
        try:
            from app.services.invoice_service import InvoiceService
            from app.services.tax_service import TaxService
            from app.models.application import Application, ApplicationStatus

            invoice_service = InvoiceService(self.db)
            tax_service = TaxService(self.db)

            # Calculate the weekly period (last 7 days)
            period_end = date.today()
            period_start = period_end - timedelta(days=7)

            for payout in payouts:
                try:
                    wallet = self.db.get(Wallet, payout.wallet_id)
                    if not wallet:
                        continue

                    # Record earnings for tax tracking (1099-NEC compliance)
                    try:
                        await tax_service.record_earnings(
                            user_id=wallet.user_id,
                            amount=payout.net_amount,
                            tax_year=datetime.utcnow().year,
                        )
                        logger.info(f"Recorded earnings for tax tracking: user {wallet.user_id}, amount {payout.net_amount}")
                    except Exception as e:
                        logger.error(f"Failed to record earnings for tax tracking: {e}")

                    # Get completed shifts for this user during the period
                    completed_shifts = list(
                        self.db.exec(
                            select(Shift)
                            .join(Application, Application.shift_id == Shift.id)
                            .where(
                                Application.applicant_id == wallet.user_id,
                                Application.status == ApplicationStatus.ACCEPTED,
                                Shift.status == ShiftStatus.COMPLETED,
                                Shift.date >= period_start,
                                Shift.date <= period_end,
                            )
                            .order_by(Shift.date.desc())
                        ).all()
                    )

                    invoice_service.create_staff_pay_stub(
                        user_id=wallet.user_id,
                        payout_id=payout.id,
                        period_start=period_start,
                        period_end=period_end,
                        shifts=completed_shifts,
                        gross_amount=payout.amount,
                        net_amount=payout.net_amount,
                    )
                    logger.info(f"Created staff pay stub for weekly payout {payout.id}")
                except Exception as e:
                    logger.error(f"Failed to create pay stub for payout {payout.id}: {e}")
                    continue

        except Exception as e:
            # Don't fail the payouts if invoice creation fails
            logger.error(f"Failed to create pay stubs for weekly payouts: {e}")

        logger.info(f"Processed {len(payouts)} weekly payouts")
        return payouts

    def get_payout_schedule(self, wallet_id: int) -> dict:
        """Get payout schedule for a wallet."""
        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        # Calculate next Friday
        today = date.today()
        days_until_friday = (4 - today.weekday()) % 7
        if days_until_friday == 0:
            days_until_friday = 7
        next_friday = today + timedelta(days=days_until_friday)

        # Get pending payouts
        pending_payouts = self.db.exec(
            select(Payout).where(
                Payout.wallet_id == wallet_id,
                Payout.status.in_([PayoutStatus.PENDING, PayoutStatus.IN_TRANSIT]),
            )
        ).all()

        scheduled_payouts = [
            {
                "scheduled_date": p.scheduled_date,
                "estimated_amount": p.amount,
                "status": p.status.value,
            }
            for p in pending_payouts
        ]

        return {
            "next_payout_date": datetime.combine(next_friday, datetime.min.time()),
            "minimum_threshold": self.WEEKLY_PAYOUT_MINIMUM,
            "current_balance": wallet.available_balance,
            "scheduled_payouts": scheduled_payouts,
        }

    def get_payout_history(
        self,
        wallet_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Payout], int]:
        """Get payout history for a wallet."""
        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        from sqlmodel import func

        # Get payouts
        payouts = list(
            self.db.exec(
                select(Payout)
                .where(Payout.wallet_id == wallet_id)
                .order_by(Payout.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

        # Get total count
        total = self.db.exec(
            select(func.count(Payout.id)).where(Payout.wallet_id == wallet_id)
        ).one()

        return payouts, total

    # ==================== Scheduled Jobs ====================

    async def check_auto_topup(self) -> list[Transaction]:
        """
        Check all wallets and trigger auto-topup if needed.

        Called periodically by scheduler.
        """
        transactions = []

        # Find wallets with auto-topup enabled below threshold
        wallets = self.db.exec(
            select(Wallet).where(
                Wallet.auto_topup_enabled == True,
                Wallet.is_active == True,
            )
        ).all()

        for wallet in wallets:
            if (
                wallet.auto_topup_threshold
                and wallet.auto_topup_amount
                and wallet.available_balance < wallet.auto_topup_threshold
            ):
                # Get default payment method
                default_pm = self.db.exec(
                    select(PaymentMethod).where(
                        PaymentMethod.user_id == wallet.user_id,
                        PaymentMethod.is_default == True,
                    )
                ).first()

                if default_pm:
                    try:
                        tx = await self.topup_wallet(
                            user_id=wallet.user_id,
                            amount=wallet.auto_topup_amount,
                            payment_method_id=default_pm.id,
                            idempotency_key=self._generate_idempotency_key("autotopup"),
                        )
                        transactions.append(tx)
                        logger.info(f"Auto-topped up wallet {wallet.id}")
                    except PaymentError as e:
                        # PaymentError is raised when Stripe payment fails
                        # handle_failed_topup is already called inside topup_wallet
                        logger.error(f"Auto-topup failed for wallet {wallet.id}: {e}")
                    except Exception as e:
                        logger.error(f"Auto-topup failed for wallet {wallet.id}: {e}")
                        # Handle unexpected errors - place wallet in grace period
                        await self.handle_failed_topup(
                            wallet_id=wallet.id,
                            amount=wallet.auto_topup_amount,
                            reason=str(e),
                        )

        return transactions

    async def handle_failed_topup(
        self,
        wallet_id: int,
        amount: Decimal,
        reason: str,
    ) -> None:
        """
        Handle a failed top-up by placing wallet in grace period.

        1. Update wallet status to GRACE_PERIOD
        2. Set grace_period_ends_at = now + 48hrs
        3. Send failed top-up email alert
        4. Create notification
        """
        from app.services.email_service import EmailService

        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            logger.error(f"Cannot handle failed topup: wallet {wallet_id} not found")
            return

        # Only process if wallet is currently active
        if wallet.status == WalletStatus.SUSPENDED:
            logger.info(f"Wallet {wallet_id} already suspended, skipping grace period")
            return

        now = datetime.utcnow()
        grace_period_ends = now + timedelta(hours=self.GRACE_PERIOD_HOURS)

        # Update wallet status
        wallet.status = WalletStatus.GRACE_PERIOD
        wallet.last_failed_topup_at = now
        wallet.grace_period_ends_at = grace_period_ends
        wallet.suspension_reason = f"Failed top-up: {reason}"
        wallet.updated_at = now
        self.db.add(wallet)
        self.db.commit()

        logger.warning(
            f"Wallet {wallet_id} placed in grace period until {grace_period_ends}. "
            f"Reason: {reason}"
        )

        # Send email notification
        email_service = EmailService(self.db)
        await email_service.send_failed_topup_alert(
            user_id=wallet.user_id,
            amount=amount,
            failure_reason=reason,
            grace_period_ends=grace_period_ends,
        )

    async def check_and_suspend_wallets(self) -> list[int]:
        """
        Find wallets where grace period has ended and suspend them.

        Returns list of suspended wallet IDs.
        """
        from app.services.email_service import EmailService

        now = datetime.utcnow()
        suspended_wallet_ids = []

        # Find wallets where grace period has ended
        wallets_to_suspend = self.db.exec(
            select(Wallet).where(
                Wallet.status == WalletStatus.GRACE_PERIOD,
                Wallet.grace_period_ends_at <= now,
            )
        ).all()

        email_service = EmailService(self.db)

        for wallet in wallets_to_suspend:
            wallet.status = WalletStatus.SUSPENDED
            wallet.updated_at = now
            self.db.add(wallet)

            logger.warning(f"Wallet {wallet.id} suspended due to expired grace period")

            # Send suspension email
            await email_service.send_account_suspended(
                user_id=wallet.user_id,
                reason=wallet.suspension_reason or "Failed to resolve payment issues within grace period",
            )

            suspended_wallet_ids.append(wallet.id)

        if suspended_wallet_ids:
            self.db.commit()

        return suspended_wallet_ids

    async def send_suspension_warnings(self) -> list[int]:
        """
        Send warning emails to wallets approaching suspension deadline.

        Returns list of wallet IDs that were warned.
        """
        from app.services.email_service import EmailService

        now = datetime.utcnow()
        warning_threshold = now + timedelta(hours=self.SUSPENSION_WARNING_HOURS)
        warned_wallet_ids = []

        # Find wallets in grace period that will be suspended within warning window
        # but haven't been warned yet (grace_period_ends_at is within 24-48 hours)
        wallets_to_warn = self.db.exec(
            select(Wallet).where(
                Wallet.status == WalletStatus.GRACE_PERIOD,
                Wallet.grace_period_ends_at <= warning_threshold,
                Wallet.grace_period_ends_at > now,
            )
        ).all()

        email_service = EmailService(self.db)

        for wallet in wallets_to_warn:
            # Calculate hours remaining
            time_remaining = wallet.grace_period_ends_at - now
            hours_remaining = int(time_remaining.total_seconds() / 3600)

            if hours_remaining <= self.SUSPENSION_WARNING_HOURS:
                await email_service.send_suspension_warning(
                    user_id=wallet.user_id,
                    hours_remaining=max(1, hours_remaining),  # At least 1 hour
                )
                warned_wallet_ids.append(wallet.id)
                logger.info(
                    f"Sent suspension warning to wallet {wallet.id}: "
                    f"{hours_remaining} hours remaining"
                )

        return warned_wallet_ids

    async def reactivate_wallet(
        self,
        wallet_id: int,
        minimum_balance: Decimal | None = None,
    ) -> Wallet:
        """
        Reactivate a suspended or grace-period wallet.

        Verifies sufficient balance before reactivation.
        """
        from app.services.email_service import EmailService

        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        if wallet.status == WalletStatus.ACTIVE:
            logger.info(f"Wallet {wallet_id} is already active")
            return wallet

        # Verify minimum balance if specified
        if minimum_balance is not None and wallet.available_balance < minimum_balance:
            raise InsufficientFundsError(
                required=minimum_balance,
                available=wallet.available_balance,
                message=f"Insufficient funds to reactivate. Need {minimum_balance}, have {wallet.available_balance}",
            )

        # Reset wallet status
        wallet.status = WalletStatus.ACTIVE
        wallet.last_failed_topup_at = None
        wallet.grace_period_ends_at = None
        wallet.suspension_reason = None
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)
        self.db.commit()
        self.db.refresh(wallet)

        logger.info(f"Wallet {wallet_id} reactivated")

        # Send reactivation email
        email_service = EmailService(self.db)
        await email_service.send_account_reactivated(user_id=wallet.user_id)

        return wallet

    async def auto_approve_shifts(self) -> list[int]:
        """
        Auto-approve shifts that are past 24hr timeout.

        Called periodically by scheduler.
        """
        approved_shift_ids = []
        cutoff_time = datetime.utcnow() - timedelta(hours=24)

        # Find shifts that completed more than 24 hours ago
        # and haven't been settled yet
        from app.models.application import Application, ApplicationStatus

        # Get shifts with active holds that have passed the shift date
        holds = self.db.exec(
            select(FundsHold).where(
                FundsHold.status == FundsHoldStatus.ACTIVE,
                FundsHold.created_at < cutoff_time,
            )
        ).all()

        for hold in holds:
            shift = self.db.get(Shift, hold.shift_id)
            if not shift:
                continue

            # Check if shift end time + 24 hours has passed
            shift_end = datetime.combine(shift.date, shift.end_time)
            if datetime.utcnow() > shift_end + timedelta(hours=24):
                try:
                    # Calculate full shift hours for auto-approval
                    start = datetime.combine(shift.date, shift.start_time)
                    end = datetime.combine(shift.date, shift.end_time)
                    if end <= start:
                        end += timedelta(days=1)
                    hours = Decimal(str((end - start).total_seconds() / 3600))

                    await self.settle_shift(
                        shift_id=shift.id,
                        actual_hours=hours,
                        approved_by=None,  # Auto-approved
                    )
                    approved_shift_ids.append(shift.id)
                    logger.info(f"Auto-approved shift {shift.id}")
                except Exception as e:
                    logger.error(f"Failed to auto-approve shift {shift.id}: {e}")

        return approved_shift_ids

    # ==================== Multi-Day Shift Scheduling ====================

    def schedule_subsequent_reserves(
        self,
        shift_id: int,
        shift_days: list[date],
    ) -> list[dict]:
        """
        Schedule reserve operations for subsequent days of a multi-day shift.

        This creates ScheduledReserve records for each day after the first.
        Each reserve is scheduled to execute 48 hours before the day starts.

        Args:
            shift_id: The ID of the multi-day shift
            shift_days: List of dates for the shift (first day is already reserved)

        Returns:
            List of created scheduled reserve records
        """
        from app.models.payment import ScheduledReserve, ScheduledReserveStatus

        if len(shift_days) <= 1:
            logger.debug(f"Shift {shift_id} is single-day, no subsequent reserves needed")
            return []

        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PaymentError("Shift not found", "shift_not_found")

        # Get the company wallet from the existing hold
        existing_hold = self.db.exec(
            select(FundsHold).where(
                FundsHold.shift_id == shift_id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()

        if not existing_hold:
            raise PaymentError(
                "No active funds hold found for shift. First day must be reserved before scheduling subsequent days.",
                "no_active_hold",
            )

        company_wallet_id = existing_hold.wallet_id
        scheduled_reserves = []

        # Calculate daily cost (same for each day)
        daily_cost = self._calculate_shift_cost(shift)

        # Schedule reserves for subsequent days (skip first day - already reserved)
        for day_date in shift_days[1:]:
            # Calculate when to execute the reserve (48 hours before day starts)
            day_start = datetime.combine(day_date, shift.start_time)
            execute_at = day_start - timedelta(hours=48)

            # Don't schedule if execute time is in the past
            if execute_at <= datetime.utcnow():
                logger.warning(
                    f"Scheduled reserve for shift {shift_id} day {day_date} "
                    f"would be in the past, executing immediately"
                )
                execute_at = datetime.utcnow()

            # Create scheduled reserve record
            scheduled_reserve = ScheduledReserve(
                shift_id=shift_id,
                wallet_id=company_wallet_id,
                shift_date=day_date,
                amount=daily_cost,
                execute_at=execute_at,
                status=ScheduledReserveStatus.PENDING,
            )
            self.db.add(scheduled_reserve)
            scheduled_reserves.append({
                "shift_id": shift_id,
                "shift_date": day_date,
                "amount": daily_cost,
                "execute_at": execute_at,
            })

        self.db.commit()

        logger.info(
            f"Scheduled {len(scheduled_reserves)} subsequent reserves for "
            f"multi-day shift {shift_id}"
        )

        return scheduled_reserves

    async def execute_scheduled_reserve(
        self,
        scheduled_reserve_id: int,
    ) -> FundsHold | None:
        """
        Execute a scheduled reserve for a multi-day shift day.

        Args:
            scheduled_reserve_id: ID of the ScheduledReserve to execute

        Returns:
            The created FundsHold, or None if execution failed
        """
        from app.models.payment import ScheduledReserve, ScheduledReserveStatus

        scheduled_reserve = self.db.get(ScheduledReserve, scheduled_reserve_id)
        if not scheduled_reserve:
            logger.error(f"ScheduledReserve {scheduled_reserve_id} not found")
            return None

        if scheduled_reserve.status != ScheduledReserveStatus.PENDING:
            logger.warning(
                f"ScheduledReserve {scheduled_reserve_id} is not pending "
                f"(status: {scheduled_reserve.status})"
            )
            return None

        # Mark as processing
        scheduled_reserve.status = ScheduledReserveStatus.PROCESSING
        self.db.add(scheduled_reserve)
        self.db.commit()

        try:
            # Get wallet and check balance
            wallet = self.db.get(Wallet, scheduled_reserve.wallet_id)
            if not wallet:
                raise PaymentError("Wallet not found", "wallet_not_found")

            available = wallet.available_balance
            if available < scheduled_reserve.amount:
                raise InsufficientFundsError(
                    required=scheduled_reserve.amount,
                    available=available,
                    message=f"Insufficient funds for scheduled reserve. "
                            f"Need {scheduled_reserve.amount}, have {available}",
                )

            # Create the funds hold
            shift = self.db.get(Shift, scheduled_reserve.shift_id)
            if not shift:
                raise PaymentError("Shift not found", "shift_not_found")

            # Calculate expiration (24 hours after the shift day ends)
            shift_end = datetime.combine(scheduled_reserve.shift_date, shift.end_time)
            if shift.end_time <= shift.start_time:
                shift_end += timedelta(days=1)
            expires_at = shift_end + timedelta(hours=24)

            hold = FundsHold(
                wallet_id=scheduled_reserve.wallet_id,
                shift_id=scheduled_reserve.shift_id,
                amount=scheduled_reserve.amount,
                status=FundsHoldStatus.ACTIVE,
                expires_at=expires_at,
            )
            self.db.add(hold)

            # Update wallet reserved balance
            wallet.reserved_balance += scheduled_reserve.amount
            wallet.updated_at = datetime.utcnow()
            self.db.add(wallet)

            # Create reserve transaction
            transaction = Transaction(
                wallet_id=scheduled_reserve.wallet_id,
                transaction_type=TransactionType.RESERVE,
                amount=scheduled_reserve.amount,
                fee=Decimal("0.00"),
                net_amount=scheduled_reserve.amount,
                status=TransactionStatus.COMPLETED,
                idempotency_key=self._generate_idempotency_key("sched_reserve"),
                related_shift_id=scheduled_reserve.shift_id,
                description=f"Scheduled reserve for shift {scheduled_reserve.shift_id} "
                           f"day {scheduled_reserve.shift_date}",
                completed_at=datetime.utcnow(),
            )
            self.db.add(transaction)

            # Mark scheduled reserve as completed
            scheduled_reserve.status = ScheduledReserveStatus.COMPLETED
            scheduled_reserve.executed_at = datetime.utcnow()
            self.db.add(scheduled_reserve)

            self.db.commit()
            self.db.refresh(hold)

            logger.info(
                f"Executed scheduled reserve {scheduled_reserve_id}: "
                f"created hold {hold.id} for {scheduled_reserve.amount}"
            )

            return hold

        except (InsufficientFundsError, PaymentError) as e:
            # Mark as failed
            scheduled_reserve.status = ScheduledReserveStatus.FAILED
            scheduled_reserve.failure_reason = str(e)
            self.db.add(scheduled_reserve)
            self.db.commit()

            logger.error(
                f"Failed to execute scheduled reserve {scheduled_reserve_id}: {e}"
            )

            # TODO: Create notification for company about failed reserve
            return None

        except Exception as e:
            # Mark as failed for unexpected errors
            scheduled_reserve.status = ScheduledReserveStatus.FAILED
            scheduled_reserve.failure_reason = f"Unexpected error: {str(e)}"
            self.db.add(scheduled_reserve)
            self.db.commit()

            logger.exception(
                f"Unexpected error executing scheduled reserve {scheduled_reserve_id}"
            )
            return None

    def get_pending_scheduled_reserves(
        self,
        execute_before: datetime | None = None,
    ) -> list:
        """
        Get pending scheduled reserves that are due for execution.

        Args:
            execute_before: Only return reserves due before this time.
                           Defaults to current time + 1 hour.

        Returns:
            List of ScheduledReserve objects ready for execution
        """
        from app.models.payment import ScheduledReserve, ScheduledReserveStatus

        if execute_before is None:
            execute_before = datetime.utcnow() + timedelta(hours=1)

        return list(
            self.db.exec(
                select(ScheduledReserve).where(
                    ScheduledReserve.status == ScheduledReserveStatus.PENDING,
                    ScheduledReserve.execute_at <= execute_before,
                )
            ).all()
        )
