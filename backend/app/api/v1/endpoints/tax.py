"""Tax compliance API endpoints for ExtraShifty."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
from app.models.user import UserType
from app.schemas.tax import (
    Generate1099Request,
    Generate1099Response,
    PendingW9Response,
    TaxDocumentListResponse,
    TaxDocumentResponse,
    TaxStatusResponse,
    W9SubmitRequest,
    W9SubmitResponse,
)
from app.services.tax_service import TaxError, TaxService

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== User Endpoints ====================


@router.get("/status", response_model=TaxStatusResponse)
async def get_tax_status(
    session: SessionDep,
    current_user: ActiveUserDep,
    year: int | None = Query(
        default=None,
        description="Tax year (defaults to current year)",
    ),
) -> TaxStatusResponse:
    """
    Get user's tax status for the year.

    Returns earnings, threshold status, W9 status, and 1099 status.
    Only available for staff and agency users who receive payments.
    """
    # Only staff and agency receive 1099s
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tax status only available for staff and agency users",
        )

    tax_service = TaxService(session)

    try:
        status_data = await tax_service.check_threshold_status(
            user_id=current_user.id,
            tax_year=year,
        )

        return TaxStatusResponse(
            tax_year=status_data["tax_year"],
            total_earnings=status_data["total_earnings"],
            threshold=status_data["threshold"],
            threshold_reached=status_data["threshold_reached"],
            threshold_reached_at=status_data["threshold_reached_at"],
            w9_required=status_data["w9_required"],
            w9_submitted=status_data["w9_submitted"],
            w9_submitted_at=status_data["w9_submitted_at"],
            status=status_data["status"],
            form_generated=status_data["form_generated"],
            form_sent=status_data["form_sent"],
        )

    except TaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/w9", response_model=W9SubmitResponse)
async def submit_w9(
    session: SessionDep,
    current_user: ActiveUserDep,
    w9_data: W9SubmitRequest,
    year: int | None = Query(
        default=None,
        description="Tax year (defaults to current year)",
    ),
) -> W9SubmitResponse:
    """
    Submit W9 information.

    Required when earnings exceed $600 threshold. W9 data includes:
    - Legal name and optional business name
    - Tax classification (individual, LLC, corporation, etc.)
    - SSN or EIN (stored securely, only last 4 digits visible)
    - US address

    The certification field must be True to confirm the information is correct.
    """
    # Only staff and agency submit W9s
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="W9 submission only available for staff and agency users",
        )

    tax_service = TaxService(session)
    tax_year = year or datetime.utcnow().year

    try:
        tax_year_record = await tax_service.submit_w9(
            user_id=current_user.id,
            tax_year=tax_year,
            w9_data=w9_data,
        )

        return W9SubmitResponse(
            success=True,
            message="W9 submitted successfully",
            tax_year=tax_year,
            status=tax_year_record.status.value,
            ssn_last_four=tax_year_record.ssn_last_four,
        )

    except TaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/documents", response_model=TaxDocumentListResponse)
async def list_tax_documents(
    session: SessionDep,
    current_user: ActiveUserDep,
    year: int | None = Query(
        default=None,
        description="Filter by tax year",
    ),
) -> TaxDocumentListResponse:
    """
    List tax documents (W9, 1099-NEC).

    Returns all tax documents for the current user, optionally filtered by year.
    """
    # Only staff and agency have tax documents
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tax documents only available for staff and agency users",
        )

    tax_service = TaxService(session)

    documents = tax_service.get_tax_documents(
        user_id=current_user.id,
        tax_year=year,
    )

    return TaxDocumentListResponse(
        documents=[
            TaxDocumentResponse(
                id=doc.id,
                tax_year=doc.tax_year.tax_year,
                document_type=doc.document_type.value,
                file_name=doc.file_name,
                created_at=doc.created_at,
            )
            for doc in documents
        ],
        total=len(documents),
    )


@router.get("/documents/{document_id}/download")
async def download_tax_document(
    session: SessionDep,
    current_user: ActiveUserDep,
    document_id: int,
):
    """
    Download a tax document.

    Returns the PDF file for the specified document ID.
    Users can only download their own documents.
    """
    import os

    # Only staff and agency have tax documents
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tax documents only available for staff and agency users",
        )

    tax_service = TaxService(session)

    document = tax_service.get_document_by_id(
        document_id=document_id,
        user_id=current_user.id,
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if not document.file_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file has not been generated yet",
        )

    # Check if file exists on disk (for local file storage)
    if document.file_url.startswith("/") or document.file_url.startswith("./"):
        # Local file path
        if os.path.exists(document.file_url):
            return FileResponse(
                path=document.file_url,
                filename=document.file_name,
                media_type="application/pdf",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document file not found on server",
            )

    # For cloud storage URLs (S3, etc.), redirect or proxy
    if document.file_url.startswith("http"):
        # In production, you would either:
        # 1. Generate a pre-signed URL and redirect
        # 2. Stream the file through the server
        # For now, return the URL as a temporary redirect
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=document.file_url)

    # File storage not configured
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Document storage not configured. Please contact support.",
    )


# ==================== Admin Endpoints ====================


@router.get("/admin/pending-w9", response_model=PendingW9Response)
async def get_pending_w9_list(
    session: SessionDep,
    current_user: AdminUserDep,
    year: int | None = Query(
        default=None,
        description="Tax year (defaults to current year)",
    ),
) -> PendingW9Response:
    """
    Admin: List users who need to submit W9.

    Returns all users who have crossed the $600 threshold but haven't
    submitted their W9 information yet.
    """
    tax_service = TaxService(session)

    try:
        users = await tax_service.get_users_needing_w9(tax_year=year)

        return PendingW9Response(
            users=users,
            total=len(users),
        )

    except TaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/admin/pending-1099", response_model=PendingW9Response)
async def get_pending_1099_list(
    session: SessionDep,
    current_user: AdminUserDep,
    year: int = Query(
        description="Tax year to check",
    ),
) -> PendingW9Response:
    """
    Admin: List users who need 1099-NEC generated.

    Returns all users who have submitted W9 but haven't had their
    1099-NEC form generated yet.
    """
    tax_service = TaxService(session)

    try:
        users = await tax_service.get_users_needing_1099(tax_year=year)

        return PendingW9Response(
            users=users,
            total=len(users),
        )

    except TaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/admin/generate-1099s", response_model=Generate1099Response)
async def batch_generate_1099s(
    session: SessionDep,
    current_user: AdminUserDep,
    request: Generate1099Request,
) -> Generate1099Response:
    """
    Admin: Generate 1099-NEC forms for a tax year.

    Generates 1099-NEC forms for all eligible users (W9 received) or
    for specific user IDs if provided. This should be run in January
    for the prior tax year.
    """
    tax_service = TaxService(session)

    try:
        result = await tax_service.batch_generate_1099s(
            tax_year=request.tax_year,
            user_ids=request.user_ids,
        )

        success = result["failed_count"] == 0

        return Generate1099Response(
            success=success,
            message=f"Generated {result['generated_count']} 1099-NEC forms"
            + (f" with {result['failed_count']} failures" if result["failed_count"] > 0 else ""),
            generated_count=result["generated_count"],
            failed_count=result["failed_count"],
            errors=result["errors"],
        )

    except TaxError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e
