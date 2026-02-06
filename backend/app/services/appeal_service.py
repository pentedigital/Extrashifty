"""Appeal service for penalty dispute resolution."""

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, or_, select

from app.models.appeal import (
    Appeal,
    AppealStatus,
    AppealType,
    EmergencyType,
    EmergencyWaiver,
)
from app.models.notification import Notification
from app.models.penalty import (
    NegativeBalance,
    Penalty,
    PenaltyStatus,
    Strike,
    UserSuspension,
)
from app.models.user import User, UserType
from app.models.wallet import Wallet
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)


# Constants
PENALTY_APPEAL_WINDOW_DAYS = 7
STRIKE_APPEAL_WINDOW_DAYS = 7
SUSPENSION_APPEAL_WINDOW_HOURS = 72
FRIVOLOUS_APPEAL_FEE = Decimal("25.00")
SUSPENSION_DURATION_DAYS = 30
PROBATION_PERIOD_DAYS = 90


class AppealServiceError(Exception):
    """Base exception for appeal service errors."""

    pass


class AppealWindowClosedError(AppealServiceError):
    """Raised when appeal window has expired."""

    pass


class DuplicateAppealError(AppealServiceError):
    """Raised when an appeal already exists for the item."""

    pass


class InvalidAppealError(AppealServiceError):
    """Raised when appeal is invalid."""

    pass


