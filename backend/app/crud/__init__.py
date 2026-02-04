"""CRUD operations for ExtraShifty models."""

from app.crud.application import CRUDApplication, application
from app.crud.base import CRUDBase
from app.crud.shift import CRUDShift, shift
from app.crud.user import CRUDUser, user

__all__ = [
    "CRUDBase",
    "CRUDUser",
    "user",
    "CRUDShift",
    "shift",
    "CRUDApplication",
    "application",
]
