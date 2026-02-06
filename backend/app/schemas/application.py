"""Application schemas for ExtraShifty."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.application import ApplicationStatus
from .shift import ShiftRead
from .user import UserRead


class ApplicationCreate(BaseModel):
    """Schema for creating a new application."""

    shift_id: int
    cover_message: Optional[str] = Field(default=None, max_length=2000)


class ApplicationUpdate(BaseModel):
    """Schema for updating an application."""

    status: Optional[ApplicationStatus] = None
    cover_message: Optional[str] = Field(default=None, max_length=2000)


class ApplicationRead(BaseModel):
    """Schema for reading application data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    shift_id: int
    applicant_id: int
    status: ApplicationStatus
    cover_message: Optional[str]
    applied_at: datetime
    shift: Optional[ShiftRead] = None
    applicant: Optional[UserRead] = None
