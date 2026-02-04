"""Tests for User CRUD operations."""

from sqlmodel import Session

from app.core.security import verify_password
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def test_create_user(session: Session):
    """Test creating a user via CRUD."""
    user_in = UserCreate(
        email="crud_test@example.com",
        password="testpassword123",
        full_name="CRUD Test User",
    )
    user = user_crud.create(session, obj_in=user_in)
    assert user.email == user_in.email
    assert user.full_name == user_in.full_name
    # Password should be hashed
    assert user.hashed_password != user_in.password
    assert verify_password(user_in.password, user.hashed_password)


def test_get_user_by_email(session: Session, test_user: User):
    """Test getting user by email."""
    user = user_crud.get_by_email(session, email=test_user.email)
    assert user is not None
    assert user.id == test_user.id
    assert user.email == test_user.email


def test_get_user_by_email_not_found(session: Session):
    """Test getting non-existent user by email."""
    user = user_crud.get_by_email(session, email="nonexistent@example.com")
    assert user is None


def test_authenticate_user(session: Session, test_user: User):
    """Test user authentication."""
    user = user_crud.authenticate(
        session, email=test_user.email, password="testpassword123"
    )
    assert user is not None
    assert user.id == test_user.id


def test_authenticate_wrong_password(session: Session, test_user: User):
    """Test authentication with wrong password."""
    user = user_crud.authenticate(
        session, email=test_user.email, password="wrongpassword"
    )
    assert user is None


def test_authenticate_nonexistent_user(session: Session):
    """Test authentication with non-existent user."""
    user = user_crud.authenticate(
        session, email="nonexistent@example.com", password="password123"
    )
    assert user is None


def test_update_user(session: Session, test_user: User):
    """Test updating a user."""
    update_data = UserUpdate(full_name="Updated Name")
    updated_user = user_crud.update(session, db_obj=test_user, obj_in=update_data)
    assert updated_user.full_name == "Updated Name"
    assert updated_user.email == test_user.email  # Unchanged


def test_get_user(session: Session, test_user: User):
    """Test getting user by ID."""
    user = user_crud.get(session, id=test_user.id)
    assert user is not None
    assert user.id == test_user.id


def test_get_user_not_found(session: Session):
    """Test getting non-existent user by ID."""
    user = user_crud.get(session, id=99999)
    assert user is None


def test_get_multi_users(session: Session, test_user: User, test_company_user: User):
    """Test getting multiple users."""
    users = user_crud.get_multi(session, skip=0, limit=10)
    assert len(users) >= 2
    emails = [u.email for u in users]
    assert test_user.email in emails
    assert test_company_user.email in emails
