"""CRUD operations for Review model."""

from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models.review import Review, ReviewType
from app.schemas.review import ReviewCreate


class ReviewUpdate:
    """Placeholder for review updates (reviews are immutable)."""

    pass


class CRUDReview(CRUDBase[Review, ReviewCreate, ReviewUpdate]):
    """CRUD operations for Review."""

    def create_review(
        self,
        db: Session,
        *,
        obj_in: ReviewCreate,
        reviewer_id: int,
    ) -> Review:
        """Create a new review."""
        db_obj = Review(
            reviewer_id=reviewer_id,
            reviewee_id=obj_in.reviewee_id,
            shift_id=obj_in.shift_id,
            rating=obj_in.rating,
            comment=obj_in.comment,
            review_type=obj_in.review_type,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_reviewee(
        self,
        db: Session,
        *,
        reviewee_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Review], int]:
        """Get reviews for a specific reviewee with count."""
        statement = (
            select(Review)
            .where(Review.reviewee_id == reviewee_id)
            .offset(skip)
            .limit(limit)
            .order_by(Review.created_at.desc())
        )
        count_statement = (
            select(func.count())
            .select_from(Review)
            .where(Review.reviewee_id == reviewee_id)
        )
        total = db.exec(count_statement).one()
        items = list(db.exec(statement).all())
        return items, total

    def get_by_shift(
        self,
        db: Session,
        *,
        shift_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Review], int]:
        """Get reviews for a specific shift with count."""
        statement = (
            select(Review)
            .where(Review.shift_id == shift_id)
            .offset(skip)
            .limit(limit)
            .order_by(Review.created_at.desc())
        )
        count_statement = (
            select(func.count())
            .select_from(Review)
            .where(Review.shift_id == shift_id)
        )
        total = db.exec(count_statement).one()
        items = list(db.exec(statement).all())
        return items, total

    def get_staff_reviews(
        self,
        db: Session,
        *,
        staff_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Review], int]:
        """Get reviews about a staff member (company_to_staff reviews)."""
        statement = (
            select(Review)
            .where(Review.reviewee_id == staff_id)
            .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
            .offset(skip)
            .limit(limit)
            .order_by(Review.created_at.desc())
        )
        count_statement = (
            select(func.count())
            .select_from(Review)
            .where(Review.reviewee_id == staff_id)
            .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
        )
        total = db.exec(count_statement).one()
        items = list(db.exec(statement).all())
        return items, total

    def get_company_reviews(
        self,
        db: Session,
        *,
        company_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[Review], int]:
        """Get reviews about a company (staff_to_company reviews)."""
        statement = (
            select(Review)
            .where(Review.reviewee_id == company_id)
            .where(Review.review_type == ReviewType.STAFF_TO_COMPANY)
            .offset(skip)
            .limit(limit)
            .order_by(Review.created_at.desc())
        )
        count_statement = (
            select(func.count())
            .select_from(Review)
            .where(Review.reviewee_id == company_id)
            .where(Review.review_type == ReviewType.STAFF_TO_COMPANY)
        )
        total = db.exec(count_statement).one()
        items = list(db.exec(statement).all())
        return items, total

    def get_average_rating(
        self,
        db: Session,
        *,
        reviewee_id: int,
        review_type: ReviewType | None = None,
    ) -> float:
        """Get average rating for a reviewee."""
        statement = select(func.avg(Review.rating)).where(
            Review.reviewee_id == reviewee_id
        )
        if review_type:
            statement = statement.where(Review.review_type == review_type)
        result = db.exec(statement).one()
        return float(result) if result else 0.0

    def exists_for_shift_and_reviewer(
        self,
        db: Session,
        *,
        shift_id: int,
        reviewer_id: int,
        reviewee_id: int,
    ) -> bool:
        """Check if a review already exists for this shift/reviewer/reviewee combo."""
        statement = (
            select(Review)
            .where(Review.shift_id == shift_id)
            .where(Review.reviewer_id == reviewer_id)
            .where(Review.reviewee_id == reviewee_id)
        )
        result = db.exec(statement).first()
        return result is not None


review = CRUDReview(Review)
