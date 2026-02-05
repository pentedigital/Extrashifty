"""CRUD operations for ExtraShifty models."""

from app.crud.application import CRUDApplication, application
from app.crud.base import CRUDBase
from app.crud.notification import (
    CRUDNotification,
    CRUDNotificationPreference,
    notification,
    notification_preference,
)
from app.crud.shift import CRUDShift, shift
from app.crud.user import CRUDUser, user
from app.crud.wallet import (
    CRUDPaymentMethod,
    CRUDTransaction,
    CRUDWallet,
    payment_method,
    transaction,
    wallet,
)

__all__ = [
    "CRUDBase",
    "CRUDUser",
    "user",
    "CRUDShift",
    "shift",
    "CRUDApplication",
    "application",
    "CRUDNotification",
    "CRUDNotificationPreference",
    "notification",
    "notification_preference",
    "CRUDWallet",
    "CRUDTransaction",
    "CRUDPaymentMethod",
    "wallet",
    "transaction",
    "payment_method",
]
