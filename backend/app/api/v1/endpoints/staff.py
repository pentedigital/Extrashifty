"""Staff endpoints for ExtraShifty."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlmodel import func, select

from app.api.deps import ActiveUserDep, SessionDep
from app.models.application import Application, ApplicationStatus
from app.models.profile import ClockRecord as ClockRecordModel
from app.models.profile import StaffProfile as StaffProfileModel
from app.models.review import Review, ReviewType
from app.models.shift import Shift, ShiftStatus
from app.models.user import UserType
from app.models.wallet import Wallet

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

    # Get or create staff profile
    profile = session.exec(
        select(StaffProfileModel).where(StaffProfileModel.user_id == current_user.id)
    ).first()

    # Calculate total completed shifts
    total_shifts_query = (
        select(func.count())
        .select_from(Application)
        .join(Shift, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total_shifts = session.exec(total_shifts_query).one() or 0

    # Calculate total hours worked from completed shifts
    total_hours_query = (
        select(func.coalesce(func.sum(Shift.actual_hours_worked), 0))
        .select_from(Application)
        .join(Shift, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total_hours = float(session.exec(total_hours_query).one() or 0)

    # Calculate average rating from reviews
    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    average_rating = float(session.exec(avg_rating_query).one() or 0)

    return StaffProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=profile.avatar_url if profile else None,
        phone=profile.phone if profile else None,
        bio=profile.bio if profile else None,
        skills=profile.skills or [] if profile else [],
        hourly_rate=float(profile.hourly_rate) if profile and profile.hourly_rate else None,
        is_available=profile.is_available if profile else True,
        is_verified=current_user.is_verified,
        average_rating=round(average_rating, 2),
        total_shifts=total_shifts,
        total_hours=round(total_hours, 2),
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

    # Update user's full_name if provided
    if profile_update.full_name is not None:
        current_user.full_name = profile_update.full_name
        current_user.updated_at = datetime.utcnow()
        session.add(current_user)

    # Get or create staff profile
    profile = session.exec(
        select(StaffProfileModel).where(StaffProfileModel.user_id == current_user.id)
    ).first()

    if not profile:
        profile = StaffProfileModel(user_id=current_user.id)

    # Update profile fields
    if profile_update.avatar_url is not None:
        profile.avatar_url = profile_update.avatar_url
    if profile_update.phone is not None:
        profile.phone = profile_update.phone
    if profile_update.bio is not None:
        profile.bio = profile_update.bio
    if profile_update.skills is not None:
        profile.skills = profile_update.skills
    if profile_update.hourly_rate is not None:
        profile.hourly_rate = Decimal(str(profile_update.hourly_rate))
    if profile_update.is_available is not None:
        profile.is_available = profile_update.is_available

    profile.updated_at = datetime.utcnow()
    session.add(profile)
    session.commit()
    session.refresh(current_user)
    session.refresh(profile)

    # Calculate totals for response
    total_shifts_query = (
        select(func.count())
        .select_from(Application)
        .join(Shift, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total_shifts = session.exec(total_shifts_query).one() or 0

    total_hours_query = (
        select(func.coalesce(func.sum(Shift.actual_hours_worked), 0))
        .select_from(Application)
        .join(Shift, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total_hours = float(session.exec(total_hours_query).one() or 0)

    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    average_rating = float(session.exec(avg_rating_query).one() or 0)

    return StaffProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=profile.avatar_url,
        phone=profile.phone,
        bio=profile.bio,
        skills=profile.skills or [],
        hourly_rate=float(profile.hourly_rate) if profile.hourly_rate else None,
        is_available=profile.is_available,
        is_verified=current_user.is_verified,
        average_rating=round(average_rating, 2),
        total_shifts=total_shifts,
        total_hours=round(total_hours, 2),
        created_at=current_user.created_at,
    )


@router.get("/wallet", response_model=StaffWallet)
def get_staff_wallet(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> Any:
    """Get current staff member's wallet information."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    # Get wallet for user
    wallet = session.exec(
        select(Wallet).where(Wallet.user_id == current_user.id)
    ).first()

    if not wallet:
        # Return empty wallet if not created yet
        return StaffWallet(
            balance=0.0,
            pending=0.0,
            currency="EUR",
            total_earned=0.0,
            last_payout_date=None,
        )

    # Calculate total earned from completed shifts
    from app.models.payment import Transaction, TransactionStatus, TransactionType

    total_earned_query = (
        select(func.coalesce(func.sum(Transaction.net_amount), 0))
        .where(Transaction.wallet_id == wallet.id)
        .where(Transaction.transaction_type == TransactionType.SETTLEMENT)
        .where(Transaction.status == TransactionStatus.COMPLETED)
    )
    total_earned = float(session.exec(total_earned_query).one() or 0)

    # Get last payout date
    from app.models.payment import Payout, PayoutStatus

    last_payout = session.exec(
        select(Payout)
        .where(Payout.wallet_id == wallet.id)
        .where(Payout.status == PayoutStatus.PAID)
        .order_by(Payout.paid_at.desc())
        .limit(1)
    ).first()

    return StaffWallet(
        balance=float(wallet.balance),
        pending=float(wallet.reserved_balance),
        currency=wallet.currency,
        total_earned=round(total_earned, 2),
        last_payout_date=last_payout.paid_at if last_payout else None,
    )


