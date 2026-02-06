"""Dispute endpoints for ExtraShifty dispute handling."""

from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import ActiveUserDep, AdminUserDep, PaginationParams, SessionDep
from app.core.errors import raise_not_found, raise_forbidden, raise_bad_request, require_found, require_permission
from app.models.payment import Dispute, DisputeStatus
from app.models.user import User
from app.schemas.dispute import (
    DisputeCreate,
    DisputeListResponse,
    DisputeResolution,
    DisputeResolutionResponse,
    DisputeResolutionType,
    DisputeResponse,
    EvidenceCreate,
)
from app.services.dispute_service import dispute_service

router = APIRouter()


def _build_dispute_response(dispute: Dispute, db) -> DisputeResponse:
    """Build a DisputeResponse from a Dispute model."""
    # Get user names
    raiser = db.get(User, dispute.raised_by_user_id)
    against = db.get(User, dispute.against_user_id)

    # Use stored resolution_deadline if available, otherwise calculate
    if dispute.resolution_deadline:
        deadline_at = dispute.resolution_deadline
    else:
        deadline_at = dispute.created_at + timedelta(
            days=dispute_service.RESOLUTION_DEADLINE_DAYS
        )
    days_until = (deadline_at - datetime.utcnow()).total_seconds() / (24 * 3600)

    # Count evidence entries (simple count based on separator)
    evidence_count = 0
    if dispute.evidence:
        evidence_count = dispute.evidence.count("--- Evidence from")

    return DisputeResponse(
        id=dispute.id,
        shift_id=dispute.shift_id,
        raised_by_user_id=dispute.raised_by_user_id,
        raised_by_user_name=raiser.full_name if raiser else "Unknown",
        against_user_id=dispute.against_user_id,
        against_user_name=against.full_name if against else "Unknown",
        amount_disputed=dispute.amount_disputed,
        reason=dispute.reason,
        status=dispute.status,
        resolution_notes=dispute.resolution_notes,
        resolved_at=dispute.resolved_at,
        created_at=dispute.created_at,
        deadline_at=deadline_at,
        days_until_deadline=max(0, days_until),
        is_overdue=dispute.is_overdue,
        is_approaching_deadline=dispute.is_approaching_deadline,
        evidence_count=evidence_count,
        escrow_hold_id=None,  # Would come from escrow service
    )


@router.post(
    "",
    response_model=DisputeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dispute(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: DisputeCreate,
) -> DisputeResponse:
    """
    Create a new dispute.

    Disputes must be raised within 7 days of shift completion.
    Creating a dispute automatically moves funds to escrow.

    Returns:
        Created dispute details.
    """
    try:
        dispute = await dispute_service.create_dispute(
            db=session,
            shift_id=request.shift_id,
            raised_by=current_user.id,
            reason=request.reason,
            disputed_amount=request.disputed_amount,
        )

        return _build_dispute_response(dispute, session)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=DisputeListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_disputes(
    session: SessionDep,
    current_user: ActiveUserDep,
    pagination: PaginationParams = Depends(),
    status_filter: DisputeStatus | None = Query(default=None, alias="status"),
) -> DisputeListResponse:
    """
    List disputes for the current user.

    Returns disputes where the user is either the raiser or the against party.

    Returns:
        List of user's disputes.
    """
    try:
        disputes = await dispute_service.get_disputes_by_user(
            db=session,
            user_id=current_user.id,
            status=status_filter,
        )

        # Apply pagination
        total = len(disputes)
        paginated = disputes[pagination.skip : pagination.skip + pagination.limit]

        items = [_build_dispute_response(d, session) for d in paginated]

        return DisputeListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch disputes: {str(e)}",
        )


