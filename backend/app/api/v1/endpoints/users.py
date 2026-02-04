"""User endpoints."""

from fastapi import APIRouter, HTTPException, status

from app.api.deps import ActiveUserDep, AdminUserDep, SessionDep
from app.crud import user as user_crud
from app.models.user import User, UserType
from app.schemas.user import UserRead, UserUpdate

router = APIRouter()


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
