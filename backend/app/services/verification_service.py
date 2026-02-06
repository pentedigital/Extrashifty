"""Verification service for ExtraShifty shift verification and auto-approval."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, and_, or_, select

from app.models.application import Application, ApplicationStatus
from app.models.payment import FundsHold, FundsHoldStatus
from app.models.shift import Shift, ShiftStatus
from app.models.user import User, UserType
from app.models.wallet import Wallet
from app.services.dispute_service import dispute_service

logger = logging.getLogger(__name__)


class VerificationService:
    """Service for managing shift verification and approval workflow."""

    AUTO_APPROVE_HOURS = 24
    DISPUTE_WINDOW_DAYS = 7

    async def check_auto_approve_shifts(self, db: Session) -> list[int]:
        """
        Auto-approve shifts that have been pending for more than 24 hours.

        Called by scheduler hourly. Finds shifts with clock_out_at > 24hrs ago
        and status = "completed", then processes payment for each.

        Only shifts with an actual clock_out_at timestamp are eligible for
        auto-approval. Shifts without clock_out_at must be manually approved.

        Args:
            db: Database session

        Returns:
            List of shift IDs that were auto-approved
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=self.AUTO_APPROVE_HOURS)

        # Find shifts that are completed, have clock_out_at set, and are past the auto-approve window
        # Only auto-approve shifts where the worker actually clocked out
        statement = select(Shift).where(
            Shift.status == ShiftStatus.COMPLETED,
            Shift.clock_out_at.isnot(None),  # Must have explicit clock-out time
            Shift.clock_out_at <= cutoff_time,  # 24 hours since clock-out
        )

        pending_shifts = list(db.exec(statement).all())
        auto_approved_ids = []

        for shift in pending_shifts:
            try:
                # Check if there's already a dispute for this shift
                existing_dispute = await dispute_service.get_dispute_by_shift(db, shift.id)
                if existing_dispute:
                    logger.info(
                        f"Skipping auto-approval for shift {shift.id} - has active dispute"
                    )
                    continue

                # Process the settlement
                await self._process_settlement(db, shift)
                auto_approved_ids.append(shift.id)

                logger.info(f"Auto-approved shift {shift.id}")

            except Exception as e:
                logger.error(f"Failed to auto-approve shift {shift.id}: {e}")
                continue

        return auto_approved_ids

    async def manager_approve_shift(
        self,
        db: Session,
        shift_id: int,
        manager_id: int,
        actual_hours: Optional[float] = None,
    ) -> dict:
        """
        Manager manually approves a shift completion.

        Args:
            db: Database session
            shift_id: ID of the shift to approve
            manager_id: ID of the manager approving
            actual_hours: Optional actual hours worked (for pro-rating)

        Returns:
            Approval result dictionary

        Raises:
            ValueError: If approval fails validation
            PermissionError: If manager lacks permission
        """
        # Get the shift
        shift = db.get(Shift, shift_id)
        if not shift:
            raise ValueError(f"Shift {shift_id} not found")

        # Verify manager has permission
        manager = db.get(User, manager_id)
        if not manager:
            raise ValueError(f"Manager {manager_id} not found")

        # Must be company owner or admin
        if manager.user_type == UserType.COMPANY:
            if shift.company_id != manager_id:
                raise PermissionError("Manager can only approve their own company's shifts")
        elif manager.user_type != UserType.ADMIN:
            raise PermissionError("Only company managers or admins can approve shifts")

        # Verify shift is in approvable state
        if shift.status != ShiftStatus.COMPLETED:
            raise ValueError(f"Shift is not in completed status. Current status: {shift.status}")

        # Check for existing dispute
        existing_dispute = await dispute_service.get_dispute_by_shift(db, shift_id)
        if existing_dispute:
            raise ValueError(f"Cannot approve shift with active dispute (ID: {existing_dispute.id})")

        # Calculate amounts
        scheduled_hours = self._calculate_scheduled_hours(shift)
        approved_hours = Decimal(str(actual_hours)) if actual_hours else scheduled_hours
        gross_amount = shift.hourly_rate * approved_hours

        # Process settlement
        settlement_result = await self._process_settlement(
            db, shift, actual_hours=approved_hours
        )

        logger.info(
            f"Manager {manager_id} approved shift {shift_id}, "
            f"hours: {approved_hours}, amount: {gross_amount}"
        )

        return {
            "shift_id": shift_id,
            "status": "approved",
            "approved_hours": approved_hours,
            "gross_amount": gross_amount,
            "settlement_triggered": True,
            "message": f"Shift approved with {approved_hours} hours",
        }

    async def manager_reject_shift(
        self,
        db: Session,
        shift_id: int,
        manager_id: int,
        reason: str,
    ) -> dict:
        """
        Manager rejects a shift (disputes hours or no-show).

        This automatically creates a dispute and holds funds in escrow.

        Args:
            db: Database session
            shift_id: ID of the shift to reject
            manager_id: ID of the manager rejecting
            reason: Reason for rejection

        Returns:
            Rejection result with dispute ID

        Raises:
            ValueError: If rejection fails validation
            PermissionError: If manager lacks permission
        """
        # Get the shift
        shift = db.get(Shift, shift_id)
        if not shift:
            raise ValueError(f"Shift {shift_id} not found")

        # Verify manager has permission
        manager = db.get(User, manager_id)
        if not manager:
            raise ValueError(f"Manager {manager_id} not found")

        # Must be company owner or admin
        if manager.user_type == UserType.COMPANY:
            if shift.company_id != manager_id:
                raise PermissionError("Manager can only reject their own company's shifts")
        elif manager.user_type != UserType.ADMIN:
            raise PermissionError("Only company managers or admins can reject shifts")

        # Verify shift is in rejectable state
        if shift.status not in [ShiftStatus.COMPLETED, ShiftStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot reject shift with status: {shift.status}")

        # Check for existing dispute
        existing_dispute = await dispute_service.get_dispute_by_shift(db, shift_id)
        if existing_dispute:
            raise ValueError(
                f"Dispute already exists for this shift (ID: {existing_dispute.id})"
            )

        # Calculate the disputed amount (full shift amount)
        disputed_amount = self._calculate_shift_amount(shift)

        # Create the dispute (this also handles escrow)
        dispute = await dispute_service.create_dispute(
            db=db,
            shift_id=shift_id,
            raised_by=manager_id,
            reason=f"Manager rejection: {reason}",
            disputed_amount=disputed_amount,
        )

        logger.info(
            f"Manager {manager_id} rejected shift {shift_id}, "
            f"created dispute {dispute.id}"
        )

        return {
            "shift_id": shift_id,
            "status": "rejected",
            "dispute_id": dispute.id,
            "reason": reason,
            "message": "Shift rejected and dispute created. Funds held in escrow.",
        }

    async def get_pending_approval_shifts(
        self,
        db: Session,
        company_id: Optional[int] = None,
    ) -> list[dict]:
        """
        Get shifts pending approval.

        Args:
            db: Database session
            company_id: Optional filter for specific company

        Returns:
            List of pending shift data
        """
        statement = select(Shift).where(
            Shift.status == ShiftStatus.COMPLETED,
        )

        if company_id:
            statement = statement.where(Shift.company_id == company_id)

        statement = statement.order_by(Shift.date.desc())

        shifts = list(db.exec(statement).all())
        result = []

        for shift in shifts:
            # Check if there's already a dispute
            dispute = await dispute_service.get_dispute_by_shift(db, shift.id)
            if dispute:
                continue  # Skip shifts with disputes

            # Get the worker
            worker_id = await self._get_worker_for_shift(db, shift.id)
            worker = db.get(User, worker_id) if worker_id else None

            scheduled_hours = self._calculate_scheduled_hours(shift)
            total_amount = shift.hourly_rate * scheduled_hours

            # Calculate auto-approve time based on clock_out_at
            # Only shifts with clock_out_at will have an auto-approve time
            if shift.clock_out_at:
                auto_approve_at = shift.clock_out_at + timedelta(hours=self.AUTO_APPROVE_HOURS)
                hours_since = (datetime.utcnow() - shift.clock_out_at).total_seconds() / 3600
            else:
                # No clock-out time yet, no auto-approve scheduled
                auto_approve_at = None
                hours_since = None

            result.append({
                "id": shift.id,
                "title": shift.title,
                "date": shift.date,
                "scheduled_hours": scheduled_hours,
                "clock_in_time": shift.clock_in_at,
                "clock_out_time": shift.clock_out_at,
                "actual_hours": shift.actual_hours_worked,
                "hourly_rate": shift.hourly_rate,
                "total_amount": total_amount,
                "worker_id": worker_id,
                "worker_name": worker.full_name if worker else "Unknown",
                "status": shift.status,
                "hours_since_clock_out": hours_since,
                "auto_approve_at": auto_approve_at,
            })

        return result

    async def adjust_hours(
        self,
        db: Session,
        shift_id: int,
        manager_id: int,
        actual_hours: Decimal,
        reason: str,
    ) -> dict:
        """
        Adjust the actual hours worked for a shift before approval.

        Args:
            db: Database session
            shift_id: ID of the shift
            manager_id: ID of the manager making adjustment
            actual_hours: New actual hours value
            reason: Reason for adjustment

        Returns:
            Adjustment result

        Raises:
            ValueError: If adjustment fails validation
            PermissionError: If manager lacks permission
        """
        # Get the shift
        shift = db.get(Shift, shift_id)
        if not shift:
            raise ValueError(f"Shift {shift_id} not found")

        # Verify manager has permission
        manager = db.get(User, manager_id)
        if not manager:
            raise ValueError(f"Manager {manager_id} not found")

        if manager.user_type == UserType.COMPANY:
            if shift.company_id != manager_id:
                raise PermissionError("Manager can only adjust their own company's shifts")
        elif manager.user_type != UserType.ADMIN:
            raise PermissionError("Only company managers or admins can adjust hours")

        # For now, we'll proceed directly to approval with adjusted hours
        # In production, you might store the adjustment and require separate approval

        scheduled_hours = self._calculate_scheduled_hours(shift)
        adjustment_pct = (actual_hours / scheduled_hours * 100) if scheduled_hours > 0 else 0

        logger.info(
            f"Manager {manager_id} adjusted shift {shift_id} hours: "
            f"{scheduled_hours} -> {actual_hours} ({adjustment_pct:.1f}%). "
            f"Reason: {reason}"
        )

        return {
            "shift_id": shift_id,
            "scheduled_hours": scheduled_hours,
            "actual_hours": actual_hours,
            "adjustment_percentage": adjustment_pct,
            "reason": reason,
            "message": "Hours adjusted. Shift ready for approval.",
        }

    async def _process_settlement(
        self,
        db: Session,
        shift: Shift,
        actual_hours: Optional[Decimal] = None,
    ) -> dict:
        """
        Process the payment settlement for an approved shift.

        In production, this would integrate with the payment service.

        Args:
            db: Database session
            shift: Shift to settle
            actual_hours: Actual hours worked (for pro-rating)

        Returns:
            Settlement result
        """
        # Calculate amounts - prefer actual_hours_worked from shift if available
        if actual_hours is None:
            if shift.actual_hours_worked is not None:
                actual_hours = shift.actual_hours_worked
            else:
                actual_hours = self._calculate_scheduled_hours(shift)

        gross_amount = shift.hourly_rate * actual_hours

        # Get worker
        worker_id = await self._get_worker_for_shift(db, shift.id)
        if not worker_id:
            raise ValueError(f"No worker found for shift {shift.id}")

        # Get wallets
        worker_wallet = await self._get_wallet_for_user(db, worker_id)
        company_wallet = await self._get_wallet_for_user(db, shift.company_id)

        if not worker_wallet or not company_wallet:
            raise ValueError("Missing wallet for settlement")

        # Release the held funds and pay the worker
        hold = await self._get_active_hold(db, shift.id)
        if hold:
            # Calculate platform fee (e.g., 10%)
            platform_fee_rate = Decimal("0.10")
            platform_fee = gross_amount * platform_fee_rate
            worker_amount = gross_amount - platform_fee

            # Update hold status
            hold.status = FundsHoldStatus.SETTLED
            hold.released_at = datetime.utcnow()

            # Update company wallet
            company_wallet.reserved_balance -= hold.amount
            company_wallet.updated_at = datetime.utcnow()

            # Update worker wallet
            worker_wallet.balance += worker_amount
            worker_wallet.updated_at = datetime.utcnow()

            db.commit()

            logger.info(
                f"Settled shift {shift.id}: gross={gross_amount}, "
                f"fee={platform_fee}, worker={worker_amount}"
            )

            return {
                "shift_id": shift.id,
                "gross_amount": gross_amount,
                "platform_fee": platform_fee,
                "worker_amount": worker_amount,
                "status": "settled",
            }

        return {
            "shift_id": shift.id,
            "gross_amount": gross_amount,
            "status": "no_hold_found",
            "message": "No active hold found - shift may have been pre-paid",
        }

    def _calculate_scheduled_hours(self, shift: Shift) -> Decimal:
        """Calculate scheduled hours for a shift."""
        from datetime import datetime as dt

        start = dt.combine(shift.date, shift.start_time)
        end = dt.combine(shift.date, shift.end_time)

        # Handle overnight shifts
        if end < start:
            end = dt.combine(shift.date + timedelta(days=1), shift.end_time)

        duration_hours = (end - start).total_seconds() / 3600
        return Decimal(str(duration_hours))

    def _calculate_shift_amount(self, shift: Shift) -> Decimal:
        """Calculate the total amount for a shift."""
        return shift.hourly_rate * self._calculate_scheduled_hours(shift)

    async def _get_worker_for_shift(self, db: Session, shift_id: int) -> Optional[int]:
        """Get the worker ID for a shift from accepted applications."""
        statement = select(Application).where(
            Application.shift_id == shift_id,
            Application.status == ApplicationStatus.ACCEPTED,
        )
        application = db.exec(statement).first()
        return application.applicant_id if application else None

    async def _get_wallet_for_user(self, db: Session, user_id: int) -> Optional[Wallet]:
        """Get wallet for a user."""
        statement = select(Wallet).where(Wallet.user_id == user_id)
        return db.exec(statement).first()

    async def _get_active_hold(self, db: Session, shift_id: int) -> Optional[FundsHold]:
        """Get active funds hold for a shift."""
        statement = select(FundsHold).where(
            FundsHold.shift_id == shift_id,
            FundsHold.status == FundsHoldStatus.ACTIVE,
        )
        return db.exec(statement).first()


# Singleton instance
verification_service = VerificationService()
