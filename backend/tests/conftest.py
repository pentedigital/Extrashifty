"""Pytest configuration and fixtures for ExtraShifty tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.main import app
from app.models.user import User, UserType


@pytest.fixture(name="engine")
def engine_fixture():
    """Create a test database engine using in-memory SQLite."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine) -> Generator[Session, None, None]:
    """Create a test database session."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with overridden database dependency."""

    def get_session_override():
        yield session

    app.dependency_overrides[get_db] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(session: Session) -> User:
    """Create a test staff user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        user_type=UserType.STAFF,
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="test_company_user")
def test_company_user_fixture(session: Session) -> User:
    """Create a test company user."""
    user = User(
        email="company@example.com",
        hashed_password=get_password_hash("companypassword123"),
        full_name="Test Company",
        user_type=UserType.COMPANY,
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="test_admin_user")
def test_admin_user_fixture(session: Session) -> User:
    """Create a test admin user."""
    user = User(
        email="admin@example.com",
        hashed_password=get_password_hash("adminpassword123"),
        full_name="Test Admin",
        user_type=UserType.ADMIN,
        is_active=True,
        is_verified=True,
        is_superuser=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(client: TestClient, test_user: User) -> dict[str, str]:
    """Get authentication headers for test user."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_user.email, "password": "testpassword123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="company_auth_headers")
def company_auth_headers_fixture(
    client: TestClient, test_company_user: User
) -> dict[str, str]:
    """Get authentication headers for company user."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_company_user.email, "password": "companypassword123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="admin_auth_headers")
def admin_auth_headers_fixture(
    client: TestClient, test_admin_user: User
) -> dict[str, str]:
    """Get authentication headers for admin user."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_admin_user.email, "password": "adminpassword123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
