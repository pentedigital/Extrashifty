"""Authentication endpoints."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import SessionDep, ActiveUserDep
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserRead

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """Login and get access token."""
    user = user_crud.get_by_email(session, email=form_data.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    session: SessionDep,
    user_in: UserCreate,
) -> User:
    """Register a new user."""
    existing_user = user_crud.get_by_email(session, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = user_crud.create(session, obj_in=user_in)
    return user


@router.get("/me", response_model=UserRead)
def get_me(current_user: ActiveUserDep) -> User:
    """Get current user."""
    return current_user
