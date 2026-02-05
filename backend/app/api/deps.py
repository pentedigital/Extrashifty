"""API Dependencies for ExtraShifty."""

from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.crud import user as user_crud
from app.models.user import User, UserType
from app.schemas.token import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_db() -> Generator[Session, None, None]:
    """Get database session dependency."""
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            raise credentials_exception
    except (jwt.InvalidTokenError, ValidationError):
        raise credentials_exception

    user = user_crud.get(session, id=token_data.sub)
    if user is None:
        raise credentials_exception
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_current_active_user(current_user: CurrentUserDep) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


ActiveUserDep = Annotated[User, Depends(get_current_active_user)]


def get_current_admin_user(current_user: ActiveUserDep) -> User:
    """Get current admin user."""
    if current_user.user_type != UserType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user


AdminUserDep = Annotated[User, Depends(get_current_admin_user)]


async def get_staff_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Require current user to be staff or admin."""
    if current_user.user_type not in [UserType.STAFF, UserType.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


async def get_agency_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Require current user to be agency or admin."""
    if current_user.user_type not in [UserType.AGENCY, UserType.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency access required",
        )
    return current_user


StaffUserDep = Annotated[User, Depends(get_staff_user)]
AgencyUserDep = Annotated[User, Depends(get_agency_user)]


def get_current_company_user(current_user: ActiveUserDep) -> User:
    """Get current company user."""
    if current_user.user_type not in (UserType.COMPANY, UserType.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions - company role required",
        )
    return current_user


CompanyUserDep = Annotated[User, Depends(get_current_company_user)]


async def get_current_user_ws(token: str) -> User | None:
    """
    Get current user from JWT token for WebSocket authentication.

    Unlike the regular get_current_user, this function accepts the token directly
    rather than extracting it from the OAuth2 scheme, making it suitable for
    WebSocket connections where the token is passed as a query parameter.

    Args:
        token: JWT access token string

    Returns:
        User object if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            return None
    except (jwt.InvalidTokenError, ValidationError):
        return None

    with Session(engine) as session:
        user = user_crud.get(session, id=token_data.sub)
        if user is None or not user.is_active:
            return None
        return user
