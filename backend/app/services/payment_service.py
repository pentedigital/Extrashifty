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
from app.models.wallet import PaymentMethod, Wallet

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
    ):
        self.required = required
        self.available = available
        self.shortfall = required - available
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

    def topup_wallet(
        self,
        user_id: int,
        amount: Decimal,
        payment_method_id: int,
        idempotency_key: str | None = None,
    ) -> Transaction:
        """
        Add funds to company wallet.

        In production, this would integrate with Stripe to charge the payment method.
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

        # Create transaction (in production, would create Stripe PaymentIntent here)
        transaction = Transaction(
            wallet_id=wallet.id,
            transaction_type=TransactionType.TOPUP,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            status=TransactionStatus.COMPLETED,  # Would be PENDING until Stripe confirms
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

        logger.info(f"Topped up wallet {wallet.id} with {amount} ({idempotency_key})")
        return transaction

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
        company_wallet_id: int,
        idempotency_key: str | None = None,
    ) -> FundsHold:
        """
        Reserve funds when accepting a worker for a shift.

        For multi-day shifts, only reserve the first day's cost.
        Returns HTTP 402 equivalent if insufficient funds.
        """
        # Get shift details
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PaymentError("Shift not found", "shift_not_found")

        # Get company wallet
        wallet = self.db.get(Wallet, company_wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        # Calculate shift cost
        shift_cost = self._calculate_shift_cost(shift)

        # Check for sufficient funds
        available = wallet.available_balance
        if available < shift_cost:
            raise InsufficientFundsError(
                required=shift_cost,
                available=available,
                message=f"Insufficient funds to reserve shift. Need {shift_cost}, have {available}",
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
        actual_hours: Decimal,
        approved_by: int | None = None,  # None = auto-approved after 24hr
    ) -> list[Transaction]:
        """
        Settle payment after shift completion.

        Triggered by clock-out + manager approval OR 24hr auto-approve.
        Splits payment: 15% platform fee, 85% to worker/agency.
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

        # Calculate actual payment based on hours worked
        actual_hours = self._quantize_amount(actual_hours)
        gross_amount = self._quantize_amount(actual_hours * shift.hourly_rate)

        # Calculate settlement split
        platform_fee, worker_amount = await self.calculate_settlement_split(gross_amount)

        # Get company wallet
        company_wallet = self.db.get(Wallet, hold.wallet_id)
        if not company_wallet:
            raise PaymentError("Company wallet not found", "wallet_not_found")

        # Get worker wallet (from accepted application)
        from app.models.application import Application, ApplicationStatus

        accepted_app = self.db.exec(
            select(Application).where(
                Application.shift_id == shift_id,
                Application.status == ApplicationStatus.ACCEPTED,
            )
        ).first()

        if not accepted_app:
            raise PaymentError("No accepted worker for this shift", "no_worker_found")

        worker_wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == accepted_app.applicant_id)
        ).first()

        if not worker_wallet:
            # Create wallet for worker
            worker_wallet = Wallet(user_id=accepted_app.applicant_id)
            self.db.add(worker_wallet)

        transactions = []
        idempotency_base = self._generate_idempotency_key("settle")

        # 1. Release the hold
        hold.status = FundsHoldStatus.SETTLED
        hold.released_at = datetime.utcnow()
        self.db.add(hold)

        # Update company reserved balance
        company_wallet.reserved_balance -= hold.amount
        company_wallet.updated_at = datetime.utcnow()

        # 2. If actual is less than reserved, refund the difference
        refund_amount = hold.amount - gross_amount
        if refund_amount > 0:
            company_wallet.balance += refund_amount  # Add back unused portion
            refund_tx = Transaction(
                wallet_id=company_wallet.id,
                transaction_type=TransactionType.REFUND,
                amount=refund_amount,
                fee=Decimal("0.00"),
                net_amount=refund_amount,
                status=TransactionStatus.COMPLETED,
                idempotency_key=f"{idempotency_base}_refund",
                related_shift_id=shift_id,
                description=f"Partial refund for shift {shift_id} (actual hours: {actual_hours})",
                completed_at=datetime.utcnow(),
            )
            self.db.add(refund_tx)
            transactions.append(refund_tx)

        # 3. Pay the worker
        worker_wallet.balance += worker_amount
        worker_wallet.updated_at = datetime.utcnow()
        self.db.add(worker_wallet)

        worker_tx = Transaction(
            wallet_id=worker_wallet.id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=gross_amount,
            fee=platform_fee,
            net_amount=worker_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=f"{idempotency_base}_worker",
            related_shift_id=shift_id,
            description=f"Payment for shift {shift_id} ({actual_hours} hours)",
            completed_at=datetime.utcnow(),
            metadata={
                "gross_amount": str(gross_amount),
                "platform_fee": str(platform_fee),
                "hourly_rate": str(shift.hourly_rate),
                "hours_worked": str(actual_hours),
                "approved_by": approved_by,
            },
        )
        self.db.add(worker_tx)
        transactions.append(worker_tx)

        # 4. Record platform commission
        commission_tx = Transaction(
            wallet_id=company_wallet.id,  # Logged against company for tracking
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

        # Update company balance (deduct actual amount from balance, not reserved)
        company_wallet.balance -= gross_amount
        self.db.add(company_wallet)

        self.db.commit()

        for tx in transactions:
            self.db.refresh(tx)

        logger.info(
            f"Settled shift {shift_id}: gross={gross_amount}, "
            f"platform={platform_fee}, worker={worker_amount}"
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

            accepted_app = self.db.exec(
                select(Application).where(
                    Application.shift_id == shift_id,
                    Application.status == ApplicationStatus.ACCEPTED,
                )
            ).first()

            if accepted_app:
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
        """
        wallet = self.db.get(Wallet, wallet_id)
        if not wallet:
            raise PaymentError("Wallet not found", "wallet_not_found")

        available = wallet.available_balance

        # Use full balance if amount not specified
        if amount is None:
            amount = available
        else:
            amount = self._quantize_amount(amount)

        # Validate minimum
        if amount < self.INSTANT_PAYOUT_MINIMUM:
            raise PaymentError(
                f"Minimum instant payout is {self.INSTANT_PAYOUT_MINIMUM}",
                "below_minimum",
            )

        # Check sufficient balance
        if amount > available:
            raise InsufficientFundsError(
                required=amount,
                available=available,
                message="Insufficient funds for payout",
            )

        # Calculate fee
        fee = self._quantize_amount(amount * self.INSTANT_PAYOUT_FEE_RATE)
        net_amount = self._quantize_amount(amount - fee)

        # Create payout
        payout = Payout(
            wallet_id=wallet_id,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            payout_type=PayoutType.INSTANT,
            status=PayoutStatus.PENDING,  # Would be IN_TRANSIT after Stripe processes
            scheduled_date=date.today(),
        )
        self.db.add(payout)

        # Deduct from wallet
        wallet.balance -= amount
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)

        # Create transaction record
        transaction = Transaction(
            wallet_id=wallet_id,
            transaction_type=TransactionType.PAYOUT,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            status=TransactionStatus.PENDING,
            idempotency_key=idempotency_key or self._generate_idempotency_key("payout"),
            description=f"Instant payout (1.5% fee: {fee})",
        )
        self.db.add(transaction)

        self.db.commit()
        self.db.refresh(payout)

        logger.info(f"Processed instant payout {payout.id}: amount={amount}, fee={fee}")
        return payout

    async def process_weekly_payouts(self) -> list[Payout]:
        """
        Process weekly payouts for all eligible wallets.

        Called by scheduler every Friday.
        Minimum payout: $50 (no fee for weekly payouts).
        """
        payouts = []

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
                payout = Payout(
                    wallet_id=wallet.id,
                    amount=available,
                    fee=Decimal("0.00"),  # No fee for weekly payouts
                    net_amount=available,
                    payout_type=PayoutType.WEEKLY,
                    status=PayoutStatus.PENDING,
                    scheduled_date=date.today(),
                )
                self.db.add(payout)

                # Deduct from wallet
                wallet.balance -= available
                wallet.updated_at = datetime.utcnow()
                self.db.add(wallet)

                # Create transaction
                transaction = Transaction(
                    wallet_id=wallet.id,
                    transaction_type=TransactionType.PAYOUT,
                    amount=available,
                    fee=Decimal("0.00"),
                    net_amount=available,
                    status=TransactionStatus.PENDING,
                    idempotency_key=self._generate_idempotency_key("weekly"),
                    description="Weekly payout",
                )
                self.db.add(transaction)

                payouts.append(payout)

            except Exception as e:
                logger.error(f"Failed to process weekly payout for wallet {wallet.id}: {e}")
                continue

        self.db.commit()

        for payout in payouts:
            self.db.refresh(payout)

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
                        tx = self.topup_wallet(
                            user_id=wallet.user_id,
                            amount=wallet.auto_topup_amount,
                            payment_method_id=default_pm.id,
                            idempotency_key=self._generate_idempotency_key("autotopup"),
                        )
                        transactions.append(tx)
                        logger.info(f"Auto-topped up wallet {wallet.id}")
                    except Exception as e:
                        logger.error(f"Auto-topup failed for wallet {wallet.id}: {e}")

        return transactions

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
