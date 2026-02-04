"""Application model for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .shift import Shift
    from .user import User


class ApplicationStatus(str, Enum):
    """Application status enumeration."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(SQLModel, table=True):
    """Application model representing shift applications from staff."""

    __tablename__ = "applications"

    id: int | None = Field(default=None, primary_key=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    applicant_id: int = Field(foreign_key="users.id", index=True)
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)
    cover_message: str | None = Field(default=None)
    applied_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    shift: Optional["Shift"] = Relationship(back_populates="applications")
    applicant: Optional["User"] = Relationship(back_populates="applications")
