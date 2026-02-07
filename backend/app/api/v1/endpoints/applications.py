"""Application endpoints."""

from fastapi import APIRouter, Query, Request

from app.api.deps import ActiveUserDep, SessionDep
from app.core.rate_limit import limiter, DEFAULT_RATE_LIMIT
from app.core.errors import raise_bad_request, require_found, require_permission
from app.crud import application as application_crud
from app.crud import shift as shift_crud
from app.models.application import Application, ApplicationStatus
from app.models.user import UserType
from app.schemas.application import ApplicationRead, ApplicationUpdate

router = APIRouter()


@router.get("", response_model=list[ApplicationRead])
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_applications(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: str | None = Query(None, alias="status"),
    shift_id: int | None = None,
) -> list[Application]:
    """
    List applications.

    Staff see their own applications.
    Companies see applications to their shifts.
    Admins see all applications.
    """
    if current_user.user_type == UserType.ADMIN:
        applications = application_crud.get_multi(
            session,
            skip=skip,
            limit=limit,
            status=status_filter,
            shift_id=shift_id,
        )
    elif current_user.user_type == UserType.COMPANY:
        # Get applications for company's shifts
        applications = application_crud.get_by_company(
            session,
            company_id=current_user.id,
            skip=skip,
            limit=limit,
            status=status_filter,
            shift_id=shift_id,
        )
    else:
        # Staff see their own applications
        applications = application_crud.get_by_applicant(
            session,
            applicant_id=current_user.id,
            skip=skip,
            limit=limit,
            status=status_filter,
        )
    return applications


@router.get("/{application_id}", response_model=ApplicationRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_application(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> Application:
    """Get application by ID."""
    application = application_crud.get(session, id=application_id)
    require_found(application, "Application")

    # Check permissions
    if current_user.user_type == UserType.ADMIN:
        return application
    elif current_user.user_type == UserType.COMPANY:
        # Company can view applications to their shifts
        shift = shift_crud.get(session, id=application.shift_id)
        require_permission(shift is not None and shift.company_id == current_user.id, "Not enough permissions")
    else:
        # Staff can only view their own applications
        require_permission(application.applicant_id == current_user.id, "Not enough permissions")
    return application


@router.patch("/{application_id}", response_model=ApplicationRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_application(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
    application_in: ApplicationUpdate,
) -> Application:
    """
    Update application status.

    Staff can withdraw their applications.
    Companies can accept/reject applications to their shifts.
    Admins can update any application.
    """
    application = application_crud.get(session, id=application_id)
    require_found(application, "Application")

    if current_user.user_type == UserType.ADMIN:
        # Admin bypass: Admins have full access to update any application.
        # This is intentional for administrative operations and support cases.
        # All application updates are tracked via database timestamps (updated_at).
        pass  # No additional restrictions for admin users
    elif current_user.user_type == UserType.COMPANY:
        # Company can only update applications to their shifts
        shift = shift_crud.get(session, id=application.shift_id)
        require_permission(shift is not None and shift.company_id == current_user.id, "Not enough permissions")
        # Companies can accept or reject
        if application_in.status not in (ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED):
            raise_bad_request("Companies can only accept or reject applications")
    else:
        # Staff can only withdraw their own applications
        require_permission(application.applicant_id == current_user.id, "Not enough permissions")
        if application_in.status != ApplicationStatus.WITHDRAWN:
            raise_bad_request("Staff can only withdraw applications")

    application = application_crud.update(session, db_obj=application, obj_in=application_in)
    return application
