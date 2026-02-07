"""Stripe webhook endpoints for ExtraShifty."""

import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.config import settings
from app.core.rate_limit import DEFAULT_RATE_LIMIT, WEBHOOK_RATE_LIMIT, limiter
from app.crud.notification import notification as notification_crud
from app.crud.payment import dispute as dispute_crud
from app.crud.payment import payout as payout_crud
from app.crud.wallet import wallet as wallet_crud
from app.models.payment import (
    ProcessedWebhookEvent,
    Transaction,
    TransactionStatus,
)
from app.models.wallet import Wallet
from app.services.stripe_service import StripeServiceError, stripe_service

logger = logging.getLogger(__name__)

router = APIRouter()


# =========================================================================
# Idempotency Helpers
# =========================================================================


def is_event_already_processed(session: Any, event_id: str) -> bool:
    """Check if a webhook event has already been processed."""
    existing = session.exec(
        select(ProcessedWebhookEvent).where(
            ProcessedWebhookEvent.event_id == event_id
        )
    ).first()
    return existing is not None


def mark_event_processed(
    session: Any,
    event_id: str,
    event_type: str,
    result: dict[str, Any] | None = None,
) -> ProcessedWebhookEvent:
    """Mark a webhook event as processed."""
    db_event = ProcessedWebhookEvent(
        event_id=event_id,
        event_type=event_type,
        result=result,
    )
    session.add(db_event)
    session.commit()
    session.refresh(db_event)
    return db_event


# =========================================================================
# Webhook Event Handlers
# =========================================================================


async def handle_payment_intent_succeeded(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle payment_intent.succeeded event.

    This event is sent when a PaymentIntent is successfully completed.
    Use this to fulfill orders, update transaction status, etc.
    """
    payment_intent = event_data.get("object", {})
    payment_intent_id = payment_intent.get("id")
    amount = payment_intent.get("amount", 0)
    currency = payment_intent.get("currency", "")
    metadata = payment_intent.get("metadata", {})

    logger.info(
        f"Payment succeeded: {payment_intent_id}, "
        f"amount: {amount} {currency.upper()}"
    )

    # Find the transaction by Stripe payment intent ID
    db_transaction = session.exec(
        select(Transaction).where(
            Transaction.stripe_payment_intent_id == payment_intent_id
        )
    ).first()

    if db_transaction:
        # Update transaction status to COMPLETED
        db_transaction.status = TransactionStatus.COMPLETED
        db_transaction.completed_at = datetime.now(UTC)
        session.add(db_transaction)

        # Add funds to wallet balance (amount is in cents, convert to decimal)
        wallet = session.get(Wallet, db_transaction.wallet_id)
        if wallet:
            amount_decimal = Decimal(str(amount)) / Decimal("100")
            wallet.balance += amount_decimal
            wallet.updated_at = datetime.now(UTC)
            session.add(wallet)

            # Create notification for user
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="payment_succeeded",
                title="Payment Successful",
                message=f"Your payment of {amount_decimal:.2f} {currency.upper()} was successful.",
                data={
                    "payment_intent_id": payment_intent_id,
                    "amount": str(amount_decimal),
                    "currency": currency,
                    "transaction_id": db_transaction.id,
                },
            )

        session.commit()
        logger.info(
            f"Transaction {db_transaction.id} updated to COMPLETED, "
            f"wallet balance updated"
        )
    else:
        logger.warning(
            f"No transaction found for payment intent {payment_intent_id}"
        )

    return {
        "action": "payment_intent.succeeded",
        "payment_intent_id": payment_intent_id,
        "amount": amount,
        "currency": currency,
        "metadata": metadata,
        "transaction_updated": db_transaction is not None,
    }


async def handle_payment_intent_failed(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle payment_intent.payment_failed event.

    This event is sent when a PaymentIntent fails to complete.
    Use this to notify users and handle failed payment flows.
    """
    payment_intent = event_data.get("object", {})
    payment_intent_id = payment_intent.get("id")
    error = payment_intent.get("last_payment_error", {})
    error_message = error.get("message", "Unknown error")
    error_code = error.get("code", "unknown")

    logger.warning(
        f"Payment failed: {payment_intent_id}, "
        f"error: {error_code} - {error_message}"
    )

    # Find the transaction by Stripe payment intent ID
    db_transaction = session.exec(
        select(Transaction).where(
            Transaction.stripe_payment_intent_id == payment_intent_id
        )
    ).first()

    if db_transaction:
        # Update transaction status to FAILED
        db_transaction.status = TransactionStatus.FAILED
        db_transaction.extra_data = db_transaction.extra_data or {}
        db_transaction.extra_data["failure_code"] = error_code
        db_transaction.extra_data["failure_message"] = error_message
        session.add(db_transaction)

        # Get wallet to find user for notification
        wallet = session.get(Wallet, db_transaction.wallet_id)
        if wallet:
            # Create notification for user about failed payment
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="payment_failed",
                title="Payment Failed",
                message=f"Your payment could not be processed: {error_message}",
                data={
                    "payment_intent_id": payment_intent_id,
                    "error_code": error_code,
                    "error_message": error_message,
                    "transaction_id": db_transaction.id,
                },
            )

        session.commit()
        logger.info(
            f"Transaction {db_transaction.id} updated to FAILED, "
            f"user notified"
        )
    else:
        logger.warning(
            f"No transaction found for failed payment intent {payment_intent_id}"
        )

    return {
        "action": "payment_intent.payment_failed",
        "payment_intent_id": payment_intent_id,
        "error_code": error_code,
        "error_message": error_message,
        "transaction_updated": db_transaction is not None,
    }


