"""Base models and mixins for ExtraShifty."""

from datetime import datetime

from sqlmodel import Field, SQLModel


class TimestampMixin(SQLModel):
    """Mixin that provides created_at and updated_at timestamp fields.

    Use this mixin to add standard timestamp fields to models:

    Example:
        class MyModel(TimestampMixin, SQLModel, table=True):
            id: int | None = Field(default=None, primary_key=True)
            name: str
    """

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
