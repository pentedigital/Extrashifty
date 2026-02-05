"""Review model for ExtraShifty."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .shift import Shift
    from .user import User


class ReviewType(str, Enum):
    """Review type enumeration."""

    STAFF_TO_COMPANY = "staff_to_company"
    COMPANY_TO_STAFF = "company_to_staff"


class Review(SQLModel, table=True):
    """Review model for rating staff and companies after shifts."""

    __tablename__ = "reviews"

    id: int | None = Field(default=None, primary_key=True)
    reviewer_id: int = Field(foreign_key="users.id", index=True)
    reviewee_id: int = Field(foreign_key="users.id", index=True)
    shift_id: int = Field(foreign_key="shifts.id", index=True)
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)
    review_type: ReviewType
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    reviewer: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Review.reviewer_id]"}
    )
    reviewee: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Review.reviewee_id]"}
    )
    shift: Optional["Shift"] = Relationship()
