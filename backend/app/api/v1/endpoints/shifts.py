"""Shift endpoints."""

from datetime import UTC, date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Query, Request, status
from pydantic import BaseModel

from app.api.deps import ActiveUserDep, CompanyUserDep, SessionDep
from app.core.rate_limit import limiter, DEFAULT_RATE_LIMIT
from app.core.errors import (
    raise_bad_request,
    require_found,
    require_permission,
)
from app.crud import application as application_crud
from app.crud import shift as shift_crud
from app.models.application import ApplicationStatus
from app.models.shift import Shift, ShiftStatus
from app.models.user import UserType
from app.schemas.shift import ShiftCreate, ShiftRead, ShiftUpdate

router = APIRouter()


class ShiftListResponse(BaseModel):
    """Paginated shift list response."""

    items: list[ShiftRead]
    total: int
    skip: int
    limit: int


@router.get("/my-shifts", response_model=list[ShiftRead])
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_my_shifts(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = Query(None, alias="status"),
    upcoming_only: bool = Query(True, description="Only return upcoming shifts"),
) -> list[Shift]:
    """
    Get shifts where the current user is assigned (confirmed).

    Staff: Returns shifts where they have an accepted application.
    """
    from datetime import date as date_type

    require_permission(current_user.user_type == UserType.STAFF, "Only staff can view their assigned shifts")

    # Get shifts where user has accepted applications
    accepted_applications = application_crud.get_by_applicant(
        session,
        applicant_id=current_user.id,
        status=ApplicationStatus.ACCEPTED.value,
        skip=0,
        limit=1000,  # Get all accepted applications
    )

    shift_ids = [app.shift_id for app in accepted_applications]

    if not shift_ids:
        return []

    # Get the actual shifts
    from sqlmodel import select

    statement = select(Shift).where(Shift.id.in_(shift_ids))

    if status_filter:
        statement = statement.where(Shift.status == status_filter)

    if upcoming_only:
        statement = statement.where(Shift.date >= date_type.today())

    statement = statement.offset(skip).limit(limit).order_by(Shift.date, Shift.start_time)

    return list(session.exec(statement).all())


