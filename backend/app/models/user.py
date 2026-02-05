"""User model for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .application import Application
    from .shift import Shift


class UserType(str, Enum):
    """User type enumeration."""

    STAFF = "staff"
    COMPANY = "company"
    AGENCY = "agency"
    ADMIN = "admin"


class User(SQLModel, table=True):
    """User model representing staff, companies, agencies, and admins."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    full_name: str = Field(max_length=255)
    user_type: UserType = Field(default=UserType.STAFF)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    is_superuser: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # GDPR deletion fields
    deletion_requested_at: datetime | None = Field(default=None)
    is_deleted: bool = Field(default=False, index=True)
    deleted_at: datetime | None = Field(default=None)
    anonymized_id: str | None = Field(default=None, max_length=50, index=True)

    # Relationships
    shifts: list["Shift"] = Relationship(back_populates="company")
    applications: list["Application"] = Relationship(back_populates="applicant")
