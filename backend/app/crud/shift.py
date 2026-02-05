"""CRUD operations for Shift model."""

from datetime import date
from decimal import Decimal

from sqlmodel import Session, func, or_, select

from app.crud.base import CRUDBase
from app.models.shift import Shift, ShiftStatus
from app.schemas.shift import ShiftCreate, ShiftUpdate


class CRUDShift(CRUDBase[Shift, ShiftCreate, ShiftUpdate]):
    """CRUD operations for Shift."""

    def get_multi_with_count(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        company_id: int | None = None,
        city: str | None = None,
        shift_type: str | None = None,
        min_rate: Decimal | None = None,
        max_rate: Decimal | None = None,
        search: str | None = None,
    ) -> tuple[list[Shift], int]:
        """Get multiple shifts with optional filtering and return total count."""
        statement = select(Shift)
        count_statement = select(func.count()).select_from(Shift)

        # Apply filters
        if status:
            statement = statement.where(Shift.status == status)
            count_statement = count_statement.where(Shift.status == status)
        if start_date:
            statement = statement.where(Shift.date >= start_date)
            count_statement = count_statement.where(Shift.date >= start_date)
        if end_date:
            statement = statement.where(Shift.date <= end_date)
            count_statement = count_statement.where(Shift.date <= end_date)
        if company_id:
            statement = statement.where(Shift.company_id == company_id)
            count_statement = count_statement.where(Shift.company_id == company_id)
        if city:
            statement = statement.where(Shift.city.ilike(f"%{city}%"))
            count_statement = count_statement.where(Shift.city.ilike(f"%{city}%"))
        if shift_type:
            statement = statement.where(Shift.shift_type == shift_type)
            count_statement = count_statement.where(Shift.shift_type == shift_type)
        if min_rate is not None:
            statement = statement.where(Shift.hourly_rate >= min_rate)
            count_statement = count_statement.where(Shift.hourly_rate >= min_rate)
        if max_rate is not None:
            statement = statement.where(Shift.hourly_rate <= max_rate)
            count_statement = count_statement.where(Shift.hourly_rate <= max_rate)
        if search:
            search_filter = or_(
                Shift.title.ilike(f"%{search}%"),
                Shift.description.ilike(f"%{search}%"),
                Shift.location.ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)
            count_statement = count_statement.where(search_filter)

        # Get total count
        total = db.exec(count_statement).one()

        # Apply pagination and ordering
        statement = statement.offset(skip).limit(limit).order_by(Shift.date, Shift.start_time)
        items = list(db.exec(statement).all())

        return items, total

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
        items, _ = self.get_multi_with_count(
            db,
            skip=skip,
            limit=limit,
            status=status,
            start_date=start_date,
            end_date=end_date,
            company_id=company_id,
        )
        return items

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
