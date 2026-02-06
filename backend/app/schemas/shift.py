"""Shift schemas for ExtraShifty."""

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.shift import ShiftStatus
from .user import UserRead


class ShiftCreate(BaseModel):
    """Schema for creating a new shift."""

    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    shift_type: str = Field(min_length=1, max_length=100)
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    location_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    spots_total: int = Field(default=1, ge=1)
    requirements: Optional[dict[str, Any]] = None
    status: ShiftStatus = ShiftStatus.DRAFT

    def model_post_init(self, __context: Any) -> None:
        """Normalize location field after initialization."""
        # Use location_name if provided, fall back to location
        if self.location_name and not self.location:
            object.__setattr__(self, 'location', self.location_name)
        elif not self.location and not self.location_name:
            raise ValueError("Either location or location_name is required")


class ShiftUpdate(BaseModel):
    """Schema for updating a shift."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    shift_type: Optional[str] = Field(default=None, min_length=1, max_length=100)
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hourly_rate: Optional[Decimal] = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    location_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    spots_total: Optional[int] = Field(default=None, ge=1)
    requirements: Optional[dict[str, Any]] = None
    status: Optional[ShiftStatus] = None

    def model_post_init(self, __context: Any) -> None:
        """Normalize location field after initialization."""
        # Use location_name if provided and location is not
        if self.location_name and not self.location:
            object.__setattr__(self, 'location', self.location_name)


class ShiftRead(BaseModel):
    """Schema for reading shift data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    company_id: int
    shift_type: str
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal
    location: str
    address: Optional[str]
    city: str
    spots_total: int
    spots_filled: int
    status: ShiftStatus
    requirements: Optional[dict[str, Any]]
    created_at: datetime
    company: Optional[UserRead] = None

    # Time tracking fields
    clock_in_at: Optional[datetime] = None
    clock_out_at: Optional[datetime] = None
    actual_hours_worked: Optional[Decimal] = None

    # Agency Mode B fields
    posted_by_agency_id: Optional[int] = None
    client_company_id: Optional[int] = None
    is_agency_managed: bool = False

    @property
    def location_name(self) -> str:
        """Alias for location field for frontend compatibility."""
        return self.location

    @property
    def duration_hours(self) -> float:
        """Calculate duration in hours."""
        start_minutes = self.start_time.hour * 60 + self.start_time.minute
        end_minutes = self.end_time.hour * 60 + self.end_time.minute
        if end_minutes < start_minutes:
            end_minutes += 24 * 60  # Overnight shift
        return (end_minutes - start_minutes) / 60

    @property
    def total_pay(self) -> Decimal:
        """Calculate total pay for the shift."""
        return self.hourly_rate * Decimal(str(self.duration_hours))

    def model_dump(self, **kwargs) -> dict[str, Any]:
        """Override to include computed properties."""
        data = super().model_dump(**kwargs)
        data['location_name'] = self.location
        data['duration_hours'] = self.duration_hours
        data['total_pay'] = float(self.total_pay)
        return data
