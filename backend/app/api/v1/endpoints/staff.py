"""Staff endpoints for ExtraShifty."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import ActiveUserDep, SessionDep
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
    current_user: ActiveUserDep,
    shift_status: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get staff member's assigned shifts."""
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff members can access this endpoint",
        )

    return {"items": [], "total": 0}
