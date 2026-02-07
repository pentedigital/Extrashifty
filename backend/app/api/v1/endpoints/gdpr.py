"""GDPR compliance endpoints for ExtraShifty."""

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
from app.core.rate_limit import DEFAULT_RATE_LIMIT, GDPR_RATE_LIMIT, limiter
from app.models.gdpr import DeletionRequestStatus
from app.schemas.gdpr import (
    AdminDeletionRequestResponse,
    DataExportDownloadResponse,
    DataExportResponse,
    DeletionRequestCreate,
    DeletionRequestListResponse,
    DeletionRequestResponse,
    DeletionStatusResponse,
)
from app.services.gdpr_service import GDPRService, GDPRServiceError

router = APIRouter()


@router.post("/request-deletion", response_model=DeletionRequestResponse)
@limiter.limit(GDPR_RATE_LIMIT)
async def request_account_deletion(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    body: DeletionRequestCreate,
) -> DeletionRequestResponse:
    """
    Request account deletion (GDPR right to erasure).

    This initiates the account deletion process with a 30-day grace period
    during which the user can cancel the request.

    After the grace period, the following will be deleted or anonymized:
    - Wallet closed and remaining balance transferred
    - Transactions anonymized (amounts kept for accounting)
    - Shifts anonymized
    - Reviews anonymized
    - Notifications deleted
    - Personal data removed
    - Stripe Connect account deleted
    """
    gdpr_service = GDPRService(session)

    try:
        deletion_request = await gdpr_service.request_account_deletion(
            user_id=current_user.id,
            reason=body.reason,
        )
        return deletion_request
    except GDPRServiceError as e:
        if e.code == "request_exists":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=e.message,
            ) from e
        elif e.code == "already_deleted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e


@router.post("/cancel-deletion", response_model=dict)
@limiter.limit(GDPR_RATE_LIMIT)
async def cancel_deletion_request(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """
    Cancel a pending deletion request.

    Can only be cancelled during the 30-day grace period.
    """
    gdpr_service = GDPRService(session)

    try:
        await gdpr_service.cancel_deletion_request(user_id=current_user.id)
        return {"success": True, "message": "Deletion request cancelled successfully"}
    except GDPRServiceError as e:
        if e.code == "no_pending_request":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=e.message,
            ) from e
        elif e.code == "grace_period_expired":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=e.message,
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e


