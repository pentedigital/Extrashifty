"""Shift endpoints."""

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import SessionDep, ActiveUserDep, CompanyUserDep
from app.crud import shift as shift_crud, application as application_crud
from app.models.shift import Shift, ShiftStatus
from app.models.user import UserType
from app.schemas.shift import ShiftCreate, ShiftRead, ShiftUpdate

router = APIRouter()


@router.get("", response_model=list[ShiftRead])
def list_shifts(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = Query(None, alias="status"),
    start_date: date | None = None,
    end_date: date | None = None,
    company_id: int | None = None,
) -> list[Shift]:
    """
    List shifts (marketplace view).

    Staff see available shifts.
    Companies see their own shifts.
    Admins see all shifts.
    """
    if current_user.user_type == UserType.ADMIN:
        # Admin sees all shifts
        shifts = shift_crud.get_multi(
            session,
            skip=skip,
            limit=limit,
            status=status_filter,
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
        )
    elif current_user.user_type == UserType.COMPANY:
        # Company sees only their shifts
        shifts = shift_crud.get_multi(
            session,
            skip=skip,
            limit=limit,
            status=status_filter,
            start_date=start_date,
            end_date=end_date,
            company_id=current_user.id,
        )
    else:
        # Staff see only open shifts
        shifts = shift_crud.get_multi(
            session,
            skip=skip,
            limit=limit,
            status=ShiftStatus.OPEN.value,
            start_date=start_date,
            end_date=end_date,
        )
    return shifts


@router.post("", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
def create_shift(
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_in: ShiftCreate,
) -> Shift:
    """Create a new shift (company only)."""
    shift = shift_crud.create(session, obj_in=shift_in, company_id=current_user.id)
    return shift


@router.get("/{shift_id}", response_model=ShiftRead)
def get_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> Shift:
    """Get shift by ID."""
    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )
    # Staff can only see open shifts or shifts they've applied to
    if current_user.user_type == UserType.STAFF and shift.status != ShiftStatus.OPEN:
        application = application_crud.get_by_shift_and_applicant(
            session, shift_id=shift_id, applicant_id=current_user.id
        )
        if not application:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view open shifts or shifts you've applied to",
            )
    # Companies can only see their own shifts
    if current_user.user_type == UserType.COMPANY and shift.company_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return shift


@router.patch("/{shift_id}", response_model=ShiftRead)
def update_shift(
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
    shift_in: ShiftUpdate,
) -> Shift:
    """Update shift (company owner or admin)."""
    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )
    # Companies can only update their own shifts
    if current_user.user_type != UserType.ADMIN and shift.company_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    shift = shift_crud.update(session, db_obj=shift, obj_in=shift_in)
    return shift


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
) -> None:
    """Delete shift (company owner or admin)."""
    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )
    # Companies can only delete their own shifts
    if current_user.user_type != UserType.ADMIN and shift.company_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    shift_crud.remove(session, id=shift_id)


@router.post("/{shift_id}/apply", response_model=dict, status_code=status.HTTP_201_CREATED)
def apply_to_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> dict:
    """Apply to a shift (staff only)."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can apply to shifts",
        )

    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )
    if shift.status != ShiftStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shift is not open for applications",
        )

    # Check if already applied
    existing = application_crud.get_by_shift_and_applicant(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this shift",
        )

    application = application_crud.create_application(
        session, shift_id=shift_id, applicant_id=current_user.id
    )
    return {"id": application.id, "status": application.status.value, "message": "Application submitted successfully"}
