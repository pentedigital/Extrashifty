"""Appeal endpoints for penalty dispute resolution."""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
from app.core.errors import raise_bad_request, require_found, require_permission
from app.models.appeal import Appeal, AppealStatus, AppealType
from app.models.user import User
from app.schemas.appeal import (
    AdminPendingAppealsResponse,
    AppealCreate,
    AppealListResponse,
    AppealResponse,
    AppealReviewRequest,
    AppealReviewResponse,
    AppealWithdrawResponse,
    EmergencyWaiverStatusResponse,
)
from app.services.appeal_service import (
    AppealServiceError,
    AppealWindowClosedError,
    DuplicateAppealError,
    InvalidAppealError,
    appeal_service,
)

router = APIRouter()


def _build_appeal_response(appeal: Appeal, db) -> AppealResponse:
    """Build an AppealResponse from an Appeal model."""
    # Get user name
    user = db.get(User, appeal.user_id)
    user_name = user.full_name if user else "Unknown"

    # Get reviewer name if reviewed
    reviewer_name = None
    if appeal.reviewed_by:
        reviewer = db.get(User, appeal.reviewed_by)
        reviewer_name = reviewer.full_name if reviewer else "Unknown"

    # Calculate days until deadline
    if appeal.appeal_type == AppealType.SUSPENSION:
        # Suspension appeal deadline is from submission window
        days_until = (appeal.appeal_deadline - datetime.utcnow()).total_seconds() / (24 * 3600)
    else:
        days_until = (appeal.appeal_deadline - datetime.utcnow()).total_seconds() / (24 * 3600)

    return AppealResponse(
        id=appeal.id,
        user_id=appeal.user_id,
        user_name=user_name,
        appeal_type=appeal.appeal_type,
        related_id=appeal.related_id,
        reason=appeal.reason,
        evidence_urls=appeal.evidence_urls,
        emergency_type=appeal.emergency_type,
        status=appeal.status,
        reviewer_notes=appeal.reviewer_notes,
        reviewed_by=appeal.reviewed_by,
        reviewer_name=reviewer_name,
        reviewed_at=appeal.reviewed_at,
        created_at=appeal.created_at,
        appeal_deadline=appeal.appeal_deadline,
        days_until_deadline=max(0, days_until),
        frivolous_fee_charged=appeal.frivolous_fee_charged,
        emergency_waiver_used=appeal.emergency_waiver_used,
    )


@router.post(
    "",
    response_model=AppealResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_appeal(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: AppealCreate,
) -> AppealResponse:
    """
    Submit a new appeal for a penalty, strike, or suspension.

    Appeal windows:
    - Penalties: 7 days from incident
    - Strikes: 7 days from incident
    - Suspensions: 72 hours from start of suspension

    If claiming an emergency exception, provide the emergency_type and
    supporting evidence_urls. Emergency waivers are limited to one per
    user per year.

    Returns:
        Created appeal details.
    """
    try:
        appeal = await appeal_service.submit_appeal(
            db=session,
            user_id=current_user.id,
            appeal_type=request.appeal_type,
            related_id=request.related_id,
            reason=request.reason,
            evidence_urls=request.evidence_urls,
            emergency_type=request.emergency_type,
        )
        return _build_appeal_response(appeal, session)

    except AppealWindowClosedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except DuplicateAppealError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
    except InvalidAppealError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except AppealServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit appeal: {str(e)}",
        ) from e


