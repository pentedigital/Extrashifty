"""Tests for authentication endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.user import User


def test_login_success(client: TestClient, test_user: User):
    """Test successful login."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_user.email, "password": "testpassword123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, test_user: User):
    """Test login with wrong password."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    """Test login with non-existent user."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": "nonexistent@example.com", "password": "password123"},
    )
    assert response.status_code == 401


def test_register_success(client: TestClient):
    """Test successful user registration."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "newpassword123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "hashed_password" not in data


def test_register_duplicate_email(client: TestClient, test_user: User):
    """Test registration with existing email."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": test_user.email,
            "password": "somepassword123",
            "full_name": "Duplicate User",
        },
    )
    assert response.status_code == 400


def test_register_invalid_email(client: TestClient):
    """Test registration with invalid email format."""
    response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={
            "email": "not-an-email",
            "password": "password123",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 422


def test_get_current_user(client: TestClient, test_user: User, auth_headers: dict):
    """Test getting current user info."""
    response = client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name


def test_get_current_user_unauthorized(client: TestClient):
    """Test getting current user without authentication."""
    response = client.get(f"{settings.API_V1_STR}/auth/me")
    assert response.status_code == 401


def test_get_current_user_invalid_token(client: TestClient):
    """Test getting current user with invalid token."""
    response = client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
