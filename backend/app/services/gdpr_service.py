"""GDPR compliance service for ExtraShifty.

Handles account deletion requests, data export, and wallet closure cascade.
"""

import json
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlmodel import Session, select

from app.models.application import Application
from app.models.gdpr import DeletionRequest, DeletionRequestStatus
from app.models.notification import Notification, NotificationPreference
from app.models.payment import (
    FundsHold,
    FundsHoldStatus,
    Payout,
    PayoutStatus,
    Transaction,
)
from app.models.review import Review
from app.models.shift import Shift
from app.models.user import User
from app.models.wallet import PaymentMethod, Wallet
from app.services.stripe_service import StripeService, StripeServiceError

logger = logging.getLogger(__name__)


class GDPRServiceError(Exception):
    """Custom exception for GDPR service errors."""

    def __init__(self, message: str, code: str = "gdpr_error"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class GDPRService:
    """Service class for GDPR compliance operations."""

    DELETION_GRACE_PERIOD_DAYS = 30  # Allow cancellation for 30 days
    DATA_EXPORT_EXPIRY_HOURS = 48

    def __init__(self, db: Session):
        self.db = db
        self.stripe_service = StripeService()

    async def request_account_deletion(
        self, user_id: int, reason: str | None = None
    ) -> DeletionRequest:
        """
        Initiate account deletion request.

        - Create DeletionRequest record
        - Send confirmation email (placeholder)
        - Schedule deletion after grace period

        Args:
            user_id: The user requesting deletion
            reason: Optional reason for deletion

        Returns:
            DeletionRequest record

        Raises:
            GDPRServiceError: If request cannot be created
        """
        # Check if user exists
        user = self.db.get(User, user_id)
        if not user:
            raise GDPRServiceError("User not found", "user_not_found")

        if user.is_deleted:
            raise GDPRServiceError("User is already deleted", "already_deleted")

        # Check for existing pending request
        existing = self.db.exec(
            select(DeletionRequest).where(
                DeletionRequest.user_id == user_id,
                DeletionRequest.status.in_([
                    DeletionRequestStatus.PENDING,
                    DeletionRequestStatus.PROCESSING,
                ]),
            )
        ).first()

        if existing:
            raise GDPRServiceError(
                "A deletion request is already pending",
                "request_exists",
            )

        # Create deletion request
        deletion_request = DeletionRequest(
            user_id=user_id,
            status=DeletionRequestStatus.PENDING,
            reason=reason,
            requested_at=datetime.utcnow(),
        )
        self.db.add(deletion_request)

        # Update user record
        user.deletion_requested_at = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        self.db.add(user)

        self.db.commit()
        self.db.refresh(deletion_request)

        logger.info(
            f"Account deletion requested for user {user_id}, "
            f"request ID: {deletion_request.id}"
        )

        # TODO: Send confirmation email with cancellation link
        # await email_service.send_deletion_confirmation(user.email, deletion_request.id)

        return deletion_request

    async def cancel_deletion_request(self, user_id: int) -> bool:
        """
        Cancel a pending deletion request.

        Args:
            user_id: The user cancelling the request

        Returns:
            True if cancelled successfully

        Raises:
            GDPRServiceError: If cancellation fails
        """
        # Find pending request
        deletion_request = self.db.exec(
            select(DeletionRequest).where(
                DeletionRequest.user_id == user_id,
                DeletionRequest.status == DeletionRequestStatus.PENDING,
            )
        ).first()

        if not deletion_request:
            raise GDPRServiceError(
                "No pending deletion request found",
                "no_pending_request",
            )

        # Check if still within grace period
        grace_period_end = deletion_request.requested_at + timedelta(
            days=self.DELETION_GRACE_PERIOD_DAYS
        )
        if datetime.utcnow() > grace_period_end:
            raise GDPRServiceError(
                "Grace period has expired, deletion cannot be cancelled",
                "grace_period_expired",
            )

        # Cancel the request
        deletion_request.status = DeletionRequestStatus.CANCELLED
        deletion_request.updated_at = datetime.utcnow()
        self.db.add(deletion_request)

        # Update user record
        user = self.db.get(User, user_id)
        if user:
            user.deletion_requested_at = None
            user.updated_at = datetime.utcnow()
            self.db.add(user)

        self.db.commit()

        logger.info(f"Deletion request cancelled for user {user_id}")
        return True

    async def get_deletion_status(self, user_id: int) -> dict:
        """
        Get the current status of a deletion request.

        Args:
            user_id: The user to check

        Returns:
            Dictionary with deletion status information
        """
        deletion_request = self.db.exec(
            select(DeletionRequest)
            .where(DeletionRequest.user_id == user_id)
            .order_by(DeletionRequest.created_at.desc())
        ).first()

        if not deletion_request:
            return {
                "has_pending_request": False,
                "request": None,
                "grace_period_ends_at": None,
                "can_cancel": False,
                "deletion_scheduled_for": None,
            }

        grace_period_end = deletion_request.requested_at + timedelta(
            days=self.DELETION_GRACE_PERIOD_DAYS
        )
        can_cancel = (
            deletion_request.status == DeletionRequestStatus.PENDING
            and datetime.utcnow() < grace_period_end
        )

        return {
            "has_pending_request": deletion_request.status
            in [DeletionRequestStatus.PENDING, DeletionRequestStatus.PROCESSING],
            "request": deletion_request,
            "grace_period_ends_at": grace_period_end
            if deletion_request.status == DeletionRequestStatus.PENDING
            else None,
            "can_cancel": can_cancel,
            "deletion_scheduled_for": grace_period_end
            if deletion_request.status == DeletionRequestStatus.PENDING
            else None,
        }

    async def export_user_data(self, user_id: int) -> str:
        """
        Export all user data (GDPR right to data portability).

        Returns temporary download URL.

        Includes:
        - Profile information
        - Wallet transactions
        - Shifts worked
        - Applications
        - Reviews (given and received)
        - Notifications
        - Tax documents

        Args:
            user_id: The user requesting export

        Returns:
            Temporary download URL

        Raises:
            GDPRServiceError: If export fails
        """
        user = self.db.get(User, user_id)
        if not user:
            raise GDPRServiceError("User not found", "user_not_found")

        # Gather all user data
        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "user_id": user_id,
        }

        # 1. Profile information
        export_data["profile"] = {
            "email": user.email,
            "full_name": user.full_name,
            "user_type": user.user_type.value,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat(),
        }

        # 2. Wallet and transactions
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if wallet:
            export_data["wallet"] = {
                "balance": str(wallet.balance),
                "reserved_balance": str(wallet.reserved_balance),
                "currency": wallet.currency,
                "created_at": wallet.created_at.isoformat(),
            }

            # Transactions
            transactions = self.db.exec(
                select(Transaction).where(Transaction.wallet_id == wallet.id)
            ).all()
            export_data["transactions"] = [
                {
                    "id": t.id,
                    "type": t.transaction_type.value,
                    "amount": str(t.amount),
                    "fee": str(t.fee),
                    "net_amount": str(t.net_amount),
                    "status": t.status.value,
                    "description": t.description,
                    "created_at": t.created_at.isoformat(),
                }
                for t in transactions
            ]

            # Payouts
            payouts = self.db.exec(
                select(Payout).where(Payout.wallet_id == wallet.id)
            ).all()
            export_data["payouts"] = [
                {
                    "id": p.id,
                    "amount": str(p.amount),
                    "fee": str(p.fee),
                    "net_amount": str(p.net_amount),
                    "type": p.payout_type.value,
                    "status": p.status.value,
                    "scheduled_date": p.scheduled_date.isoformat(),
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                }
                for p in payouts
            ]

        # 3. Applications
        applications = self.db.exec(
            select(Application).where(Application.applicant_id == user_id)
        ).all()
        export_data["applications"] = [
            {
                "id": a.id,
                "shift_id": a.shift_id,
                "status": a.status.value,
                "cover_message": a.cover_message,
                "applied_at": a.applied_at.isoformat(),
            }
            for a in applications
        ]

        # 4. Shifts (company posted)
        shifts = self.db.exec(
            select(Shift).where(Shift.company_id == user_id)
        ).all()
        export_data["shifts_posted"] = [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "date": s.date.isoformat(),
                "hourly_rate": str(s.hourly_rate),
                "status": s.status.value,
                "location": s.location,
                "created_at": s.created_at.isoformat(),
            }
            for s in shifts
        ]

        # 5. Reviews (given and received)
        reviews_given = self.db.exec(
            select(Review).where(Review.reviewer_id == user_id)
        ).all()
        export_data["reviews_given"] = [
            {
                "id": r.id,
                "shift_id": r.shift_id,
                "rating": r.rating,
                "comment": r.comment,
                "review_type": r.review_type.value,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews_given
        ]

        reviews_received = self.db.exec(
            select(Review).where(Review.reviewee_id == user_id)
        ).all()
        export_data["reviews_received"] = [
            {
                "id": r.id,
                "shift_id": r.shift_id,
                "rating": r.rating,
                "comment": r.comment,
                "review_type": r.review_type.value,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews_received
        ]

        # 6. Notifications
        notifications = self.db.exec(
            select(Notification).where(Notification.user_id == user_id)
        ).all()
        export_data["notifications"] = [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ]

        # 7. Payment methods (masked)
        payment_methods = self.db.exec(
            select(PaymentMethod).where(PaymentMethod.user_id == user_id)
        ).all()
        export_data["payment_methods"] = [
            {
                "id": pm.id,
                "type": pm.type.value,
                "last_four": pm.last_four,
                "brand": pm.brand,
                "is_default": pm.is_default,
                "created_at": pm.created_at.isoformat(),
            }
            for pm in payment_methods
        ]

        # Generate export file (in production, upload to S3/GCS and return URL)
        export_json = json.dumps(export_data, indent=2, default=str)

        # Create/update deletion request with export info
        deletion_request = self.db.exec(
            select(DeletionRequest)
            .where(DeletionRequest.user_id == user_id)
            .order_by(DeletionRequest.created_at.desc())
        ).first()

        # Generate a temporary URL (in production, use S3 presigned URL)
        export_id = uuid.uuid4().hex
        export_url = f"/api/v1/gdpr/export-data/download?export_id={export_id}"
        expires_at = datetime.utcnow() + timedelta(hours=self.DATA_EXPORT_EXPIRY_HOURS)

        if deletion_request:
            deletion_request.data_export_url = export_url
            deletion_request.data_export_expires_at = expires_at
            deletion_request.updated_at = datetime.utcnow()
            self.db.add(deletion_request)
        else:
            # Create a new request just for export tracking
            deletion_request = DeletionRequest(
                user_id=user_id,
                status=DeletionRequestStatus.CANCELLED,  # Not actually deleting
                data_export_url=export_url,
                data_export_expires_at=expires_at,
            )
            self.db.add(deletion_request)

        self.db.commit()
        self.db.refresh(deletion_request)

        logger.info(f"Data export generated for user {user_id}")

        # TODO: In production, save export_json to cloud storage and return presigned URL
        return export_url

    async def process_deletion(self, deletion_request_id: int) -> bool:
        """
        Execute account deletion.

        Steps:
        1. Close wallet and process final payout
        2. Cancel pending payouts
        3. Anonymize transactions (keep for accounting, remove PII)
        4. Anonymize shifts
        5. Anonymize reviews
        6. Delete notifications
        7. Delete user profile
        8. Delete from Stripe Connect

        Args:
            deletion_request_id: The deletion request to process

        Returns:
            True if deletion completed successfully

        Raises:
            GDPRServiceError: If deletion fails
        """
        deletion_request = self.db.get(DeletionRequest, deletion_request_id)
        if not deletion_request:
            raise GDPRServiceError("Deletion request not found", "request_not_found")

        if deletion_request.status != DeletionRequestStatus.PENDING:
            raise GDPRServiceError(
                f"Request is not pending (status: {deletion_request.status})",
                "invalid_status",
            )

        # Check grace period has passed
        grace_period_end = deletion_request.requested_at + timedelta(
            days=self.DELETION_GRACE_PERIOD_DAYS
        )
        if datetime.utcnow() < grace_period_end:
            raise GDPRServiceError(
                "Grace period has not ended yet",
                "grace_period_active",
            )

        user_id = deletion_request.user_id
        user = self.db.get(User, user_id)
        if not user:
            raise GDPRServiceError("User not found", "user_not_found")

        # Mark as processing
        deletion_request.status = DeletionRequestStatus.PROCESSING
        deletion_request.processing_started_at = datetime.utcnow()
        deletion_request.updated_at = datetime.utcnow()
        self.db.add(deletion_request)
        self.db.commit()

        try:
            # Generate anonymized ID
            anonymized_id = f"deleted_user_{uuid.uuid4().hex[:12]}"

            # 1. Close wallet
            wallet_info = await self.close_wallet(user_id)
            deletion_request.wallet_closed = True
            deletion_request.wallet_balance_at_deletion = json.dumps(wallet_info)

            # 2. Cancel pending payouts
            cancelled_payouts = await self._cancel_pending_payouts(user_id)
            deletion_request.pending_payouts_cancelled = cancelled_payouts

            # 3. Anonymize transactions
            anonymized_txns = await self.anonymize_transactions(user_id, anonymized_id)
            deletion_request.transactions_anonymized = anonymized_txns

            # 4. Anonymize shifts
            anonymized_shifts = await self.anonymize_shifts(user_id, anonymized_id)
            deletion_request.shifts_anonymized = anonymized_shifts

            # 5. Anonymize reviews
            anonymized_reviews = await self.anonymize_reviews(user_id, anonymized_id)
            deletion_request.reviews_anonymized = anonymized_reviews

            # 6. Delete notifications
            deleted_notifications = await self._delete_notifications(user_id)
            deletion_request.notifications_deleted = deleted_notifications

            # 7. Delete payment methods
            await self._delete_payment_methods(user_id)

            # 8. Delete notification preferences
            await self._delete_notification_preferences(user_id)

            # 9. Mark user as deleted (soft delete)
            user.email = f"{anonymized_id}@deleted.extrashifty.com"
            user.hashed_password = "DELETED"
            user.full_name = "Deleted User"
            user.is_active = False
            user.is_deleted = True
            user.deleted_at = datetime.utcnow()
            user.anonymized_id = anonymized_id
            user.updated_at = datetime.utcnow()
            self.db.add(user)

            # Mark deletion as completed
            deletion_request.status = DeletionRequestStatus.COMPLETED
            deletion_request.completed_at = datetime.utcnow()
            deletion_request.updated_at = datetime.utcnow()
            self.db.add(deletion_request)

            self.db.commit()

            logger.info(
                f"Account deletion completed for user {user_id} "
                f"(anonymized as {anonymized_id})"
            )
            return True

        except Exception as e:
            # Mark as failed
            deletion_request.status = DeletionRequestStatus.FAILED
            deletion_request.error_message = str(e)[:2000]
            deletion_request.updated_at = datetime.utcnow()
            self.db.add(deletion_request)
            self.db.commit()

            logger.error(f"Account deletion failed for user {user_id}: {e}")
            raise GDPRServiceError(f"Deletion failed: {str(e)}", "deletion_failed")

    async def close_wallet(self, user_id: int) -> dict:
        """
        Close wallet and return final balance info.

        - Process any pending payouts
        - Transfer remaining balance
        - Mark wallet as closed
        - Delete Stripe Connect account

        Args:
            user_id: The user whose wallet to close

        Returns:
            Dictionary with final wallet state
        """
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            return {"status": "no_wallet", "balance": "0.00"}

        result = {
            "wallet_id": wallet.id,
            "final_balance": str(wallet.balance),
            "final_reserved_balance": str(wallet.reserved_balance),
            "currency": wallet.currency,
            "stripe_account_id": wallet.stripe_account_id,
        }

        # Release any active funds holds
        active_holds = self.db.exec(
            select(FundsHold).where(
                FundsHold.wallet_id == wallet.id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).all()

        for hold in active_holds:
            hold.status = FundsHoldStatus.RELEASED
            hold.released_at = datetime.utcnow()
            self.db.add(hold)

            # Return reserved funds to available balance
            wallet.reserved_balance -= hold.amount

        # Cancel any in-transit payouts
        in_transit_payouts = self.db.exec(
            select(Payout).where(
                Payout.wallet_id == wallet.id,
                Payout.status == PayoutStatus.IN_TRANSIT,
            )
        ).all()

        for payout in in_transit_payouts:
            # Try to cancel in Stripe
            if payout.stripe_payout_id and wallet.stripe_account_id:
                try:
                    self.stripe_service.cancel_payout(
                        payout.stripe_payout_id,
                        wallet.stripe_account_id,
                    )
                except StripeServiceError as e:
                    logger.warning(f"Could not cancel payout {payout.id}: {e}")

            payout.status = PayoutStatus.CANCELLED
            self.db.add(payout)

        # If there's remaining balance, create final payout
        if wallet.balance > Decimal("0.00"):
            # In production, transfer to user's bank account
            result["final_payout_amount"] = str(wallet.balance)
            result["final_payout_status"] = "scheduled"
            # TODO: Create actual payout via Stripe

        # Delete Stripe Connect account
        if wallet.stripe_account_id:
            try:
                self.stripe_service.delete_account(wallet.stripe_account_id)
                result["stripe_account_deleted"] = True
            except StripeServiceError as e:
                logger.warning(
                    f"Could not delete Stripe account {wallet.stripe_account_id}: {e}"
                )
                result["stripe_account_deleted"] = False
                result["stripe_deletion_error"] = str(e)

        # Mark wallet as closed
        wallet.is_active = False
        wallet.balance = Decimal("0.00")
        wallet.reserved_balance = Decimal("0.00")
        wallet.stripe_account_id = None
        wallet.updated_at = datetime.utcnow()
        self.db.add(wallet)

        return result

    async def _cancel_pending_payouts(self, user_id: int) -> int:
        """Cancel all pending payouts for a user."""
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            return 0

        pending_payouts = self.db.exec(
            select(Payout).where(
                Payout.wallet_id == wallet.id,
                Payout.status == PayoutStatus.PENDING,
            )
        ).all()

        count = 0
        for payout in pending_payouts:
            payout.status = PayoutStatus.CANCELLED
            self.db.add(payout)
            count += 1

        return count

    async def anonymize_transactions(self, user_id: int, anonymized_id: str) -> int:
        """
        Anonymize transactions (required for accounting).

        - Keep amounts and dates for tax/accounting
        - Remove personal metadata
        - Update description to generic text

        Args:
            user_id: The user whose transactions to anonymize
            anonymized_id: The anonymized identifier

        Returns:
            Number of transactions anonymized
        """
        wallet = self.db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

        if not wallet:
            return 0

        transactions = self.db.exec(
            select(Transaction).where(Transaction.wallet_id == wallet.id)
        ).all()

        count = 0
        for transaction in transactions:
            # Clear personal details from description
            transaction.description = f"[Anonymized] {transaction.transaction_type.value}"
            # Clear metadata that might contain PII
            transaction.extra_data = None
            self.db.add(transaction)
            count += 1

        return count

    async def anonymize_shifts(self, user_id: int, anonymized_id: str) -> int:
        """
        Anonymize shift records.

        Args:
            user_id: The user whose shifts to anonymize
            anonymized_id: The anonymized identifier

        Returns:
            Number of shifts anonymized
        """
        shifts = self.db.exec(
            select(Shift).where(Shift.company_id == user_id)
        ).all()

        count = 0
        for shift in shifts:
            # Anonymize identifying information
            shift.title = "[Deleted]"
            shift.description = None
            shift.address = None
            shift.requirements = None
            self.db.add(shift)
            count += 1

        return count

    async def anonymize_reviews(self, user_id: int, anonymized_id: str) -> int:
        """
        Anonymize reviews.

        Args:
            user_id: The user whose reviews to anonymize
            anonymized_id: The anonymized identifier

        Returns:
            Number of reviews anonymized
        """
        # Reviews given
        reviews_given = self.db.exec(
            select(Review).where(Review.reviewer_id == user_id)
        ).all()

        count = 0
        for review in reviews_given:
            review.comment = "[Deleted]"
            self.db.add(review)
            count += 1

        # Reviews received - keep rating but anonymize comment
        reviews_received = self.db.exec(
            select(Review).where(Review.reviewee_id == user_id)
        ).all()

        for review in reviews_received:
            review.comment = "[Deleted]"
            self.db.add(review)
            count += 1

        return count

    async def _delete_notifications(self, user_id: int) -> int:
        """Delete all notifications for a user."""
        notifications = self.db.exec(
            select(Notification).where(Notification.user_id == user_id)
        ).all()

        count = len(notifications)
        for notification in notifications:
            self.db.delete(notification)

        return count

    async def _delete_payment_methods(self, user_id: int) -> int:
        """Delete all payment methods for a user."""
        payment_methods = self.db.exec(
            select(PaymentMethod).where(PaymentMethod.user_id == user_id)
        ).all()

        count = len(payment_methods)
        for pm in payment_methods:
            # TODO: Delete from Stripe as well
            self.db.delete(pm)

        return count

    async def _delete_notification_preferences(self, user_id: int) -> None:
        """Delete notification preferences for a user."""
        preferences = self.db.exec(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        ).first()

        if preferences:
            self.db.delete(preferences)

    async def get_pending_deletions(self, status: DeletionRequestStatus | None = None):
        """Get all pending deletion requests (admin)."""
        query = select(DeletionRequest)

        if status:
            query = query.where(DeletionRequest.status == status)
        else:
            query = query.where(
                DeletionRequest.status.in_([
                    DeletionRequestStatus.PENDING,
                    DeletionRequestStatus.PROCESSING,
                    DeletionRequestStatus.FAILED,
                ])
            )

        return list(self.db.exec(query.order_by(DeletionRequest.created_at.desc())).all())

    async def get_ready_for_deletion(self) -> list[DeletionRequest]:
        """Get deletion requests ready to be processed (past grace period)."""
        cutoff = datetime.utcnow() - timedelta(days=self.DELETION_GRACE_PERIOD_DAYS)

        return list(
            self.db.exec(
                select(DeletionRequest).where(
                    DeletionRequest.status == DeletionRequestStatus.PENDING,
                    DeletionRequest.requested_at <= cutoff,
                )
            ).all()
        )
