"""CRUD operations for Application model."""

from sqlmodel import Session, select

from app.crud.base import CRUDBase
from app.models.application import Application, ApplicationStatus
from app.models.shift import Shift
from app.schemas.application import ApplicationCreate, ApplicationUpdate


class CRUDApplication(CRUDBase[Application, ApplicationCreate, ApplicationUpdate]):
    """CRUD operations for Application."""

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        shift_id: int | None = None,
    ) -> list[Application]:
        """Get multiple applications with optional filtering."""
        statement = select(Application)

        if status:
            statement = statement.where(Application.status == status)
        if shift_id:
            statement = statement.where(Application.shift_id == shift_id)

        statement = statement.offset(skip).limit(limit).order_by(Application.applied_at.desc())
        return list(db.exec(statement).all())

    def get_by_applicant(
        self,
        db: Session,
        *,
        applicant_id: int,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
    ) -> list[Application]:
        """Get applications by applicant ID."""
        statement = select(Application).where(Application.applicant_id == applicant_id)

        if status:
            statement = statement.where(Application.status == status)

        statement = statement.offset(skip).limit(limit).order_by(Application.applied_at.desc())
        return list(db.exec(statement).all())

    def get_by_company(
        self,
        db: Session,
        *,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        shift_id: int | None = None,
    ) -> list[Application]:
        """Get applications for a company's shifts."""
        statement = (
            select(Application)
            .join(Shift, Application.shift_id == Shift.id)
            .where(Shift.company_id == company_id)
        )

        if status:
            statement = statement.where(Application.status == status)
        if shift_id:
            statement = statement.where(Application.shift_id == shift_id)

        statement = statement.offset(skip).limit(limit).order_by(Application.applied_at.desc())
        return list(db.exec(statement).all())

    def get_by_shift_and_applicant(
        self,
        db: Session,
        *,
        shift_id: int,
        applicant_id: int,
    ) -> Application | None:
        """Get application by shift and applicant."""
        statement = select(Application).where(
            Application.shift_id == shift_id,
            Application.applicant_id == applicant_id,
        )
        return db.exec(statement).first()

    def create_application(
        self,
        db: Session,
        *,
        shift_id: int,
        applicant_id: int,
        cover_message: str | None = None,
    ) -> Application:
        """Create a new application."""
        db_obj = Application(
            shift_id=shift_id,
            applicant_id=applicant_id,
            cover_message=cover_message,
            status=ApplicationStatus.PENDING,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_shift(
        self,
        db: Session,
        *,
        shift_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Application]:
        """Get all applications for a shift."""
        statement = (
            select(Application)
            .where(Application.shift_id == shift_id)
            .offset(skip)
            .limit(limit)
            .order_by(Application.applied_at.desc())
        )
        return list(db.exec(statement).all())


application = CRUDApplication(Application)
