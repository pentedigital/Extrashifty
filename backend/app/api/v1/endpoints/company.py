"""Company endpoints for ExtraShifty."""

import datetime as dt
from datetime import datetime
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import select

from app.api.deps import ActiveUserDep, SessionDep
from app.models.application import Application, ApplicationStatus
from app.models.review import Review, ReviewType
from app.models.shift import Shift, ShiftStatus
from app.models.user import UserType

router = APIRouter()


# ============================================================================
# Schemas
# ============================================================================


class CompanyProfile(BaseModel):
    """Company profile response schema."""

    id: int
    email: str
    business_name: str
    business_type: str | None = None
    logo_url: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    website: str | None = None
    is_verified: bool = False
    average_rating: float = 0.0
    total_shifts_posted: int = 0
    total_staff_hired: int = 0
    created_at: datetime


class CompanyProfileUpdate(BaseModel):
    """Company profile update schema."""

    business_name: str | None = None
    business_type: str | None = None
    logo_url: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    website: str | None = None


class CompanyWallet(BaseModel):
    """Company wallet response schema."""

    balance: float = 0.0
    pending_payments: float = 0.0
    currency: str = "EUR"
    total_spent: float = 0.0
    last_payment_date: datetime | None = None


class Venue(BaseModel):
    """Venue schema."""

    id: int
    name: str
    address: str
    city: str
    is_primary: bool = False


class VenueCreate(BaseModel):
    """Venue creation schema."""

    name: str
    address: str
    city: str
    is_primary: bool = False


class VenueUpdate(BaseModel):
    """Venue update schema."""

    name: str | None = None
    address: str | None = None
    city: str | None = None
    is_primary: bool | None = None


class VenuesResponse(BaseModel):
    """Venues list response."""

    items: list[Venue]
    total: int


class ShiftCreate(BaseModel):
    """Shift creation schema."""

    title: str
    description: str | None = None
    shift_type: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    hourly_rate: Decimal = Field(ge=0, decimal_places=2)
    location: str
    address: str | None = None
    city: str
    spots_total: int = Field(default=1, ge=1)
    requirements: dict[str, Any] | None = None


class ShiftUpdate(BaseModel):
    """Shift update schema."""

    title: str | None = None
    description: str | None = None
    shift_type: str | None = None
    date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    hourly_rate: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    location: str | None = None
    address: str | None = None
    city: str | None = None
    spots_total: int | None = Field(default=None, ge=1)
    requirements: dict[str, Any] | None = None
    status: ShiftStatus | None = None


class ShiftResponse(BaseModel):
    """Shift response schema."""

    id: int
    title: str
    description: str | None
    company_id: int
    shift_type: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    hourly_rate: Decimal
    location: str
    address: str | None
    city: str
    spots_total: int
    spots_filled: int
    status: ShiftStatus
    requirements: dict[str, Any] | None
    created_at: datetime


class ShiftsResponse(BaseModel):
    """Shifts list response."""

    items: list[ShiftResponse]
    total: int
    skip: int
    limit: int


class ApplicantInfo(BaseModel):
    """Applicant information schema."""

    id: int
    full_name: str
    email: str
    user_type: str


class ApplicationResponse(BaseModel):
    """Application response schema."""

    id: int
    shift_id: int
    applicant_id: int
    status: ApplicationStatus
    cover_message: str | None
    applied_at: datetime
    applicant: ApplicantInfo | None = None


class ApplicationsResponse(BaseModel):
    """Applications list response."""

    items: list[ApplicationResponse]
    total: int


class SpendingRecord(BaseModel):
    """Spending record schema."""

    id: int
    shift_id: int
    shift_title: str
    amount: Decimal
    worker_name: str
    date: dt.date
    status: str


class SpendingResponse(BaseModel):
    """Spending history response."""

    items: list[SpendingRecord]
    total: int
    total_spent: Decimal


class ReviewCreate(BaseModel):
    """Review creation schema."""

    shift_id: int
    worker_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = None


class ReviewResponse(BaseModel):
    """Review response schema."""

    id: int
    reviewer_id: int
    reviewee_id: int
    shift_id: int
    rating: int
    comment: str | None
    created_at: datetime
    worker_name: str | None = None
    shift_title: str | None = None


class ReviewsResponse(BaseModel):
    """Reviews list response."""

    items: list[ReviewResponse]
    total: int


# ============================================================================
# Helper Functions
# ============================================================================


def require_company_user(user: Any) -> None:
    """Raise 403 if user is not a company."""
    if user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )


def get_company_shift(session: SessionDep, shift_id: int, company_id: int) -> Shift:
    """Get shift owned by company or raise 404."""
    shift = session.get(Shift, shift_id)
    if not shift or shift.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )
    return shift


# ============================================================================
# Profile Endpoints
# ============================================================================