@router.get(
    "/{dispute_id}",
    response_model=DisputeResponse,
    status_code=status.HTTP_200_OK,
)
async def get_dispute(
    dispute_id: int,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> DisputeResponse:
    """
    Get dispute details.

    Users can only view disputes they are party to.
    Admins can view any dispute.

    Returns:
        Dispute details.
    """
    dispute = session.get(Dispute, dispute_id)
    require_found(dispute, f"Dispute {dispute_id}")

    # Check access permission
    from app.models.user import UserType

    if current_user.user_type != UserType.ADMIN:
        require_permission(
            current_user.id in [dispute.raised_by_user_id, dispute.against_user_id],
            "You can only view disputes you are party to"
        )

    return _build_dispute_response(dispute, session)


@router.post(
    "/{dispute_id}/evidence",
    response_model=DisputeResponse,
    status_code=status.HTTP_200_OK,
)
async def add_evidence(
    dispute_id: int,
    session: SessionDep,
    current_user: ActiveUserDep,
    request: EvidenceCreate,
) -> DisputeResponse:
    """
    Add evidence to a dispute.

    Only parties to the dispute can add evidence.
    Evidence can only be added to open or under-review disputes.

    Returns:
        Updated dispute details.
    """
    try:
        dispute = await dispute_service.add_evidence(
            db=session,
            dispute_id=dispute_id,
            user_id=current_user.id,
            evidence=request.evidence,
        )

        return _build_dispute_response(dispute, session)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{dispute_id}/resolve",
    response_model=DisputeResolutionResponse,
    status_code=status.HTTP_200_OK,
)
async def resolve_dispute(
    dispute_id: int,
    session: SessionDep,
    current_user: AdminUserDep,
    request: DisputeResolution,
) -> DisputeResolutionResponse:
    """
    Resolve a dispute (admin only).

    Resolution options:
    - for_raiser: Full amount goes to the party who raised the dispute
    - against_raiser: Full amount goes to the other party
    - split: Amount is split based on split_percentage

    Returns:
        Resolution details including fund distribution.
    """
    try:
        dispute = await dispute_service.resolve_dispute(
            db=session,
            dispute_id=dispute_id,
            resolution=request.resolution,
            admin_notes=request.admin_notes,
            split_percentage=request.split_percentage,
        )

        # Calculate amounts for response
        total_amount = dispute.amount_disputed
        if request.resolution == DisputeResolutionType.FOR_RAISER:
            # Determine if raiser is worker or company
            from app.models.shift import Shift

            shift = session.get(Shift, dispute.shift_id)

            # Get worker from applications
            from app.models.application import Application, ApplicationStatus
            from sqlmodel import select

            stmt = select(Application).where(
                Application.shift_id == dispute.shift_id,
                Application.status == ApplicationStatus.ACCEPTED,
            )
            app = session.exec(stmt).first()
            worker_id = app.applicant_id if app else None

            raiser_is_worker = dispute.raised_by_user_id == worker_id
            if raiser_is_worker:
                worker_amount = total_amount
                company_amount = 0
            else:
                worker_amount = 0
                company_amount = total_amount

        elif request.resolution == DisputeResolutionType.AGAINST_RAISER:
            from app.models.shift import Shift

            shift = session.get(Shift, dispute.shift_id)

            from app.models.application import Application, ApplicationStatus
            from sqlmodel import select

            stmt = select(Application).where(
                Application.shift_id == dispute.shift_id,
                Application.status == ApplicationStatus.ACCEPTED,
            )
            app = session.exec(stmt).first()
            worker_id = app.applicant_id if app else None

            raiser_is_worker = dispute.raised_by_user_id == worker_id
            if raiser_is_worker:
                worker_amount = 0
                company_amount = total_amount
            else:
                worker_amount = total_amount
                company_amount = 0

        else:  # SPLIT
            worker_pct = request.split_percentage or 50
            worker_amount = total_amount * worker_pct / 100
            company_amount = total_amount - worker_amount

        return DisputeResolutionResponse(
            dispute_id=dispute.id,
            resolution=request.resolution,
            worker_amount=worker_amount,
            company_amount=company_amount,
            status=dispute.status.value,
            message=f"Dispute resolved: {request.resolution.value}",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/admin/pending",
    response_model=DisputeListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_pending_disputes(
    session: SessionDep,
    current_user: AdminUserDep,
    pagination: PaginationParams = Depends(),
) -> DisputeListResponse:
    """
    Get all open disputes needing resolution (admin only).

    Returns disputes ordered by creation date (oldest first).

    Returns:
        List of pending disputes.
    """
    try:
        disputes = await dispute_service.get_open_disputes(db=session)

        # Apply pagination
        total = len(disputes)
        paginated = disputes[pagination.skip : pagination.skip + pagination.limit]

        items = [_build_dispute_response(d, session) for d in paginated]

        return DisputeListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending disputes: {str(e)}",
        )