async def handle_payout_paid(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle payout.paid event.

    This event is sent when a payout is successfully sent to the bank.
    Use this to confirm withdrawal completion to users.
    """
    payout = event_data.get("object", {})
    payout_id = payout.get("id")
    amount = payout.get("amount", 0)
    currency = payout.get("currency", "")
    arrival_date = payout.get("arrival_date")

    logger.info(
        f"Payout paid: {payout_id}, "
        f"amount: {amount} {currency.upper()}, "
        f"arrival: {arrival_date}"
    )

    # Find the payout record by Stripe payout ID
    db_payout = payout_crud.get_by_stripe_payout_id(session, stripe_payout_id=payout_id)

    if db_payout:
        # Update payout status to PAID
        payout_crud.mark_paid(session, payout_id=db_payout.id)

        # Get wallet to find user for notification
        wallet = session.get(Wallet, db_payout.wallet_id)
        if wallet:
            amount_decimal = Decimal(str(amount)) / Decimal("100")

            # Create notification for user about successful payout
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="payout_paid",
                title="Payout Sent",
                message=f"Your payout of {amount_decimal:.2f} {currency.upper()} has been sent to your bank.",
                data={
                    "payout_id": db_payout.id,
                    "stripe_payout_id": payout_id,
                    "amount": str(amount_decimal),
                    "currency": currency,
                    "arrival_date": arrival_date,
                },
            )

        logger.info(
            f"Payout {db_payout.id} updated to PAID, user notified"
        )
    else:
        logger.warning(
            f"No payout record found for Stripe payout {payout_id}"
        )

    return {
        "action": "payout.paid",
        "payout_id": payout_id,
        "amount": amount,
        "currency": currency,
        "arrival_date": arrival_date,
        "payout_updated": db_payout is not None,
    }


async def handle_payout_failed(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle payout.failed event.

    This event is sent when a payout fails.
    Use this to refund the user's wallet balance and notify them.
    """
    payout = event_data.get("object", {})
    payout_id = payout.get("id")
    amount = payout.get("amount", 0)
    currency = payout.get("currency", "")
    failure_code = payout.get("failure_code", "unknown")
    failure_message = payout.get("failure_message", "Unknown error")

    logger.error(
        f"Payout failed: {payout_id}, "
        f"amount: {amount} {currency.upper()}, "
        f"reason: {failure_code} - {failure_message}"
    )

    # Find the payout record by Stripe payout ID
    db_payout = payout_crud.get_by_stripe_payout_id(session, stripe_payout_id=payout_id)

    if db_payout:
        # Update payout status to FAILED
        payout_crud.mark_failed(session, payout_id=db_payout.id)

        # Return funds to wallet balance
        wallet = session.get(Wallet, db_payout.wallet_id)
        if wallet:
            # Return the original payout amount (before fees) to wallet
            wallet.balance += db_payout.amount
            wallet.updated_at = datetime.now(UTC)
            session.add(wallet)
            session.commit()

            amount_decimal = Decimal(str(amount)) / Decimal("100")

            # Create notification for user about failed payout
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="payout_failed",
                title="Payout Failed",
                message=f"Your payout of {amount_decimal:.2f} {currency.upper()} failed: {failure_message}. The funds have been returned to your wallet.",
                data={
                    "payout_id": db_payout.id,
                    "stripe_payout_id": payout_id,
                    "amount": str(amount_decimal),
                    "currency": currency,
                    "failure_code": failure_code,
                    "failure_message": failure_message,
                },
            )

        logger.info(
            f"Payout {db_payout.id} updated to FAILED, "
            f"funds returned to wallet, user notified"
        )
    else:
        logger.warning(
            f"No payout record found for failed Stripe payout {payout_id}"
        )

    return {
        "action": "payout.failed",
        "payout_id": payout_id,
        "amount": amount,
        "currency": currency,
        "failure_code": failure_code,
        "failure_message": failure_message,
        "payout_updated": db_payout is not None,
        "funds_returned": db_payout is not None,
    }


