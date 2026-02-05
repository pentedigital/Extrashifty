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
from .payment import (
    AutoTopupConfigRequest,
    AutoTopupConfigResponse,
    BalanceResponse,
    CancellationPolicy,
    CancellationRequest,
    CancellationResponse,
    CancelledBy,
    InsufficientFundsResponse,
    PayoutHistoryItem,
    PayoutHistoryResponse,
    PayoutRequest,
    PayoutResponse,
    PayoutScheduleItem,
    PayoutScheduleResponse,
    PayoutStatus,
    ReserveRequest,
    ReserveResponse,
    SettlementResponse,
    SettlementSplit,
    TopupRequest,
    TopupResponse,
)
from .dispute import (
    DisputeCreate,
    DisputeListResponse,
    DisputeResolution,
    DisputeResolutionResponse,
    DisputeResolutionType,
    DisputeResponse,
    DisputeUpdate,
    EvidenceCreate,
    EvidenceResponse,
)
from .review import ReviewCreate, ReviewListResponse, ReviewRead, ReviewStats
from .shift import ShiftCreate, ShiftRead, ShiftUpdate
from .token import Token, TokenPayload
from .user import UserCreate, UserLogin, UserRead, UserUpdate
from .verification import (
    HoursAdjustmentRequest,
    PendingShiftResponse,
    PendingShiftsListResponse,
    ShiftApprovalRequest,
    ShiftApprovalResponse,
    ShiftRejectionRequest,
    ShiftRejectionResponse,
)
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
    # Application
    "ApplicationCreate",
    "ApplicationRead",
    "ApplicationUpdate",
    # Notification
    "NotificationCreate",
    "NotificationListResponse",
    "NotificationPreferenceRead",
    "NotificationPreferenceUpdate",
    "NotificationRead",
    "NotificationUpdate",
    # Payment flow
    "AutoTopupConfigRequest",
    "AutoTopupConfigResponse",
    "BalanceResponse",
    "CancellationPolicy",
    "CancellationRequest",
    "CancellationResponse",
    "CancelledBy",
    "InsufficientFundsResponse",
    "PayoutHistoryItem",
    "PayoutHistoryResponse",
    "PayoutRequest",
    "PayoutResponse",
    "PayoutScheduleItem",
    "PayoutScheduleResponse",
    "PayoutStatus",
    "ReserveRequest",
    "ReserveResponse",
    "SettlementResponse",
    "SettlementSplit",
    "TopupRequest",
    "TopupResponse",
    # Wallet (legacy)
    "PaymentMethodCreate",
    "PaymentMethodListResponse",
    "PaymentMethodRead",
    "TopUpRequest",
    "TopUpResponse",
    "TransactionListResponse",
    "TransactionRead",
    "WalletRead",
    "WithdrawRequest",
    "WithdrawResponse",
    # Review
    "ReviewCreate",
    "ReviewListResponse",
    "ReviewRead",
    "ReviewStats",
    # Shift
    "ShiftCreate",
    "ShiftRead",
    "ShiftUpdate",
    # Token
    "Token",
    "TokenPayload",
    # User
    "UserCreate",
    "UserLogin",
    "UserRead",
    "UserUpdate",
    # Verification
    "HoursAdjustmentRequest",
    "PendingShiftResponse",
    "PendingShiftsListResponse",
    "ShiftApprovalRequest",
    "ShiftApprovalResponse",
    "ShiftRejectionRequest",
    "ShiftRejectionResponse",
    # Dispute
    "DisputeCreate",
    "DisputeListResponse",
    "DisputeResolution",
    "DisputeResolutionResponse",
    "DisputeResolutionType",
    "DisputeResponse",
    "DisputeUpdate",
    "EvidenceCreate",
    "EvidenceResponse",
]
