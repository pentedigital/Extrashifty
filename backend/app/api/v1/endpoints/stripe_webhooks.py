"""Stripe webhook endpoints for ExtraShifty."""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.api.deps import SessionDep
from app.core.config import settings
from app.services.stripe_service import StripeServiceError, stripe_service

logger = logging.getLogger(__name__)

router = APIRouter()


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

    # TODO: Update transaction status in database
    # TODO: Send confirmation notification to user
    # TODO: Trigger any post-payment workflows

    return {
        "action": "payment_intent.succeeded",
        "payment_intent_id": payment_intent_id,
        "amount": amount,
        "currency": currency,
        "metadata": metadata,
    }


async def handle_payment_intent_failed(
    session: Any,
    event_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Handle payment_intent.failed event.

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

    # TODO: Update transaction status in database
    # TODO: Notify user of failed payment
    # TODO: Trigger retry logic if appropriate

    return {
        "action": "payment_intent.failed",
        "payment_intent_id": payment_intent_id,
        "error_code": error_code,
        "error_message": error_message,
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

    # TODO: Update withdrawal transaction status to completed
    # TODO: Notify user that payout has been sent

    return {
        "action": "payout.paid",
        "payout_id": payout_id,
        "amount": amount,
        "currency": currency,
        "arrival_date": arrival_date,
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

    # TODO: Refund the amount back to user's wallet balance
    # TODO: Update withdrawal transaction status to failed
    # TODO: Notify user of failed payout with reason

    return {
        "action": "payout.failed",
        "payout_id": payout_id,
        "amount": amount,
        "currency": currency,
        "failure_code": failure_code,
        "failure_message": failure_message,
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

    # TODO: Update Connect account status in database
    # TODO: If charges/payouts newly enabled, notify user
    # TODO: If requirements past due, prompt user to complete onboarding

    return {
        "action": "account.updated",
        "account_id": account_id,
        "charges_enabled": charges_enabled,
        "payouts_enabled": payouts_enabled,
        "details_submitted": details_submitted,
        "currently_due": currently_due,
        "eventually_due": eventually_due,
        "past_due": past_due,
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
    dispute = event_data.get("object", {})
    dispute_id = dispute.get("id")
    charge_id = dispute.get("charge")
    amount = dispute.get("amount", 0)
    currency = dispute.get("currency", "")
    reason = dispute.get("reason", "unknown")
    status = dispute.get("status", "unknown")
    evidence_details = dispute.get("evidence_details", {})
    due_by = evidence_details.get("due_by")

    logger.warning(
        f"Dispute created: {dispute_id} for charge {charge_id}, "
        f"amount: {amount} {currency.upper()}, "
        f"reason: {reason}, "
        f"evidence due by: {due_by}"
    )

    # TODO: Create dispute record in database
    # TODO: Notify platform admin of new dispute
    # TODO: Gather evidence for dispute response
    # TODO: If applicable, notify connected account

    return {
        "action": "charge.dispute.created",
        "dispute_id": dispute_id,
        "charge_id": charge_id,
        "amount": amount,
        "currency": currency,
        "reason": reason,
        "status": status,
        "evidence_due_by": due_by,
    }


# Map of event types to their handlers
EVENT_HANDLERS = {
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payment_intent.failed": handle_payment_intent_failed,
    "payout.paid": handle_payout_paid,
    "payout.failed": handle_payout_failed,
    "account.updated": handle_account_updated,
    "charge.dispute.created": handle_charge_dispute_created,
}


# =========================================================================
# Webhook Endpoint
# =========================================================================


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    session: SessionDep,
    stripe_signature: str = Header(..., alias="Stripe-Signature"),
) -> dict[str, Any]:
    """
    Handle incoming Stripe webhooks.

    This endpoint receives webhook events from Stripe and processes them
    according to their type. All events are logged for auditing.

    The endpoint verifies the webhook signature to ensure the request
    came from Stripe and hasn't been tampered with.

    Supported events:
    - payment_intent.succeeded: Payment completed successfully
    - payment_intent.failed: Payment failed
    - payout.paid: Payout sent to bank successfully
    - payout.failed: Payout failed
    - account.updated: Connect account status changed
    - charge.dispute.created: Customer disputed a charge
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
        )

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

    # Process the event
    handler = EVENT_HANDLERS.get(event_type)
    result: dict[str, Any] = {}

    if handler:
        try:
            result = await handler(session, event_data)
            logger.info(f"Successfully processed event: {event_type}")
        except Exception as e:
            logger.exception(f"Error processing event {event_type}: {e}")
            # Don't raise - return 200 to prevent Stripe from retrying
            # but log the error for investigation
            result = {
                "action": event_type,
                "error": str(e),
                "processed": False,
            }
    else:
        # Log unhandled events for visibility
        logger.info(f"Unhandled event type: {event_type}")
        result = {
            "action": event_type,
            "handled": False,
            "message": f"Event type '{event_type}' is not handled",
        }

    # Always return 200 to acknowledge receipt
    # Stripe will retry if we return an error status
    return {
        "received": True,
        "event_id": event_id,
        "event_type": event_type,
        "processed_at": datetime.utcnow().isoformat(),
        "result": result,
    }


@router.get("/stripe/health", status_code=status.HTTP_200_OK)
async def webhook_health_check() -> dict[str, Any]:
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
