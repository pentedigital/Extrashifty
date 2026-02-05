"""Agency endpoints for staff invitations and client management."""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Field as SQLField
from sqlmodel import Session, SQLModel, select, func

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


class AgencyStaffMember(SQLModel, table=True):
    """Model for agency staff members."""

    __tablename__ = "agency_staff_members"

    id: Optional[int] = SQLField(default=None, primary_key=True)
    agency_id: int = SQLField(index=True)
    staff_user_id: int = SQLField(index=True)
    status: str = SQLField(default="active")  # active, inactive, pending
    is_available: bool = SQLField(default=True)
    shifts_completed: int = SQLField(default=0)
    total_hours: float = SQLField(default=0.0)
    notes: Optional[str] = SQLField(default=None, max_length=2000)
    joined_at: datetime = SQLField(default_factory=datetime.utcnow)
    updated_at: datetime = SQLField(default_factory=datetime.utcnow)


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


class StaffMemberResponse(BaseModel):
    """Response schema for staff member data."""

    id: int
    agency_id: int
    staff_user_id: int
    status: str
    is_available: bool
    shifts_completed: int
    total_hours: float
    notes: Optional[str]
    joined_at: datetime
    # Additional fields that would come from user lookup
    name: Optional[str] = None
    email: Optional[str] = None
    skills: List[str] = []
    rating: float = 0.0


class AgencyStatsResponse(BaseModel):
    """Response schema for agency dashboard stats."""

    total_staff: int
    available_staff: int
    total_clients: int
    pending_clients: int
    active_shifts: int
    revenue_this_week: float
    pending_invoices: int
    pending_payroll: int


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


@router.get("/staff", response_model=List[StaffMemberResponse])
def list_staff(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
) -> List[dict]:
    """
    List all staff members for the current agency.

    Optionally filter by status (active, inactive, pending).
    """
    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id
    )

    if status_filter:
        statement = statement.where(AgencyStaffMember.status == status_filter)

    statement = statement.offset(skip).limit(limit)
    staff_members = session.exec(statement).all()

    # Return staff members with placeholder user data
    # In production, this would join with user table to get full profile
    return [
        StaffMemberResponse(
            id=member.id,
            agency_id=member.agency_id,
            staff_user_id=member.staff_user_id,
            status=member.status,
            is_available=member.is_available,
            shifts_completed=member.shifts_completed,
            total_hours=member.total_hours,
            notes=member.notes,
            joined_at=member.joined_at,
            name=f"Staff Member {member.staff_user_id}",  # Would come from user lookup
            email=None,
            skills=[],
            rating=0.0,
        )
        for member in staff_members
    ]


@router.delete("/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_staff(
    session: SessionDep,
    current_user: ActiveUserDep,
    staff_id: int,
) -> None:
    """
    Remove a staff member from the agency.

    This doesn't delete the user account, just the agency association.
    """
    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.id == staff_id,
        AgencyStaffMember.agency_id == current_user.id,
    )
    staff_member = session.exec(statement).first()

    if not staff_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    session.delete(staff_member)
    session.commit()

    logger.info(
        f"Agency {current_user.id} removed staff member {staff_id}"
    )


@router.get("/stats", response_model=AgencyStatsResponse)
def get_stats(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyStatsResponse:
    """
    Get agency dashboard statistics.

    Returns counts and metrics for the agency dashboard.
    """
    require_agency_user(current_user)

    # Count total staff
    total_staff_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )
    total_staff = session.exec(total_staff_stmt).one() or 0

    # Count available staff
    available_staff_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
        AgencyStaffMember.is_available == True,
    )
    available_staff = session.exec(available_staff_stmt).one() or 0

    # Count total active clients
    total_clients_stmt = select(func.count()).select_from(AgencyClient).where(
        AgencyClient.agency_id == current_user.id,
        AgencyClient.is_active == True,
    )
    total_clients = session.exec(total_clients_stmt).one() or 0

    # Count pending invitations (used as pending clients indicator)
    pending_clients_stmt = select(func.count()).select_from(StaffInvitation).where(
        StaffInvitation.agency_id == current_user.id,
        StaffInvitation.status == "pending",
    )
    pending_clients = session.exec(pending_clients_stmt).one() or 0

    # Active shifts would come from shifts table in production
    # For now, return placeholder data
    active_shifts = 0
    revenue_this_week = 0.0
    pending_invoices = 0
    pending_payroll = 0

    return AgencyStatsResponse(
        total_staff=total_staff,
        available_staff=available_staff,
        total_clients=total_clients,
        pending_clients=pending_clients,
        active_shifts=active_shifts,
        revenue_this_week=revenue_this_week,
        pending_invoices=pending_invoices,
        pending_payroll=pending_payroll,
    )
