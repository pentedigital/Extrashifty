"""User model for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .appeal import Appeal, EmergencyWaiver
    from .application import Application
    from .notification import Notification, NotificationPreference
    from .shift import Shift
    from .tax import TaxYear


class UserType(str, Enum):
    """User type enumeration."""

    STAFF = "staff"
    COMPANY = "company"
    AGENCY = "agency"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


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
    shifts: list["Shift"] = Relationship(
        back_populates="company",
        sa_relationship_kwargs={"foreign_keys": "[Shift.company_id]"},
    )
    applications: list["Application"] = Relationship(back_populates="applicant")
    notifications: list["Notification"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "noload"},
    )
    notification_preference: Optional["NotificationPreference"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "noload", "uselist": False},
    )
    tax_years: list["TaxYear"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "noload"},
    )
    appeals: list["Appeal"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "lazy": "noload",
            "foreign_keys": "[Appeal.user_id]",
        },
    )
    emergency_waivers: list["EmergencyWaiver"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "noload"},
    )