@router.get("/profile", response_model=CompanyProfile)
def get_company_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> Any:
    """Get current company's profile."""
    require_company_user(current_user)

    return CompanyProfile(
        id=current_user.id,
        email=current_user.email,
        business_name=current_user.full_name,
        business_type=None,
        logo_url=None,
        description=None,
        address=None,
        city=None,
        phone=None,
        website=None,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        total_shifts_posted=0,
        total_staff_hired=0,
        created_at=current_user.created_at,
    )


@router.patch("/profile", response_model=CompanyProfile)
def update_company_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
    profile_update: CompanyProfileUpdate,
) -> Any:
    """Update current company's profile."""
    require_company_user(current_user)

    if profile_update.business_name is not None:
        current_user.full_name = profile_update.business_name

    current_user.updated_at = datetime.utcnow()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return CompanyProfile(
        id=current_user.id,
        email=current_user.email,
        business_name=current_user.full_name,
        business_type=None,
        logo_url=None,
        description=None,
        address=None,
        city=None,
        phone=None,
        website=None,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        total_shifts_posted=0,
        total_staff_hired=0,
        created_at=current_user.created_at,
    )


# ============================================================================
# Wallet Endpoints
# ============================================================================


@router.get("/wallet", response_model=CompanyWallet)
def get_company_wallet(
    current_user: ActiveUserDep,
) -> Any:
    """Get current company's wallet information."""
    require_company_user(current_user)

    return CompanyWallet(
        balance=0.0,
        pending_payments=0.0,
        currency="EUR",
        total_spent=0.0,
        last_payment_date=None,
    )


# ============================================================================
# Venue Endpoints
# ============================================================================


@router.get("/venues", response_model=VenuesResponse)
def get_venues(
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get company's venues."""
    require_company_user(current_user)

    return VenuesResponse(items=[], total=0)


@router.post("/venues", response_model=Venue)
def create_venue(
    session: SessionDep,
    current_user: ActiveUserDep,
    venue: VenueCreate,
) -> Any:
    """Create a new venue for the company."""
    require_company_user(current_user)

    # Placeholder - would create venue in database
    return Venue(
        id=1,
        name=venue.name,
        address=venue.address,
        city=venue.city,
        is_primary=venue.is_primary,
    )


@router.patch("/venues/{venue_id}", response_model=Venue)
def update_venue(
    session: SessionDep,
    current_user: ActiveUserDep,
    venue_id: int,
    venue_update: VenueUpdate,
) -> Any:
    """Update a venue."""
    require_company_user(current_user)

    # Placeholder - would update venue in database
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Venue not found",
    )


@router.delete("/venues/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue(
    session: SessionDep,
    current_user: ActiveUserDep,
    venue_id: int,
) -> None:
    """Delete a venue."""
    require_company_user(current_user)

    # Placeholder - would delete venue in database
    # For now, just return 404 as we don't have venues table yet
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Venue not found",
    )


# ============================================================================
# Shift Endpoints
# ============================================================================


@router.get("/shifts", response_model=ShiftsResponse)
def get_company_shifts(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    status_filter: ShiftStatus | None = Query(default=None, alias="status"),
) -> Any:
    """Get company's posted shifts."""
    require_company_user(current_user)

    query = select(Shift).where(Shift.company_id == current_user.id)

    if status_filter:
        query = query.where(Shift.status == status_filter)

    query = query.order_by(Shift.created_at.desc())

    # Get total count
    count_query = select(Shift).where(Shift.company_id == current_user.id)
    if status_filter:
        count_query = count_query.where(Shift.status == status_filter)
    total = len(session.exec(count_query).all())

    # Get paginated results
    query = query.offset(skip).limit(limit)
    shifts = session.exec(query).all()

    items = [
        ShiftResponse(
            id=shift.id,
            title=shift.title,
            description=shift.description,
            company_id=shift.company_id,
            shift_type=shift.shift_type,
            date=shift.date,
            start_time=shift.start_time,
            end_time=shift.end_time,
            hourly_rate=shift.hourly_rate,
            location=shift.location,
            address=shift.address,
            city=shift.city,
            spots_total=shift.spots_total,
            spots_filled=shift.spots_filled,
            status=shift.status,
            requirements=shift.requirements,
            created_at=shift.created_at,
        )
        for shift in shifts
    ]

    return ShiftsResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/shifts", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_data: ShiftCreate,
) -> Any:
    """Create a new shift."""
    require_company_user(current_user)

    shift = Shift(
        title=shift_data.title,
        description=shift_data.description,
        company_id=current_user.id,
        shift_type=shift_data.shift_type,
        date=shift_data.date,
        start_time=shift_data.start_time,
        end_time=shift_data.end_time,
        hourly_rate=shift_data.hourly_rate,
        location=shift_data.location,
        address=shift_data.address,
        city=shift_data.city,
        spots_total=shift_data.spots_total,
        spots_filled=0,
        status=ShiftStatus.OPEN,
        requirements=shift_data.requirements,
    )

    session.add(shift)
    session.commit()
    session.refresh(shift)

    return ShiftResponse(
        id=shift.id,
        title=shift.title,
        description=shift.description,
        company_id=shift.company_id,
        shift_type=shift.shift_type,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hourly_rate=shift.hourly_rate,
        location=shift.location,
        address=shift.address,
        city=shift.city,
        spots_total=shift.spots_total,
        spots_filled=shift.spots_filled,
        status=shift.status,
        requirements=shift.requirements,
        created_at=shift.created_at,
    )


