"""Dispute service for ExtraShifty dispute handling."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, select

from app.models.payment import (
    Dispute,
    DisputeStatus,
    FundsHold,
    FundsHoldStatus,
)
from app.models.shift import Shift
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.dispute import DisputeResolutionType
from app.services.escrow_service import escrow_service

logger = logging.getLogger(__name__)


def add_business_days(start_date: datetime, num_days: int) -> datetime:
    """
    Add business days to a datetime, skipping weekends (Saturday=5, Sunday=6).

    Args:
        start_date: Starting datetime
        num_days: Number of business days to add

    Returns:
        Datetime after adding the specified business days
    """
    current = start_date
    days_added = 0

    while days_added < num_days:
        current += timedelta(days=1)
        # Skip weekends (Monday=0, ..., Saturday=5, Sunday=6)
        if current.weekday() < 5:
            days_added += 1

    return current


class DisputeService:
    """Service for managing disputes between workers and companies."""

    RESOLUTION_DEADLINE_DAYS = 3
    DISPUTE_WINDOW_DAYS = 7

    async def create_dispute(
        self,
        db: Session,
        shift_id: int,
        raised_by: int,
        reason: str,
        disputed_amount: Optional[Decimal] = None,
    ) -> Dispute:
        """
        Create a new dispute and move funds to escrow.

        Args:
            db: Database session
            shift_id: ID of the shift being disputed
            raised_by: User ID of the person raising the dispute
            reason: Reason for the dispute
            disputed_amount: Amount being disputed (None = full shift amount)

        Returns:
            Created Dispute record

        Raises:
            ValueError: If dispute cannot be created
        """
        # Get the shift
        shift = db.get(Shift, shift_id)
        if not shift:
            raise ValueError(f"Shift {shift_id} not found")

        # Verify the shift is in a disputable state
        # (completed within the dispute window)
        if not self._is_within_dispute_window(shift):
            raise ValueError(
                f"Dispute window has closed. Disputes must be raised within "
                f"{self.DISPUTE_WINDOW_DAYS} days of shift completion."
            )

        # Get the raiser user
        raiser = db.get(User, raised_by)
        if not raiser:
            raise ValueError(f"User {raised_by} not found")

        # Determine the against_user based on who raised the dispute
        if raised_by == shift.company_id:
            # Company is disputing, so it's against the worker
            # Need to find the worker from applications
            against_user_id = await self._get_worker_for_shift(db, shift_id)
        else:
            # Worker is disputing, so it's against the company
            against_user_id = shift.company_id

        if not against_user_id:
            raise ValueError("Could not determine the other party for the dispute")

        # Check for existing active dispute
        existing = await self.get_dispute_by_shift(db, shift_id)
        if existing and existing.status in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            raise ValueError(f"An active dispute already exists for shift {shift_id}")

        # Calculate disputed amount if not provided
        if disputed_amount is None:
            disputed_amount = self._calculate_shift_amount(shift)

        # Get company wallet for escrow
        company_wallet = await self._get_wallet_for_user(db, shift.company_id)
        if not company_wallet:
            raise ValueError(f"Company wallet not found for user {shift.company_id}")

        # Calculate resolution deadline (3 business days from now)
        created_at = datetime.utcnow()
        resolution_deadline = add_business_days(created_at, self.RESOLUTION_DEADLINE_DAYS)

        # Create the dispute
        dispute = Dispute(
            shift_id=shift_id,
            raised_by_user_id=raised_by,
            against_user_id=against_user_id,
            amount_disputed=disputed_amount,
            reason=reason,
            status=DisputeStatus.OPEN,
            created_at=created_at,
            resolution_deadline=resolution_deadline,
        )
        db.add(dispute)
        db.flush()  # Get the dispute ID

        # Move funds to escrow
        try:
            await escrow_service.hold_funds(
                db=db,
                shift_id=shift_id,
                amount=disputed_amount,
                wallet_id=company_wallet.id,
            )
        except ValueError as e:
            db.rollback()
            raise ValueError(f"Failed to escrow funds: {e}")

        db.commit()
        db.refresh(dispute)

        logger.info(
            f"Created dispute {dispute.id} for shift {shift_id}, "
            f"amount: {disputed_amount}, raised by user {raised_by}"
        )

        return dispute

    async def add_evidence(
        self,
        db: Session,
        dispute_id: int,
        user_id: int,
        evidence: str,
    ) -> Dispute:
        """
        Add evidence to an existing dispute.

        Args:
            db: Database session
            dispute_id: ID of the dispute
            user_id: ID of the user adding evidence
            evidence: Evidence text

        Returns:
            Updated Dispute record
        """
        dispute = db.get(Dispute, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} not found")

        # Verify user is party to the dispute
        if user_id not in [dispute.raised_by_user_id, dispute.against_user_id]:
            raise ValueError("Only parties to the dispute can add evidence")

        # Verify dispute is still open
        if dispute.status not in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            raise ValueError("Cannot add evidence to a resolved dispute")

        # Append evidence (with timestamp and user info)
        user = db.get(User, user_id)
        user_name = user.full_name if user else f"User {user_id}"
        timestamp = datetime.utcnow().isoformat()

        new_evidence = f"\n\n--- Evidence from {user_name} at {timestamp} ---\n{evidence}"

        if dispute.evidence:
            dispute.evidence += new_evidence
        else:
            dispute.evidence = new_evidence.strip()

        # Move to under review if it was just opened
        if dispute.status == DisputeStatus.OPEN:
            dispute.status = DisputeStatus.UNDER_REVIEW

        db.commit()
        db.refresh(dispute)

        logger.info(f"Added evidence to dispute {dispute_id} by user {user_id}")

        return dispute

    async def resolve_dispute(
        self,
        db: Session,
        dispute_id: int,
        resolution: DisputeResolutionType,
        admin_notes: str,
        split_percentage: Optional[float] = None,
    ) -> Dispute:
        """
        Resolve a dispute and release escrowed funds.

        Args:
            db: Database session
            dispute_id: ID of the dispute to resolve
            resolution: Resolution type (for_raiser, against_raiser, split)
            admin_notes: Admin notes explaining the resolution
            split_percentage: If split, percentage for the raiser (0-100)

        Returns:
            Resolved Dispute record
        """
        dispute = db.get(Dispute, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} not found")

        if dispute.status not in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            raise ValueError("Dispute has already been resolved")

        if resolution == DisputeResolutionType.SPLIT and split_percentage is None:
            raise ValueError("Split percentage required for split resolution")

        # Get the shift to find wallets
        shift = db.get(Shift, dispute.shift_id)
        if not shift:
            raise ValueError(f"Shift {dispute.shift_id} not found")

        # Get worker wallet
        worker_id = await self._get_worker_for_shift(db, dispute.shift_id)
        if not worker_id:
            raise ValueError("Could not find worker for shift")

        worker_wallet = await self._get_wallet_for_user(db, worker_id)
        if not worker_wallet:
            raise ValueError(f"Worker wallet not found for user {worker_id}")

        # Determine who the "raiser" is and handle funds accordingly
        raiser_is_worker = dispute.raised_by_user_id == worker_id

        if resolution == DisputeResolutionType.FOR_RAISER:
            if raiser_is_worker:
                # Worker raised and won - release to worker
                await escrow_service.release_to_worker(
                    db=db,
                    shift_id=dispute.shift_id,
                    worker_wallet_id=worker_wallet.id,
                )
            else:
                # Company raised and won - release to company
                await escrow_service.release_to_company(
                    db=db,
                    shift_id=dispute.shift_id,
                )
            dispute.status = DisputeStatus.RESOLVED_FOR_RAISER

        elif resolution == DisputeResolutionType.AGAINST_RAISER:
            if raiser_is_worker:
                # Worker raised and lost - release to company
                await escrow_service.release_to_company(
                    db=db,
                    shift_id=dispute.shift_id,
                )
            else:
                # Company raised and lost - release to worker
                await escrow_service.release_to_worker(
                    db=db,
                    shift_id=dispute.shift_id,
                    worker_wallet_id=worker_wallet.id,
                )
            dispute.status = DisputeStatus.RESOLVED_AGAINST_RAISER

        else:  # SPLIT
            # For split, always give the split_percentage to the worker
            await escrow_service.split_release(
                db=db,
                shift_id=dispute.shift_id,
                worker_wallet_id=worker_wallet.id,
                worker_pct=split_percentage,
            )
            # Determine status based on who raised
            if raiser_is_worker:
                if split_percentage >= 50:
                    dispute.status = DisputeStatus.RESOLVED_FOR_RAISER
                else:
                    dispute.status = DisputeStatus.RESOLVED_AGAINST_RAISER
            else:
                if split_percentage < 50:
                    dispute.status = DisputeStatus.RESOLVED_FOR_RAISER
                else:
                    dispute.status = DisputeStatus.RESOLVED_AGAINST_RAISER

        dispute.resolution_notes = admin_notes
        dispute.resolved_at = datetime.utcnow()

        db.commit()
        db.refresh(dispute)

        logger.info(
            f"Resolved dispute {dispute_id} with resolution {resolution}, "
            f"split_percentage: {split_percentage}"
        )

        return dispute

    async def get_open_disputes(self, db: Session) -> list[Dispute]:
        """
        Get all disputes that need resolution.

        Returns:
            List of open/under_review disputes
        """
        statement = select(Dispute).where(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW])
        ).order_by(Dispute.created_at)

        return list(db.exec(statement).all())

    async def get_disputes_by_user(
        self,
        db: Session,
        user_id: int,
        status: Optional[DisputeStatus] = None,
    ) -> list[Dispute]:
        """
        Get disputes where user is either raiser or against party.

        Args:
            db: Database session
            user_id: User ID
            status: Optional status filter

        Returns:
            List of disputes
        """
        from sqlmodel import or_

        statement = select(Dispute).where(
            or_(
                Dispute.raised_by_user_id == user_id,
                Dispute.against_user_id == user_id,
            )
        )

        if status:
            statement = statement.where(Dispute.status == status)

        statement = statement.order_by(Dispute.created_at.desc())

        return list(db.exec(statement).all())

    async def get_dispute_by_shift(
        self,
        db: Session,
        shift_id: int,
    ) -> Optional[Dispute]:
        """
        Get the dispute for a specific shift.

        Args:
            db: Database session
            shift_id: Shift ID

        Returns:
            Dispute or None
        """
        statement = select(Dispute).where(Dispute.shift_id == shift_id)
        return db.exec(statement).first()

    async def check_dispute_deadlines(self, db: Session) -> list[Dispute]:
        """
        Check for disputes approaching the 3-day resolution deadline.

        This should be called by a scheduled job to alert admins.

        Returns:
            List of disputes within 24 hours of deadline
        """
        # Use the new resolution_deadline field if available, otherwise fall back to calculation
        now = datetime.utcnow()
        deadline_in_24hrs = now + timedelta(hours=24)

        statement = select(Dispute).where(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
            Dispute.resolution_deadline.isnot(None),
            Dispute.resolution_deadline > now,
            Dispute.resolution_deadline <= deadline_in_24hrs,
        )

        approaching_deadline = list(db.exec(statement).all())

        if approaching_deadline:
            logger.warning(
                f"Found {len(approaching_deadline)} disputes approaching deadline: "
                f"{[d.id for d in approaching_deadline]}"
            )

        return approaching_deadline

    async def get_overdue_disputes(self, db: Session) -> list[Dispute]:
        """
        Get all disputes that have passed their resolution deadline.

        Returns:
            List of overdue disputes (still open/under_review but past deadline)
        """
        now = datetime.utcnow()

        statement = select(Dispute).where(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
            Dispute.resolution_deadline.isnot(None),
            Dispute.resolution_deadline < now,
        ).order_by(Dispute.resolution_deadline)

        overdue_disputes = list(db.exec(statement).all())

        if overdue_disputes:
            logger.warning(
                f"Found {len(overdue_disputes)} overdue disputes: "
                f"{[d.id for d in overdue_disputes]}"
            )

        return overdue_disputes

    async def get_disputes_approaching_deadline(
        self, db: Session, hours: int = 24
    ) -> list[Dispute]:
        """
        Get disputes that are within the specified hours of their deadline.

        Args:
            db: Database session
            hours: Hours before deadline to consider (default 24)

        Returns:
            List of disputes approaching deadline
        """
        now = datetime.utcnow()
        threshold = now + timedelta(hours=hours)

        statement = select(Dispute).where(
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]),
            Dispute.resolution_deadline.isnot(None),
            Dispute.resolution_deadline > now,
            Dispute.resolution_deadline <= threshold,
        ).order_by(Dispute.resolution_deadline)

        return list(db.exec(statement).all())

    async def auto_resolve_overdue_disputes(self, db: Session) -> list[Dispute]:
        """
        Auto-resolve all overdue disputes in favor of the worker.

        Per platform policy, if arbitration is not completed within 3 business days,
        the dispute is automatically resolved in favor of the worker.

        Returns:
            List of auto-resolved disputes
        """
        overdue_disputes = await self.get_overdue_disputes(db)

        if not overdue_disputes:
            logger.debug("No overdue disputes to auto-resolve")
            return []

        resolved_disputes = []

        for dispute in overdue_disputes:
            try:
                # Get worker ID for the shift
                worker_id = await self._get_worker_for_shift(db, dispute.shift_id)
                if not worker_id:
                    logger.error(
                        f"Could not find worker for dispute {dispute.id}, shift {dispute.shift_id}"
                    )
                    continue

                worker_wallet = await self._get_wallet_for_user(db, worker_id)
                if not worker_wallet:
                    logger.error(f"Worker wallet not found for user {worker_id}")
                    continue

                # Determine if raiser is the worker
                raiser_is_worker = dispute.raised_by_user_id == worker_id

                # Always resolve in favor of worker - release escrowed funds to worker
                await escrow_service.release_to_worker(
                    db=db,
                    shift_id=dispute.shift_id,
                    worker_wallet_id=worker_wallet.id,
                )

                # Set status based on who raised (if worker raised, FOR_RAISER; otherwise AGAINST_RAISER)
                if raiser_is_worker:
                    dispute.status = DisputeStatus.RESOLVED_FOR_RAISER
                else:
                    dispute.status = DisputeStatus.RESOLVED_AGAINST_RAISER

                dispute.resolution_notes = (
                    "AUTO-RESOLVED: Platform arbitration deadline (3 business days) exceeded. "
                    "Per platform policy, dispute automatically resolved in favor of the worker."
                )
                dispute.resolved_at = datetime.utcnow()

                db.add(dispute)
                resolved_disputes.append(dispute)

                logger.info(
                    f"Auto-resolved overdue dispute {dispute.id} in favor of worker {worker_id}"
                )

            except Exception as e:
                logger.error(f"Failed to auto-resolve dispute {dispute.id}: {e}")
                continue

        if resolved_disputes:
            db.commit()
            logger.info(f"Auto-resolved {len(resolved_disputes)} overdue disputes")

        return resolved_disputes

    def _is_within_dispute_window(self, shift: Shift) -> bool:
        """Check if the shift is within the dispute window."""
        from app.models.shift import ShiftStatus

        if shift.status != ShiftStatus.COMPLETED:
            # Can only dispute completed shifts
            return False

        # Use created_at as proxy for completion time
        # In production, you'd have a completed_at field
        completion_time = shift.created_at
        window_end = completion_time + timedelta(days=self.DISPUTE_WINDOW_DAYS)

        return datetime.utcnow() <= window_end

    def _calculate_shift_amount(self, shift: Shift) -> Decimal:
        """Calculate the total amount for a shift."""
        from datetime import datetime as dt

        start = dt.combine(shift.date, shift.start_time)
        end = dt.combine(shift.date, shift.end_time)

        # Handle overnight shifts
        if end < start:
            end = dt.combine(shift.date + timedelta(days=1), shift.end_time)

        duration_hours = (end - start).total_seconds() / 3600
        return shift.hourly_rate * Decimal(str(duration_hours))

    async def _get_worker_for_shift(self, db: Session, shift_id: int) -> Optional[int]:
        """Get the worker ID for a shift from accepted applications."""
        from app.models.application import Application, ApplicationStatus

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


# Singleton instance
dispute_service = DisputeService()
