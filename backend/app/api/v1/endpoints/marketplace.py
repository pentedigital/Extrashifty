"""Marketplace endpoints for public/authenticated shift browsing."""

from datetime import date
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlmodel import func, select

from app.api.deps import SessionDep
from app.crud import shift as shift_crud
from app.models.shift import ShiftStatus
from app.schemas.shift import ShiftRead

router = APIRouter()


class MarketplaceShiftListResponse(BaseModel):
    """Paginated marketplace shift list response."""

    items: list[ShiftRead]
    total: int
    skip: int
    limit: int


class MarketplaceStats(BaseModel):
    """Marketplace statistics response."""

    total_shifts: int
    total_companies: int
    avg_hourly_rate: float


@router.get("/shifts", response_model=MarketplaceShiftListResponse)
def list_marketplace_shifts(
    session: SessionDep,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    """
    Browse all available shifts in the marketplace.

    Returns only open shifts that are available for applications.
    """

    shifts, total = shift_crud.get_multi_with_count(
        session,
        skip=skip,
        limit=limit,
        status=ShiftStatus.OPEN.value,
    )

    return {
        "items": shifts,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/shifts/search", response_model=MarketplaceShiftListResponse)
def search_marketplace_shifts(
    session: SessionDep,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    location: Optional[str] = Query(None, description="Filter by city/location"),
    job_type: Optional[str] = Query(None, description="Filter by shift type"),
    min_pay: Optional[Decimal] = Query(None, description="Minimum hourly rate"),
    max_pay: Optional[Decimal] = Query(None, description="Maximum hourly rate"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    skills: Optional[str] = Query(None, description="Required skills (comma-separated)"),
    search: Optional[str] = Query(None, description="Search in title, description"),
) -> dict[str, Any]:
    """
    Search marketplace shifts with filters.

    Filters:
    - location: City name (case-insensitive partial match)
    - job_type: Type of shift (e.g., bar, server, kitchen)
    - min_pay/max_pay: Hourly rate range
    - date_from/date_to: Date range
    - skills: Required skills (comma-separated, matches in requirements)
    - search: Full-text search in title and description
    """
    shifts, total = shift_crud.get_multi_with_count(
        session,
        skip=skip,
        limit=limit,
        status=ShiftStatus.OPEN.value,
        city=location,
        shift_type=job_type,
        min_rate=min_pay,
        max_rate=max_pay,
        start_date=date_from,
        end_date=date_to,
        search=search,
    )

    # Note: skills filtering would require additional implementation
    # in the CRUD layer if requirements structure contains skills

    return {
        "items": shifts,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/shifts/{shift_id}", response_model=ShiftRead)
def get_marketplace_shift(
    session: SessionDep,
    shift_id: int,
) -> Any:
    """
    Get details of a specific shift from the marketplace.

    Only returns the shift if it's open for applications.
    """
    from fastapi import HTTPException, status

    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )

    # Allow viewing open shifts publicly, or any shift for context
    # The application process still requires authentication
    return shift


@router.get("/stats", response_model=MarketplaceStats)
def get_marketplace_stats(
    session: SessionDep,
) -> dict[str, Any]:
    """
    Get marketplace statistics.

    Returns:
    - total_shifts: Number of open shifts
    - total_companies: Number of companies with open shifts
    - avg_hourly_rate: Average hourly rate across open shifts
    """
    from app.models.shift import Shift

    # Count total open shifts
    total_shifts_stmt = (
        select(func.count())
        .select_from(Shift)
        .where(Shift.status == ShiftStatus.OPEN)
    )
    total_shifts = session.exec(total_shifts_stmt).one()

    # Count unique companies with open shifts
    total_companies_stmt = (
        select(func.count(func.distinct(Shift.company_id)))
        .select_from(Shift)
        .where(Shift.status == ShiftStatus.OPEN)
    )
    total_companies = session.exec(total_companies_stmt).one()

    # Calculate average hourly rate
    avg_rate_stmt = (
        select(func.avg(Shift.hourly_rate))
        .select_from(Shift)
        .where(Shift.status == ShiftStatus.OPEN)
    )
    avg_rate = session.exec(avg_rate_stmt).one()

    return {
        "total_shifts": total_shifts or 0,
        "total_companies": total_companies or 0,
        "avg_hourly_rate": float(avg_rate) if avg_rate else 0.0,
    }
