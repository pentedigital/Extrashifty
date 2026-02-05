"""User endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
from app.core.errors import raise_bad_request, raise_forbidden, require_found, require_permission
from app.core.security import get_password_hash, verify_password
from app.crud import user as user_crud
from app.models.user import User, UserType
from app.schemas.user import UserRead, UserUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Request/Response Schemas for User Settings ---


class UpdateNameRequest(BaseModel):
    """Request schema for updating user's full name."""

    full_name: str = Field(min_length=1, max_length=255)


class UpdatePasswordRequest(BaseModel):
    """Request schema for updating user's password."""

    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=100)


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


class StaffStatsResponse(BaseModel):
    """Response schema for staff dashboard stats."""

    upcoming_shifts: int
    pending_applications: int
    total_earned: float
    average_rating: float
    wallet_balance: float


class UpdateProfileRequest(BaseModel):
    """Request schema for updating user's profile."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    email: Optional[str] = Field(default=None, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class PublicUserProfile(BaseModel):
    """Public user profile schema - limited info for viewing other users."""

    id: int
    full_name: str
    user_type: UserType
    is_verified: bool
    created_at: str


# --- User Settings Endpoints (for current user) ---
# NOTE: These must be defined BEFORE /{user_id} routes to avoid path conflicts


@router.patch("/me", response_model=UserRead)
def update_my_profile(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: UpdateProfileRequest,
) -> User:
    """
    Update current user's profile (name, email, avatar).

    Allows users to update their own profile information.
    Email changes may require re-verification in the future.
    """
    update_data = request.model_dump(exclude_unset=True)

    if not update_data:
        raise_bad_request("No fields to update")

    # Check if email is being changed and if it's already taken
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_user = user_crud.get_by_email(session, email=update_data["email"])
        if existing_user:
            raise_bad_request("Email already registered")

    # Apply updates
    for field, value in update_data.items():
        setattr(current_user, field, value)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    logger.info(f"User {current_user.id} updated their profile")
    return current_user


@router.patch("/me/name", response_model=UserRead)
def update_my_name(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: UpdateNameRequest,
) -> User:
    """
    Update current user's full name.

    Allows users to update their own display name.
    """
    current_user.full_name = request.full_name
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    logger.info(f"User {current_user.id} updated their name")
    return current_user


@router.patch("/me/password", response_model=MessageResponse)
def update_my_password(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: UpdatePasswordRequest,
) -> MessageResponse:
    """
    Update current user's password.

    Requires the current password for verification before allowing the change.
    """
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise_bad_request("Current password is incorrect")

    # Ensure new password is different
    if request.current_password == request.new_password:
        raise_bad_request("New password must be different from current password")

    # Update password
    current_user.hashed_password = get_password_hash(request.new_password)
    session.add(current_user)
    session.commit()
    logger.info(f"User {current_user.id} updated their password")
    return MessageResponse(message="Password updated successfully")


@router.delete("/me", response_model=MessageResponse)
def delete_my_account(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> MessageResponse:
    """
    Delete (deactivate) the current user's account.

    This performs a soft delete by setting is_active=False.
    The account data is preserved but the user can no longer log in.
    """
    current_user.is_active = False
    session.add(current_user)
    session.commit()
    logger.info(f"User {current_user.id} deactivated their account")
    return MessageResponse(message="Account deactivated successfully")


@router.get("/me/stats", response_model=StaffStatsResponse)
def get_my_stats(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> StaffStatsResponse:
    """
    Get dashboard stats for the current user.

    For staff users: returns upcoming shifts count, pending applications,
    total earned, average rating, and wallet balance.
    """
    from datetime import date as date_type
    from decimal import Decimal

    from sqlmodel import func, select

    from app.crud import application as application_crud
    from app.models.application import Application, ApplicationStatus
    from app.models.review import Review, ReviewType
    from app.models.shift import Shift, ShiftStatus
    from app.models.wallet import Wallet

    if current_user.user_type != UserType.STAFF:
        raise_forbidden("Stats are currently only available for staff users")

    # Count pending applications
    pending_applications = len(
        application_crud.get_by_applicant(
            session,
            applicant_id=current_user.id,
            status=ApplicationStatus.PENDING.value,
        )
    )

    # Count upcoming shifts (accepted applications for future shifts)
    accepted_apps = application_crud.get_by_applicant(
        session,
        applicant_id=current_user.id,
        status=ApplicationStatus.ACCEPTED.value,
    )
    shift_ids = [app.shift_id for app in accepted_apps]

    upcoming_shifts = 0
    if shift_ids:
        statement = (
            select(func.count())
            .select_from(Shift)
            .where(Shift.id.in_(shift_ids))
            .where(Shift.date >= date_type.today())
        )
        upcoming_shifts = session.exec(statement).one() or 0

    # Calculate total earned from completed shifts
    total_earned_query = (
        select(
            func.coalesce(
                func.sum(Shift.actual_hours_worked * Shift.hourly_rate),
                0
            )
        )
        .select_from(Shift)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.actual_hours_worked.isnot(None))
    )
    total_earned_with_hours = float(session.exec(total_earned_query).one() or 0)

    # For shifts without actual_hours_worked, calculate from scheduled times
    scheduled_earnings_query = (
        select(Shift)
        .join(Application, Application.shift_id == Shift.id)
        .where(Application.applicant_id == current_user.id)
        .where(Application.status == ApplicationStatus.ACCEPTED)
        .where(Shift.status == ShiftStatus.COMPLETED)
        .where(Shift.actual_hours_worked.is_(None))
    )
    scheduled_shifts = session.exec(scheduled_earnings_query).all()

    scheduled_earnings = Decimal("0.00")
    for shift in scheduled_shifts:
        from datetime import datetime
        start_dt = datetime.combine(shift.date, shift.start_time)
        end_dt = datetime.combine(shift.date, shift.end_time)
        hours = Decimal(str((end_dt - start_dt).seconds / 3600))
        scheduled_earnings += hours * shift.hourly_rate

    total_earned = total_earned_with_hours + float(scheduled_earnings)

    # Calculate average rating from reviews
    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == current_user.id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    average_rating = float(session.exec(avg_rating_query).one() or 0)

    # Get wallet balance
    wallet = session.exec(
        select(Wallet).where(Wallet.user_id == current_user.id)
    ).first()
    wallet_balance = float(wallet.balance) if wallet else 0.0

    return StaffStatsResponse(
        upcoming_shifts=upcoming_shifts,
        pending_applications=pending_applications,
        total_earned=round(total_earned, 2),
        average_rating=round(average_rating, 2),
        wallet_balance=round(wallet_balance, 2),
    )


# --- Admin and General User Endpoints ---


@router.get("", response_model=list[UserRead])
def list_users(
    session: SessionDep,
    _: AdminUserDep,
    skip: int = 0,
    limit: int = 100,
) -> list[User]:
    """List all users (admin only)."""
    users = user_crud.get_multi(session, skip=skip, limit=limit)
    return users


@router.get("/{user_id}/public", response_model=PublicUserProfile)
def get_user_public_profile(
    session: SessionDep,
    _: ActiveUserDep,  # Requires authentication but any user can view
    user_id: int,
) -> PublicUserProfile:
    """
    Get public profile for any user.

    Returns limited information suitable for public display.
    Requires authentication but does not require admin or ownership.
    """
    user = user_crud.get(session, id=user_id)
    require_found(user, "User")
    if not user.is_active:
        require_found(None, "User")
    return PublicUserProfile(
        id=user.id,
        full_name=user.full_name,
        user_type=user.user_type,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat(),
    )


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    session: SessionDep,
    current_user: ActiveUserDep,
    user_id: int,
) -> User:
    """Get user by ID."""
    user = user_crud.get(session, id=user_id)
    require_found(user, "User")
    # Users can only view their own profile unless they are admin
    require_permission(
        current_user.user_type == UserType.ADMIN or current_user.id == user_id
    )
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    session: SessionDep,
    current_user: ActiveUserDep,
    user_id: int,
    user_in: UserUpdate,
) -> User:
    """Update user."""
    user = user_crud.get(session, id=user_id)
    require_found(user, "User")
    # Users can only update their own profile unless they are admin
    require_permission(
        current_user.user_type == UserType.ADMIN or current_user.id == user_id
    )
    user = user_crud.update(session, db_obj=user, obj_in=user_in)
    return user