async def handle_account_updated(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle account.updated event.

    This event is sent when a Connect account is updated.
    Use this to track onboarding status and capability changes.
    """
    account = event_data.get("object", {})
    account_id = account.get("id")
    charges_enabled = account.get("charges_enabled", False)
    payouts_enabled = account.get("payouts_enabled", False)
    details_submitted = account.get("details_submitted", False)
    requirements = account.get("requirements", {})
    currently_due = requirements.get("currently_due", [])
    eventually_due = requirements.get("eventually_due", [])
    past_due = requirements.get("past_due", [])

    logger.info(
        f"Account updated: {account_id}, "
        f"charges_enabled: {charges_enabled}, "
        f"payouts_enabled: {payouts_enabled}, "
        f"details_submitted: {details_submitted}"
    )

    if past_due:
        logger.warning(
            f"Account {account_id} has past due requirements: {past_due}"
        )

    # Find wallet by Stripe account ID
    wallet = wallet_crud.get_by_stripe_account_id(session, stripe_account_id=account_id)
    wallet_updated = False

    if wallet:
        previous_onboarding_complete = wallet.stripe_onboarding_complete
        previous_is_active = wallet.is_active

        # Update wallet.stripe_onboarding_complete based on charges_enabled
        wallet.stripe_onboarding_complete = charges_enabled

        # Update wallet.is_active based on payouts_enabled
        wallet.is_active = payouts_enabled

        wallet.updated_at = datetime.now(UTC)
        session.add(wallet)
        session.commit()
        wallet_updated = True

        # If onboarding just completed, notify user
        if charges_enabled and not previous_onboarding_complete:
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="account_onboarding_complete",
                title="Account Setup Complete",
                message="Your account setup is complete. You can now receive payments.",
                data={
                    "stripe_account_id": account_id,
                    "charges_enabled": charges_enabled,
                    "payouts_enabled": payouts_enabled,
                },
            )
            logger.info(f"Wallet {wallet.id} onboarding completed, user notified")

        # If account was deactivated (payouts disabled), notify user
        if not payouts_enabled and previous_is_active:
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="account_payouts_disabled",
                title="Account Payouts Disabled",
                message="Your account payouts have been disabled. Please update your account information to continue receiving payments.",
                data={
                    "stripe_account_id": account_id,
                    "currently_due": currently_due,
                    "past_due": past_due,
                },
            )
            logger.warning(f"Wallet {wallet.id} payouts disabled, user notified")

        # If there are past due requirements, notify user
        if past_due:
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="account_requirements_past_due",
                title="Action Required: Account Information",
                message="Your account has past due requirements that need to be completed.",
                data={
                    "stripe_account_id": account_id,
                    "past_due": past_due,
                },
            )

        logger.info(
            f"Wallet {wallet.id} updated: "
            f"onboarding_complete={charges_enabled}, is_active={payouts_enabled}"
        )
    else:
        logger.warning(
            f"No wallet found for Stripe account {account_id}"
        )

    return {
        "action": "account.updated",
        "account_id": account_id,
        "charges_enabled": charges_enabled,
        "payouts_enabled": payouts_enabled,
        "details_submitted": details_submitted,
        "currently_due": currently_due,
        "eventually_due": eventually_due,
        "past_due": past_due,
        "wallet_updated": wallet_updated,
    }


async def handle_charge_dispute_created(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle charge.dispute.created event.

    This event is sent when a customer disputes a charge.
    Use this to respond to disputes and notify relevant parties.
    """
    stripe_dispute = event_data.get("object", {})
    dispute_id = stripe_dispute.get("id")
    charge_id = stripe_dispute.get("charge")
    amount = stripe_dispute.get("amount", 0)
    currency = stripe_dispute.get("currency", "")
    reason = stripe_dispute.get("reason", "unknown")
    dispute_status = stripe_dispute.get("status", "unknown")
    evidence_details = stripe_dispute.get("evidence_details", {})
    due_by = evidence_details.get("due_by")
    _metadata = stripe_dispute.get("metadata", {})

    logger.warning(
        f"Dispute created: {dispute_id} for charge {charge_id}, "
        f"amount: {amount} {currency.upper()}, "
        f"reason: {reason}, "
        f"evidence due by: {due_by}"
    )

    amount_decimal = Decimal(str(amount)) / Decimal("100")
    db_dispute = None
    funds_moved_to_escrow = False

    # Try to find the related transaction by charge_id (stored in metadata or via payment_intent)
    # First, look for transaction with matching stripe_payment_intent_id
    payment_intent_id = stripe_dispute.get("payment_intent")
    db_transaction = None

    if payment_intent_id:
        db_transaction = session.exec(
            select(Transaction).where(
                Transaction.stripe_payment_intent_id == payment_intent_id
            )
        ).first()

    if db_transaction:
        # Get the wallet and related shift info
        wallet = session.get(Wallet, db_transaction.wallet_id)
        shift_id = db_transaction.related_shift_id

        if wallet and shift_id:
            # Create Dispute record in database
            # For Stripe disputes, we may not have a clear "against_user"
            # Using the company (wallet owner) as the involved party
            db_dispute = dispute_crud.create(
                session,
                shift_id=shift_id,
                raised_by_user_id=wallet.user_id,  # The affected party
                against_user_id=wallet.user_id,  # Platform dispute - same party
                amount_disputed=amount_decimal,
                reason=f"Stripe Dispute ({reason}): {dispute_id}",
                evidence=f"Stripe dispute ID: {dispute_id}\nCharge ID: {charge_id}\nReason: {reason}\nEvidence due by: {due_by}",
                stripe_dispute_id=dispute_id,
            )

            # Move funds to escrow (increase reserved balance)
            # This prevents the disputed funds from being withdrawn
            if wallet.available_balance >= amount_decimal:
                wallet.reserved_balance += amount_decimal
                wallet.updated_at = datetime.now(UTC)
                session.add(wallet)
                session.commit()
                funds_moved_to_escrow = True

                logger.info(
                    f"Moved {amount_decimal} to escrow for wallet {wallet.id} "
                    f"due to dispute {dispute_id}"
                )
            else:
                logger.warning(
                    f"Insufficient balance to escrow disputed amount {amount_decimal} "
                    f"for wallet {wallet.id}"
                )

            # Notify the wallet owner (company)
            notification_crud.create_notification(
                session,
                user_id=wallet.user_id,
                type="charge_dispute_created",
                title="Payment Dispute Received",
                message=f"A dispute for {amount_decimal:.2f} {currency.upper()} has been filed. Reason: {reason}. Please provide evidence by the deadline.",
                data={
                    "stripe_dispute_id": dispute_id,
                    "charge_id": charge_id,
                    "amount": str(amount_decimal),
                    "currency": currency,
                    "reason": reason,
                    "evidence_due_by": due_by,
                    "internal_dispute_id": db_dispute.id if db_dispute else None,
                },
            )

            # If there's a related shift, try to notify the worker too
            if shift_id:
                from app.models.application import Application, ApplicationStatus

                accepted_app = session.exec(
                    select(Application).where(
                        Application.shift_id == shift_id,
                        Application.status == ApplicationStatus.ACCEPTED,
                    )
                ).first()

                if accepted_app:
                    notification_crud.create_notification(
                        session,
                        user_id=accepted_app.applicant_id,
                        type="charge_dispute_created",
                        title="Payment Dispute Notice",
                        message=f"A payment dispute has been filed for a shift you worked. Amount: {amount_decimal:.2f} {currency.upper()}. Our team is reviewing the case.",
                        data={
                            "stripe_dispute_id": dispute_id,
                            "shift_id": shift_id,
                            "amount": str(amount_decimal),
                            "internal_dispute_id": db_dispute.id if db_dispute else None,
                        },
                    )

            logger.info(
                f"Created internal dispute record {db_dispute.id if db_dispute else 'N/A'} "
                f"for Stripe dispute {dispute_id}"
            )
    else:
        logger.warning(
            f"Could not find related transaction for dispute {dispute_id} "
            f"(payment_intent: {payment_intent_id})"
        )

    return {
        "action": "charge.dispute.created",
        "dispute_id": dispute_id,
        "charge_id": charge_id,
        "amount": amount,
        "currency": currency,
        "reason": reason,
        "status": dispute_status,
        "evidence_due_by": due_by,
        "internal_dispute_created": db_dispute is not None,
        "internal_dispute_id": db_dispute.id if db_dispute else None,
        "funds_moved_to_escrow": funds_moved_to_escrow,
    }


async def handle_charge_dispute_closed(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle charge.dispute.closed event.

    This event is sent when a dispute is closed (won, lost, or withdrawn).
    Use this to resolve internal disputes and release/transfer escrowed funds.

    Dispute statuses:
    - won: Merchant won the dispute (funds returned to merchant)
    - lost: Customer won the dispute (funds go to customer)
    - warning_closed: Early fraud warning closed without action needed
    """
    stripe_dispute = event_data.get("object", {})
    dispute_id = stripe_dispute.get("id")
    charge_id = stripe_dispute.get("charge")
    amount = stripe_dispute.get("amount", 0)
    currency = stripe_dispute.get("currency", "")
    reason = stripe_dispute.get("reason", "unknown")
    dispute_status = stripe_dispute.get("status", "unknown")
    payment_intent_id = stripe_dispute.get("payment_intent")

    logger.info(
        f"Dispute closed: {dispute_id} for charge {charge_id}, "
        f"status: {dispute_status}, "
        f"amount: {amount} {currency.upper()}, "
        f"reason: {reason}"
    )

    amount_decimal = Decimal(str(amount)) / Decimal("100")
    internal_dispute_resolved = False
    escrow_released = False
    funds_transferred = False

    # Find the internal dispute record by Stripe dispute ID
    db_dispute = dispute_crud.get_by_stripe_dispute_id(session, stripe_dispute_id=dispute_id)

    if db_dispute:
        # Resolve the internal dispute based on Stripe outcome
        dispute_crud.resolve_by_stripe_outcome(
            session,
            dispute_id=db_dispute.id,
            stripe_status=dispute_status,
            resolution_notes=f"Stripe dispute {dispute_id} closed with status: {dispute_status}",
        )
        internal_dispute_resolved = True

        # Find the related transaction to get the wallet
        db_transaction = None
        if payment_intent_id:
            db_transaction = session.exec(
                select(Transaction).where(
                    Transaction.stripe_payment_intent_id == payment_intent_id
                )
            ).first()

        if db_transaction:
            wallet = session.get(Wallet, db_transaction.wallet_id)

            if wallet:
                if dispute_status == "won":
                    # Merchant won - release funds from escrow back to available balance
                    # The funds were already in the wallet, just remove from reserved
                    if wallet.reserved_balance >= amount_decimal:
                        wallet.reserved_balance -= amount_decimal
                        wallet.updated_at = datetime.now(UTC)
                        session.add(wallet)
                        session.commit()
                        escrow_released = True

                        logger.info(
                            f"Released {amount_decimal} from escrow for wallet {wallet.id} "
                            f"(dispute won)"
                        )

                    # Notify user of successful dispute resolution
                    notification_crud.create_notification(
                        session,
                        user_id=wallet.user_id,
                        type="charge_dispute_won",
                        title="Dispute Won",
                        message=f"Good news! The dispute for {amount_decimal:.2f} {currency.upper()} has been resolved in your favor. The funds are now available in your wallet.",
                        data={
                            "stripe_dispute_id": dispute_id,
                            "amount": str(amount_decimal),
                            "currency": currency,
                            "internal_dispute_id": db_dispute.id,
                        },
                    )

                elif dispute_status == "lost":
                    # Customer won - deduct funds from wallet
                    # Remove from both reserved (escrow) and total balance
                    if wallet.reserved_balance >= amount_decimal:
                        wallet.reserved_balance -= amount_decimal
                    wallet.balance -= amount_decimal
                    wallet.updated_at = datetime.now(UTC)
                    session.add(wallet)
                    session.commit()
                    funds_transferred = True

                    logger.warning(
                        f"Deducted {amount_decimal} from wallet {wallet.id} "
                        f"due to lost dispute {dispute_id}"
                    )

                    # Notify user of lost dispute
                    notification_crud.create_notification(
                        session,
                        user_id=wallet.user_id,
                        type="charge_dispute_lost",
                        title="Dispute Lost",
                        message=f"Unfortunately, the dispute for {amount_decimal:.2f} {currency.upper()} was not resolved in your favor. The funds have been deducted from your wallet.",
                        data={
                            "stripe_dispute_id": dispute_id,
                            "amount": str(amount_decimal),
                            "currency": currency,
                            "internal_dispute_id": db_dispute.id,
                        },
                    )

                else:
                    # Other status (warning_closed, etc.) - just release escrow
                    if wallet.reserved_balance >= amount_decimal:
                        wallet.reserved_balance -= amount_decimal
                        wallet.updated_at = datetime.now(UTC)
                        session.add(wallet)
                        session.commit()
                        escrow_released = True

                    notification_crud.create_notification(
                        session,
                        user_id=wallet.user_id,
                        type="charge_dispute_closed",
                        title="Dispute Closed",
                        message=f"The dispute for {amount_decimal:.2f} {currency.upper()} has been closed. Status: {dispute_status}",
                        data={
                            "stripe_dispute_id": dispute_id,
                            "amount": str(amount_decimal),
                            "currency": currency,
                            "status": dispute_status,
                            "internal_dispute_id": db_dispute.id,
                        },
                    )

                # Notify worker if there's a related shift
                shift_id = db_transaction.related_shift_id
                if shift_id:
                    from app.models.application import Application, ApplicationStatus

                    accepted_app = session.exec(
                        select(Application).where(
                            Application.shift_id == shift_id,
                            Application.status == ApplicationStatus.ACCEPTED,
                        )
                    ).first()

                    if accepted_app:
                        notification_crud.create_notification(
                            session,
                            user_id=accepted_app.applicant_id,
                            type="charge_dispute_closed",
                            title="Dispute Resolved",
                            message=f"The payment dispute for a shift you worked has been resolved. Final status: {dispute_status}",
                            data={
                                "stripe_dispute_id": dispute_id,
                                "shift_id": shift_id,
                                "status": dispute_status,
                            },
                        )

        logger.info(
            f"Resolved internal dispute {db_dispute.id} for Stripe dispute {dispute_id}"
        )
    else:
        logger.warning(
            f"No internal dispute found for Stripe dispute {dispute_id}"
        )

    return {
        "action": "charge.dispute.closed",
        "dispute_id": dispute_id,
        "charge_id": charge_id,
        "amount": amount,
        "currency": currency,
        "status": dispute_status,
        "reason": reason,
        "internal_dispute_resolved": internal_dispute_resolved,
        "internal_dispute_id": db_dispute.id if db_dispute else None,
        "escrow_released": escrow_released,
        "funds_transferred": funds_transferred,
    }


# Map of event types to their handlers
EVENT_HANDLERS = {
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payment_intent.payment_failed": handle_payment_intent_failed,
    "payout.paid": handle_payout_paid,
    "payout.failed": handle_payout_failed,
    "account.updated": handle_account_updated,
    "charge.dispute.created": handle_charge_dispute_created,
    "charge.dispute.closed": handle_charge_dispute_closed,
}


# =========================================================================
# Webhook Endpoint
# =========================================================================


@router.post("/stripe", status_code=status.HTTP_200_OK)
@limiter.limit(WEBHOOK_RATE_LIMIT)
async def stripe_webhook(
    request: Request,
    session: SessionDep,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
) -> dict[str, Any]:
    """
    Handle incoming Stripe webhooks.

    This endpoint receives webhook events from Stripe and processes them
    according to their type. All events are logged for auditing.

    Security features:
    - Webhook signature verification (rejects invalid signatures with 400)
    - Idempotency handling (prevents duplicate event processing)

    Supported events:
    - payment_intent.succeeded: Payment completed successfully (top-up)
    - payment_intent.payment_failed: Payment failed (triggers grace period)
    - payout.paid: Payout sent to bank successfully
    - payout.failed: Payout failed (returns funds to wallet)
    - account.updated: Connect account status changed
    - charge.dispute.created: Customer disputed a charge (holds funds in escrow)
    - charge.dispute.closed: Dispute resolved (releases/transfers escrow funds)
    """
    # Get the raw body for signature verification
    payload = await request.body()

    # Log the incoming webhook
    logger.info(f"Received Stripe webhook, signature present: {bool(stripe_signature)}")

    # Verify the webhook signature
    try:
        event = stripe_service.verify_webhook_signature(
            payload=payload,
            signature=stripe_signature,
            webhook_secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except StripeServiceError as e:
        logger.error(f"Webhook signature verification failed: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook signature verification failed: {e.message}",
        ) from e

    # Extract event data
    event_id = event.id
    event_type = event.type
    event_data = event.data
    account_id = getattr(event, "account", None)

    # Log the event
    logger.info(
        f"Processing webhook event: {event_type} (ID: {event_id})"
        + (f" for account {account_id}" if account_id else "")
    )

    # Idempotency check: Skip if already processed
    if is_event_already_processed(session, event_id):
        logger.info(f"Event {event_id} already processed, skipping (idempotency)")
        return {"received": True}

    # Process the event
    handler = EVENT_HANDLERS.get(event_type)
    result: dict[str, Any] = {}

    if handler:
        try:
            result = await handler(session, event_data)
            logger.info(f"Successfully processed event: {event_type}")

            # Mark event as processed for idempotency
            mark_event_processed(session, event_id, event_type, result)
        except Exception as e:
            logger.exception(f"Error processing event {event_type}: {e}")
            # Don't raise - return 200 to prevent Stripe from retrying
            # but log the error for investigation
            result = {
                "action": event_type,
                "error": str(e),
                "processed": False,
            }
            # Still mark as processed to prevent infinite retries on permanent errors
            # For transient errors, you may want different handling
            mark_event_processed(session, event_id, event_type, result)
    else:
        # Log unhandled events for visibility
        logger.info(f"Unhandled event type: {event_type}")
        result = {
            "action": event_type,
            "handled": False,
            "message": f"Event type '{event_type}' is not handled",
        }
        # Mark unhandled events as processed too (they're not errors)
        mark_event_processed(session, event_id, event_type, result)

    # Always return 200 to acknowledge receipt
    # Stripe will retry if we return an error status
    return {"received": True}


@router.get("/stripe/health", status_code=status.HTTP_200_OK)
@limiter.limit(DEFAULT_RATE_LIMIT)
async def webhook_health_check(request: Request) -> dict[str, Any]:
    """
    Health check endpoint for Stripe webhook configuration.

    Returns the current webhook configuration status (without secrets).
    """
    return {
        "status": "healthy",
        "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
        "supported_events": list(EVENT_HANDLERS.keys()),
    }
