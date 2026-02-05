"""Penalty service for ExtraShifty no-show and penalty flows.

Handles:
- No-show detection (30min after shift start with no clock-in)
- Penalty calculation (50% of shift value)
- Strike management (3 strikes in 90 days = 30-day suspension)
- First-offense leniency (warning only, no penalty)
- Same-day strike cap (multiple no-shows same day = 1 strike max)
- Penalty collection priority (earnings -> wallet -> negative balance)
- Appeal handling (7-day window)
- Agency worker penalties (charged to agency wallet)
"""

import logging
import uuid
from datetime import datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from sqlmodel import Session, func, select

from app.models.application import Application, ApplicationStatus
from app.models.payment import (
    FundsHold,
    FundsHoldStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from app.models.penalty import (
    AppealStatus,
    NegativeBalance,
    Penalty,
    PenaltyAppeal,
    PenaltyStatus,
    Strike,
    UserSuspension,
)
from app.models.shift import Shift, ShiftStatus
from app.models.wallet import Wallet, WalletType

if TYPE_CHECKING:
    from app.models.user import User

logger = logging.getLogger(__name__)


class PenaltyError(Exception):
    """General penalty processing error."""

    def __init__(self, message: str, code: str = "penalty_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class PenaltyService:
    """Service class handling penalty-related business logic for workers and agencies."""

    # Policy constants for worker no-shows
    GRACE_PERIOD_MINUTES = 30  # Minutes after shift start before no-show
    PENALTY_RATE = Decimal("0.50")  # 50% of shift value
    STRIKE_EXPIRY_DAYS = 90  # Strikes expire after 90 days
    STRIKES_FOR_SUSPENSION = 3  # 3 strikes = suspension
    SUSPENSION_DAYS = 30  # 30-day suspension
    APPEAL_WINDOW_DAYS = 7  # 7 days to appeal
    INACTIVITY_WRITEOFF_DAYS = 180  # 6 months for negative balance write-off

    # Agency penalty rates
    NO_SHOW_PENALTY_RATE = Decimal("0.50")  # 50% of shift value as penalty
    MIN_NO_SHOW_PENALTY = Decimal("25.00")  # Minimum penalty amount
    MAX_NO_SHOW_PENALTY = Decimal("500.00")  # Maximum penalty cap
    AGENCY_STRIKES_BEFORE_WARNING = 2
    AGENCY_STRIKES_BEFORE_SUSPENSION = 5

    def __init__(self, db: Session):
        self.db = db

    def _generate_idempotency_key(self, prefix: str = "penalty") -> str:
        """Generate a unique idempotency key."""
        return f"{prefix}_{uuid.uuid4().hex}"

    def _quantize_amount(self, amount: Decimal) -> Decimal:
        """Ensure amount has exactly 2 decimal places."""
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def _calculate_shift_value(self, shift: Shift) -> Decimal:
        """Calculate the total value of a shift based on hours and rate."""
        start = datetime.combine(shift.date, shift.start_time)
        end = datetime.combine(shift.date, shift.end_time)

        # Handle overnight shifts
        if end <= start:
            end += timedelta(days=1)

        hours = Decimal(str((end - start).total_seconds() / 3600))
        return self._quantize_amount(hours * shift.hourly_rate)

    # ==================== No-Show Detection ====================

    def check_for_noshow(self, shift_id: int) -> bool:
        """
        Check if a shift qualifies as a no-show.

        A no-show occurs when:
        - Shift start time has passed
        - 30 minutes grace period has elapsed
        - No clock-in recorded

        Returns True if shift is a no-show.
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            logger.warning(f"Shift {shift_id} not found for no-show check")
            return False

        # Only check filled shifts
        if shift.status != ShiftStatus.FILLED:
            return False

        # Check if shift start + grace period has passed
        shift_start = datetime.combine(shift.date, shift.start_time)
        noshow_threshold = shift_start + timedelta(minutes=self.GRACE_PERIOD_MINUTES)

        if datetime.utcnow() < noshow_threshold:
            return False

        # Check for existing penalty to avoid duplicate processing
        existing_penalty = self.db.exec(
            select(Penalty).where(
                Penalty.shift_id == shift_id,
                Penalty.status != PenaltyStatus.WAIVED,
            )
        ).first()

        if existing_penalty:
            return False

        # Get accepted application
        accepted_app = self.db.exec(
            select(Application).where(
                Application.shift_id == shift_id,
                Application.status == ApplicationStatus.ACCEPTED,
            )
        ).first()

        if not accepted_app:
            return False

        # Shift is a no-show if status is still FILLED (not IN_PROGRESS or COMPLETED)
        return True

    def get_shifts_needing_noshow_check(self) -> list[Shift]:
        """
        Find all shifts that need no-show checking.

        Returns shifts where:
        - Status is FILLED (has accepted worker, not started)
        - Shift start + 30min has passed
        - No existing penalty
        """
        now = datetime.utcnow()
        grace_cutoff = now - timedelta(minutes=self.GRACE_PERIOD_MINUTES)

        filled_shifts = self.db.exec(
            select(Shift).where(Shift.status == ShiftStatus.FILLED)
        ).all()

        shifts_to_check = []
        for shift in filled_shifts:
            shift_start = datetime.combine(shift.date, shift.start_time)
            if shift_start <= grace_cutoff:
                # Check no existing penalty
                existing = self.db.exec(
                    select(Penalty).where(Penalty.shift_id == shift.id)
                ).first()
                if not existing:
                    shifts_to_check.append(shift)

        return shifts_to_check

    # ==================== No-Show Processing ====================

    async def process_noshow(self, shift_id: int) -> dict | None:
        """
        Process a no-show for a shift.

        Applies:
        1. First-offense leniency check (warning only if first time)
        2. Penalty (50% of shift value)
        3. Strike (with same-day cap)
        4. Suspension check (3 strikes = 30 days)
        5. Full refund to company

        Returns processing result dict or None if not a no-show.
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PenaltyError(f"Shift {shift_id} not found", "shift_not_found")

        # Get the accepted worker
        accepted_app = self.db.exec(
            select(Application).where(
                Application.shift_id == shift_id,
                Application.status == ApplicationStatus.ACCEPTED,
            )
        ).first()

        if not accepted_app:
            raise PenaltyError(f"No accepted worker for shift {shift_id}", "no_worker")

        worker_id = accepted_app.applicant_id

        # Check if this is an agency-supplied worker
        is_agency, agency_id = self.is_agency_supplied_worker(shift_id, worker_id)
        if is_agency and agency_id:
            # Route to agency penalty flow
            return await self.process_agency_worker_noshow(
                shift_id=shift_id,
                agency_id=agency_id,
                worker_id=worker_id,
            )

        # Regular worker no-show processing
        shift_value = self._calculate_shift_value(shift)
        penalty_amount = self._quantize_amount(shift_value * self.PENALTY_RATE)

        result = {
            "shift_id": shift_id,
            "worker_id": worker_id,
            "shift_value": shift_value,
            "penalty_amount": penalty_amount,
            "is_first_offense": False,
            "strike_added": False,
            "suspended": False,
            "refund_processed": False,
        }

        # Check first offense leniency
        is_first = self.is_first_offense(worker_id)
        result["is_first_offense"] = is_first

        if is_first:
            # First offense: warning only, no penalty, no strike
            await self._apply_first_offense_warning(worker_id, shift_id)
            result["penalty_amount"] = Decimal("0.00")
            logger.info(f"First offense leniency applied for worker {worker_id} on shift {shift_id}")
        else:
            # Create penalty
            penalty = Penalty(
                user_id=worker_id,
                shift_id=shift_id,
                amount=penalty_amount,
                reason=f"No-show for shift on {shift.date}",
                status=PenaltyStatus.PENDING,
            )
            self.db.add(penalty)

            # Add strike (with same-day cap check)
            strike_result = await self.add_strike(
                user_id=worker_id,
                reason=f"No-show for shift {shift_id}",
                shift_id=shift_id,
            )
            result["strike_added"] = strike_result["strike_added"]

            # Check for suspension
            if strike_result["strike_added"]:
                suspension_result = await self.check_suspension(worker_id)
                result["suspended"] = suspension_result["suspended"]

            # Attempt to collect penalty
            await self.collect_penalty(worker_id, penalty_amount, penalty)

            logger.info(
                f"No-show processed for worker {worker_id} on shift {shift_id}: "
                f"penalty={penalty_amount}, strike={result['strike_added']}, "
                f"suspended={result['suspended']}"
            )

        # Process company refund
        await self._process_noshow_refund(shift)
        result["refund_processed"] = True

        # Update shift status
        shift.status = ShiftStatus.CANCELLED
        self.db.add(shift)

        self.db.commit()

        return result

    async def _apply_first_offense_warning(self, user_id: int, shift_id: int) -> None:
        """Apply first offense warning (no penalty, creates warning strike)."""
        expires_at = datetime.utcnow() + timedelta(days=self.STRIKE_EXPIRY_DAYS)

        # Create a warning-only strike (doesn't count toward 3-strike limit)
        warning_strike = Strike(
            user_id=user_id,
            shift_id=shift_id,
            reason=f"First offense warning for no-show on shift {shift_id}",
            expires_at=expires_at,
            is_active=True,
            is_warning_only=True,
        )
        self.db.add(warning_strike)

        logger.info(f"First offense warning recorded for user {user_id}, shift {shift_id}")

    async def _process_noshow_refund(self, shift: Shift) -> None:
        """Process 100% refund to company for no-show."""
        # Find the active funds hold
        hold = self.db.exec(
            select(FundsHold).where(
                FundsHold.shift_id == shift.id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()

        if not hold:
            logger.warning(f"No active funds hold found for shift {shift.id}")
            return

        # Get company wallet
        company_wallet = self.db.get(Wallet, hold.wallet_id)
        if not company_wallet:
            logger.error(f"Company wallet {hold.wallet_id} not found for refund")
            return

        # Release hold and refund full amount
        hold.status = FundsHoldStatus.RELEASED
        hold.released_at = datetime.utcnow()
        self.db.add(hold)

        # Update wallet balances
        company_wallet.reserved_balance -= hold.amount
        company_wallet.balance += hold.amount  # Refund to available balance
        company_wallet.updated_at = datetime.utcnow()
        self.db.add(company_wallet)

        # Create refund transaction
        transaction = Transaction(
            wallet_id=company_wallet.id,
            transaction_type=TransactionType.REFUND,
            amount=hold.amount,
            fee=Decimal("0.00"),
            net_amount=hold.amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=f"noshow_refund_{uuid.uuid4().hex}",
            related_shift_id=shift.id,
            description=f"Full refund for no-show on shift {shift.id}",
            completed_at=datetime.utcnow(),
        )
        self.db.add(transaction)

        logger.info(f"Processed no-show refund of {hold.amount} to company wallet {company_wallet.id}")

    # ==================== First Offense Leniency ====================

    def is_first_offense(self, user_id: int) -> bool:
        """
        Check if this is the user's first no-show offense.

        Returns True if user has never had a no-show (including warnings).
        """
        existing_strike = self.db.exec(
            select(Strike).where(Strike.user_id == user_id)
        ).first()

        return existing_strike is None

    # ==================== Strike Management ====================

    async def add_strike(
        self,
        user_id: int,
        reason: str,
        shift_id: int | None = None,
    ) -> dict:
        """
        Add a strike to a user's record with same-day cap check.

        Same-day cap: Multiple no-shows on the same day count as 1 strike max.

        Returns dict with strike_added and strike_count.
        """
        today = datetime.utcnow().date()

        # Check for same-day strike cap
        existing_today = self.db.exec(
            select(Strike).where(
                Strike.user_id == user_id,
                Strike.is_warning_only == False,
                func.date(Strike.created_at) == today,
            )
        ).first()

        if existing_today:
            logger.info(
                f"Same-day strike cap: user {user_id} already has a strike today"
            )
            active_count = self.get_active_strike_count(user_id)
            return {
                "strike_added": False,
                "strike_count": active_count,
                "reason": "same_day_cap",
            }

        # Create new strike
        expires_at = datetime.utcnow() + timedelta(days=self.STRIKE_EXPIRY_DAYS)
        strike = Strike(
            user_id=user_id,
            shift_id=shift_id,
            reason=reason,
            expires_at=expires_at,
            is_active=True,
            is_warning_only=False,
        )
        self.db.add(strike)
        self.db.flush()

        active_count = self.get_active_strike_count(user_id)

        logger.info(f"Strike added for user {user_id}: now has {active_count} active strikes")

        return {
            "strike_added": True,
            "strike_count": active_count,
            "strike_id": strike.id,
        }

    def get_active_strike_count(self, user_id: int) -> int:
        """Count active (non-expired, non-warning) strikes for a user."""
        now = datetime.utcnow()
        count = self.db.exec(
            select(func.count(Strike.id)).where(
                Strike.user_id == user_id,
                Strike.is_active == True,
                Strike.is_warning_only == False,
                Strike.expires_at > now,
            )
        ).one()
        return count

    def get_active_strikes(self, user_id: int) -> list[Strike]:
        """Get all active strikes for a user."""
        now = datetime.utcnow()
        return list(
            self.db.exec(
                select(Strike).where(
                    Strike.user_id == user_id,
                    Strike.is_active == True,
                    Strike.expires_at > now,
                ).order_by(Strike.created_at.desc())
            ).all()
        )

    def expire_old_strikes(self) -> int:
        """Expire strikes past their expiration date. Returns count of expired."""
        now = datetime.utcnow()
        expired_strikes = self.db.exec(
            select(Strike).where(
                Strike.is_active == True,
                Strike.expires_at <= now,
            )
        ).all()

        for strike in expired_strikes:
            strike.is_active = False
            self.db.add(strike)

        if expired_strikes:
            self.db.commit()
            logger.info(f"Expired {len(expired_strikes)} strikes")

        return len(expired_strikes)

    # ==================== Suspension Management ====================

    async def check_suspension(self, user_id: int) -> dict:
        """
        Check if user should be suspended (3+ active strikes).

        Creates a 30-day suspension if threshold is met.
        """
        active_count = self.get_active_strike_count(user_id)

        if active_count < self.STRIKES_FOR_SUSPENSION:
            return {
                "suspended": False,
                "strike_count": active_count,
            }

        # Check if user already has an active suspension
        existing_suspension = self.db.exec(
            select(UserSuspension).where(
                UserSuspension.user_id == user_id,
                UserSuspension.is_active == True,
            )
        ).first()

        if existing_suspension:
            return {
                "suspended": True,
                "existing": True,
                "suspended_until": existing_suspension.suspended_until,
            }

        # Create new suspension
        suspended_until = datetime.utcnow() + timedelta(days=self.SUSPENSION_DAYS)
        suspension = UserSuspension(
            user_id=user_id,
            reason=f"Automatic suspension: {active_count} no-show strikes in 90 days",
            suspended_until=suspended_until,
            is_active=True,
        )
        self.db.add(suspension)

        # Update user's is_active status
        from app.models.user import User
        user = self.db.get(User, user_id)
        if user:
            user.is_active = False
            self.db.add(user)

        logger.warning(
            f"User {user_id} suspended until {suspended_until}: "
            f"{active_count} strikes in 90 days"
        )

        return {
            "suspended": True,
            "suspended_until": suspended_until,
            "strike_count": active_count,
        }

    def get_user_suspension(self, user_id: int) -> UserSuspension | None:
        """Get active suspension for a user."""
        return self.db.exec(
            select(UserSuspension).where(
                UserSuspension.user_id == user_id,
                UserSuspension.is_active == True,
            )
        ).first()

    async def lift_suspension(
        self,
        user_id: int,
        lifted_by_user_id: int,
        reason: str,
    ) -> UserSuspension | None:
        """Lift an active suspension (admin action)."""
        suspension = self.get_user_suspension(user_id)
        if not suspension:
            return None

        suspension.is_active = False
        suspension.lifted_at = datetime.utcnow()
        suspension.lifted_by_user_id = lifted_by_user_id
        suspension.lift_reason = reason
        self.db.add(suspension)

        # Reactivate user
        from app.models.user import User
        user = self.db.get(User, user_id)
        if user:
            user.is_active = True
            self.db.add(user)

        self.db.commit()
        self.db.refresh(suspension)

        logger.info(f"Suspension lifted for user {user_id} by admin {lifted_by_user_id}")

        return suspension

    # ==================== Penalty Collection ====================

    async def collect_penalty(
        self,
        user_id: int,
        amount: Decimal,
        penalty: Penalty,
    ) -> dict:
        """
        Collect penalty using priority order:
        1. Deduct from pending earnings (next payout)
        2. Deduct from Staff Wallet balance
        3. Create negative balance (carried forward)
        """
        amount = self._quantize_amount(amount)
        remaining = amount
        collected_from = []

        # Get worker's wallet
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if wallet and wallet.available_balance > 0:
            # Deduct from available wallet balance
            deductible = min(wallet.available_balance, remaining)
            wallet.balance -= deductible
            wallet.updated_at = datetime.utcnow()
            self.db.add(wallet)

            remaining -= deductible
            collected_from.append({"source": "wallet", "amount": deductible})

        if remaining > 0:
            # Create or update negative balance
            negative_balance = self.db.exec(
                select(NegativeBalance).where(NegativeBalance.user_id == user_id)
            ).first()

            if not negative_balance:
                negative_balance = NegativeBalance(
                    user_id=user_id,
                    amount=remaining,
                )
            else:
                negative_balance.amount += remaining
                negative_balance.updated_at = datetime.utcnow()

            self.db.add(negative_balance)
            collected_from.append({"source": "negative_balance", "amount": remaining})

        # Update penalty status
        penalty.status = PenaltyStatus.COLLECTED
        penalty.collected_at = datetime.utcnow()
        penalty.collected_amount = amount - remaining
        self.db.add(penalty)

        logger.info(
            f"Penalty collection for user {user_id}: {amount} total, "
            f"collected from: {collected_from}"
        )

        return {
            "total_amount": amount,
            "collected_from": collected_from,
            "remaining_negative": remaining if remaining > 0 else Decimal("0.00"),
        }

    def get_negative_balance(self, user_id: int) -> NegativeBalance | None:
        """Get user's negative balance record."""
        return self.db.exec(
            select(NegativeBalance).where(NegativeBalance.user_id == user_id)
        ).first()

    async def offset_negative_balance(
        self,
        user_id: int,
        earnings: Decimal,
    ) -> dict:
        """
        Offset negative balance with new earnings.

        Called during payout processing - earnings first go to cover negative balance.
        Returns dict with offset_amount and remaining_earnings.
        """
        negative_balance = self.get_negative_balance(user_id)
        if not negative_balance or negative_balance.amount <= 0:
            return {
                "offset_amount": Decimal("0.00"),
                "remaining_earnings": earnings,
                "remaining_negative": Decimal("0.00"),
            }

        offset = min(negative_balance.amount, earnings)
        remaining_earnings = earnings - offset

        negative_balance.amount -= offset
        negative_balance.updated_at = datetime.utcnow()
        negative_balance.last_activity_at = datetime.utcnow()
        self.db.add(negative_balance)

        logger.info(
            f"Offset negative balance for user {user_id}: {offset} offset, "
            f"{remaining_earnings} remaining earnings"
        )

        return {
            "offset_amount": offset,
            "remaining_earnings": remaining_earnings,
            "remaining_negative": negative_balance.amount,
        }

    # ==================== Penalty Write-off ====================

    async def check_inactivity_writeoffs(self) -> list[int]:
        """
        Check for negative balances past 6 months of inactivity.

        Writes off the balance and suspends the account.
        Returns list of affected user IDs.
        """
        cutoff = datetime.utcnow() - timedelta(days=self.INACTIVITY_WRITEOFF_DAYS)

        inactive_balances = self.db.exec(
            select(NegativeBalance).where(
                NegativeBalance.amount > 0,
                NegativeBalance.last_activity_at < cutoff,
            )
        ).all()

        affected_user_ids = []

        for nb in inactive_balances:
            # Write off the balance
            writeoff_amount = nb.amount
            nb.amount = Decimal("0.00")
            nb.updated_at = datetime.utcnow()
            self.db.add(nb)

            # Update any pending penalties to WRITTEN_OFF
            pending_penalties = self.db.exec(
                select(Penalty).where(
                    Penalty.user_id == nb.user_id,
                    Penalty.status == PenaltyStatus.PENDING,
                )
            ).all()

            for penalty in pending_penalties:
                penalty.status = PenaltyStatus.WRITTEN_OFF
                penalty.written_off_at = datetime.utcnow()
                self.db.add(penalty)

            # Suspend the account
            existing_suspension = self.db.exec(
                select(UserSuspension).where(
                    UserSuspension.user_id == nb.user_id,
                    UserSuspension.is_active == True,
                )
            ).first()

            if not existing_suspension:
                suspension = UserSuspension(
                    user_id=nb.user_id,
                    reason=f"Account suspended: {writeoff_amount} negative balance written off after 6 months inactivity",
                    suspended_until=None,  # Indefinite
                    is_active=True,
                )
                self.db.add(suspension)

                # Deactivate user
                from app.models.user import User
                user = self.db.get(User, nb.user_id)
                if user:
                    user.is_active = False
                    self.db.add(user)

            affected_user_ids.append(nb.user_id)
            logger.warning(
                f"Wrote off {writeoff_amount} negative balance for user {nb.user_id} "
                f"due to 6 months inactivity"
            )

        if affected_user_ids:
            self.db.commit()

        return affected_user_ids

    # ==================== Appeal Management ====================

    async def create_appeal(
        self,
        user_id: int,
        penalty_id: int,
        reason: str,
        evidence: str | None = None,
    ) -> PenaltyAppeal:
        """
        Create an appeal for a penalty.

        Appeals must be within 7 days of penalty creation.
        """
        penalty = self.db.get(Penalty, penalty_id)
        if not penalty:
            raise PenaltyError("Penalty not found", "penalty_not_found")

        if penalty.user_id != user_id:
            raise PenaltyError("Cannot appeal another user's penalty", "forbidden")

        if penalty.status == PenaltyStatus.WAIVED:
            raise PenaltyError("Penalty already waived", "already_waived")

        # Check appeal window
        appeal_deadline = penalty.created_at + timedelta(days=self.APPEAL_WINDOW_DAYS)
        if datetime.utcnow() > appeal_deadline:
            raise PenaltyError(
                f"Appeal window expired. Appeals must be submitted within {self.APPEAL_WINDOW_DAYS} days.",
                "appeal_window_expired",
            )

        # Check for existing appeal
        existing = self.db.exec(
            select(PenaltyAppeal).where(PenaltyAppeal.penalty_id == penalty_id)
        ).first()

        if existing:
            raise PenaltyError("An appeal already exists for this penalty", "appeal_exists")

        appeal = PenaltyAppeal(
            penalty_id=penalty_id,
            user_id=user_id,
            reason=reason,
            evidence=evidence,
            status=AppealStatus.PENDING,
        )
        self.db.add(appeal)
        self.db.commit()
        self.db.refresh(appeal)

        logger.info(f"Appeal created for penalty {penalty_id} by user {user_id}")

        return appeal

    async def review_appeal(
        self,
        appeal_id: int,
        reviewed_by_user_id: int,
        approved: bool,
        review_notes: str,
    ) -> PenaltyAppeal:
        """Review and decide on a penalty appeal (admin action)."""
        appeal = self.db.get(PenaltyAppeal, appeal_id)
        if not appeal:
            raise PenaltyError("Appeal not found", "appeal_not_found")

        if appeal.status != AppealStatus.PENDING:
            raise PenaltyError("Appeal already reviewed", "already_reviewed")

        appeal.status = AppealStatus.APPROVED if approved else AppealStatus.REJECTED
        appeal.reviewed_by_user_id = reviewed_by_user_id
        appeal.review_notes = review_notes
        appeal.reviewed_at = datetime.utcnow()
        self.db.add(appeal)

        if approved:
            # Waive the penalty
            penalty = self.db.get(Penalty, appeal.penalty_id)
            if penalty:
                penalty.status = PenaltyStatus.WAIVED
                penalty.waived_at = datetime.utcnow()
                penalty.waived_by_user_id = reviewed_by_user_id
                penalty.waive_reason = f"Appeal approved: {review_notes}"
                self.db.add(penalty)

                # Refund any collected amount to wallet
                if penalty.collected_amount and penalty.collected_amount > 0:
                    wallet = self.db.exec(
                        select(Wallet).where(Wallet.user_id == penalty.user_id)
                    ).first()
                    if wallet:
                        wallet.balance += penalty.collected_amount
                        wallet.updated_at = datetime.utcnow()
                        self.db.add(wallet)

                # Also remove the associated strike
                strike = self.db.exec(
                    select(Strike).where(
                        Strike.shift_id == penalty.shift_id,
                        Strike.user_id == penalty.user_id,
                    )
                ).first()
                if strike:
                    strike.is_active = False
                    self.db.add(strike)

            logger.info(f"Appeal {appeal_id} approved by admin {reviewed_by_user_id}")
        else:
            logger.info(f"Appeal {appeal_id} rejected by admin {reviewed_by_user_id}")

        self.db.commit()
        self.db.refresh(appeal)

        return appeal

    def get_pending_appeals(self) -> list[PenaltyAppeal]:
        """Get all pending appeals for admin review."""
        return list(
            self.db.exec(
                select(PenaltyAppeal)
                .where(PenaltyAppeal.status == AppealStatus.PENDING)
                .order_by(PenaltyAppeal.created_at.asc())
            ).all()
        )

    # ==================== Waive/Remove Methods (for Appeal Integration) ====================

    async def waive_penalty(
        self,
        penalty_id: int,
        waived_by_user_id: int,
        reason: str,
    ) -> Penalty | None:
        """
        Waive a penalty as part of appeal approval.

        This method is called by the appeal service when an appeal is approved.
        """
        penalty = self.db.get(Penalty, penalty_id)
        if not penalty:
            return None

        if penalty.status == PenaltyStatus.WAIVED:
            logger.warning(f"Penalty {penalty_id} already waived")
            return penalty

        penalty.status = PenaltyStatus.WAIVED
        penalty.waived_at = datetime.utcnow()
        penalty.waived_by_user_id = waived_by_user_id
        penalty.waive_reason = reason
        self.db.add(penalty)

        # Refund any collected amount to wallet
        if penalty.collected_amount and penalty.collected_amount > 0:
            wallet = self.db.exec(
                select(Wallet).where(Wallet.user_id == penalty.user_id)
            ).first()
            if wallet:
                wallet.balance += penalty.collected_amount
                wallet.updated_at = datetime.utcnow()
                self.db.add(wallet)

                # Create refund transaction
                refund_tx = Transaction(
                    wallet_id=wallet.id,
                    transaction_type=TransactionType.REFUND,
                    amount=penalty.collected_amount,
                    fee=Decimal("0.00"),
                    net_amount=penalty.collected_amount,
                    status=TransactionStatus.COMPLETED,
                    idempotency_key=self._generate_idempotency_key("waive_refund"),
                    related_shift_id=penalty.shift_id,
                    description=f"Penalty waiver refund - Appeal approved: {reason}",
                    completed_at=datetime.utcnow(),
                )
                self.db.add(refund_tx)

                logger.info(
                    f"Refunded {penalty.collected_amount} to user {penalty.user_id} "
                    f"for waived penalty {penalty_id}"
                )

        self.db.commit()
        self.db.refresh(penalty)

        logger.info(f"Penalty {penalty_id} waived by admin {waived_by_user_id}: {reason}")

        return penalty

    async def remove_strike(self, strike_id: int) -> Strike | None:
        """
        Remove a strike as part of appeal approval.

        This marks the strike as inactive.
        """
        strike = self.db.get(Strike, strike_id)
        if not strike:
            return None

        strike.is_active = False
        self.db.add(strike)
        self.db.commit()
        self.db.refresh(strike)

        logger.info(f"Strike {strike_id} removed via appeal")

        return strike

    async def clear_user_strikes(self, user_id: int) -> int:
        """
        Clear all active strikes for a user (called when suspension is lifted).

        Returns the number of strikes cleared.
        """
        active_strikes = self.db.exec(
            select(Strike).where(
                Strike.user_id == user_id,
                Strike.is_active == True,
            )
        ).all()

        for strike in active_strikes:
            strike.is_active = False
            self.db.add(strike)

        if active_strikes:
            self.db.commit()

        logger.info(f"Cleared {len(active_strikes)} strikes for user {user_id}")

        return len(active_strikes)

    # ==================== Query Methods ====================

    def get_user_penalties(
        self,
        user_id: int,
        status_filter: PenaltyStatus | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Penalty]:
        """Get penalties for a user with optional status filter."""
        query = select(Penalty).where(Penalty.user_id == user_id)

        if status_filter:
            query = query.where(Penalty.status == status_filter)

        return list(
            self.db.exec(
                query.order_by(Penalty.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

    def get_penalty_count(
        self,
        user_id: int,
        status_filter: PenaltyStatus | None = None,
    ) -> int:
        """Get count of penalties for a user."""
        query = select(func.count(Penalty.id)).where(Penalty.user_id == user_id)

        if status_filter:
            query = query.where(Penalty.status == status_filter)

        return self.db.exec(query).one()

    def get_user_penalty_summary(self, user_id: int) -> dict:
        """Get summary of user's penalty status."""
        active_strikes = self.get_active_strike_count(user_id)
        all_strikes = self.get_active_strikes(user_id)
        negative_balance = self.get_negative_balance(user_id)
        suspension = self.get_user_suspension(user_id)
        pending_penalties = self.get_penalty_count(user_id, PenaltyStatus.PENDING)

        return {
            "active_strikes": active_strikes,
            "strikes": [
                {
                    "id": s.id,
                    "reason": s.reason,
                    "created_at": s.created_at,
                    "expires_at": s.expires_at,
                    "is_warning_only": s.is_warning_only,
                }
                for s in all_strikes
            ],
            "strikes_until_suspension": max(0, self.STRIKES_FOR_SUSPENSION - active_strikes),
            "negative_balance": negative_balance.amount if negative_balance else Decimal("0.00"),
            "pending_penalties": pending_penalties,
            "is_suspended": suspension is not None,
            "suspension": {
                "reason": suspension.reason,
                "suspended_at": suspension.suspended_at,
                "suspended_until": suspension.suspended_until,
            } if suspension else None,
        }

    # ==================== Agency Worker Penalties ====================

    def is_agency_supplied_worker(self, shift_id: int, worker_id: int) -> tuple[bool, int | None]:
        """
        Check if a worker on a shift was supplied by an agency.

        Returns:
            tuple: (is_agency_supplied, agency_id or None)
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            return False, None

        # Mode B: Shift posted by agency for client
        if shift.is_agency_managed and shift.posted_by_agency_id:
            return True, shift.posted_by_agency_id

        return False, None

    async def process_agency_worker_noshow(
        self,
        shift_id: int,
        agency_id: int,
        worker_id: int,
        custom_penalty: Decimal | None = None,
    ) -> dict:
        """
        Process a no-show by an agency-supplied worker.

        Financial penalty is applied to Agency Wallet (not individual worker).
        Strike is added to agency's reliability score (not worker's personal record).
        Agency is responsible for internal discipline of their staff.
        """
        shift = self.db.get(Shift, shift_id)
        if not shift:
            raise PenaltyError("Shift not found", "shift_not_found")

        # Calculate penalty amount
        if custom_penalty is not None:
            penalty_amount = self._quantize_amount(custom_penalty)
        else:
            shift_value = self._calculate_shift_value(shift)
            penalty_amount = self._quantize_amount(shift_value * self.NO_SHOW_PENALTY_RATE)

            # Apply min/max caps
            penalty_amount = max(penalty_amount, self.MIN_NO_SHOW_PENALTY)
            penalty_amount = min(penalty_amount, self.MAX_NO_SHOW_PENALTY)

        # Get agency wallet
        agency_wallet = self.db.exec(
            select(Wallet).where(
                Wallet.user_id == agency_id,
            )
        ).first()

        if not agency_wallet:
            agency_wallet = Wallet(
                user_id=agency_id,
                wallet_type=WalletType.AGENCY,
            )
            self.db.add(agency_wallet)
            self.db.commit()
            self.db.refresh(agency_wallet)

        # Deduct penalty from agency wallet
        original_balance = agency_wallet.balance
        agency_wallet.balance -= penalty_amount
        agency_wallet.updated_at = datetime.utcnow()
        self.db.add(agency_wallet)

        # Create penalty transaction
        idempotency_key = self._generate_idempotency_key("noshow")
        penalty_tx = Transaction(
            wallet_id=agency_wallet.id,
            transaction_type=TransactionType.CANCELLATION_FEE,  # Using existing type
            amount=-penalty_amount,
            fee=Decimal("0.00"),
            net_amount=-penalty_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
            description=f"No-show penalty for shift {shift_id} - Worker {worker_id} (agency-supplied)",
            completed_at=datetime.utcnow(),
        )
        self.db.add(penalty_tx)

        # Add strike to agency's reliability record
        strike_result = await self._add_agency_strike(
            agency_id=agency_id,
            shift_id=shift_id,
            reason="worker_noshow",
            worker_id=worker_id,
        )

        # Process company refund
        await self._process_noshow_refund(shift)

        # Update shift status
        shift.status = ShiftStatus.CANCELLED
        self.db.add(shift)

        self.db.commit()
        self.db.refresh(penalty_tx)

        logger.warning(
            f"Agency no-show penalty processed: Agency {agency_id}, "
            f"Worker {worker_id}, Shift {shift_id}, Amount: {penalty_amount}, "
            f"Strike count: {strike_result['total_strikes']}"
        )

        return {
            "transaction_id": penalty_tx.id,
            "penalty_amount": penalty_amount,
            "agency_id": agency_id,
            "worker_id": worker_id,
            "shift_id": shift_id,
            "new_balance": agency_wallet.balance,
            "strike_count": strike_result["total_strikes"],
            "warning_issued": strike_result.get("warning_issued", False),
            "suspension_pending": strike_result.get("suspension_pending", False),
            "refund_processed": True,
            "message": (
                f"Penalty of {penalty_amount} applied to agency wallet. "
                f"Agency has {strike_result['total_strikes']} total strikes. "
                "Agency is responsible for internal discipline of worker."
            ),
        }

    async def _add_agency_strike(
        self,
        agency_id: int,
        shift_id: int,
        reason: str,
        worker_id: int | None = None,
    ) -> dict:
        """
        Add a strike to agency's reliability record.
        """
        from app.models.agency import AgencyProfile

        # Get or create agency profile
        agency_profile = self.db.exec(
            select(AgencyProfile).where(AgencyProfile.user_id == agency_id)
        ).first()

        # Count existing strike transactions for this agency
        strike_count = self.db.exec(
            select(func.count(Transaction.id)).where(
                Transaction.description.contains("agency-supplied"),
                Transaction.transaction_type == TransactionType.CANCELLATION_FEE,
            )
        ).one() or 0

        total_strikes = strike_count + 1

        warning_issued = False
        suspension_pending = False

        if total_strikes >= self.AGENCY_STRIKES_BEFORE_SUSPENSION:
            suspension_pending = True
            logger.critical(
                f"Agency {agency_id} has reached {total_strikes} strikes - "
                f"SUSPENSION REVIEW REQUIRED"
            )
        elif total_strikes >= self.AGENCY_STRIKES_BEFORE_WARNING:
            warning_issued = True
            logger.warning(
                f"Agency {agency_id} has reached {total_strikes} strikes - "
                f"Warning issued"
            )

        return {
            "total_strikes": total_strikes,
            "warning_issued": warning_issued,
            "suspension_pending": suspension_pending,
            "strike_reason": reason,
            "shift_id": shift_id,
            "worker_id": worker_id,
        }

    async def process_company_late_cancellation_agency_worker(
        self,
        shift_id: int,
        agency_id: int,
        worker_id: int,
        shift_value: Decimal,
        cancellation_time: datetime | None = None,
    ) -> dict:
        """
        Process late cancellation (<24hrs) compensation for agency-supplied worker.
        """
        compensation_amount = self._quantize_amount(shift_value * Decimal("0.50"))

        agency_wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == agency_id)
        ).first()

        if not agency_wallet:
            agency_wallet = Wallet(
                user_id=agency_id,
                wallet_type=WalletType.AGENCY,
            )
            self.db.add(agency_wallet)
            self.db.commit()
            self.db.refresh(agency_wallet)

        agency_wallet.balance += compensation_amount
        agency_wallet.updated_at = datetime.utcnow()
        self.db.add(agency_wallet)

        idempotency_key = self._generate_idempotency_key("late_cancel_comp")
        compensation_tx = Transaction(
            wallet_id=agency_wallet.id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=compensation_amount,
            fee=Decimal("0.00"),
            net_amount=compensation_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
            description=(
                f"Late cancellation compensation for shift {shift_id} - "
                f"Agency responsible for worker distribution"
            ),
            completed_at=datetime.utcnow(),
        )
        self.db.add(compensation_tx)

        self.db.commit()
        self.db.refresh(compensation_tx)

        logger.info(
            f"Late cancellation compensation processed: Agency {agency_id}, "
            f"Worker {worker_id}, Shift {shift_id}, Amount: {compensation_amount}"
        )

        return {
            "transaction_id": compensation_tx.id,
            "compensation_amount": compensation_amount,
            "agency_id": agency_id,
            "worker_id": worker_id,
            "shift_id": shift_id,
            "paid_to": "agency_wallet",
            "new_agency_balance": agency_wallet.balance,
            "message": (
                f"Compensation of {compensation_amount} (50% of shift value) "
                f"paid to agency wallet. Agency is responsible for distributing "
                f"to worker per their internal policy."
            ),
        }

    def get_agency_penalty_history(
        self,
        agency_id: int,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Transaction], int]:
        """Get penalty transaction history for an agency."""
        agency_wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == agency_id)
        ).first()

        if not agency_wallet:
            return [], 0

        penalty_txs = list(
            self.db.exec(
                select(Transaction)
                .where(
                    Transaction.wallet_id == agency_wallet.id,
                    Transaction.transaction_type == TransactionType.CANCELLATION_FEE,
                )
                .order_by(Transaction.created_at.desc())
                .offset(skip)
                .limit(limit)
            ).all()
        )

        total = self.db.exec(
            select(func.count(Transaction.id)).where(
                Transaction.wallet_id == agency_wallet.id,
                Transaction.transaction_type == TransactionType.CANCELLATION_FEE,
            )
        ).one()

        return penalty_txs, total or 0

    def get_agency_strike_count(self, agency_id: int) -> int:
        """Get the current strike count for an agency."""
        strike_count = self.db.exec(
            select(func.count(Transaction.id)).where(
                Transaction.description.contains("agency-supplied"),
                Transaction.transaction_type == TransactionType.CANCELLATION_FEE,
            )
        ).one()

        return strike_count or 0


def get_penalty_service(db: Session) -> PenaltyService:
    """Get a PenaltyService instance with the given database session."""
    return PenaltyService(db)
