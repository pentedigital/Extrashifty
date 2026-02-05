"""Company endpoints for ExtraShifty."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.api.deps import ActiveUserDep, SessionDep
from app.models.user import UserType

router = APIRouter()


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


@router.get("/profile", response_model=CompanyProfile)
def get_company_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> Any:
    """Get current company's profile."""
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

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
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

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


@router.get("/wallet", response_model=CompanyWallet)
def get_company_wallet(
    current_user: ActiveUserDep,
) -> Any:
    """Get current company's wallet information."""
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

    return CompanyWallet(
        balance=0.0,
        pending_payments=0.0,
        currency="EUR",
        total_spent=0.0,
        last_payment_date=None,
    )


@router.get("/venues", response_model=VenuesResponse)
def get_venues(
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get company's venues."""
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

    return VenuesResponse(items=[], total=0)


@router.post("/venues", response_model=Venue)
def create_venue(
    session: SessionDep,
    current_user: ActiveUserDep,
    venue: VenueCreate,
) -> Any:
    """Create a new venue for the company."""
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

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
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can access this endpoint",
        )

    # Placeholder - would update venue in database
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Venue not found",
    )
