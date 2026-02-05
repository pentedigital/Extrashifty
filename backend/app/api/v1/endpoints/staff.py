"""Staff endpoints for ExtraShifty."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import ActiveUserDep, SessionDep
from app.models.application import Application, ApplicationStatus
from app.models.shift import Shift
from app.models.user import UserType

router = APIRouter()


class StaffProfile(BaseModel):
    """Staff profile response schema."""

    id: int
    email: str
    full_name: str
    avatar_url: str | None = None
    phone: str | None = None
    bio: str | None = None
    skills: list[str] = []
    hourly_rate: float | None = None
    is_available: bool = True
    is_verified: bool = False
    average_rating: float = 0.0
    total_shifts: int = 0
    total_hours: float = 0.0
    created_at: datetime


class StaffProfileUpdate(BaseModel):
    """Staff profile update schema."""

    full_name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    bio: str | None = None
    skills: list[str] | None = None
    hourly_rate: float | None = None
    is_available: bool | None = None


class StaffWallet(BaseModel):
    """Staff wallet response schema."""

    balance: float = 0.0
    pending: float = 0.0
    currency: str = "EUR"
    total_earned: float = 0.0
    last_payout_date: datetime | None = None


class ClockRecord(BaseModel):
    """Clock record schema."""

    id: int
    shift_id: int
    shift_title: str
    clock_in: datetime
    clock_out: datetime | None = None
    hours_worked: float
    status: str


class ClockRecordsResponse(BaseModel):
    """Clock records list response."""

    items: list[ClockRecord]
    total: int


# Clock in/out request schemas
class ClockInRequest(BaseModel):
    """Request schema for clocking in."""

    shift_id: int
    notes: str | None = None


class ClockOutRequest(BaseModel):
    """Request schema for clocking out."""

    shift_id: int
    notes: str | None = None


class ClockActionResponse(BaseModel):
    """Response schema for clock in/out actions."""

    id: int
    shift_id: int
    clock_in: datetime
    clock_out: datetime | None = None
    status: str
    message: str


# Application schemas
class ApplicationCreate(BaseModel):
    """Request schema for creating an application."""

    shift_id: int
    cover_message: str | None = None


class ApplicationResponse(BaseModel):
    """Response schema for an application."""

    id: int
    shift_id: int
    applicant_id: int
    status: str
    cover_message: str | None = None
    applied_at: datetime
    shift_title: str | None = None
    shift_date: str | None = None
    company_name: str | None = None


class ApplicationsResponse(BaseModel):
    """Response schema for list of applications."""

    items: list[ApplicationResponse]
    total: int


# Earnings schemas
class EarningsRecord(BaseModel):
    """Individual earnings record."""

    id: int
    shift_id: int
    shift_title: str
    date: str
    hours_worked: float
    hourly_rate: float
    gross_amount: float
    net_amount: float
    status: str  # pending, paid, processing


class EarningsResponse(BaseModel):
    """Response schema for earnings history."""

    items: list[EarningsRecord]
    total: int
    total_gross: float
    total_net: float


# Review schemas
class ReviewRecord(BaseModel):
    """Individual review record."""

    id: int
    shift_id: int
    shift_title: str
    company_name: str
    rating: float
    comment: str | None = None
    created_at: datetime


class ReviewsResponse(BaseModel):
    """Response schema for reviews."""

    items: list[ReviewRecord]
    total: int
    average_rating: float


@router.get("/profile", response_model=StaffProfile)
def get_staff_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> Any:
    """Get current staff member's profile."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    return StaffProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=None,
        phone=None,
        bio=None,
        skills=[],
        hourly_rate=None,
        is_available=True,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        total_shifts=0,
        total_hours=0.0,
        created_at=current_user.created_at,
    )


@router.patch("/profile", response_model=StaffProfile)
def update_staff_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
    profile_update: StaffProfileUpdate,
) -> Any:
    """Update current staff member's profile."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name

    current_user.updated_at = datetime.utcnow()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return StaffProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=None,
        phone=None,
        bio=None,
        skills=[],
        hourly_rate=None,
        is_available=True,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        total_shifts=0,
        total_hours=0.0,
        created_at=current_user.created_at,
    )


@router.get("/wallet", response_model=StaffWallet)
def get_staff_wallet(
    current_user: ActiveUserDep,
) -> Any:
    """Get current staff member's wallet information."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    return StaffWallet(
        balance=0.0,
        pending=0.0,
        currency="EUR",
        total_earned=0.0,
        last_payout_date=None,
    )


