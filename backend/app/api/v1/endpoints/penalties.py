"""Penalty API endpoints for ExtraShifty no-show system."""

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import func, select

from app.api.deps import ActiveUserDep, AdminUserDep, PaginationParams, SessionDep
from app.core.errors import (
    require_found,
)
from app.models.penalty import (
    AppealStatus,
    NegativeBalance,
    Penalty,
    PenaltyAppeal,
    PenaltyStatus,
    Strike,
    UserSuspension,
)
from app.schemas.penalty import (
    AdminPenaltySummaryResponse,
    AppealResponse,
    AppealReviewRequest,
    AppealReviewResponse,
    LiftSuspensionRequest,
    NegativeBalanceResponse,
    PenaltyAppealRequest,
    PenaltyListResponse,
    PenaltyResponse,
    PenaltySummaryResponse,
    StrikeListResponse,
    StrikeResponse,
    SuspensionResponse,
)
from app.services.penalty_service import PenaltyError, PenaltyService

router = APIRouter()


# ==================== User Endpoints ====================


@router.get("/strikes", response_model=StrikeListResponse)
def get_user_strikes(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """
    Get current user's strikes.

    Returns all strikes (active and inactive) for the current user,
    with counts of active and warning-only strikes.
    """
    now = datetime.utcnow()

    # Get all strikes for user
    all_strikes = session.exec(
        select(Strike)
        .where(Strike.user_id == current_user.id)
        .order_by(Strike.created_at.desc())
    ).all()

    # Calculate counts
    active_count = 0
    warning_count = 0
    strike_responses = []

    for strike in all_strikes:
        # Calculate days until expiry
        if strike.is_active and strike.expires_at > now:
            days_until_expiry = (strike.expires_at - now).days
            if not strike.is_warning_only:
                active_count += 1
        else:
            days_until_expiry = 0

        if strike.is_warning_only:
            warning_count += 1

        strike_responses.append(
            StrikeResponse(
                id=strike.id,
                user_id=strike.user_id,
                shift_id=strike.shift_id,
                reason=strike.reason,
                created_at=strike.created_at,
                expires_at=strike.expires_at,
                is_active=strike.is_active,
                is_warning_only=strike.is_warning_only,
                days_until_expiry=days_until_expiry,
            )
        )

    return {
        "items": strike_responses,
        "total": len(strike_responses),
        "active_count": active_count,
        "warning_count": warning_count,
    }


@router.get("/history", response_model=PenaltyListResponse)
def get_penalty_history(
    session: SessionDep,
    current_user: ActiveUserDep,
    pagination: PaginationParams = Depends(),
    status_filter: PenaltyStatus | None = Query(None, alias="status"),
) -> dict:
    """
    Get current user's penalty history.

    Returns penalties with optional status filtering.
    """
    penalty_service = PenaltyService(session)

    penalties = penalty_service.get_user_penalties(
        user_id=current_user.id,
        status_filter=status_filter,
        skip=pagination.skip,
        limit=pagination.limit,
    )

    total = penalty_service.get_penalty_count(
        user_id=current_user.id,
        status_filter=status_filter,
    )

    # Calculate counts
    pending_count = penalty_service.get_penalty_count(
        user_id=current_user.id,
        status_filter=PenaltyStatus.PENDING,
    )
    collected_count = penalty_service.get_penalty_count(
        user_id=current_user.id,
        status_filter=PenaltyStatus.COLLECTED,
    )

    # Calculate total amount
    total_amount_result = session.exec(
        select(func.sum(Penalty.amount)).where(
            Penalty.user_id == current_user.id,
            Penalty.status.in_([PenaltyStatus.PENDING, PenaltyStatus.COLLECTED]),
        )
    ).one()
    total_amount = total_amount_result or Decimal("0.00")

    # Build response with appeal info
    now = datetime.utcnow()
    appeal_window_days = penalty_service.APPEAL_WINDOW_DAYS

    penalty_responses = []
    for penalty in penalties:
        appeal_deadline = penalty.created_at + timedelta(days=appeal_window_days)
        can_appeal = (
            penalty.status in [PenaltyStatus.PENDING, PenaltyStatus.COLLECTED]
            and now < appeal_deadline
        )

        # Check if appeal already exists
        existing_appeal = session.exec(
            select(PenaltyAppeal).where(PenaltyAppeal.penalty_id == penalty.id)
        ).first()
        if existing_appeal:
            can_appeal = False

        penalty_responses.append(
            PenaltyResponse(
                id=penalty.id,
                user_id=penalty.user_id,
                shift_id=penalty.shift_id,
                amount=penalty.amount,
                reason=penalty.reason,
                status=penalty.status,
                collected_at=penalty.collected_at,
                collected_amount=penalty.collected_amount,
                waived_at=penalty.waived_at,
                waived_by_user_id=penalty.waived_by_user_id,
                waive_reason=penalty.waive_reason,
                written_off_at=penalty.written_off_at,
                created_at=penalty.created_at,
                appeal_deadline=appeal_deadline,
                can_appeal=can_appeal,
            )
        )

    return {
        "items": penalty_responses,
        "total": total,
        "pending_count": pending_count,
        "collected_count": collected_count,
        "total_amount": total_amount,
    }


@router.get("/summary", response_model=PenaltySummaryResponse)
def get_penalty_summary(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """
    Get current user's penalty summary.

    Returns comprehensive summary including strikes, negative balance,
    suspension status, and ability to accept shifts.
    """
    penalty_service = PenaltyService(session)
    summary = penalty_service.get_user_penalty_summary(current_user.id)

    # Determine if user can accept shifts
    can_accept = True
    warning_message = None

    if summary["is_suspended"]:
        can_accept = False
        if summary["suspension"]["suspended_until"]:
            warning_message = (
                f"Your account is suspended until "
                f"{summary['suspension']['suspended_until'].strftime('%Y-%m-%d')}. "
                f"Reason: {summary['suspension']['reason']}"
            )
        else:
            warning_message = (
                f"Your account is suspended indefinitely. "
                f"Reason: {summary['suspension']['reason']}. "
                "Please contact support."
            )
    elif summary["strikes_until_suspension"] == 1:
        warning_message = (
            "Warning: You have 2 active strikes. One more no-show will result "
            "in a 30-day suspension."
        )
    elif summary["negative_balance"] > 0:
        warning_message = (
            f"You have a negative balance of {summary['negative_balance']:.2f}. "
            "Your future earnings will be used to offset this balance."
        )

    # Convert strikes to response format
    now = datetime.utcnow()
    strike_responses = []
    for s in summary["strikes"]:
        days_until_expiry = (s["expires_at"] - now).days if s["expires_at"] > now else 0
        strike_responses.append(
            StrikeResponse(
                id=s["id"],
                user_id=current_user.id,
                shift_id=None,
                reason=s["reason"],
                created_at=s["created_at"],
                expires_at=s["expires_at"],
                is_active=True,
                is_warning_only=s["is_warning_only"],
                days_until_expiry=days_until_expiry,
            )
        )

    # Convert suspension to response format
    suspension_response = None
    if summary["suspension"]:
        suspension_response = SuspensionResponse(
            id=0,  # Will be filled from actual data if needed
            user_id=current_user.id,
            reason=summary["suspension"]["reason"],
            suspended_at=summary["suspension"]["suspended_at"],
            suspended_until=summary["suspension"]["suspended_until"],
            is_active=True,
            days_remaining=(
                (summary["suspension"]["suspended_until"] - now).days
                if summary["suspension"]["suspended_until"] and summary["suspension"]["suspended_until"] > now
                else None
            ),
        )

    return {
        "active_strikes": summary["active_strikes"],
        "strikes": strike_responses,
        "strikes_until_suspension": summary["strikes_until_suspension"],
        "negative_balance": summary["negative_balance"],
        "pending_penalties": summary["pending_penalties"],
        "is_suspended": summary["is_suspended"],
        "suspension": suspension_response,
        "can_accept_shifts": can_accept,
        "warning_message": warning_message,
    }


@router.get("/negative-balance", response_model=NegativeBalanceResponse | None)
def get_negative_balance(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> NegativeBalanceResponse | None:
    """
    Get current user's negative balance if any.
    """
    penalty_service = PenaltyService(session)
    nb = penalty_service.get_negative_balance(current_user.id)

    if not nb or nb.amount <= 0:
        return None

    # Calculate days until write-off
    days_since_activity = (datetime.utcnow() - nb.last_activity_at).days
    days_until_writeoff = max(0, penalty_service.INACTIVITY_WRITEOFF_DAYS - days_since_activity)

    return NegativeBalanceResponse(
        user_id=nb.user_id,
        amount=nb.amount,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
        last_activity_at=nb.last_activity_at,
        days_until_writeoff=days_until_writeoff,
    )


# ==================== Appeal Endpoints ====================


@router.post("/{penalty_id}/appeal", response_model=AppealResponse, status_code=status.HTTP_201_CREATED)
async def appeal_penalty(
    session: SessionDep,
    current_user: ActiveUserDep,
    penalty_id: int,
    appeal_in: PenaltyAppealRequest,
) -> AppealResponse:
    """
    Appeal a penalty (7-day window).

    Workers can appeal penalties within 7 days of the penalty being created.
    Only one appeal per penalty is allowed.
    """
    penalty_service = PenaltyService(session)

    try:
        appeal = await penalty_service.create_appeal(
            user_id=current_user.id,
            penalty_id=penalty_id,
            reason=appeal_in.reason,
            evidence=appeal_in.evidence,
        )

        return AppealResponse(
            id=appeal.id,
            penalty_id=appeal.penalty_id,
            user_id=appeal.user_id,
            reason=appeal.reason,
            evidence=appeal.evidence,
            status=appeal.status,
            reviewed_by_user_id=appeal.reviewed_by_user_id,
            review_notes=appeal.review_notes,
            reviewed_at=appeal.reviewed_at,
            created_at=appeal.created_at,
        )
    except PenaltyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/appeals", response_model=list[AppealResponse])
def get_user_appeals(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> list[AppealResponse]:
    """
    Get current user's penalty appeals.
    """
    appeals = session.exec(
        select(PenaltyAppeal)
        .where(PenaltyAppeal.user_id == current_user.id)
        .order_by(PenaltyAppeal.created_at.desc())
    ).all()

    return [
        AppealResponse(
            id=appeal.id,
            penalty_id=appeal.penalty_id,
            user_id=appeal.user_id,
            reason=appeal.reason,
            evidence=appeal.evidence,
            status=appeal.status,
            reviewed_by_user_id=appeal.reviewed_by_user_id,
            review_notes=appeal.review_notes,
            reviewed_at=appeal.reviewed_at,
            created_at=appeal.created_at,
        )
        for appeal in appeals
    ]


# ==================== Admin Endpoints ====================


@router.get("/admin/summary", response_model=AdminPenaltySummaryResponse)
def get_admin_penalty_summary(
    session: SessionDep,
    current_user: AdminUserDep,
) -> dict:
    """
    Get admin penalty dashboard summary.

    Admin only endpoint for monitoring the penalty system.
    """
    penalty_service = PenaltyService(session)

    # Total pending penalties
    total_pending = session.exec(
        select(func.count(Penalty.id)).where(Penalty.status == PenaltyStatus.PENDING)
    ).one()

    # Total pending amount
    total_pending_amount_result = session.exec(
        select(func.sum(Penalty.amount)).where(Penalty.status == PenaltyStatus.PENDING)
    ).one()
    total_pending_amount = total_pending_amount_result or Decimal("0.00")

    # Total pending appeals
    total_pending_appeals = session.exec(
        select(func.count(PenaltyAppeal.id)).where(
            PenaltyAppeal.status == AppealStatus.PENDING
        )
    ).one()

    # Active suspensions
    active_suspensions = session.exec(
        select(func.count(UserSuspension.id)).where(UserSuspension.is_active == True)
    ).one()

    # Users with negative balance
    users_with_negative = session.exec(
        select(func.count(NegativeBalance.id)).where(NegativeBalance.amount > 0)
    ).one()

    # Total negative balance
    total_negative_result = session.exec(
        select(func.sum(NegativeBalance.amount)).where(NegativeBalance.amount > 0)
    ).one()
    total_negative = total_negative_result or Decimal("0.00")

    # Penalties last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    penalties_last_30 = session.exec(
        select(func.count(Penalty.id)).where(Penalty.created_at >= thirty_days_ago)
    ).one()

    # Write-off candidates (6 months inactive)
    cutoff = datetime.utcnow() - timedelta(days=penalty_service.INACTIVITY_WRITEOFF_DAYS)
    writeoff_candidates = session.exec(
        select(func.count(NegativeBalance.id)).where(
            NegativeBalance.amount > 0,
            NegativeBalance.last_activity_at < cutoff,
        )
    ).one()

    return {
        "total_pending_penalties": total_pending,
        "total_pending_amount": total_pending_amount,
        "total_pending_appeals": total_pending_appeals,
        "active_suspensions": active_suspensions,
        "users_with_negative_balance": users_with_negative,
        "total_negative_balance": total_negative,
        "penalties_last_30_days": penalties_last_30,
        "writeoff_candidates": writeoff_candidates,
    }


@router.get("/admin/appeals/pending", response_model=list[AppealResponse])
def get_pending_appeals(
    session: SessionDep,
    current_user: AdminUserDep,
) -> list[AppealResponse]:
    """
    Get all pending appeals for admin review.

    Admin only endpoint.
    """
    penalty_service = PenaltyService(session)
    appeals = penalty_service.get_pending_appeals()

    return [
        AppealResponse(
            id=appeal.id,
            penalty_id=appeal.penalty_id,
            user_id=appeal.user_id,
            reason=appeal.reason,
            evidence=appeal.evidence,
            status=appeal.status,
            reviewed_by_user_id=appeal.reviewed_by_user_id,
            review_notes=appeal.review_notes,
            reviewed_at=appeal.reviewed_at,
            created_at=appeal.created_at,
        )
        for appeal in appeals
    ]


@router.post("/admin/appeals/{appeal_id}/review", response_model=AppealReviewResponse)
async def review_appeal(
    session: SessionDep,
    current_user: AdminUserDep,
    appeal_id: int,
    review_in: AppealReviewRequest,
) -> dict:
    """
    Review and decide on a penalty appeal.

    Admin only endpoint. Approving waives the penalty and removes the strike.
    """
    penalty_service = PenaltyService(session)

    try:
        appeal = await penalty_service.review_appeal(
            appeal_id=appeal_id,
            reviewed_by_user_id=current_user.id,
            approved=review_in.approved,
            review_notes=review_in.review_notes,
        )

        # Get penalty for refund info
        penalty = session.get(Penalty, appeal.penalty_id)
        refund_amount = None
        if review_in.approved and penalty and penalty.collected_amount:
            refund_amount = penalty.collected_amount

        return {
            "appeal_id": appeal.id,
            "approved": review_in.approved,
            "penalty_waived": review_in.approved,
            "strike_removed": review_in.approved,
            "refund_amount": refund_amount,
            "message": (
                f"Appeal approved. Penalty waived and strike removed. "
                f"Refund of {refund_amount} processed."
                if review_in.approved
                else f"Appeal rejected. Reason: {review_in.review_notes}"
            ),
        }
    except PenaltyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/admin/suspensions/{user_id}/lift", response_model=SuspensionResponse)
async def lift_user_suspension(
    session: SessionDep,
    current_user: AdminUserDep,
    user_id: int,
    lift_in: LiftSuspensionRequest,
) -> SuspensionResponse:
    """
    Lift a user's suspension.

    Admin only endpoint.
    """
    penalty_service = PenaltyService(session)

    suspension = await penalty_service.lift_suspension(
        user_id=user_id,
        lifted_by_user_id=current_user.id,
        reason=lift_in.reason,
    )

    require_found(suspension, "No active suspension found for this user")

    return SuspensionResponse(
        id=suspension.id,
        user_id=suspension.user_id,
        reason=suspension.reason,
        suspended_at=suspension.suspended_at,
        suspended_until=suspension.suspended_until,
        is_active=suspension.is_active,
        lifted_at=suspension.lifted_at,
        lifted_by_user_id=suspension.lifted_by_user_id,
        lift_reason=suspension.lift_reason,
    )


@router.get("/admin/user/{user_id}/penalties", response_model=PenaltyListResponse)
def get_user_penalties_admin(
    session: SessionDep,
    current_user: AdminUserDep,
    user_id: int,
    pagination: PaginationParams = Depends(),
) -> dict:
    """
    Get penalties for a specific user (admin).

    Admin only endpoint.
    """
    penalty_service = PenaltyService(session)

    penalties = penalty_service.get_user_penalties(
        user_id=user_id,
        skip=pagination.skip,
        limit=pagination.limit,
    )

    total = penalty_service.get_penalty_count(user_id=user_id)

    pending_count = penalty_service.get_penalty_count(
        user_id=user_id,
        status_filter=PenaltyStatus.PENDING,
    )
    collected_count = penalty_service.get_penalty_count(
        user_id=user_id,
        status_filter=PenaltyStatus.COLLECTED,
    )

    total_amount_result = session.exec(
        select(func.sum(Penalty.amount)).where(
            Penalty.user_id == user_id,
            Penalty.status.in_([PenaltyStatus.PENDING, PenaltyStatus.COLLECTED]),
        )
    ).one()
    total_amount = total_amount_result or Decimal("0.00")

    now = datetime.utcnow()
    appeal_window_days = penalty_service.APPEAL_WINDOW_DAYS

    penalty_responses = []
    for penalty in penalties:
        appeal_deadline = penalty.created_at + timedelta(days=appeal_window_days)
        can_appeal = (
            penalty.status in [PenaltyStatus.PENDING, PenaltyStatus.COLLECTED]
            and now < appeal_deadline
        )

        existing_appeal = session.exec(
            select(PenaltyAppeal).where(PenaltyAppeal.penalty_id == penalty.id)
        ).first()
        if existing_appeal:
            can_appeal = False

        penalty_responses.append(
            PenaltyResponse(
                id=penalty.id,
                user_id=penalty.user_id,
                shift_id=penalty.shift_id,
                amount=penalty.amount,
                reason=penalty.reason,
                status=penalty.status,
                collected_at=penalty.collected_at,
                collected_amount=penalty.collected_amount,
                waived_at=penalty.waived_at,
                waived_by_user_id=penalty.waived_by_user_id,
                waive_reason=penalty.waive_reason,
                written_off_at=penalty.written_off_at,
                created_at=penalty.created_at,
                appeal_deadline=appeal_deadline,
                can_appeal=can_appeal,
            )
        )

    return {
        "items": penalty_responses,
        "total": total,
        "pending_count": pending_count,
        "collected_count": collected_count,
        "total_amount": total_amount,
    }


@router.get("/admin/user/{user_id}/summary", response_model=PenaltySummaryResponse)
def get_user_penalty_summary_admin(
    session: SessionDep,
    current_user: AdminUserDep,
    user_id: int,
) -> dict:
    """
    Get penalty summary for a specific user (admin).

    Admin only endpoint.
    """
    penalty_service = PenaltyService(session)
    summary = penalty_service.get_user_penalty_summary(user_id)

    can_accept = not summary["is_suspended"]
    warning_message = None

    if summary["is_suspended"]:
        if summary["suspension"]["suspended_until"]:
            warning_message = f"User suspended until {summary['suspension']['suspended_until'].strftime('%Y-%m-%d')}"
        else:
            warning_message = "User suspended indefinitely"

    now = datetime.utcnow()
    strike_responses = []
    for s in summary["strikes"]:
        days_until_expiry = (s["expires_at"] - now).days if s["expires_at"] > now else 0
        strike_responses.append(
            StrikeResponse(
                id=s["id"],
                user_id=user_id,
                shift_id=None,
                reason=s["reason"],
                created_at=s["created_at"],
                expires_at=s["expires_at"],
                is_active=True,
                is_warning_only=s["is_warning_only"],
                days_until_expiry=days_until_expiry,
            )
        )

    suspension_response = None
    if summary["suspension"]:
        suspension_response = SuspensionResponse(
            id=0,
            user_id=user_id,
            reason=summary["suspension"]["reason"],
            suspended_at=summary["suspension"]["suspended_at"],
            suspended_until=summary["suspension"]["suspended_until"],
            is_active=True,
            days_remaining=(
                (summary["suspension"]["suspended_until"] - now).days
                if summary["suspension"]["suspended_until"] and summary["suspension"]["suspended_until"] > now
                else None
            ),
        )

    return {
        "active_strikes": summary["active_strikes"],
        "strikes": strike_responses,
        "strikes_until_suspension": summary["strikes_until_suspension"],
        "negative_balance": summary["negative_balance"],
        "pending_penalties": summary["pending_penalties"],
        "is_suspended": summary["is_suspended"],
        "suspension": suspension_response,
        "can_accept_shifts": can_accept,
        "warning_message": warning_message,
    }
