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
    location: str = Field(min_length=1, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    spots_total: int = Field(default=1, ge=1)
    requirements: Optional[dict[str, Any]] = None
    status: ShiftStatus = ShiftStatus.DRAFT


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
    address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, min_length=1, max_length=100)
    spots_total: Optional[int] = Field(default=None, ge=1)
    requirements: Optional[dict[str, Any]] = None
    status: Optional[ShiftStatus] = None


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
