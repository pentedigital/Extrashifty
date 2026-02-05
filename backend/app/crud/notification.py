"""CRUD operations for Notification and NotificationPreference models."""

from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models.notification import Notification, NotificationPreference
from app.schemas.notification import (
    NotificationCreate,
    NotificationPreferenceUpdate,
    NotificationUpdate,
)


class CRUDNotification(CRUDBase[Notification, NotificationCreate, NotificationUpdate]):
    """CRUD operations for Notification."""

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
    ) -> list[Notification]:
        """Get notifications for a user."""
        statement = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            statement = statement.where(Notification.is_read == False)

        statement = statement.offset(skip).limit(limit).order_by(Notification.created_at.desc())
        return list(db.exec(statement).all())

    def get_count_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        unread_only: bool = False,
    ) -> int:
        """Get notification count for a user."""
        statement = select(func.count(Notification.id)).where(Notification.user_id == user_id)

        if unread_only:
            statement = statement.where(Notification.is_read == False)

        return db.exec(statement).one()

    def get_by_user_with_count(
        self,
        db: Session,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Notification], int, int]:
        """Get notifications for a user with total and unread counts."""
        notifications = self.get_by_user(db, user_id=user_id, skip=skip, limit=limit)
        total = self.get_count_by_user(db, user_id=user_id)
        unread_count = self.get_count_by_user(db, user_id=user_id, unread_only=True)
        return notifications, total, unread_count

    def mark_as_read(
        self,
        db: Session,
        *,
        notification_id: int,
        user_id: int,
    ) -> Notification | None:
        """Mark a notification as read."""
        notification = db.exec(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()

        if notification:
            notification.is_read = True
            db.add(notification)
            db.commit()
            db.refresh(notification)

        return notification

    def mark_all_as_read(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> int:
        """Mark all notifications as read for a user. Returns count of updated notifications."""
        from sqlalchemy import update

        result = db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        db.commit()
        return result.rowcount

    def delete_by_user(
        self,
        db: Session,
        *,
        notification_id: int,
        user_id: int,
    ) -> bool:
        """Delete a notification for a user. Returns True if deleted."""
        notification = db.exec(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        ).first()

        if notification:
            db.delete(notification)
            db.commit()
            return True

        return False

    def create_notification(
        self,
        db: Session,
        *,
        user_id: int,
        type: str,
        title: str,
        message: str,
        data: dict | None = None,
    ) -> Notification:
        """Create a new notification."""
        db_obj = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            data=data,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


class CRUDNotificationPreference:
    """CRUD operations for NotificationPreference."""

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> NotificationPreference | None:
        """Get notification preferences for a user."""
        return db.exec(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        ).first()

    def get_or_create(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> NotificationPreference:
        """Get or create notification preferences for a user."""
        preference = self.get_by_user(db, user_id=user_id)

        if not preference:
            preference = NotificationPreference(user_id=user_id)
            db.add(preference)
            db.commit()
            db.refresh(preference)

        return preference

    def update(
        self,
        db: Session,
        *,
        user_id: int,
        obj_in: NotificationPreferenceUpdate,
    ) -> NotificationPreference:
        """Update notification preferences for a user."""
        preference = self.get_or_create(db, user_id=user_id)

        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preference, field, value)

        db.add(preference)
        db.commit()
        db.refresh(preference)
        return preference


notification = CRUDNotification(Notification)
notification_preference = CRUDNotificationPreference()
