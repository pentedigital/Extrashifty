"""Reviews endpoints for ExtraShifty."""

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.api.deps import ActiveUserDep, SessionDep
from app.core.cache import get_cached, invalidate_cache_prefix, set_cached
from app.core.rate_limit import limiter, DEFAULT_RATE_LIMIT
from app.crud import application as application_crud
from app.crud import review as review_crud
from app.crud import shift as shift_crud
from app.crud import user as user_crud
from app.models.application import ApplicationStatus
from app.models.review import ReviewType
from app.models.user import UserType
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewRead

router = APIRouter()


def enrich_review_with_names(session: SessionDep, review: Any) -> dict:
    """Add reviewer and reviewee names to review data."""
    review_dict = {
        "id": review.id,
        "reviewer_id": review.reviewer_id,
        "reviewee_id": review.reviewee_id,
        "shift_id": review.shift_id,
        "rating": review.rating,
        "comment": review.comment,
        "review_type": review.review_type,
        "created_at": review.created_at,
        "reviewer_name": None,
        "reviewee_name": None,
    }

    reviewer = user_crud.get(session, id=review.reviewer_id)
    reviewee = user_crud.get(session, id=review.reviewee_id)

    if reviewer:
        review_dict["reviewer_name"] = reviewer.full_name
    if reviewee:
        review_dict["reviewee_name"] = reviewee.full_name

    return review_dict


@router.post("", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def create_review(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    review_in: ReviewCreate,
) -> dict:
    """
    Create a new review.

    Staff can review companies (staff_to_company).
    Companies can review staff (company_to_staff).

    Requirements:
    - The shift must be completed
    - The reviewer must have been involved in the shift
    - Can only review once per shift/reviewee combination
    """
    # Validate shift exists and is completed
    shift = shift_crud.get(session, id=review_in.shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )

    # Validate reviewee exists
    reviewee = user_crud.get(session, id=review_in.reviewee_id)
    if not reviewee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reviewee not found",
        )

    # Validate review type matches user types
    if review_in.review_type == ReviewType.STAFF_TO_COMPANY:
        if current_user.user_type != UserType.STAFF:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only staff can write staff_to_company reviews",
            )
        if reviewee.user_type != UserType.COMPANY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewee must be a company for staff_to_company review",
            )
        # Verify staff worked the shift (has accepted application)
        application = application_crud.get_by_shift_and_applicant(
            session, shift_id=shift.id, applicant_id=current_user.id
        )
        if not application or application.status != ApplicationStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review shifts you have worked",
            )
        # Verify reviewing the correct company
        if review_in.reviewee_id != shift.company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewee must be the company that posted this shift",
            )
    elif review_in.review_type == ReviewType.COMPANY_TO_STAFF:
        if current_user.user_type != UserType.COMPANY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only companies can write company_to_staff reviews",
            )
        if reviewee.user_type != UserType.STAFF:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reviewee must be staff for company_to_staff review",
            )
        # Verify company owns the shift
        if shift.company_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only review staff for your own shifts",
            )
        # Verify staff worked the shift
        application = application_crud.get_by_shift_and_applicant(
            session, shift_id=shift.id, applicant_id=review_in.reviewee_id
        )
        if not application or application.status != ApplicationStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Staff member did not work this shift",
            )

    # Check for existing review
    if review_crud.exists_for_shift_and_reviewer(
        session,
        shift_id=review_in.shift_id,
        reviewer_id=current_user.id,
        reviewee_id=review_in.reviewee_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this person for this shift",
        )

    # Create the review
    review = review_crud.create_review(
        session,
        obj_in=review_in,
        reviewer_id=current_user.id,
    )

    # Invalidate review caches for both parties
    invalidate_cache_prefix(f"reviews:staff:{review_in.reviewee_id}")
    invalidate_cache_prefix(f"reviews:company:{review_in.reviewee_id}")

    return enrich_review_with_names(session, review)


@router.get("/staff/{staff_id}", response_model=ReviewListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_staff_reviews(
    request: Request,
    session: SessionDep,
    staff_id: int,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    """
    Get reviews for a staff member.

    Returns company_to_staff reviews about this staff member.
    """
    # Verify staff exists
    staff = user_crud.get(session, id=staff_id)
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )
    if staff.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a staff member",
        )

    cache_key = f"reviews:staff:{staff_id}:{skip}:{limit}"
    cached = get_cached(cache_key, tier="medium")
    if cached is not None:
        return cached

    reviews, total = review_crud.get_staff_reviews(
        session,
        staff_id=staff_id,
        skip=skip,
        limit=limit,
    )

    avg_rating = review_crud.get_average_rating(
        session,
        reviewee_id=staff_id,
        review_type=ReviewType.COMPANY_TO_STAFF,
    )

    enriched_reviews = [enrich_review_with_names(session, r) for r in reviews]

    result = {
        "items": enriched_reviews,
        "total": total,
        "average_rating": avg_rating if total > 0 else None,
    }
    set_cached(cache_key, result, tier="medium")
    return result


@router.get("/company/{company_id}", response_model=ReviewListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_company_reviews(
    request: Request,
    session: SessionDep,
    company_id: int,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    """
    Get reviews for a company.

    Returns staff_to_company reviews about this company.
    """
    # Verify company exists
    company = user_crud.get(session, id=company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    if company.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a company",
        )

    cache_key = f"reviews:company:{company_id}:{skip}:{limit}"
    cached = get_cached(cache_key, tier="medium")
    if cached is not None:
        return cached

    reviews, total = review_crud.get_company_reviews(
        session,
        company_id=company_id,
        skip=skip,
        limit=limit,
    )

    avg_rating = review_crud.get_average_rating(
        session,
        reviewee_id=company_id,
        review_type=ReviewType.STAFF_TO_COMPANY,
    )

    enriched_reviews = [enrich_review_with_names(session, r) for r in reviews]

    result = {
        "items": enriched_reviews,
        "total": total,
        "average_rating": avg_rating if total > 0 else None,
    }
    set_cached(cache_key, result, tier="medium")
    return result


@router.get("/shift/{shift_id}", response_model=ReviewListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_shift_reviews(
    request: Request,
    session: SessionDep,
    shift_id: int,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    """
    Get all reviews for a specific shift.

    Returns both staff_to_company and company_to_staff reviews.
    """
    # Verify shift exists
    shift = shift_crud.get(session, id=shift_id)
    if not shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shift not found",
        )

    reviews, total = review_crud.get_by_shift(
        session,
        shift_id=shift_id,
        skip=skip,
        limit=limit,
    )

    enriched_reviews = [enrich_review_with_names(session, r) for r in reviews]

    return {
        "items": enriched_reviews,
        "total": total,
        "average_rating": None,  # Mixed review types, no single average
    }