@router.post(
    "/admin/check-deadlines",
    status_code=status.HTTP_200_OK,
)
async def check_dispute_deadlines(
    session: SessionDep,
    current_user: AdminUserDep,
) -> dict[str, Any]:
    """
    Check for disputes approaching deadline (admin only).

    This is typically run by the scheduler daily, but can be
    triggered manually by admins.

    Returns:
        List of disputes within 24 hours of deadline.
    """
    try:
        approaching = await dispute_service.check_dispute_deadlines(db=session)

        return {
            "status": "completed",
            "approaching_deadline_count": len(approaching),
            "dispute_ids": [d.id for d in approaching],
            "message": f"Found {len(approaching)} disputes approaching deadline",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Deadline check failed: {str(e)}",
        )


@router.get(
    "/admin/overdue",
    response_model=DisputeListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_overdue_disputes(
    session: SessionDep,
    current_user: AdminUserDep,
    pagination: PaginationParams = Depends(),
) -> DisputeListResponse:
    """
    Get all overdue disputes (admin only).

    Returns disputes that have passed their 3-business-day resolution deadline
    but have not yet been resolved.

    Returns:
        List of overdue disputes.
    """
    try:
        disputes = await dispute_service.get_overdue_disputes(db=session)

        # Apply pagination
        total = len(disputes)
        paginated = disputes[pagination.skip : pagination.skip + pagination.limit]

        items = [_build_dispute_response(d, session) for d in paginated]

        return DisputeListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch overdue disputes: {str(e)}",
        )


@router.get(
    "/admin/approaching-deadline",
    response_model=DisputeListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_disputes_approaching_deadline(
    session: SessionDep,
    current_user: AdminUserDep,
    pagination: PaginationParams = Depends(),
    hours: int = Query(default=24, ge=1, le=72, description="Hours until deadline"),
) -> DisputeListResponse:
    """
    Get disputes approaching their resolution deadline (admin only).

    Returns disputes that are within the specified number of hours of their
    3-business-day resolution deadline.

    Args:
        hours: Number of hours to consider as "approaching deadline" (default 24)

    Returns:
        List of disputes approaching deadline.
    """
    try:
        disputes = await dispute_service.get_disputes_approaching_deadline(
            db=session, hours=hours
        )

        # Apply pagination
        total = len(disputes)
        paginated = disputes[pagination.skip : pagination.skip + pagination.limit]

        items = [_build_dispute_response(d, session) for d in paginated]

        return DisputeListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch disputes approaching deadline: {str(e)}",
        )


@router.post(
    "/admin/auto-resolve-overdue",
    status_code=status.HTTP_200_OK,
)
async def auto_resolve_overdue_disputes(
    session: SessionDep,
    current_user: AdminUserDep,
) -> dict[str, Any]:
    """
    Manually trigger auto-resolution of overdue disputes (admin only).

    This is typically run by the scheduler hourly, but can be
    triggered manually by admins. Overdue disputes are resolved
    in favor of the worker per platform policy.

    Returns:
        Summary of auto-resolved disputes.
    """
    try:
        resolved = await dispute_service.auto_resolve_overdue_disputes(db=session)

        return {
            "status": "completed",
            "auto_resolved_count": len(resolved),
            "dispute_ids": [d.id for d in resolved],
            "message": f"Auto-resolved {len(resolved)} overdue disputes in favor of workers",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto-resolution failed: {str(e)}",
        )