@router.get("/clock-records", response_model=ClockRecordsResponse)
def get_clock_records(
    session: SessionDep,
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

    # Query clock records for this user
    query = (
        select(ClockRecordModel)
        .where(ClockRecordModel.staff_user_id == current_user.id)
        .order_by(ClockRecordModel.clock_in.desc())
    )

    # Get total count
    count_query = (
        select(func.count())
        .select_from(ClockRecordModel)
        .where(ClockRecordModel.staff_user_id == current_user.id)
    )
    total = session.exec(count_query).one() or 0

    # Get paginated records
    records = session.exec(query.offset(skip).limit(limit)).all()

    # Build response items with shift details
    items = []
    for record in records:
        shift = session.get(Shift, record.shift_id)
        items.append(
            ClockRecord(
                id=record.id,
                shift_id=record.shift_id,
                shift_title=shift.title if shift else "Unknown Shift",
                clock_in=record.clock_in,
                clock_out=record.clock_out,
                hours_worked=float(record.hours_worked) if record.hours_worked else 0.0,
                status=record.status,
            )
        )

    return ClockRecordsResponse(items=items, total=total)


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

    # Check if already clocked in for this shift
    existing_record = session.exec(
        select(ClockRecordModel)
        .where(ClockRecordModel.shift_id == request.shift_id)
        .where(ClockRecordModel.staff_user_id == current_user.id)
        .where(ClockRecordModel.status == "clocked_in")
    ).first()

    if existing_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already clocked in for this shift",
        )

    # Create clock record
    clock_record = ClockRecordModel(
        shift_id=request.shift_id,
        staff_user_id=current_user.id,
        clock_in=datetime.utcnow(),
        clock_in_notes=request.notes,
        status="clocked_in",
    )
    session.add(clock_record)

    # Update shift status to in_progress if it was open/filled
    shift = session.get(Shift, request.shift_id)
    if shift and shift.status in (ShiftStatus.OPEN, ShiftStatus.FILLED):
        shift.status = ShiftStatus.IN_PROGRESS
        shift.clock_in_at = datetime.utcnow()
        session.add(shift)

    session.commit()
    session.refresh(clock_record)

    return ClockActionResponse(
        id=clock_record.id,
        shift_id=request.shift_id,
        clock_in=clock_record.clock_in,
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

    # Find the active clock record
    clock_record = session.exec(
        select(ClockRecordModel)
        .where(ClockRecordModel.shift_id == request.shift_id)
        .where(ClockRecordModel.staff_user_id == current_user.id)
        .where(ClockRecordModel.status == "clocked_in")
    ).first()

    if not clock_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active clock-in record found for this shift",
        )

    # Update clock record
    clock_out_time = datetime.utcnow()
    clock_record.clock_out = clock_out_time
    clock_record.clock_out_notes = request.notes
    clock_record.status = "clocked_out"

    # Calculate hours worked
    time_diff = clock_out_time - clock_record.clock_in
    hours_worked = Decimal(str(time_diff.total_seconds() / 3600))
    clock_record.hours_worked = hours_worked.quantize(Decimal("0.01"))
    clock_record.updated_at = datetime.utcnow()

    session.add(clock_record)

    # Update shift with clock out time and actual hours
    shift = session.get(Shift, request.shift_id)
    if shift:
        shift.clock_out_at = clock_out_time
        shift.actual_hours_worked = clock_record.hours_worked

        # Check if all workers have clocked out (for multi-spot shifts)
        active_clock_ins = session.exec(
            select(func.count())
            .select_from(ClockRecordModel)
            .where(ClockRecordModel.shift_id == request.shift_id)
            .where(ClockRecordModel.status == "clocked_in")
        ).one() or 0

        # If no more active clock-ins, mark shift as completed
        if active_clock_ins == 0:
            shift.status = ShiftStatus.COMPLETED

        session.add(shift)

    session.commit()
    session.refresh(clock_record)

    return ClockActionResponse(
        id=clock_record.id,
        shift_id=request.shift_id,
        clock_in=clock_record.clock_in,
        clock_out=clock_record.clock_out,
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

    # Query completed shifts with accepted applications for this user
    query = (
        select(Shift, Application)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
        .order_by(Shift.date.desc())
    )

    # Get total count
    count_query = (
        select(func.count())
        .select_from(Shift)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total = session.exec(count_query).one() or 0

    # Get paginated results
    results = session.exec(query.offset(skip).limit(limit)).all()

    # Build earnings records
    items = []
    total_gross = Decimal("0.00")
    total_net = Decimal("0.00")
    platform_fee_rate = Decimal("0.10")  # 10% platform fee

    for shift, application in results:
        # Use actual hours worked if available, otherwise calculate from scheduled times
        if shift.actual_hours_worked:
            hours_worked = shift.actual_hours_worked
        else:
            # Calculate scheduled hours
            start_dt = datetime.combine(shift.date, shift.start_time)
            end_dt = datetime.combine(shift.date, shift.end_time)
            hours_worked = Decimal(str((end_dt - start_dt).seconds / 3600))

        gross_amount = hours_worked * shift.hourly_rate
        fee = gross_amount * platform_fee_rate
        net_amount = gross_amount - fee

        total_gross += gross_amount
        total_net += net_amount

        # Determine payment status (simplified - would check transactions in full implementation)
        payment_status = "paid" if shift.status == ShiftStatus.COMPLETED else "pending"

        items.append(
            EarningsRecord(
                id=application.id,
                shift_id=shift.id,
                shift_title=shift.title,
                date=str(shift.date),
                hours_worked=float(hours_worked),
                hourly_rate=float(shift.hourly_rate),
                gross_amount=float(gross_amount),
                net_amount=float(net_amount),
                status=payment_status,
            )
        )

    return EarningsResponse(
        items=items,
        total=total,
        total_gross=float(total_gross),
        total_net=float(total_net),
    )


@router.get("/reviews", response_model=ReviewsResponse)
def get_reviews(
    session: SessionDep,
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

    # Query reviews for this staff member
    query = (
        select(Review)
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
        .order_by(Review.created_at.desc())
    )

    # Get total count
    count_query = (
        select(func.count())
        .select_from(Review)
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    total = session.exec(count_query).one() or 0

    # Calculate average rating
    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    average_rating = float(session.exec(avg_rating_query).one() or 0)

    # Get paginated results
    reviews = session.exec(query.offset(skip).limit(limit)).all()

    # Build response items with shift and company details
    from app.models.user import User

    items = []
    for review in reviews:
        shift = session.get(Shift, review.shift_id)
        company = session.get(User, review.reviewer_id)

        items.append(
            ReviewRecord(
                id=review.id,
                shift_id=review.shift_id,
                shift_title=shift.title if shift else "Unknown Shift",
                company_name=company.full_name if company else "Unknown Company",
                rating=float(review.rating),
                comment=review.comment,
                created_at=review.created_at,
            )
        )

    return ReviewsResponse(
        items=items,
        total=total,
        average_rating=round(average_rating, 2),
    )