@router.patch("/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    shift_update: ShiftUpdate,
) -> Any:
    """Update a shift."""
    require_company_user(current_user)

    shift = get_company_shift(session, shift_id, current_user.id)

    # Update fields
    update_data = shift_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shift, field, value)

    session.add(shift)
    session.commit()
    session.refresh(shift)

    return ShiftResponse(
        id=shift.id,
        title=shift.title,
        description=shift.description,
        company_id=shift.company_id,
        shift_type=shift.shift_type,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hourly_rate=shift.hourly_rate,
        location=shift.location,
        address=shift.address,
        city=shift.city,
        spots_total=shift.spots_total,
        spots_filled=shift.spots_filled,
        status=shift.status,
        requirements=shift.requirements,
        created_at=shift.created_at,
    )


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> None:
    """Cancel/delete a shift."""
    require_company_user(current_user)

    shift = get_company_shift(session, shift_id, current_user.id)

    # Only allow cancellation if shift hasn't started
    if shift.status == ShiftStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a shift that is in progress",
        )

    if shift.status == ShiftStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed shift",
        )

    # Mark as cancelled rather than hard delete
    shift.status = ShiftStatus.CANCELLED
    session.add(shift)
    session.commit()


# ============================================================================
# Application Endpoints
# ============================================================================


@router.get("/shifts/{shift_id}/applications", response_model=ApplicationsResponse)
def get_shift_applications(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    """Get applications for a specific shift."""
    require_company_user(current_user)

    # Verify shift belongs to company
    shift = get_company_shift(session, shift_id, current_user.id)

    query = (
        select(Application)
        .where(Application.shift_id == shift_id)
        .order_by(Application.applied_at.desc())
    )

    total = len(session.exec(select(Application).where(Application.shift_id == shift_id)).all())

    query = query.offset(skip).limit(limit)
    applications = session.exec(query).all()

    items = []
    for app in applications:
        applicant_info = None
        if app.applicant:
            applicant_info = ApplicantInfo(
                id=app.applicant.id,
                full_name=app.applicant.full_name,
                email=app.applicant.email,
                user_type=app.applicant.user_type.value,
            )

        items.append(
            ApplicationResponse(
                id=app.id,
                shift_id=app.shift_id,
                applicant_id=app.applicant_id,
                status=app.status,
                cover_message=app.cover_message,
                applied_at=app.applied_at,
                applicant=applicant_info,
            )
        )

    return ApplicationsResponse(items=items, total=total)


@router.post("/applications/{application_id}/accept", response_model=ApplicationResponse)
def accept_application(
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> Any:
    """Accept an application."""
    require_company_user(current_user)

    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Verify shift belongs to company
    shift = get_company_shift(session, application.shift_id, current_user.id)

    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept application with status: {application.status.value}",
        )

    # Check if shift still has spots
    if shift.spots_filled >= shift.spots_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No more spots available for this shift",
        )

    application.status = ApplicationStatus.ACCEPTED
    shift.spots_filled += 1

    # Update shift status if fully filled
    if shift.spots_filled >= shift.spots_total:
        shift.status = ShiftStatus.FILLED

    session.add(application)
    session.add(shift)
    session.commit()
    session.refresh(application)

    applicant_info = None
    if application.applicant:
        applicant_info = ApplicantInfo(
            id=application.applicant.id,
            full_name=application.applicant.full_name,
            email=application.applicant.email,
            user_type=application.applicant.user_type.value,
        )

    return ApplicationResponse(
        id=application.id,
        shift_id=application.shift_id,
        applicant_id=application.applicant_id,
        status=application.status,
        cover_message=application.cover_message,
        applied_at=application.applied_at,
        applicant=applicant_info,
    )


