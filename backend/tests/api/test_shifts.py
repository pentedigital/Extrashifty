"""Tests for shift endpoints."""

from datetime import date, time, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models.shift import Shift, ShiftStatus
from app.models.user import User


def create_test_shift(session: Session, company_user: User) -> Shift:
    """Helper to create a test shift."""
    shift = Shift(
        title="Test Shift",
        description="A test shift",
        company_id=company_user.id,
        shift_type="bartender",
        date=date.today() + timedelta(days=7),
        start_time=time(18, 0),
        end_time=time(23, 0),
        hourly_rate=Decimal("25.00"),
        location="Test Bar",
        city="Test City",
        spots_total=3,
        status=ShiftStatus.OPEN,
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)
    return shift


def test_create_shift(client: TestClient, company_auth_headers: dict):
    """Test creating a new shift."""
    shift_date = (date.today() + timedelta(days=7)).isoformat()
    response = client.post(
        f"{settings.API_V1_STR}/shifts/",
        headers=company_auth_headers,
        json={
            "title": "Evening Shift",
            "shift_type": "waiter",
            "date": shift_date,
            "start_time": "18:00:00",
            "end_time": "23:00:00",
            "hourly_rate": "20.00",
            "location": "Restaurant ABC",
            "city": "New York",
            "spots_total": 2,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Evening Shift"
    assert data["status"] == "draft"


def test_create_shift_staff_forbidden(client: TestClient, auth_headers: dict):
    """Test that staff users cannot create shifts."""
    shift_date = (date.today() + timedelta(days=7)).isoformat()
    response = client.post(
        f"{settings.API_V1_STR}/shifts/",
        headers=auth_headers,
        json={
            "title": "Evening Shift",
            "shift_type": "waiter",
            "date": shift_date,
            "start_time": "18:00:00",
            "end_time": "23:00:00",
            "hourly_rate": "20.00",
            "location": "Restaurant ABC",
            "city": "New York",
            "spots_total": 2,
        },
    )
    assert response.status_code == 403


def test_list_shifts(
    client: TestClient,
    session: Session,
    test_company_user: User,
    auth_headers: dict,
):
    """Test listing shifts."""
    create_test_shift(session, test_company_user)
    response = client.get(
        f"{settings.API_V1_STR}/shifts/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_get_shift(
    client: TestClient,
    session: Session,
    test_company_user: User,
    auth_headers: dict,
):
    """Test getting a single shift."""
    shift = create_test_shift(session, test_company_user)
    response = client.get(
        f"{settings.API_V1_STR}/shifts/{shift.id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == shift.id
    assert data["title"] == shift.title


def test_get_shift_not_found(client: TestClient, auth_headers: dict):
    """Test getting a non-existent shift."""
    response = client.get(
        f"{settings.API_V1_STR}/shifts/99999",
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_update_shift(
    client: TestClient,
    session: Session,
    test_company_user: User,
    company_auth_headers: dict,
):
    """Test updating a shift."""
    shift = create_test_shift(session, test_company_user)
    response = client.patch(
        f"{settings.API_V1_STR}/shifts/{shift.id}",
        headers=company_auth_headers,
        json={"title": "Updated Shift Title"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Shift Title"


def test_update_shift_other_company_forbidden(
    client: TestClient,
    session: Session,
    test_company_user: User,
    auth_headers: dict,
):
    """Test that other users cannot update someone else's shift."""
    shift = create_test_shift(session, test_company_user)
    response = client.patch(
        f"{settings.API_V1_STR}/shifts/{shift.id}",
        headers=auth_headers,
        json={"title": "Hacked Title"},
    )
    assert response.status_code == 403


def test_delete_shift(
    client: TestClient,
    session: Session,
    test_company_user: User,
    company_auth_headers: dict,
):
    """Test deleting a shift."""
    shift = create_test_shift(session, test_company_user)
    response = client.delete(
        f"{settings.API_V1_STR}/shifts/{shift.id}",
        headers=company_auth_headers,
    )
    assert response.status_code == 204

    # Verify it's deleted
    response = client.get(
        f"{settings.API_V1_STR}/shifts/{shift.id}",
        headers=company_auth_headers,
    )
    assert response.status_code == 404


def test_list_shifts_with_filters(
    client: TestClient,
    session: Session,
    test_company_user: User,
    auth_headers: dict,
):
    """Test listing shifts with filters."""
    create_test_shift(session, test_company_user)
    response = client.get(
        f"{settings.API_V1_STR}/shifts/",
        headers=auth_headers,
        params={"city": "Test City"},
    )
    assert response.status_code == 200
    data = response.json()
    for shift in data:
        assert shift["city"] == "Test City"
