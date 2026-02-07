"""Admin endpoints for ExtraShifty platform management."""

import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel
from sqlmodel import func, select

from app.api.deps import AdminUserDep, SessionDep
from app.core.rate_limit import ADMIN_RATE_LIMIT, limiter
from app.core.cache import get_cached, set_cached
from app.models.payment import Payout, PayoutStatus, Transaction, TransactionStatus, TransactionType
from app.models.shift import Shift, ShiftStatus
from app.models.user import User, UserType

router = APIRouter()
logger = logging.getLogger(__name__)


class ReportDataItem(BaseModel):
    period: str
    total_revenue: float
    total_shifts: int
    new_users: int
    active_users: int
    completion_rate: float


class ReportSummary(BaseModel):
    total_revenue: float
    previous_revenue: float
    revenue_change: float
    total_users: int
    previous_users: int
    users_change: float
    total_shifts: int
    previous_shifts: int
    shifts_change: float
    fill_rate: float
    previous_fill_rate: float
    fill_rate_change: float


class ReportsResponse(BaseModel):
    data: list[ReportDataItem]
    summary: ReportSummary


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_companies: int
    total_agencies: int
    active_shifts: int
    shifts_this_week: int
    total_revenue: float
    pending_payouts: int
    pending_payout_amount: float


@router.get("/stats", response_model=AdminStatsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_admin_stats(
    request: Request,
    session: SessionDep,
    admin: AdminUserDep,
) -> AdminStatsResponse:
    """
    Get platform-wide dashboard statistics.

    Returns user counts, shift counts, revenue, and pending payouts
    for the admin overview dashboard.
    """
    cache_key = "admin:stats"
    cached = get_cached(cache_key)
    if cached is not None:
        return AdminStatsResponse(**cached)

    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)

    total_users = session.exec(
        select(func.count(User.id)).where(User.is_active == True)  # noqa: E712
    ).one()

    # Active = updated within 30 days (profile update, shift activity, etc.)
    thirty_days_ago = now - timedelta(days=30)
    active_users = session.exec(
        select(func.count(User.id)).where(
            User.is_active == True,  # noqa: E712
            User.updated_at >= thirty_days_ago,
        )
    ).one()

    total_companies = session.exec(
        select(func.count(User.id)).where(
            User.user_type == UserType.COMPANY,
            User.is_active == True,  # noqa: E712
        )
    ).one()

    total_agencies = session.exec(
        select(func.count(User.id)).where(
            User.user_type == UserType.AGENCY,
            User.is_active == True,  # noqa: E712
        )
    ).one()

    active_shifts = session.exec(
        select(func.count(Shift.id)).where(
            Shift.status.in_([ShiftStatus.OPEN, ShiftStatus.FILLED, ShiftStatus.IN_PROGRESS])
        )
    ).one()

    shifts_this_week = session.exec(
        select(func.count(Shift.id)).where(
            Shift.created_at >= week_ago,
        )
    ).one()

    # Revenue this month
    month_start = datetime.combine(now.date().replace(day=1), datetime.min.time())
    revenue_result = session.exec(
        select(func.coalesce(func.sum(Transaction.amount), Decimal("0")))
        .where(
            Transaction.transaction_type == TransactionType.COMMISSION,
            Transaction.status == TransactionStatus.COMPLETED,
            Transaction.created_at >= month_start,
        )
    ).one()
    total_revenue = float(revenue_result)

    # Pending payouts
    pending_payouts = session.exec(
        select(func.count(Payout.id)).where(
            Payout.status == PayoutStatus.PENDING,
        )
    ).one()

    pending_payout_amount_result = session.exec(
        select(func.coalesce(func.sum(Payout.amount), Decimal("0")))
        .where(
            Payout.status == PayoutStatus.PENDING,
        )
    ).one()

    result = AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_companies=total_companies,
        total_agencies=total_agencies,
        active_shifts=active_shifts,
        shifts_this_week=shifts_this_week,
        total_revenue=total_revenue,
        pending_payouts=pending_payouts,
        pending_payout_amount=float(pending_payout_amount_result),
    )

    set_cached(cache_key, result.model_dump(), tier="short")
    return result


