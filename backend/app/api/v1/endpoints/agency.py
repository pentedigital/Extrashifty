"""Agency endpoints for staff invitations and client management."""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Field as SQLField
from sqlmodel import Session, SQLModel, select

from app.api.deps import ActiveUserDep, SessionDep
from app.models.user import UserType

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Models for Agency Features ---


class StaffInvitation(SQLModel, table=True):
    """Model for pending staff invitations."""

    __tablename__ = "staff_invitations"

    id: Optional[int] = SQLField(default=None, primary_key=True)
    agency_id: int = SQLField(index=True)
    email: str = SQLField(max_length=255, index=True)
    message: Optional[str] = SQLField(default=None, max_length=1000)
    status: str = SQLField(default="pending")  # pending, accepted, expired
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = SQLField(default=None)


class AgencyClient(SQLModel, table=True):
    """Model for agency client relationships."""

    __tablename__ = "agency_clients"

    id: Optional[int] = SQLField(default=None, primary_key=True)
    agency_id: int = SQLField(index=True)
    business_email: str = SQLField(max_length=255, index=True)
    billing_rate_markup: Optional[float] = SQLField(default=None)
    notes: Optional[str] = SQLField(default=None, max_length=2000)
    is_active: bool = SQLField(default=True)
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    updated_at: datetime = SQLField(default_factory=datetime.utcnow)


# --- Request/Response Schemas ---


class StaffInviteRequest(BaseModel):
    """Request schema for inviting staff members."""

    emails: List[EmailStr] = Field(min_length=1, max_length=50)
    message: Optional[str] = Field(default=None, max_length=1000)


class StaffInviteResponse(BaseModel):
    """Response schema for staff invitation."""

    invited: List[str]
    already_invited: List[str]
    message: str


class ClientCreateRequest(BaseModel):
    """Request schema for adding a client business."""

    business_email: EmailStr
    billing_rate_markup: Optional[float] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=2000)


class ClientResponse(BaseModel):
    """Response schema for client data."""

    id: int
    agency_id: int
    business_email: str
    billing_rate_markup: Optional[float]
    notes: Optional[str]
    is_active: bool
    created_at: datetime


# --- Helper Functions ---


def require_agency_user(current_user: ActiveUserDep) -> None:
    """Verify that the current user is an agency user."""
    if current_user.user_type not in (UserType.AGENCY, UserType.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agency role required for this operation",
        )


# --- Endpoints ---


@router.post("/staff/invite", response_model=StaffInviteResponse)
def invite_staff(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: StaffInviteRequest,
) -> StaffInviteResponse:
    """
    Send invitations to potential staff members.

    Creates pending invitations for the provided email addresses.
    Existing pending invitations for the same email will not be duplicated.
    """
    require_agency_user(current_user)

    invited: List[str] = []
    already_invited: List[str] = []

    for email in request.emails:
        email_lower = email.lower()

        # Check if invitation already exists for this agency
        statement = select(StaffInvitation).where(
            StaffInvitation.agency_id == current_user.id,
            StaffInvitation.email == email_lower,
            StaffInvitation.status == "pending",
        )
        existing = session.exec(statement).first()

        if existing:
            already_invited.append(email_lower)
            continue

        # Create new invitation
        invitation = StaffInvitation(
            agency_id=current_user.id,
            email=email_lower,
            message=request.message,
            status="pending",
        )
        session.add(invitation)
        invited.append(email_lower)

    session.commit()

    logger.info(
        f"Agency {current_user.id} invited {len(invited)} staff members"
    )

    return StaffInviteResponse(
        invited=invited,
        already_invited=already_invited,
        message=f"Successfully invited {len(invited)} staff member(s)",
    )


@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def add_client(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: ClientCreateRequest,
) -> AgencyClient:
    """
    Add a new client business to the agency.

    Creates a new client relationship with optional billing rate markup and notes.
    """
    require_agency_user(current_user)

    email_lower = request.business_email.lower()

    # Check if client already exists for this agency
    statement = select(AgencyClient).where(
        AgencyClient.agency_id == current_user.id,
        AgencyClient.business_email == email_lower,
    )
    existing = session.exec(statement).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client with this email already exists",
            )
        else:
            # Reactivate existing client
            existing.is_active = True
            existing.billing_rate_markup = request.billing_rate_markup
            existing.notes = request.notes
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            session.commit()
            session.refresh(existing)
            logger.info(
                f"Agency {current_user.id} reactivated client {email_lower}"
            )
            return existing

    # Create new client
    client = AgencyClient(
        agency_id=current_user.id,
        business_email=email_lower,
        billing_rate_markup=request.billing_rate_markup,
        notes=request.notes,
    )
    session.add(client)
    session.commit()
    session.refresh(client)

    logger.info(f"Agency {current_user.id} added client {email_lower}")

    return client


@router.get("/clients", response_model=List[ClientResponse])
def list_clients(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False,
) -> List[AgencyClient]:
    """
    List all clients for the current agency.

    Returns active clients by default. Set include_inactive=True to see all.
    """
    require_agency_user(current_user)

    statement = select(AgencyClient).where(
        AgencyClient.agency_id == current_user.id
    )

    if not include_inactive:
        statement = statement.where(AgencyClient.is_active == True)

    statement = statement.offset(skip).limit(limit)
    clients = session.exec(statement).all()

    return list(clients)


@router.get("/staff/invitations", response_model=List[dict])
def list_invitations(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
) -> List[dict]:
    """
    List all staff invitations for the current agency.

    Optionally filter by status (pending, accepted, expired).
    """
    require_agency_user(current_user)

    statement = select(StaffInvitation).where(
        StaffInvitation.agency_id == current_user.id
    )

    if status_filter:
        statement = statement.where(StaffInvitation.status == status_filter)

    statement = statement.offset(skip).limit(limit)
    invitations = session.exec(statement).all()

    return [
        {
            "id": inv.id,
            "email": inv.email,
            "message": inv.message,
            "status": inv.status,
            "created_at": inv.created_at,
        }
        for inv in invitations
    ]
