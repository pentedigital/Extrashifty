"""Database models for ExtraShifty."""

from .agency import (
    AgencyClient,
    AgencyClientInvoice,
    AgencyMode,
    AgencyModeChangeRequest,
    AgencyProfile,
    AgencyShift,
    AgencyShiftAssignment,
    AgencyStaffMember,
    PayrollEntry,
    StaffInvitation,
)
from .appeal import (
    Appeal,
    AppealStatus,
    AppealType,
    EmergencyType,
    EmergencyWaiver,
)
from .application import Application, ApplicationStatus
from .base import TimestampMixin
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
from .penalty import (
    NegativeBalance,
    Penalty,
    PenaltyAppeal,
    PenaltyStatus,
    Strike,
    UserSuspension,
)
from .profile import ClockRecord, CompanyProfile, StaffProfile, Venue
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

__all__ = [
    # Agency
    "AgencyClient",
    "AgencyClientInvoice",
    "AgencyMode",
    "AgencyModeChangeRequest",
    "AgencyProfile",
    "AgencyShift",
    "AgencyShiftAssignment",
    "AgencyStaffMember",
    "PayrollEntry",
    "StaffInvitation",
    # Appeal
    "Appeal",
    "AppealStatus",
    "AppealType",
    "EmergencyType",
    "EmergencyWaiver",
    # User
    "User",
    "UserType",
    # Profile
    "StaffProfile",
    "CompanyProfile",
    "ClockRecord",
    "Venue",
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
    "PenaltyAppeal",
    "Strike",
    "UserSuspension",
    "NegativeBalance",
    # Base/Mixins
    "TimestampMixin",
]
