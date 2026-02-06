"""Event broadcasting helpers for real-time updates via WebSocket."""

import logging
from typing import Any

logger = logging.getLogger(__name__)


async def broadcast_notification(user_id: int, notification: dict[str, Any]) -> None:
    """
    Send a notification to a specific user via WebSocket.

    Args:
        user_id: The ID of the user to send the notification to
        notification: The notification data to send
    """
    from app.api.v1.endpoints.websocket import manager

    message = {
        "type": "notification",
        "data": notification
    }
    await manager.send_to_user(user_id, message)
    logger.debug(f"Broadcast notification to user {user_id}")


async def broadcast_shift_update(
    shift_id: int,
    update: dict[str, Any],
    user_ids: list[int] | None = None
) -> None:
    """
    Broadcast a shift update to relevant users.

    Args:
        shift_id: The ID of the shift that was updated
        update: The update data to send
        user_ids: Optional list of specific user IDs to notify.
                  If None, the update will be broadcast based on the shift's applicants.
    """
    from app.api.v1.endpoints.websocket import manager

    message = {
        "type": "shift_update",
        "data": {
            "shift_id": shift_id,
            **update
        }
    }

    if user_ids:
        await manager.send_to_users(user_ids, message)
        logger.debug(f"Broadcast shift update for shift {shift_id} to {len(user_ids)} users")
    else:
        # If no specific users provided, broadcast to all connected users
        # In production, you'd want to query for users who applied to this shift
        await manager.broadcast(message)
        logger.debug(f"Broadcast shift update for shift {shift_id} to all users")


async def broadcast_application_update(
    application_id: int,
    shift_id: int,
    update: dict[str, Any],
    applicant_id: int,
    poster_id: int | None = None
) -> None:
    """
    Broadcast an application update to relevant users.

    Args:
        application_id: The ID of the application that was updated
        shift_id: The ID of the shift the application is for
        update: The update data to send
        applicant_id: The ID of the user who applied
        poster_id: The ID of the user who posted the shift (optional)
    """
    from app.api.v1.endpoints.websocket import manager

    message = {
        "type": "application_update",
        "data": {
            "application_id": application_id,
            "shift_id": shift_id,
            **update
        }
    }

    # Send to the applicant
    await manager.send_to_user(applicant_id, message)

    # Also send to the shift poster if provided
    if poster_id and poster_id != applicant_id:
        await manager.send_to_user(poster_id, message)

    logger.debug(f"Broadcast application update for application {application_id}")


async def broadcast_payment_update(user_id: int, payment: dict[str, Any]) -> None:
    """
    Send a payment update to a specific user via WebSocket.

    Args:
        user_id: The ID of the user to send the update to
        payment: The payment data to send
    """
    from app.api.v1.endpoints.websocket import manager

    message = {
        "type": "payment_update",
        "data": payment
    }
    await manager.send_to_user(user_id, message)
    logger.debug(f"Broadcast payment update to user {user_id}")


async def broadcast_to_users(
    user_ids: list[int],
    event_type: str,
    data: dict[str, Any]
) -> None:
    """
    Generic function to broadcast an event to specific users.

    Args:
        user_ids: List of user IDs to send the event to
        event_type: The type of event (e.g., 'notification', 'shift_update')
        data: The event data to send
    """
    from app.api.v1.endpoints.websocket import manager

    message = {
        "type": event_type,
        "data": data
    }
    await manager.send_to_users(user_ids, message)
    logger.debug(f"Broadcast {event_type} to {len(user_ids)} users")


def get_connected_users() -> list[int]:
    """
    Get list of all connected user IDs.

    Returns:
        List of user IDs with active WebSocket connections
    """
    from app.api.v1.endpoints.websocket import manager
    return manager.get_connected_user_ids()


def is_user_online(user_id: int) -> bool:
    """
    Check if a specific user has an active WebSocket connection.

    Args:
        user_id: The ID of the user to check

    Returns:
        True if the user is connected, False otherwise
    """
    from app.api.v1.endpoints.websocket import manager
    return manager.is_user_connected(user_id)
