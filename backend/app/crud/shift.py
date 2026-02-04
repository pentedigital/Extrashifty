"""CRUD operations for Shift model."""

from datetime import date

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.shift import Shift, ShiftStatus
from app.schemas.shift import ShiftCreate, ShiftUpdate


class CRUDShift(CRUDBase[Shift, ShiftCreate, ShiftUpdate]):
    """CRUD operations for Shift."""

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        company_id: int | None = None,
    ) -> list[Shift]:
        """Get multiple shifts with optional filtering."""
        statement = select(Shift)

        if status:
            statement = statement.where(Shift.status == status)
        if start_date:
            statement = statement.where(Shift.date >= start_date)
        if end_date:
            statement = statement.where(Shift.date <= end_date)
        if company_id:
            statement = statement.where(Shift.company_id == company_id)

        statement = statement.offset(skip).limit(limit).order_by(Shift.date, Shift.start_time)
        return list(db.exec(statement).all())

    def create(
        self, db: Session, *, obj_in: ShiftCreate, company_id: int
    ) -> Shift:
        """Create a new shift."""
        obj_data = obj_in.model_dump()
        db_obj = Shift(
            company_id=company_id,
            **obj_data,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_company(
        self,
        db: Session,
        *,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Shift]:
        """Get shifts by company ID."""
        statement = (
            select(Shift)
            .where(Shift.company_id == company_id)
            .offset(skip)
            .limit(limit)
            .order_by(Shift.date, Shift.start_time)
        )
        return list(db.exec(statement).all())

    def get_open_shifts(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Shift]:
        """Get all open shifts."""
        statement = (
            select(Shift)
            .where(Shift.status == ShiftStatus.OPEN)
            .offset(skip)
            .limit(limit)
            .order_by(Shift.date, Shift.start_time)
        )
        return list(db.exec(statement).all())


shift = CRUDShift(Shift)
