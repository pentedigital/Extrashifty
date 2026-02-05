"""Database models for ExtraShifty."""

from .agency import AgencyMode, AgencyModeChangeRequest, AgencyProfile
from .appeal import (
    Appeal,
    AppealStatus,
    AppealType,
    EmergencyType,
    EmergencyWaiver,
)
from .application import Application, ApplicationStatus
from .gdpr import DeletionRequest, DeletionRequestStatus
from .invoice import Invoice, InvoiceStatus, InvoiceType
from .notification import Notification, NotificationPreference
from .payment import (
    Dispute,
    DisputeStatus,
    FundsHold,
    FundsHoldStatus,
    Payout,
    PayoutStatus,
    PayoutType,
    ProcessedWebhookEvent,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from .review import Review, ReviewType
from .shift import Shift, ShiftStatus
from .tax import TaxDocument, TaxFormStatus, TaxFormType, TaxYear
from .user import User, UserType
from .wallet import (
    PaymentMethod,
    PaymentMethodType,
    Wallet,
    WalletType,
)
from .penalty import (
    AppealStatus as PenaltyAppealStatus,
    NegativeBalance,
    Penalty,
    PenaltyAppeal,
    PenaltyStatus,
    Strike,
    UserSuspension,
)

__all__ = [
    # Agency
    "AgencyMode",
    "AgencyModeChangeRequest",
    "AgencyProfile",
    # Appeal
    "Appeal",
    "AppealStatus",
    "AppealType",
    "EmergencyType",
    "EmergencyWaiver",
    # User
    "User",
    "UserType",
    # Shift
    "Shift",
    "ShiftStatus",
    # Application
    "Application",
    "ApplicationStatus",
    # Notification
    "Notification",
    "NotificationPreference",
    # Review
    "Review",
    "ReviewType",
    # Wallet
    "Wallet",
    "WalletType",
    "PaymentMethod",
    "PaymentMethodType",
    # Payment/Transaction
    "Transaction",
    "TransactionType",
    "TransactionStatus",
    "FundsHold",
    "FundsHoldStatus",
    "Payout",
    "PayoutType",
    "PayoutStatus",
    "Dispute",
    "DisputeStatus",
    "ProcessedWebhookEvent",
    # Invoice
    "Invoice",
    "InvoiceType",
    "InvoiceStatus",
    # GDPR
    "DeletionRequest",
    "DeletionRequestStatus",
    # Tax
    "TaxYear",
    "TaxDocument",
    "TaxFormType",
    "TaxFormStatus",
    # Penalty
    "Penalty",
    "PenaltyStatus",
    "PenaltyAppealStatus",
    "PenaltyAppeal",
    "Strike",
    "UserSuspension",
    "NegativeBalance",
]
