"""CRUD operations for ExtraShifty models."""

from app.crud.application import CRUDApplication, application
from app.crud.base import CRUDBase
from app.crud.notification import (
    CRUDNotification,
    CRUDNotificationPreference,
    notification,
    notification_preference,
)
from app.crud.payment import (
    CRUDDispute,
    CRUDFundsHold,
    CRUDPayout,
    CRUDTransaction,
    dispute,
    funds_hold,
    payout,
    transaction,
)
from app.crud.shift import CRUDShift, shift
from app.crud.user import CRUDUser, user
from app.crud.wallet import (
    CRUDPaymentMethod,
    CRUDWallet,
    payment_method,
    wallet,
)

__all__ = [
    # Base
    "CRUDBase",
    # User
    "CRUDUser",
    "user",
    # Shift
    "CRUDShift",
    "shift",
    # Application
    "CRUDApplication",
    "application",
    # Notification
    "CRUDNotification",
    "CRUDNotificationPreference",
    "notification",
    "notification_preference",
    # Wallet
    "CRUDWallet",
    "CRUDPaymentMethod",
    "wallet",
    "payment_method",
    # Payment/Transaction
    "CRUDTransaction",
    "CRUDFundsHold",
    "CRUDPayout",
    "CRUDDispute",
    "transaction",
    "funds_hold",
    "payout",
    "dispute",
]