@router.get("/clock-records", response_model=ClockRecordsResponse)
def get_clock_records(
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get staff member's clock in/out records."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    return ClockRecordsResponse(items=[], total=0)


@router.get("/shifts")
def get_staff_shifts(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_status: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get staff member's assigned shifts (accepted applications)."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Get shifts where the staff member has an accepted application
    query = (
        select(Shift)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
    )

    if shift_status:
        query = query.where(Shift.status == shift_status)

    query = query.offset(skip).limit(limit)
    shifts = session.exec(query).all()

    # Get total count
    count_query = (
        select(Shift)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
    )
    if shift_status:
        count_query = count_query.where(Shift.status == shift_status)
    total = len(session.exec(count_query).all())

    return {"items": shifts, "total": total}


@router.post("/clock-in", response_model=ClockActionResponse)
def clock_in(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: ClockInRequest,
) -> Any:
    """Clock in for a shift."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Verify the staff member has an accepted application for this shift
    application = session.exec(
        select(Application)
        .where(Application.shift_id == request.shift_id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No accepted application found for this shift",
        )

    # For now, return a placeholder response
    # In a full implementation, this would create a ClockRecord in the database
    return ClockActionResponse(
        id=1,
        shift_id=request.shift_id,
        clock_in=datetime.utcnow(),
        clock_out=None,
        status="clocked_in",
        message="Successfully clocked in",
    )


@router.post("/clock-out", response_model=ClockActionResponse)
def clock_out(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: ClockOutRequest,
) -> Any:
    """Clock out from a shift."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Verify the staff member has an accepted application for this shift
    application = session.exec(
        select(Application)
        .where(Application.shift_id == request.shift_id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No accepted application found for this shift",
        )

    # For now, return a placeholder response
    # In a full implementation, this would update the ClockRecord in the database
    clock_out_time = datetime.utcnow()
    return ClockActionResponse(
        id=1,
        shift_id=request.shift_id,
        clock_in=datetime.utcnow(),  # Would be fetched from DB
        clock_out=clock_out_time,
        status="clocked_out",
        message="Successfully clocked out",
    )


@router.get("/applications", response_model=ApplicationsResponse)
def get_applications(
    session: SessionDep,
    current_user: ActiveUserDep,
    application_status: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get staff member's application history."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Build query for applications
    query = select(Application).where(Application.applicant_id == current_user.id)

    if application_status:
        query = query.where(Application.status == application_status)

    query = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit)
    applications = session.exec(query).all()

    # Get total count
    count_query = select(Application).where(Application.applicant_id == current_user.id)
    if application_status:
        count_query = count_query.where(Application.status == application_status)
    total = len(session.exec(count_query).all())

    # Build response with shift details
    items = []
    for app in applications:
        shift = session.get(Shift, app.shift_id)
        company = None
        if shift:
            from app.models.user import User

            company = session.get(User, shift.company_id)

        items.append(
            ApplicationResponse(
                id=app.id,
                shift_id=app.shift_id,
                applicant_id=app.applicant_id,
                status=app.status.value,
                cover_message=app.cover_message,
                applied_at=app.applied_at,
                shift_title=shift.title if shift else None,
                shift_date=str(shift.date) if shift else None,
                company_name=company.full_name if company else None,
            )
        )

    return ApplicationsResponse(items=items, total=total)


@router.post("/applications", response_model=ApplicationResponse)
def create_application(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: ApplicationCreate,
) -> Any:
    """Apply to a shift."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Check if shift exists
    shift = session.get(Shift, request.shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )

    # Check if already applied
    existing = session.exec(
        select(Application)
        .where(Application.shift_id == request.shift_id)
        .where(Application.applicant_id == current_user.id)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this shift",
        )

    # Create application
    application = Application(
        shift_id=request.shift_id,
        applicant_id=current_user.id,
        cover_message=request.cover_message,
        status=ApplicationStatus.PENDING,
    )
    session.add(application)
    session.commit()
    session.refresh(application)

    # Get company name
    from app.models.user import User

    company = session.get(User, shift.company_id)

    return ApplicationResponse(
        id=application.id,
        shift_id=application.shift_id,
        applicant_id=application.applicant_id,
        status=application.status.value,
        cover_message=application.cover_message,
        applied_at=application.applied_at,
        shift_title=shift.title,
        shift_date=str(shift.date),
        company_name=company.full_name if company else None,
    )


@router.delete("/applications/{application_id}")
def withdraw_application(
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> Any:
    """Withdraw an application."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Find the application
    application = session.get(Application, application_id)

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Verify ownership
    if application.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only withdraw your own applications",
        )

    # Can only withdraw pending applications
    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only withdraw pending applications",
        )

    # Update status to withdrawn
    application.status = ApplicationStatus.WITHDRAWN
    session.add(application)
    session.commit()

    return {"message": "Application withdrawn successfully"}


@router.get("/earnings", response_model=EarningsResponse)
def get_earnings(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get staff member's earnings history."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # For now, return placeholder data
    # In a full implementation, this would query completed shifts and payment records
    return EarningsResponse(
        items=[],
        total=0,
        total_gross=0.0,
        total_net=0.0,
    )


@router.get("/reviews", response_model=ReviewsResponse)
def get_reviews(
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get reviews received by the staff member."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # For now, return placeholder data
    # In a full implementation, this would query a reviews table
    return ReviewsResponse(
        items=[],
        total=0,
        average_rating=0.0,
    )
