"""User endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
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


# --- User Settings Endpoints (for current user) ---
# NOTE: These must be defined BEFORE /{user_id} routes to avoid path conflicts


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Ensure new password is different
    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

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


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    session: SessionDep,
    current_user: ActiveUserDep,
    user_id: int,
) -> User:
    """Get user by ID."""
    user = user_crud.get(session, id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    # Users can only view their own profile unless they are admin
    if current_user.user_type != UserType.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
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
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    # Users can only update their own profile unless they are admin
    if current_user.user_type != UserType.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    user = user_crud.update(session, db_obj=user, obj_in=user_in)
    return user