@router.get(
    "",
    response_model=AppealListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_appeals(
    session: SessionDep,
    current_user: ActiveUserDep,
    status_filter: AppealStatus | None = Query(default=None, alias="status"),
    appeal_type: AppealType | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AppealListResponse:
    """
    List the current user's appeals.

    Filters:
    - status: Filter by appeal status (pending, approved, denied, withdrawn)
    - appeal_type: Filter by type (penalty, strike, suspension)

    Returns:
        List of user's appeals.
    """
    try:
        appeals = await appeal_service.get_appeals_by_user(
            db=session,
            user_id=current_user.id,
            status=status_filter,
            appeal_type=appeal_type,
        )

        total = len(appeals)
        paginated = appeals[skip : skip + limit]

        items = [_build_appeal_response(a, session) for a in paginated]

        return AppealListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch appeals: {str(e)}",
        ) from e


@router.get(
    "/emergency-waiver-status",
    response_model=EmergencyWaiverStatusResponse,
    status_code=status.HTTP_200_OK,
)
async def get_emergency_waiver_status(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> EmergencyWaiverStatusResponse:
    """
    Check if the user has an emergency waiver available for the current year.

    Emergency waivers can be used once per year to have a penalty waived
    for documented emergencies (medical, family, natural disaster, transit).

    Returns:
        Emergency waiver availability status.
    """
    try:
        status_info = await appeal_service.get_emergency_waiver_status(
            db=session,
            user_id=current_user.id,
        )
        return EmergencyWaiverStatusResponse(**status_info)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check waiver status: {str(e)}",
        ) from e


@router.get(
    "/{appeal_id}",
    response_model=AppealResponse,
    status_code=status.HTTP_200_OK,
)
async def get_appeal(
    appeal_id: int,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AppealResponse:
    """
    Get details of a specific appeal.

    Users can only view their own appeals.
    Admins can view any appeal.

    Returns:
        Appeal details.
    """
    appeal = await appeal_service.get_appeal(db=session, appeal_id=appeal_id)

    require_found(appeal, f"Appeal {appeal_id}")

    # Check access permission
    from app.models.user import UserType

    if current_user.user_type != UserType.ADMIN:
        require_permission(appeal.user_id == current_user.id, "You can only view your own appeals")

    return _build_appeal_response(appeal, session)


@router.post(
    "/{appeal_id}/withdraw",
    response_model=AppealWithdrawResponse,
    status_code=status.HTTP_200_OK,
)
async def withdraw_appeal(
    appeal_id: int,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AppealWithdrawResponse:
    """
    Withdraw a pending appeal.

    Only the user who submitted the appeal can withdraw it.
    Only pending appeals can be withdrawn.

    Returns:
        Withdrawal confirmation.
    """
    try:
        appeal = await appeal_service.withdraw_appeal(
            db=session,
            appeal_id=appeal_id,
            user_id=current_user.id,
        )

        return AppealWithdrawResponse(
            appeal_id=appeal.id,
            status=appeal.status,
            message="Appeal has been withdrawn successfully",
        )

    except InvalidAppealError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to withdraw appeal: {str(e)}",
        ) from e


# ============================================================================
# Admin Endpoints
# ============================================================================


@router.get(
    "/admin/pending",
    response_model=AdminPendingAppealsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_pending_appeals(
    session: SessionDep,
    current_user: AdminUserDep,
    appeal_type: AppealType | None = Query(default=None),
    emergency_only: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AdminPendingAppealsResponse:
    """
    Get all pending appeals awaiting admin review.

    Filters:
    - appeal_type: Filter by type (penalty, strike, suspension)
    - emergency_only: Only show emergency-related appeals

    Appeals are ordered by submission date (oldest first to ensure
    timely review within 3 business days).

    Returns:
        List of pending appeals with summary statistics.
    """
    try:
        # Get all pending appeals
        all_pending = await appeal_service.get_pending_appeals(db=session)

        # Calculate summary stats
        penalty_appeals = len([a for a in all_pending if a.appeal_type == AppealType.PENALTY])
        strike_appeals = len([a for a in all_pending if a.appeal_type == AppealType.STRIKE])
        suspension_appeals = len([a for a in all_pending if a.appeal_type == AppealType.SUSPENSION])
        emergency_appeals = len([a for a in all_pending if a.emergency_type])

        # Get appeals approaching deadline (within 24 hours of 3-day review window)
        approaching = await appeal_service.get_appeals_approaching_deadline(
            db=session,
            hours_threshold=24,
        )

        # Apply filters for the list
        filtered = await appeal_service.get_pending_appeals(
            db=session,
            appeal_type=appeal_type,
            emergency_only=emergency_only,
        )

        paginated = filtered[skip : skip + limit]

        items = [_build_appeal_response(a, session) for a in paginated]

        return AdminPendingAppealsResponse(
            total_pending=len(all_pending),
            penalty_appeals=penalty_appeals,
            strike_appeals=strike_appeals,
            suspension_appeals=suspension_appeals,
            emergency_appeals=emergency_appeals,
            appeals_approaching_deadline=len(approaching),
            items=items,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pending appeals: {str(e)}",
        ) from e


@router.post(
    "/admin/{appeal_id}/review",
    response_model=AppealReviewResponse,
    status_code=status.HTTP_200_OK,
)
async def review_appeal(
    appeal_id: int,
    session: SessionDep,
    current_user: AdminUserDep,
    request: AppealReviewRequest,
) -> AppealReviewResponse:
    """
    Review and decide on an appeal (admin only).

    Decision options:
    - approved=True: Waive penalty, remove strike, or lift suspension
    - approved=False: Deny the appeal
    - is_frivolous=True: Charge $25 fee for frivolous appeal (only if denied)
    - use_emergency_waiver=True: Apply the user's annual emergency waiver

    Note: If approving a suspension appeal, all strikes are cleared and
    the user enters a 90-day probation period where any new no-show
    results in permanent ban.

    Returns:
        Review result with actions taken.
    """
    try:
        # Validate is_frivolous can only be used with denial
        if request.is_frivolous and request.approved:
            raise_bad_request("Frivolous fee can only be charged when denying an appeal")

        # Validate emergency waiver can only be used with approval
        if request.use_emergency_waiver and not request.approved:
            raise_bad_request("Emergency waiver can only be used when approving an appeal")

        appeal = await appeal_service.review_appeal(
            db=session,
            appeal_id=appeal_id,
            approved=request.approved,
            reviewer_notes=request.reviewer_notes,
            reviewer_id=current_user.id,
            is_frivolous=request.is_frivolous,
            use_emergency_waiver=request.use_emergency_waiver,
        )

        # Determine what actions were taken
        penalty_waived = appeal.status == AppealStatus.APPROVED and appeal.appeal_type == AppealType.PENALTY
        strike_removed = appeal.status == AppealStatus.APPROVED and appeal.appeal_type == AppealType.STRIKE
        suspension_lifted = appeal.status == AppealStatus.APPROVED and appeal.appeal_type == AppealType.SUSPENSION

        if appeal.status == AppealStatus.APPROVED:
            message = f"Appeal approved. {appeal.appeal_type.value.title()} has been resolved in user's favor."
            if appeal.emergency_waiver_used:
                message += " User's annual emergency waiver has been used."
        else:
            message = f"Appeal denied. {appeal.appeal_type.value.title()} remains on record."
            if appeal.frivolous_fee_charged:
                message += " $25 frivolous appeal fee has been charged."

        return AppealReviewResponse(
            appeal_id=appeal.id,
            status=appeal.status,
            reviewer_notes=appeal.reviewer_notes,
            frivolous_fee_charged=appeal.frivolous_fee_charged,
            emergency_waiver_used=appeal.emergency_waiver_used,
            penalty_waived=penalty_waived,
            strike_removed=strike_removed,
            suspension_lifted=suspension_lifted,
            message=message,
        )

    except InvalidAppealError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review appeal: {str(e)}",
        ) from e


@router.get(
    "/admin/user/{user_id}",
    response_model=AppealListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_user_appeals(
    user_id: int,
    session: SessionDep,
    current_user: AdminUserDep,
    status_filter: AppealStatus | None = Query(default=None, alias="status"),
    appeal_type: AppealType | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> AppealListResponse:
    """
    Get all appeals for a specific user (admin only).

    Useful for reviewing a user's appeal history when making decisions.

    Returns:
        List of user's appeals.
    """
    try:
        appeals = await appeal_service.get_appeals_by_user(
            db=session,
            user_id=user_id,
            status=status_filter,
            appeal_type=appeal_type,
        )

        total = len(appeals)
        paginated = appeals[skip : skip + limit]

        items = [_build_appeal_response(a, session) for a in paginated]

        return AppealListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user appeals: {str(e)}",
        ) from e


@router.get(
    "/admin/approaching-deadline",
    response_model=AppealListResponse,
    status_code=status.HTTP_200_OK,
)
async def get_appeals_approaching_deadline(
    session: SessionDep,
    current_user: AdminUserDep,
    hours_threshold: int = Query(default=24, ge=1, le=72),
) -> AppealListResponse:
    """
    Get appeals approaching review deadline (admin only).

    Platform is required to review appeals within 3 business days.
    This endpoint helps identify appeals needing urgent attention.

    Args:
        hours_threshold: Hours until deadline (default 24)

    Returns:
        List of appeals needing urgent review.
    """
    try:
        appeals = await appeal_service.get_appeals_approaching_deadline(
            db=session,
            hours_threshold=hours_threshold,
        )

        items = [_build_appeal_response(a, session) for a in appeals]

        return AppealListResponse(items=items, total=len(items))

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch approaching deadline appeals: {str(e)}",
        ) from e