@router.post("/applications/{application_id}/reject", response_model=ApplicationResponse)
def reject_application(
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> Any:
    """Reject an application."""
    require_company_user(current_user)

    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # Verify shift belongs to company
    get_company_shift(session, application.shift_id, current_user.id)

    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject application with status: {application.status.value}",
        )

    application.status = ApplicationStatus.REJECTED

    session.add(application)
    session.commit()
    session.refresh(application)

    applicant_info = None
    if application.applicant:
        applicant_info = ApplicantInfo(
            id=application.applicant.id,
            full_name=application.applicant.full_name,
            email=application.applicant.email,
            user_type=application.applicant.user_type.value,
        )

    return ApplicationResponse(
        id=application.id,
        shift_id=application.shift_id,
        applicant_id=application.applicant_id,
        status=application.status,
        cover_message=application.cover_message,
        applied_at=application.applied_at,
        applicant=applicant_info,
    )


# ============================================================================
# Spending Endpoints
# ============================================================================


@router.get("/spending", response_model=SpendingResponse)
def get_spending_history(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    """Get company's spending history."""
    require_company_user(current_user)

    # Get completed shifts for this company
    query = (
        select(Shift)
        .where(Shift.company_id == current_user.id)
        .where(Shift.status == ShiftStatus.COMPLETED)
        .order_by(Shift.date.desc())
    )

    count_query = (
        select(Shift)
        .where(Shift.company_id == current_user.id)
        .where(Shift.status == ShiftStatus.COMPLETED)
    )
    total = len(session.exec(count_query).all())

    shifts = session.exec(query.offset(skip).limit(limit)).all()

    items = []
    total_spent = Decimal("0.00")

    for shift in shifts:
        # Get accepted applications for this shift
        accepted_apps = session.exec(
            select(Application)
            .where(Application.shift_id == shift.id)
            .where(Application.status == ApplicationStatus.ACCEPTED)
        ).all()

        for app in accepted_apps:
            # Calculate hours worked (simplified)
            start_dt = datetime.combine(shift.date, shift.start_time)
            end_dt = datetime.combine(shift.date, shift.end_time)
            hours = Decimal(str((end_dt - start_dt).seconds / 3600))
            amount = hours * shift.hourly_rate

            worker_name = app.applicant.full_name if app.applicant else "Unknown"

            items.append(
                SpendingRecord(
                    id=app.id,
                    shift_id=shift.id,
                    shift_title=shift.title,
                    amount=amount,
                    worker_name=worker_name,
                    date=shift.date,
                    status="paid",
                )
            )
            total_spent += amount

    return SpendingResponse(
        items=items[:limit],  # Apply pagination to flattened list
        total=total,
        total_spent=total_spent,
    )


# ============================================================================
# Review Endpoints
# ============================================================================


@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    session: SessionDep,
    current_user: ActiveUserDep,
    review_data: ReviewCreate,
) -> Any:
    """Create a review for a worker."""
    require_company_user(current_user)

    # Verify shift belongs to company
    shift = get_company_shift(session, review_data.shift_id, current_user.id)

    # Verify the worker was assigned to this shift
    application = session.exec(
        select(Application)
        .where(Application.shift_id == review_data.shift_id)
        .where(Application.applicant_id == review_data.worker_id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
    ).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker was not assigned to this shift",
        )

    # Check if review already exists
    existing_review = session.exec(
        select(Review)
        .where(Review.reviewer_id == current_user.id)
        .where(Review.reviewee_id == review_data.worker_id)
        .where(Review.shift_id == review_data.shift_id)
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists for this worker and shift",
        )

    review = Review(
        reviewer_id=current_user.id,
        reviewee_id=review_data.worker_id,
        shift_id=review_data.shift_id,
        review_type=ReviewType.COMPANY_TO_STAFF,
        rating=review_data.rating,
        comment=review_data.comment,
    )

    session.add(review)
    session.commit()
    session.refresh(review)

    worker_name = None
    if application.applicant:
        worker_name = application.applicant.full_name

    return ReviewResponse(
        id=review.id,
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        shift_id=review.shift_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        worker_name=worker_name,
        shift_title=shift.title,
    )


@router.get("/reviews", response_model=ReviewsResponse)
def get_company_reviews(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
) -> Any:
    """Get reviews given by the company."""
    require_company_user(current_user)

    query = (
        select(Review)
        .where(Review.reviewer_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
        .order_by(Review.created_at.desc())
    )

    count_query = (
        select(Review)
        .where(Review.reviewer_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    total = len(session.exec(count_query).all())

    reviews = session.exec(query.offset(skip).limit(limit)).all()

    items = []
    for review in reviews:
        worker_name = None
        shift_title = None

        if review.reviewee:
            worker_name = review.reviewee.full_name
        if review.shift:
            shift_title = review.shift.title

        items.append(
            ReviewResponse(
                id=review.id,
                reviewer_id=review.reviewer_id,
                reviewee_id=review.reviewee_id,
                shift_id=review.shift_id,
                rating=review.rating,
                comment=review.comment,
                created_at=review.created_at,
                worker_name=worker_name,
                shift_title=shift_title,
            )
        )

    return ReviewsResponse(items=items, total=total)