@router.get("", response_model=ShiftListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_shifts(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    status_filter: str | None = Query(None, alias="status"),
    start_date: date | None = Query(None, alias="date_from"),
    end_date: date | None = Query(None, alias="date_to"),
    company_id: int | None = None,
    city: str | None = None,
    shift_type: str | None = None,
    min_rate: Decimal | None = None,
    max_rate: Decimal | None = None,
    search: str | None = None,
) -> dict[str, Any]:
    """
    List shifts (marketplace view) with filtering and pagination.

    Staff see available shifts.
    Companies see their own shifts.
    Admins see all shifts.

    Supports filtering by:
    - status: Shift status (open, filled, etc.)
    - date_from/date_to: Date range
    - city: City name (case-insensitive partial match)
    - shift_type: Type of shift
    - min_rate/max_rate: Hourly rate range
    - search: Search in title, description, and location
    """
    # Determine status filter based on user type
    effective_status = status_filter
    effective_company_id = company_id

    if current_user.user_type == UserType.COMPANY:
        # Company sees only their shifts
        effective_company_id = current_user.id
    elif current_user.user_type == UserType.STAFF:
        # Staff see only open shifts
        effective_status = ShiftStatus.OPEN.value

    shifts, total = shift_crud.get_multi_with_count(
        session,
        skip=skip,
        limit=limit,
        status=effective_status,
        start_date=start_date,
        end_date=end_date,
        company_id=effective_company_id,
        city=city,
        shift_type=shift_type,
        min_rate=min_rate,
        max_rate=max_rate,
        search=search,
    )

    return {
        "items": shifts,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def create_shift(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_in: ShiftCreate,
) -> Shift:
    """Create a new shift (company only)."""
    shift = shift_crud.create(session, obj_in=shift_in, company_id=current_user.id)
    return shift


@router.get("/{shift_id}", response_model=ShiftRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> Shift:
    """Get shift by ID."""
    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")
    # Staff can only see open shifts or shifts they've applied to
    if current_user.user_type == UserType.STAFF and shift.status != ShiftStatus.OPEN:
        application = application_crud.get_by_shift_and_applicant(
            session, shift_id=shift_id, applicant_id=current_user.id
        )
        require_permission(application is not None, "You can only view open shifts or shifts you've applied to")
    # Companies can only see their own shifts
    require_permission(
        current_user.user_type != UserType.COMPANY or shift.company_id == current_user.id,
        "Not enough permissions"
    )
    return shift


@router.patch("/{shift_id}", response_model=ShiftRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_shift(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
    shift_in: ShiftUpdate,
) -> Shift:
    """Update shift (company owner or admin)."""
    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")
    # Companies can only update their own shifts
    require_permission(
        current_user.user_type == UserType.ADMIN or shift.company_id == current_user.id,
        "Not enough permissions"
    )
    shift = shift_crud.update(session, db_obj=shift, obj_in=shift_in)
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(DEFAULT_RATE_LIMIT)
def delete_shift(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
) -> None:
    """Delete shift (company owner or admin)."""
    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")
    # Companies can only delete their own shifts
    require_permission(
        current_user.user_type == UserType.ADMIN or shift.company_id == current_user.id,
        "Not enough permissions"
    )
    shift_crud.remove(session, id=shift_id)


@router.post("/{shift_id}/apply", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def apply_to_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> dict:
    """Apply to a shift (staff only)."""
    require_permission(current_user.user_type == UserType.STAFF, "Only staff can apply to shifts")

    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")
    if shift.status != ShiftStatus.OPEN:
        raise_bad_request("Shift is not open for applications")

    # Check if already applied
    existing = application_crud.get_by_shift_and_applicant(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    if existing:
        raise_bad_request("You have already applied to this shift")

    application = application_crud.create_application(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    return {"id": application.id, "status": application.status.value, "message": "Application submitted successfully"}


@router.post("/{shift_id}/clock-in", response_model=dict)
@limiter.limit(DEFAULT_RATE_LIMIT)
def clock_in(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> dict:
    """
    Clock in to a shift (staff only).

    Records the actual start time for the worker.
    Updates shift status to IN_PROGRESS if not already.
    """
    from datetime import datetime

    require_permission(current_user.user_type == UserType.STAFF, "Only staff can clock in to shifts")

    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")

    # Verify user is assigned to this shift
    application = application_crud.get_by_shift_and_applicant(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    require_permission(
        application is not None and application.status == ApplicationStatus.ACCEPTED,
        "You are not assigned to this shift"
    )

    # Check if already clocked in
    if shift.clock_in_at is not None:
        raise_bad_request(f"Already clocked in at {shift.clock_in_at.isoformat()}")

    # Validate shift status
    if shift.status not in [ShiftStatus.FILLED, ShiftStatus.IN_PROGRESS]:
        raise_bad_request(f"Cannot clock in to shift with status: {shift.status.value}")

    # Record clock in
    now = datetime.now(UTC)
    shift.clock_in_at = now
    shift.status = ShiftStatus.IN_PROGRESS
    session.add(shift)
    session.commit()
    session.refresh(shift)

    return {
        "shift_id": shift.id,
        "clock_in_at": shift.clock_in_at.isoformat(),
        "status": shift.status.value,
        "message": "Successfully clocked in",
    }


@router.post("/{shift_id}/clock-out", response_model=dict)
@limiter.limit(DEFAULT_RATE_LIMIT)
def clock_out(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> dict:
    """
    Clock out from a shift (staff only).

    Records the actual end time and calculates actual hours worked.
    Updates shift status to COMPLETED.
    Auto-approve timer starts from this clock-out time.
    """
    from datetime import datetime

    require_permission(current_user.user_type == UserType.STAFF, "Only staff can clock out from shifts")

    shift = shift_crud.get(session, id=shift_id)
    require_found(shift, "Shift")

    # Verify user is assigned to this shift
    application = application_crud.get_by_shift_and_applicant(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    require_permission(
        application is not None and application.status == ApplicationStatus.ACCEPTED,
        "You are not assigned to this shift"
    )

    # Check if clocked in
    if shift.clock_in_at is None:
        raise_bad_request("Must clock in before clocking out")

    # Check if already clocked out
    if shift.clock_out_at is not None:
        raise_bad_request(f"Already clocked out at {shift.clock_out_at.isoformat()}")

    # Validate shift status
    if shift.status != ShiftStatus.IN_PROGRESS:
        raise_bad_request(f"Cannot clock out from shift with status: {shift.status.value}")

    # Record clock out and calculate hours worked
    now = datetime.now(UTC)
    shift.clock_out_at = now

    # Calculate actual hours worked
    time_diff = now - shift.clock_in_at
    hours_worked = Decimal(str(time_diff.total_seconds() / 3600))
    shift.actual_hours_worked = hours_worked.quantize(Decimal("0.01"))

    shift.status = ShiftStatus.COMPLETED
    session.add(shift)
    session.commit()
    session.refresh(shift)

    return {
        "shift_id": shift.id,
        "clock_in_at": shift.clock_in_at.isoformat(),
        "clock_out_at": shift.clock_out_at.isoformat(),
        "actual_hours_worked": float(shift.actual_hours_worked),
        "status": shift.status.value,
        "message": "Successfully clocked out",
    }
