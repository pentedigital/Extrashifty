"""Notification endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActiveUserDep, SessionDep
from app.crud.notification import notification as notification_crud
from app.crud.notification import notification_preference as preference_crud
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
)

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    unread_only: bool = Query(False, description="Only return unread notifications"),
) -> dict:
    """
    Get current user's notifications.

    Returns paginated list of notifications with total and unread counts.
    """
    if unread_only:
        notifications = notification_crud.get_by_user(
            session, user_id=current_user.id, skip=skip, limit=limit, unread_only=True
        )
        total = notification_crud.get_count_by_user(session, user_id=current_user.id, unread_only=True)
        unread_count = total
    else:
        notifications, total, unread_count = notification_crud.get_by_user_with_count(
            session, user_id=current_user.id, skip=skip, limit=limit
        )

    return {
        "items": notifications,
        "total": total,
        "unread_count": unread_count,
    }


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    session: SessionDep,
    current_user: ActiveUserDep,
    notification_id: int,
) -> NotificationRead:
    """Mark a notification as read."""
    notification = notification_crud.mark_as_read(
        session, notification_id=notification_id, user_id=current_user.id
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification


@router.patch("/read-all", response_model=dict)
def mark_all_notifications_read(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """Mark all notifications as read."""
    count = notification_crud.mark_all_as_read(session, user_id=current_user.id)
    return {"message": f"Marked {count} notifications as read", "count": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    session: SessionDep,
    current_user: ActiveUserDep,
    notification_id: int,
) -> None:
    """Delete a notification."""
    deleted = notification_crud.delete_by_user(
        session, notification_id=notification_id, user_id=current_user.id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )


@router.get("/preferences", response_model=NotificationPreferenceRead)
def get_notification_preferences(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> NotificationPreferenceRead:
    """Get current user's notification preferences."""
    preferences = preference_crud.get_or_create(session, user_id=current_user.id)
    return preferences


@router.patch("/preferences", response_model=NotificationPreferenceRead)
def update_notification_preferences(
    session: SessionDep,
    current_user: ActiveUserDep,
    preferences_in: NotificationPreferenceUpdate,
) -> NotificationPreferenceRead:
    """Update current user's notification preferences."""
    preferences = preference_crud.update(
        session, user_id=current_user.id, obj_in=preferences_in
    )
    return preferences
