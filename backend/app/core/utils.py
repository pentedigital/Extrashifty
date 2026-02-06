"""Shared utility functions for ExtraShifty."""

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal


def quantize_amount(amount: Decimal) -> Decimal:
    """Round decimal to 2 decimal places for currency."""
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_shift_cost(hours: Decimal, hourly_rate: Decimal) -> Decimal:
    """Calculate the total cost of a shift.

    Args:
        hours: Number of hours worked
        hourly_rate: Rate per hour

    Returns:
        Total shift cost rounded to 2 decimal places
    """
    return (hours * hourly_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_days_until(deadline: datetime) -> float:
    """Calculate days until a deadline from now."""
    delta = deadline - datetime.utcnow()
    return delta.total_seconds() / (24 * 3600)
