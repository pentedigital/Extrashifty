"""Services module for ExtraShifty business logic."""

from .appeal_service import (
    AppealService,
    AppealServiceError,
    AppealWindowClosedError,
    DuplicateAppealError,
    InvalidAppealError,
    appeal_service,
)
from .dispute_service import DisputeService, dispute_service
from .email_service import EmailService, email_service
from .escrow_service import EscrowService, escrow_service
from .gdpr_service import GDPRService, GDPRServiceError
from .invoice_service import (
    InvoiceService,
    InvoiceServiceError,
    get_invoice_service,
)
from .payment_service import (
    InsufficientFundsError,
    PaymentError,
    PaymentService,
)
from .tax_service import TaxError, TaxService, get_tax_service
from .verification_service import VerificationService, verification_service

__all__ = [
    # Appeal
    "AppealService",
    "AppealServiceError",
    "AppealWindowClosedError",
    "DuplicateAppealError",
    "InvalidAppealError",
    "appeal_service",
    # Payment
    "InsufficientFundsError",
    "PaymentError",
    "PaymentService",
    # Email
    "EmailService",
    "email_service",
    # Invoice
    "InvoiceService",
    "InvoiceServiceError",
    "get_invoice_service",
    # Verification
    "VerificationService",
    "verification_service",
    # Dispute
    "DisputeService",
    "dispute_service",
    # Escrow
    "EscrowService",
    "escrow_service",
    # Tax
    "TaxService",
    "TaxError",
    "get_tax_service",
    # GDPR
    "GDPRService",
    "GDPRServiceError",
]
