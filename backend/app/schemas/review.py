"""Review schemas for ExtraShifty."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.review import ReviewType


class ReviewCreate(BaseModel):
    """Schema for creating a new review."""

    reviewee_id: int
    shift_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)
    review_type: ReviewType


class ReviewRead(BaseModel):
    """Schema for reading review data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    reviewer_id: int
    reviewee_id: int
    shift_id: int
    rating: int
    comment: Optional[str]
    review_type: ReviewType
    created_at: datetime
    reviewer_name: Optional[str] = None
    reviewee_name: Optional[str] = None


class ReviewListResponse(BaseModel):
    """Paginated review list response."""

    items: list[ReviewRead]
    total: int
    average_rating: Optional[float] = None


class ReviewStats(BaseModel):
    """Schema for review statistics."""

    total_reviews: int
    average_rating: float
    rating_distribution: dict[int, int]  # rating -> count
