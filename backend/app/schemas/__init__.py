"""Pydantic schemas for ExtraShifty."""

from .application import ApplicationCreate, ApplicationRead, ApplicationUpdate
from .notification import (
    NotificationCreate,
    NotificationListResponse,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    NotificationUpdate,
)
from .review import ReviewCreate, ReviewListResponse, ReviewRead, ReviewStats
from .shift import ShiftCreate, ShiftRead, ShiftUpdate
from .token import Token, TokenPayload
from .user import UserCreate, UserLogin, UserRead, UserUpdate
from .wallet import (
    PaymentMethodCreate,
    PaymentMethodListResponse,
    PaymentMethodRead,
    TopUpRequest,
    TopUpResponse,
    TransactionListResponse,
    TransactionRead,
    WalletRead,
    WithdrawRequest,
    WithdrawResponse,
)

__all__ = [
    "ApplicationCreate",
    "ApplicationRead",
    "ApplicationUpdate",
    "NotificationCreate",
    "NotificationListResponse",
    "NotificationPreferenceRead",
    "NotificationPreferenceUpdate",
    "NotificationRead",
    "NotificationUpdate",
    "PaymentMethodCreate",
    "PaymentMethodListResponse",
    "PaymentMethodRead",
    "ReviewCreate",
    "ReviewListResponse",
    "ReviewRead",
    "ReviewStats",
    "ShiftCreate",
    "ShiftRead",
    "ShiftUpdate",
    "Token",
    "TokenPayload",
    "TopUpRequest",
    "TopUpResponse",
    "TransactionListResponse",
    "TransactionRead",
    "UserCreate",
    "UserLogin",
    "UserRead",
    "UserUpdate",
    "WalletRead",
    "WithdrawRequest",
    "WithdrawResponse",
]
