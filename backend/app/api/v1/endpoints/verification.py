"""Verification endpoints for ExtraShifty shift verification workflow."""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActiveUserDep, AdminUserDep, CompanyUserDep, SessionDep
from app.models.user import UserType
from app.schemas.verification import (
    HoursAdjustmentRequest,
    PendingShiftResponse,
    PendingShiftsListResponse,
    ShiftApprovalRequest,
    ShiftApprovalResponse,
    ShiftRejectionRequest,
    ShiftRejectionResponse,
)
from app.services.verification_service import verification_service

router = APIRouter()


@router.post(
    "/shifts/{shift_id}/approve",
    response_model=ShiftApprovalResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_shift(
    shift_id: int,
    session: SessionDep,
    current_user: CompanyUserDep,
    request: ShiftApprovalRequest,
) -> ShiftApprovalResponse:
    """
    Approve a completed shift.

    Only the company that owns the shift or an admin can approve it.
    Optionally specify actual hours worked for pro-rating.

    Returns:
        Approval confirmation with settlement details.
    """
    try:
        result = await verification_service.manager_approve_shift(
            db=session,
            shift_id=shift_id,
            manager_id=current_user.id,
            actual_hours=float(request.actual_hours) if request.actual_hours else None,
        )

        return ShiftApprovalResponse(
            shift_id=result["shift_id"],
            status=result["status"],
            approved_hours=result["approved_hours"],
            gross_amount=result["gross_amount"],
            settlement_triggered=result["settlement_triggered"],
            message=result["message"],
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/shifts/{shift_id}/reject",
    response_model=ShiftRejectionResponse,
    status_code=status.HTTP_200_OK,
)
async def reject_shift(
    shift_id: int,
    session: SessionDep,
    current_user: CompanyUserDep,
    request: ShiftRejectionRequest,
) -> ShiftRejectionResponse:
    """
    Reject a completed shift.

    This automatically creates a dispute and holds funds in escrow.
    Only the company that owns the shift or an admin can reject it.

    Returns:
        Rejection confirmation with dispute ID.
    """
    try:
        result = await verification_service.manager_reject_shift(
            db=session,
            shift_id=shift_id,
            manager_id=current_user.id,
            reason=request.reason,
        )

        return ShiftRejectionResponse(
            shift_id=result["shift_id"],
            status=result["status"],
            dispute_id=result["dispute_id"],
            reason=result["reason"],
            message=result["message"],
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/shifts/pending",
    response_model=PendingShiftsListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_pending_shifts(
    session: SessionDep,
    current_user: CompanyUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> PendingShiftsListResponse:
    """
    Get shifts pending approval.

    Companies see their own pending shifts.
    Admins can see all pending shifts.

    Returns:
        List of pending shifts with approval information.
    """
    # Determine company filter
    company_id = None
    if current_user.user_type == UserType.COMPANY:
        company_id = current_user.id
    # Admins see all

    try:
        pending_shifts = await verification_service.get_pending_approval_shifts(
            db=session,
            company_id=company_id,
        )

        # Apply pagination
        total = len(pending_shifts)
        paginated = pending_shifts[skip : skip + limit]

        items = [
            PendingShiftResponse(
                id=s["id"],
                title=s["title"],
                date=s["date"],
                scheduled_hours=s["scheduled_hours"],
                clock_in_time=s.get("clock_in_time"),
                clock_out_time=s.get("clock_out_time"),
                actual_hours=s.get("actual_hours"),
                hourly_rate=s["hourly_rate"],
                total_amount=s["total_amount"],
                worker_id=s["worker_id"],
                worker_name=s["worker_name"],
                status=s["status"],
                hours_since_clock_out=s.get("hours_since_clock_out"),
                auto_approve_at=s.get("auto_approve_at"),
            )
            for s in paginated
        ]

        return PendingShiftsListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending shifts: {str(e)}",
        )


@router.post(
    "/shifts/{shift_id}/adjust-hours",
    status_code=status.HTTP_200_OK,
)
async def adjust_shift_hours(
    shift_id: int,
    session: SessionDep,
    current_user: CompanyUserDep,
    request: HoursAdjustmentRequest,
) -> dict[str, Any]:
    """
    Adjust the actual hours worked for a shift.

    This is typically used before approval when the scheduled hours
    don't match the actual hours worked.

    Returns:
        Adjustment confirmation.
    """
    try:
        result = await verification_service.adjust_hours(
            db=session,
            shift_id=shift_id,
            manager_id=current_user.id,
            actual_hours=request.actual_hours,
            reason=request.reason,
        )

        return result

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/auto-approve",
    status_code=status.HTTP_200_OK,
)
async def trigger_auto_approve(
    session: SessionDep,
    current_user: AdminUserDep,
) -> dict[str, Any]:
    """
    Manually trigger the auto-approve check (admin only).

    This is typically run by the scheduler hourly, but can be
    triggered manually by admins for testing or catch-up.

    Returns:
        List of shift IDs that were auto-approved.
    """
    try:
        approved_ids = await verification_service.check_auto_approve_shifts(db=session)

        return {
            "status": "completed",
            "auto_approved_count": len(approved_ids),
            "auto_approved_shift_ids": approved_ids,
            "message": f"Auto-approved {len(approved_ids)} shifts",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto-approve check failed: {str(e)}",
        )