def _compute_change(current: float, previous: float) -> float:
    """Compute percentage change, avoiding division by zero."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/reports", response_model=ReportsResponse)
@limiter.limit(ADMIN_RATE_LIMIT)
async def get_admin_reports(
    request: Request,
    session: SessionDep,
    admin: AdminUserDep,
    period: str = Query(default="monthly", pattern="^(monthly|weekly)$"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> ReportsResponse:
    """
    Get platform reports with period-over-period comparison.

    Returns revenue, user, shift, and fill rate data broken down by period,
    plus summary with current vs previous period comparisons.
    """
    now = datetime.now(UTC)

    if not end_date:
        end_date = now.date()
    if not start_date:
        start_date = end_date - timedelta(days=180 if period == "monthly" else 56)

    end_dt = datetime.combine(end_date, datetime.max.time())
    _start_dt = datetime.combine(start_date, datetime.min.time())

    # ---- Build period data ----
    data: list[ReportDataItem] = []

    if period == "monthly":
        # Generate monthly buckets
        current = date(start_date.year, start_date.month, 1)
        while current <= end_date:
            next_month = (current.replace(day=28) + timedelta(days=4)).replace(day=1)
            period_start = datetime.combine(current, datetime.min.time())
            period_end = datetime.combine(next_month, datetime.min.time())

            item = _build_period_item(
                session, current.strftime("%Y-%m"), period_start, period_end
            )
            data.append(item)
            current = next_month
    else:
        # Weekly buckets
        current = start_date - timedelta(days=start_date.weekday())  # Monday
        while current <= end_date:
            week_end = current + timedelta(days=7)
            period_start = datetime.combine(current, datetime.min.time())
            period_end = datetime.combine(week_end, datetime.min.time())

            item = _build_period_item(
                session, current.strftime("%Y-W%V"), period_start, period_end
            )
            data.append(item)
            current = week_end

    # ---- Build summary (current month vs previous month) ----
    current_month_start = datetime.combine(
        now.date().replace(day=1), datetime.min.time()
    )
    prev_month_end = current_month_start
    prev_month_start = (prev_month_end - timedelta(days=1)).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    cur = _get_period_stats(session, current_month_start, end_dt)
    prev = _get_period_stats(session, prev_month_start, prev_month_end)

    summary = ReportSummary(
        total_revenue=cur["revenue"],
        previous_revenue=prev["revenue"],
        revenue_change=_compute_change(cur["revenue"], prev["revenue"]),
        total_users=cur["new_users"],
        previous_users=prev["new_users"],
        users_change=_compute_change(cur["new_users"], prev["new_users"]),
        total_shifts=cur["total_shifts"],
        previous_shifts=prev["total_shifts"],
        shifts_change=_compute_change(cur["total_shifts"], prev["total_shifts"]),
        fill_rate=cur["fill_rate"],
        previous_fill_rate=prev["fill_rate"],
        fill_rate_change=_compute_change(cur["fill_rate"], prev["fill_rate"]),
    )

    return ReportsResponse(data=data, summary=summary)


def _build_period_item(
    session, label: str, start: datetime, end: datetime
) -> ReportDataItem:
    """Build a single period data item."""
    stats = _get_period_stats(session, start, end)
    return ReportDataItem(
        period=label,
        total_revenue=stats["revenue"],
        total_shifts=stats["total_shifts"],
        new_users=stats["new_users"],
        active_users=stats["active_users"],
        completion_rate=stats["fill_rate"],
    )


def _get_period_stats(
    session, start: datetime, end: datetime
) -> dict:
    """Get aggregate stats for a given time period."""
    # Revenue: sum of commission transactions
    revenue_result = session.exec(
        select(func.coalesce(func.sum(Transaction.amount), Decimal("0")))
        .where(
            Transaction.transaction_type == TransactionType.COMMISSION,
            Transaction.status == TransactionStatus.COMPLETED,
            Transaction.created_at >= start,
            Transaction.created_at < end,
        )
    ).one()
    revenue = float(revenue_result)

    # Shifts
    total_shifts = session.exec(
        select(func.count(Shift.id)).where(
            Shift.created_at >= start,
            Shift.created_at < end,
        )
    ).one()

    completed_shifts = session.exec(
        select(func.count(Shift.id)).where(
            Shift.status == ShiftStatus.COMPLETED,
            Shift.created_at >= start,
            Shift.created_at < end,
        )
    ).one()

    fill_rate = round((completed_shifts / total_shifts * 100), 1) if total_shifts > 0 else 0.0

    # New users
    new_users = session.exec(
        select(func.count(User.id)).where(
            User.created_at >= start,
            User.created_at < end,
        )
    ).one()

    # Active users (users who have shifts in this period)
    active_users = session.exec(
        select(func.count(func.distinct(Shift.company_id))).where(
            Shift.created_at >= start,
            Shift.created_at < end,
        )
    ).one()

    return {
        "revenue": revenue,
        "total_shifts": total_shifts,
        "new_users": new_users,
        "active_users": active_users,
        "fill_rate": fill_rate,
    }