@router.get("/deletion-status", response_model=DeletionStatusResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
async def get_deletion_status(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> DeletionStatusResponse:
    """
    Get status of deletion request.

    Returns information about any pending or past deletion requests,
    including the grace period end date and whether it can be cancelled.
    """
    gdpr_service = GDPRService(session)
    status_info = await gdpr_service.get_deletion_status(user_id=current_user.id)
    return DeletionStatusResponse(**status_info)


@router.post("/export-data", response_model=DataExportResponse)
@limiter.limit(GDPR_RATE_LIMIT)
async def export_my_data(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> DataExportResponse:
    """
    Request data export (GDPR right to portability).

    Generates a JSON export of all user data including:
    - Profile information
    - Wallet transactions
    - Shifts posted/worked
    - Applications
    - Reviews given and received
    - Notifications
    - Payment methods (masked)

    The export will be available for 48 hours.
    """
    gdpr_service = GDPRService(session)

    try:
        export_url = await gdpr_service.export_user_data(user_id=current_user.id)

        # Get the updated deletion request with export info
        status_info = await gdpr_service.get_deletion_status(user_id=current_user.id)

        return DataExportResponse(
            export_id=status_info["request"].id if status_info["request"] else 0,
            status="ready",
            download_url=export_url,
            expires_at=status_info["request"].data_export_expires_at
            if status_info["request"]
            else None,
            message="Your data export is ready. The download link will expire in 48 hours.",
        )
    except GDPRServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e


@router.get("/export-data/download", response_model=DataExportDownloadResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
async def download_data_export(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    export_id: str = Query(..., description="Export ID from the export request"),
) -> DataExportDownloadResponse:
    """
    Download data export file.

    Returns the download URL for the exported data.
    The URL is valid for 48 hours from the time of export.
    """
    gdpr_service = GDPRService(session)
    status_info = await gdpr_service.get_deletion_status(user_id=current_user.id)

    if not status_info["request"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data export found",
        )

    deletion_req = status_info["request"]
    if not deletion_req.data_export_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data export available",
        )

    from datetime import UTC, datetime

    if deletion_req.data_export_expires_at and datetime.now(UTC) > deletion_req.data_export_expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Data export has expired. Please request a new export.",
        )

    # In production, this would return a presigned S3/GCS URL
    return DataExportDownloadResponse(
        download_url=deletion_req.data_export_url,
        expires_at=deletion_req.data_export_expires_at,
        file_size_bytes=None,  # Would be populated from cloud storage
    )


# ==================== Admin Endpoints ====================


@router.get("/admin/deletion-requests", response_model=DeletionRequestListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
async def list_deletion_requests(
    request: Request,
    session: SessionDep,
    current_user: AdminUserDep,
    status_filter: DeletionRequestStatus | None = Query(
        None,
        alias="status",
        description="Filter by status",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> DeletionRequestListResponse:
    """
    Admin: List all deletion requests.

    Allows filtering by status and pagination.
    """
    from sqlmodel import func, select

    from app.models.gdpr import DeletionRequest

    query = select(DeletionRequest)

    if status_filter:
        query = query.where(DeletionRequest.status == status_filter)

    # Get total count
    count_query = select(func.count(DeletionRequest.id))
    if status_filter:
        count_query = count_query.where(DeletionRequest.status == status_filter)
    total = session.exec(count_query).one()

    # Get paginated results
    requests = list(
        session.exec(
            query.order_by(DeletionRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        ).all()
    )

    return DeletionRequestListResponse(items=requests, total=total)


@router.post("/admin/process-deletion/{request_id}", response_model=DeletionRequestResponse)
@limiter.limit(GDPR_RATE_LIMIT)
async def admin_process_deletion(
    request: Request,
    session: SessionDep,
    current_user: AdminUserDep,
    request_id: int,
) -> DeletionRequestResponse:
    """
    Admin: Manually trigger deletion processing.

    This allows admins to immediately process a deletion request
    without waiting for the grace period (use with caution).
    """
    from app.models.gdpr import DeletionRequest

    deletion_request = session.get(DeletionRequest, request_id)
    if not deletion_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deletion request not found",
        )

    if deletion_request.status != DeletionRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot process request with status: {deletion_request.status}",
        )

    gdpr_service = GDPRService(session)

    try:
        # Override grace period check for admin
        from datetime import datetime, timedelta

        # Temporarily adjust requested_at to bypass grace period
        original_requested_at = deletion_request.requested_at
        deletion_request.requested_at = datetime.now(UTC) - timedelta(
            days=GDPRService.DELETION_GRACE_PERIOD_DAYS + 1
        )
        session.add(deletion_request)
        session.commit()

        await gdpr_service.process_deletion(request_id)

        # Refresh and return
        session.refresh(deletion_request)
        return deletion_request

    except GDPRServiceError as e:
        # Restore original requested_at on failure
        deletion_request.requested_at = original_requested_at
        session.add(deletion_request)
        session.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        ) from e


@router.get("/admin/deletion-requests/{request_id}", response_model=AdminDeletionRequestResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
async def get_deletion_request_details(
    request: Request,
    session: SessionDep,
    current_user: AdminUserDep,
    request_id: int,
) -> AdminDeletionRequestResponse:
    """
    Admin: Get detailed information about a deletion request.

    Includes user information for context.
    """
    from app.models.gdpr import DeletionRequest
    from app.models.user import User

    deletion_request = session.get(DeletionRequest, request_id)
    if not deletion_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deletion request not found",
        )

    user = session.get(User, deletion_request.user_id)

    return AdminDeletionRequestResponse(
        id=deletion_request.id,
        user_id=deletion_request.user_id,
        user_email=user.email if user else None,
        user_full_name=user.full_name if user else None,
        status=deletion_request.status,
        requested_at=deletion_request.requested_at,
        reason=deletion_request.reason,
        processing_started_at=deletion_request.processing_started_at,
        completed_at=deletion_request.completed_at,
        wallet_closed=deletion_request.wallet_closed,
        wallet_balance_at_deletion=deletion_request.wallet_balance_at_deletion,
        pending_payouts_cancelled=deletion_request.pending_payouts_cancelled,
        transactions_anonymized=deletion_request.transactions_anonymized,
        shifts_anonymized=deletion_request.shifts_anonymized,
        reviews_anonymized=deletion_request.reviews_anonymized,
        notifications_deleted=deletion_request.notifications_deleted,
        error_message=deletion_request.error_message,
        created_at=deletion_request.created_at,
        updated_at=deletion_request.updated_at,
    )