class AppealService:
    """Service for managing penalty dispute appeals."""

    async def submit_appeal(
        self,
        db: Session,
        user_id: int,
        appeal_type: AppealType,
        related_id: int,
        reason: str,
        evidence_urls: Optional[list[str]] = None,
        emergency_type: Optional[EmergencyType] = None,
    ) -> Appeal:
        """
        Submit a new appeal for a penalty, strike, or suspension.

        Args:
            db: Database session
            user_id: ID of the user submitting the appeal
            appeal_type: Type of appeal (PENALTY, STRIKE, SUSPENSION)
            related_id: ID of the penalty, strike, or suspension being appealed
            reason: User's reason for appeal
            evidence_urls: Optional list of evidence URLs
            emergency_type: Optional emergency type for waiver consideration

        Returns:
            Created Appeal record

        Raises:
            AppealWindowClosedError: If appeal window has expired
            DuplicateAppealError: If appeal already exists
            InvalidAppealError: If the related item doesn't exist or can't be appealed
        """
        # Validate the user exists
        user = db.get(User, user_id)
        if not user:
            raise InvalidAppealError(f"User {user_id} not found")

        # Get the related item and validate appeal eligibility
        if appeal_type == AppealType.PENALTY:
            related_item = db.get(Penalty, related_id)
            if not related_item:
                raise InvalidAppealError(f"Penalty {related_id} not found")
            if related_item.user_id != user_id:
                raise InvalidAppealError("You can only appeal your own penalties")
            if related_item.status == PenaltyStatus.WAIVED:
                raise InvalidAppealError("This penalty has already been waived")
            appeal_deadline = related_item.created_at + timedelta(days=PENALTY_APPEAL_WINDOW_DAYS)

        elif appeal_type == AppealType.STRIKE:
            related_item = db.get(Strike, related_id)
            if not related_item:
                raise InvalidAppealError(f"Strike {related_id} not found")
            if related_item.user_id != user_id:
                raise InvalidAppealError("You can only appeal your own strikes")
            if not related_item.is_active:
                raise InvalidAppealError("This strike is no longer active")
            appeal_deadline = related_item.created_at + timedelta(days=STRIKE_APPEAL_WINDOW_DAYS)

        elif appeal_type == AppealType.SUSPENSION:
            related_item = db.get(UserSuspension, related_id)
            if not related_item:
                raise InvalidAppealError(f"Suspension {related_id} not found")
            if related_item.user_id != user_id:
                raise InvalidAppealError("You can only appeal your own suspensions")
            if not related_item.is_active:
                raise InvalidAppealError("This suspension is no longer active")
            appeal_deadline = related_item.suspended_at + timedelta(hours=SUSPENSION_APPEAL_WINDOW_HOURS)

        else:
            raise InvalidAppealError(f"Invalid appeal type: {appeal_type}")

        # Check if within appeal window
        if datetime.utcnow() > appeal_deadline:
            raise AppealWindowClosedError(
                f"Appeal window has closed. Appeals must be submitted within "
                f"{PENALTY_APPEAL_WINDOW_DAYS} days for penalties/strikes or "
                f"{SUSPENSION_APPEAL_WINDOW_HOURS} hours for suspensions."
            )

        # Check for existing pending appeal
        existing = await self.get_appeal_for_item(db, appeal_type, related_id)
        if existing and existing.status == AppealStatus.PENDING:
            raise DuplicateAppealError(
                f"An appeal already exists for this {appeal_type.value}"
            )

        # Create the appeal
        appeal = Appeal(
            user_id=user_id,
            appeal_type=appeal_type,
            related_id=related_id,
            reason=reason,
            evidence_urls=evidence_urls,
            emergency_type=emergency_type,
            status=AppealStatus.PENDING,
            appeal_deadline=appeal_deadline,
        )
        db.add(appeal)
        db.commit()
        db.refresh(appeal)

        # Notify admins
        await self._notify_admins_new_appeal(db, appeal)

        logger.info(
            f"Appeal {appeal.id} submitted by user {user_id} for "
            f"{appeal_type.value} {related_id}"
        )

        return appeal

    async def review_appeal(
        self,
        db: Session,
        appeal_id: int,
        approved: bool,
        reviewer_notes: str,
        reviewer_id: int,
        is_frivolous: bool = False,
        use_emergency_waiver: bool = False,
    ) -> Appeal:
        """
        Review and decide on an appeal.

        Args:
            db: Database session
            appeal_id: ID of the appeal to review
            approved: Whether to approve or deny
            reviewer_notes: Admin notes explaining the decision
            reviewer_id: ID of the admin reviewing
            is_frivolous: If denied, whether to charge $25 frivolous fee
            use_emergency_waiver: If approved with emergency_type, use the waiver

        Returns:
            Updated Appeal record
        """
        appeal = db.get(Appeal, appeal_id)
        if not appeal:
            raise InvalidAppealError(f"Appeal {appeal_id} not found")

        if appeal.status != AppealStatus.PENDING:
            raise InvalidAppealError(f"Appeal has already been reviewed")

        # Verify reviewer is admin
        reviewer = db.get(User, reviewer_id)
        if not reviewer or reviewer.user_type != UserType.ADMIN:
            raise InvalidAppealError("Only admins can review appeals")

        if approved:
            appeal.status = AppealStatus.APPROVED

            # Handle the related item based on appeal type
            if appeal.appeal_type == AppealType.PENALTY:
                await self._waive_penalty(db, appeal.related_id, reviewer_id, reviewer_notes)

            elif appeal.appeal_type == AppealType.STRIKE:
                await self._remove_strike(db, appeal.related_id)

            elif appeal.appeal_type == AppealType.SUSPENSION:
                await self._lift_suspension(db, appeal.related_id, reviewer_id, reviewer_notes)

            # Handle emergency waiver if requested
            if use_emergency_waiver and appeal.emergency_type:
                waiver_eligible = await self.check_emergency_waiver_eligibility(db, appeal.user_id)
                if waiver_eligible:
                    await self.apply_emergency_waiver(db, appeal)
                    appeal.emergency_waiver_used = True

        else:
            appeal.status = AppealStatus.DENIED

            # Charge frivolous appeal fee if flagged
            if is_frivolous:
                await self._charge_frivolous_fee(db, appeal.user_id)
                appeal.frivolous_fee_charged = True

        appeal.reviewer_notes = reviewer_notes
        appeal.reviewed_by = reviewer_id
        appeal.reviewed_at = datetime.utcnow()

        db.commit()
        db.refresh(appeal)

        # Notify the user
        await self._notify_user_appeal_reviewed(db, appeal)

        logger.info(
            f"Appeal {appeal_id} {'approved' if approved else 'denied'} by admin {reviewer_id}"
        )

        return appeal

    async def withdraw_appeal(
        self,
        db: Session,
        appeal_id: int,
        user_id: int,
    ) -> Appeal:
        """
        Withdraw a pending appeal.

        Args:
            db: Database session
            appeal_id: ID of the appeal to withdraw
            user_id: ID of the user withdrawing

        Returns:
            Updated Appeal record
        """
        appeal = db.get(Appeal, appeal_id)
        if not appeal:
            raise InvalidAppealError(f"Appeal {appeal_id} not found")

        if appeal.user_id != user_id:
            raise InvalidAppealError("You can only withdraw your own appeals")

        if appeal.status != AppealStatus.PENDING:
            raise InvalidAppealError("Only pending appeals can be withdrawn")

        appeal.status = AppealStatus.WITHDRAWN
        db.commit()
        db.refresh(appeal)

        logger.info(f"Appeal {appeal_id} withdrawn by user {user_id}")

        return appeal

    async def check_emergency_waiver_eligibility(
        self,
        db: Session,
        user_id: int,
    ) -> bool:
        """
        Check if user is eligible for emergency waiver (one per year).

        Args:
            db: Database session
            user_id: ID of the user

        Returns:
            True if waiver is available for current year
        """
        current_year = datetime.utcnow().year

        statement = select(EmergencyWaiver).where(
            EmergencyWaiver.user_id == user_id,
            EmergencyWaiver.year == current_year,
        )
        existing_waiver = db.exec(statement).first()

        return existing_waiver is None

    async def get_emergency_waiver_status(
        self,
        db: Session,
        user_id: int,
    ) -> dict:
        """
        Get emergency waiver status for a user.

        Returns:
            Dictionary with waiver availability and usage info
        """
        current_year = datetime.utcnow().year

        statement = select(EmergencyWaiver).where(
            EmergencyWaiver.user_id == user_id,
            EmergencyWaiver.year == current_year,
        )
        existing_waiver = db.exec(statement).first()

        return {
            "user_id": user_id,
            "year": current_year,
            "waiver_available": existing_waiver is None,
            "waiver_used_at": existing_waiver.used_at if existing_waiver else None,
            "waiver_appeal_id": existing_waiver.appeal_id if existing_waiver else None,
            "waiver_emergency_type": existing_waiver.emergency_type if existing_waiver else None,
        }

    async def apply_emergency_waiver(
        self,
        db: Session,
        appeal: Appeal,
    ) -> EmergencyWaiver:
        """
        Apply an emergency waiver for an approved appeal.

        Args:
            db: Database session
            appeal: The approved appeal

        Returns:
            Created EmergencyWaiver record
        """
        if not appeal.emergency_type:
            raise InvalidAppealError("Appeal does not have an emergency type")

        current_year = datetime.utcnow().year

        # Check eligibility again
        if not await self.check_emergency_waiver_eligibility(db, appeal.user_id):
            raise InvalidAppealError(
                f"User has already used their emergency waiver for {current_year}"
            )

        waiver = EmergencyWaiver(
            user_id=appeal.user_id,
            year=current_year,
            appeal_id=appeal.id,
            emergency_type=appeal.emergency_type,
        )
        db.add(waiver)
        db.commit()
        db.refresh(waiver)

        logger.info(
            f"Emergency waiver applied for user {appeal.user_id}, "
            f"appeal {appeal.id}, type {appeal.emergency_type}"
        )

        return waiver

    async def get_appeal(
        self,
        db: Session,
        appeal_id: int,
    ) -> Optional[Appeal]:
        """Get an appeal by ID."""
        return db.get(Appeal, appeal_id)

    async def get_appeal_for_item(
        self,
        db: Session,
        appeal_type: AppealType,
        related_id: int,
    ) -> Optional[Appeal]:
        """Get the most recent appeal for a specific penalty/strike/suspension."""
        statement = (
            select(Appeal)
            .where(
                Appeal.appeal_type == appeal_type,
                Appeal.related_id == related_id,
            )
            .order_by(Appeal.created_at.desc())
        )
        return db.exec(statement).first()

    async def get_appeals_by_user(
        self,
        db: Session,
        user_id: int,
        status: Optional[AppealStatus] = None,
        appeal_type: Optional[AppealType] = None,
    ) -> list[Appeal]:
        """Get all appeals for a user with optional filters."""
        statement = select(Appeal).where(Appeal.user_id == user_id)

        if status:
            statement = statement.where(Appeal.status == status)
        if appeal_type:
            statement = statement.where(Appeal.appeal_type == appeal_type)

        statement = statement.order_by(Appeal.created_at.desc())

        return list(db.exec(statement).all())

    async def get_pending_appeals(
        self,
        db: Session,
        appeal_type: Optional[AppealType] = None,
        emergency_only: bool = False,
    ) -> list[Appeal]:
        """Get all pending appeals for admin review."""
        statement = select(Appeal).where(Appeal.status == AppealStatus.PENDING)

        if appeal_type:
            statement = statement.where(Appeal.appeal_type == appeal_type)
        if emergency_only:
            statement = statement.where(Appeal.emergency_type.is_not(None))

        statement = statement.order_by(Appeal.created_at.asc())

        return list(db.exec(statement).all())

    async def get_appeals_approaching_deadline(
        self,
        db: Session,
        hours_threshold: int = 24,
    ) -> list[Appeal]:
        """Get pending appeals approaching their review deadline."""
        deadline_threshold = datetime.utcnow() + timedelta(hours=hours_threshold)

        statement = (
            select(Appeal)
            .where(
                Appeal.status == AppealStatus.PENDING,
                Appeal.created_at <= deadline_threshold - timedelta(days=3),  # 3 business days
            )
            .order_by(Appeal.created_at.asc())
        )

        return list(db.exec(statement).all())

    # Private helper methods

    async def _waive_penalty(
        self,
        db: Session,
        penalty_id: int,
        waived_by: int,
        reason: str,
    ) -> None:
        """Waive a penalty as part of appeal approval."""
        penalty = db.get(Penalty, penalty_id)
        if penalty:
            penalty.status = PenaltyStatus.WAIVED
            penalty.waived_at = datetime.utcnow()
            penalty.waived_by_user_id = waived_by
            penalty.waive_reason = f"Appeal approved: {reason}"
            db.commit()
            logger.info(f"Penalty {penalty_id} waived via appeal")

    async def _remove_strike(
        self,
        db: Session,
        strike_id: int,
    ) -> None:
        """Remove a strike as part of appeal approval."""
        strike = db.get(Strike, strike_id)
        if strike:
            strike.is_active = False
            db.commit()
            logger.info(f"Strike {strike_id} removed via appeal")

    async def _lift_suspension(
        self,
        db: Session,
        suspension_id: int,
        lifted_by: int,
        reason: str,
    ) -> None:
        """
        Lift a suspension as part of appeal approval.

        Also clears strikes and sets probation period.
        """
        suspension = db.get(UserSuspension, suspension_id)
        if suspension:
            suspension.is_active = False
            suspension.lifted_at = datetime.utcnow()
            suspension.lifted_by_user_id = lifted_by
            suspension.lift_reason = f"Appeal approved: {reason}"
            db.commit()

            # Clear all active strikes for this user
            await self._clear_user_strikes(db, suspension.user_id)

            # Reactivate user account
            user = db.get(User, suspension.user_id)
            if user:
                user.is_active = True
                db.commit()

            logger.info(f"Suspension {suspension_id} lifted via appeal")

    async def _clear_user_strikes(
        self,
        db: Session,
        user_id: int,
    ) -> None:
        """Clear all active strikes for a user upon reinstatement."""
        statement = select(Strike).where(
            Strike.user_id == user_id,
            Strike.is_active == True,
        )
        strikes = db.exec(statement).all()

        for strike in strikes:
            strike.is_active = False

        db.commit()
        logger.info(f"Cleared {len(strikes)} strikes for user {user_id}")

    async def _charge_frivolous_fee(
        self,
        db: Session,
        user_id: int,
    ) -> None:
        """Charge $25 frivolous appeal fee to user."""
        # Get or create negative balance
        statement = select(NegativeBalance).where(NegativeBalance.user_id == user_id)
        negative_balance = db.exec(statement).first()

        if negative_balance:
            negative_balance.amount += FRIVOLOUS_APPEAL_FEE
            negative_balance.updated_at = datetime.utcnow()
        else:
            # Try to deduct from wallet first
            wallet_statement = select(Wallet).where(Wallet.user_id == user_id)
            wallet = db.exec(wallet_statement).first()

            if wallet and wallet.available_balance >= FRIVOLOUS_APPEAL_FEE:
                wallet.available_balance -= FRIVOLOUS_APPEAL_FEE
            else:
                # Create negative balance
                negative_balance = NegativeBalance(
                    user_id=user_id,
                    amount=FRIVOLOUS_APPEAL_FEE,
                )
                db.add(negative_balance)

        db.commit()
        logger.info(f"Charged ${FRIVOLOUS_APPEAL_FEE} frivolous appeal fee to user {user_id}")

    async def _notify_admins_new_appeal(
        self,
        db: Session,
        appeal: Appeal,
    ) -> None:
        """Send notification to admins about new appeal."""
        # Get all admin users
        statement = select(User).where(User.user_type == UserType.ADMIN)
        admins = db.exec(statement).all()

        user = db.get(User, appeal.user_id)
        user_name = user.full_name if user else f"User {appeal.user_id}"

        emergency_tag = " [EMERGENCY]" if appeal.emergency_type else ""

        for admin in admins:
            notification = Notification(
                user_id=admin.id,
                type="appeal_submitted",
                title=f"New Appeal{emergency_tag}: {appeal.appeal_type.value.title()}",
                message=(
                    f"{user_name} has submitted an appeal for a {appeal.appeal_type.value}. "
                    f"Review required within 3 business days."
                ),
                data={
                    "appeal_id": appeal.id,
                    "appeal_type": appeal.appeal_type.value,
                    "user_id": appeal.user_id,
                    "emergency_type": appeal.emergency_type.value if appeal.emergency_type else None,
                },
            )
            db.add(notification)

        db.commit()
        logger.info(f"Notified {len(admins)} admins about appeal {appeal.id}")

    async def _notify_user_appeal_reviewed(
        self,
        db: Session,
        appeal: Appeal,
    ) -> None:
        """Send notification to user about appeal decision."""
        if appeal.status == AppealStatus.APPROVED:
            title = f"Appeal Approved: {appeal.appeal_type.value.title()}"
            message = (
                f"Your appeal has been approved. "
                f"The {appeal.appeal_type.value} has been removed from your record."
            )
            if appeal.emergency_waiver_used:
                message += " Your annual emergency waiver has been used."
        else:
            title = f"Appeal Denied: {appeal.appeal_type.value.title()}"
            message = f"Your appeal has been denied. Reason: {appeal.reviewer_notes}"
            if appeal.frivolous_fee_charged:
                message += f" A ${FRIVOLOUS_APPEAL_FEE} fee has been charged for frivolous appeal."

        notification = Notification(
            user_id=appeal.user_id,
            type="appeal_reviewed",
            title=title,
            message=message,
            data={
                "appeal_id": appeal.id,
                "appeal_type": appeal.appeal_type.value,
                "status": appeal.status.value,
                "frivolous_fee_charged": appeal.frivolous_fee_charged,
                "emergency_waiver_used": appeal.emergency_waiver_used,
            },
        )
        db.add(notification)
        db.commit()

        email_svc = EmailService(db=db)
        if appeal.status == AppealStatus.APPROVED:
            await email_svc.send_appeal_approved(
                user_id=appeal.user_id,
                appeal_type=appeal.appeal_type.value,
                appeal_id=appeal.id,
                reviewer_notes=appeal.reviewer_notes or "",
                emergency_waiver_used=appeal.emergency_waiver_used,
            )
        else:
            await email_svc.send_appeal_denied(
                user_id=appeal.user_id,
                appeal_type=appeal.appeal_type.value,
                appeal_id=appeal.id,
                reviewer_notes=appeal.reviewer_notes or "",
                frivolous_fee_charged=appeal.frivolous_fee_charged,
            )

        logger.info(f"Notified user {appeal.user_id} about appeal {appeal.id} review")


# Singleton instance
appeal_service = AppealService()
