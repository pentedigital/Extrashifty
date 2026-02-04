"""Email module for ExtraShifty."""

from .send import (
    send_email,
    send_password_reset_email,
    send_shift_application_email,
    send_shift_assigned_email,
    send_welcome_email,
)

__all__ = [
    "send_email",
    "send_welcome_email",
    "send_password_reset_email",
    "send_shift_application_email",
    "send_shift_assigned_email",
]
