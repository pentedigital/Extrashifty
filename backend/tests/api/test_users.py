"""Tests for user endpoints."""

from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.user import User


def test_get_user_by_id(
    client: TestClient, test_user: User, auth_headers: dict
):
    """Test getting a user by ID."""
    response = client.get(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["id"] == test_user.id


def test_get_user_not_found(client: TestClient, auth_headers: dict):
    """Test getting a non-existent user."""
    response = client.get(
        f"{settings.API_V1_STR}/users/99999",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_update_user(client: TestClient, test_user: User, auth_headers: dict):
    """Test updating user profile."""
    response = client.patch(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers=auth_headers,
        json={"full_name": "Updated Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"


def test_update_other_user_forbidden(
    client: TestClient, test_user: User, test_company_user: User, auth_headers: dict
):
    """Test that users cannot update other users' profiles."""
    response = client.patch(
        f"{settings.API_V1_STR}/users/{test_company_user.id}",
        headers=auth_headers,
        json={"full_name": "Hacked Name"},
    )
    assert response.status_code == 403


def test_admin_can_update_any_user(
    client: TestClient, test_user: User, admin_auth_headers: dict
):
    """Test that admins can update any user."""
    response = client.patch(
        f"{settings.API_V1_STR}/users/{test_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "Admin Updated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Admin Updated"


def test_list_users_admin_only(
    client: TestClient, auth_headers: dict, admin_auth_headers: dict
):
    """Test that only admins can list all users."""
    # Regular user should get 403
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers=auth_headers,
    )
    assert response.status_code == 403

    # Admin should get 200
    response = client.get(
        f"{settings.API_V1_STR}/users/",
        headers=admin_auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
