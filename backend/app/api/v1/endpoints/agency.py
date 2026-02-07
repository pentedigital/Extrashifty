"""Agency endpoints for staff invitations and client management."""

import logging
from datetime import UTC, date, datetime, time
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import func, select

from app.api.deps import ActiveUserDep, SessionDep
from app.core.rate_limit import limiter, DEFAULT_RATE_LIMIT, PAYMENT_RATE_LIMIT
from app.core.errors import (
    raise_bad_request,
    raise_not_found,
    require_found,
    require_permission,
)
from app.models.agency import (
    AgencyClient,
    AgencyClientInvoice,
    AgencyMode,
    AgencyModeChangeRequest,
    AgencyShift,
    AgencyShiftAssignment,
    AgencyStaffMember,
    PayrollEntry,
    StaffInvitation,
)
from app.models.agency import (
    AgencyProfile as AgencyProfileModel,
)
from app.models.application import Application, ApplicationStatus
from app.models.shift import Shift, ShiftStatus
from app.models.user import UserType
from app.models.wallet import Wallet
from app.schemas.agency import (
    AgencyDashboardResponse,
    AgencyModeRequirements,
    AgencyModeUpdateRequest,
    AgencyModeUpdateResponse,
    AgencyProfileRead,
    AgencyShiftCreateForClient,
)
from app.schemas.agency import (
    AgencyProfileUpdate as AgencyProfileUpdateSchema,
)
from app.schemas.agency import (
    AgencyShiftResponse as AgencyModeShiftResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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


class AgencyProfile(BaseModel):
    """Agency profile response schema."""

    id: int
    email: str
    agency_name: str
    description: str | None = None
    logo_url: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    website: str | None = None
    is_verified: bool = False
    average_rating: float = 0.0
    staff_count: int = 0
    client_count: int = 0
    created_at: datetime


class AgencyProfileUpdate(BaseModel):
    """Agency profile update schema."""

    agency_name: str | None = None
    description: str | None = None
    logo_url: str | None = None
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    website: str | None = None


class AgencyWallet(BaseModel):
    """Agency wallet response schema."""

    balance: float = 0.0
    pending_payments: float = 0.0
    pending_receivables: float = 0.0
    currency: str = "EUR"
    total_revenue: float = 0.0
    total_payroll: float = 0.0
    last_payout_date: datetime | None = None


# --- Invoice Schemas ---


class InvoiceCreateRequest(BaseModel):
    """Request schema for creating an invoice."""

    client_id: int
    period_start: date
    period_end: date
    due_date: date
    amount: float = Field(ge=0)
    currency: str = Field(default="EUR", max_length=3)
    notes: Optional[str] = Field(default=None, max_length=2000)


class InvoiceResponse(BaseModel):
    """Response schema for invoice data."""

    id: int
    agency_id: int
    client_id: int
    invoice_number: str
    status: str
    amount: float
    currency: str
    period_start: date
    period_end: date
    due_date: date
    paid_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Client info (optionally populated)
    client: Optional[ClientResponse] = None


class InvoiceListResponse(BaseModel):
    """Response schema for invoice list."""

    items: List[InvoiceResponse]
    total: int


class InvoiceGenerateRequest(BaseModel):
    """Request schema for generating an invoice from completed shifts."""

    period_start: date
    period_end: date
    include_markup: bool = Field(default=True, description="Apply agency markup to invoice")
    custom_due_date: Optional[date] = Field(default=None, description="Custom due date (default: period_end + 30 days)")
    notes: Optional[str] = Field(default=None, max_length=2000)


class InvoiceGenerateResponse(BaseModel):
    """Response schema for generated invoice with shift details."""

    invoice_id: int
    invoice_number: str
    agency_id: int
    client_id: int
    client_email: str
    status: str
    period_start: str
    period_end: str
    due_date: str
    currency: str
    subtotal: float
    markup_rate: float
    markup_amount: float
    total_amount: float
    total_hours: float
    shift_count: int
    shift_details: List[dict]
    notes: Optional[str] = None


class ClientBillingSummaryResponse(BaseModel):
    """Response schema for client billing summary."""

    agency_id: int
    client_id: int
    client_email: str
    total_invoiced: float
    paid_amount: float
    outstanding_amount: float
    overdue_amount: float
    draft_amount: float
    uninvoiced_amount: float
    uninvoiced_shift_count: int
    invoice_count: int
    invoice_count_by_status: dict
    recent_invoices: List[dict]


class UnbilledShiftResponse(BaseModel):
    """Response schema for unbilled shift."""

    shift_id: int
    date: str
    title: str
    location: str
    hours: float
    hourly_rate: float
    amount: float


# --- Payroll Schemas ---


class PayrollEntryCreateRequest(BaseModel):
    """Request schema for creating a payroll entry."""

    staff_member_id: int
    period_start: date
    period_end: date
    hours_worked: float = Field(ge=0)
    gross_amount: float = Field(ge=0)
    deductions: float = Field(default=0, ge=0)
    currency: str = Field(default="EUR", max_length=3)
    notes: Optional[str] = Field(default=None, max_length=2000)


class PayrollProcessRequest(BaseModel):
    """Request schema for processing payroll batch."""

    period_start: date
    period_end: date
    staff_member_ids: Optional[List[int]] = Field(default=None)


class PayrollEntryResponse(BaseModel):
    """Response schema for payroll entry data."""

    id: int
    agency_id: int
    staff_member_id: int
    period_start: date
    period_end: date
    status: str
    hours_worked: float
    gross_amount: float
    deductions: float
    net_amount: float
    currency: str
    paid_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Staff member info (optionally populated)
    staff_member: Optional[StaffMemberResponse] = None


class PayrollListResponse(BaseModel):
    """Response schema for payroll list."""

    items: List[PayrollEntryResponse]
    total: int


class PayrollProcessResponse(BaseModel):
    """Response schema for payroll processing result."""

    processed: int
    entries: List[PayrollEntryResponse]
    message: str


# --- New Request/Response Schemas for Staff, Client, and Shift Management ---


class StaffAddRequest(BaseModel):
    """Request schema for adding a staff member to the agency pool."""

    staff_user_id: int
    notes: Optional[str] = Field(default=None, max_length=2000)
    is_available: bool = True


class StaffUpdateRequest(BaseModel):
    """Request schema for updating staff member details."""

    status: Optional[str] = Field(default=None, pattern="^(active|inactive|pending)$")
    is_available: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class StaffAvailabilityResponse(BaseModel):
    """Response schema for staff availability."""

    staff_id: int
    is_available: bool
    status: str
    notes: Optional[str] = None


class StaffAvailabilityUpdateRequest(BaseModel):
    """Request schema for updating staff availability."""

    is_available: bool
    notes: Optional[str] = Field(default=None, max_length=2000)


class ClientUpdateRequest(BaseModel):
    """Request schema for updating client details."""

    billing_rate_markup: Optional[float] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=2000)
    is_active: Optional[bool] = None


class AgencyShiftCreateRequest(BaseModel):
    """Request schema for creating a shift on behalf of a client."""

    client_id: int
    title: str = Field(max_length=255)
    description: Optional[str] = None
    shift_type: str = Field(max_length=100)
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(max_digits=10, decimal_places=2)
    location: str = Field(max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: str = Field(max_length=100)
    spots_total: int = Field(default=1, ge=1)
    requirements: Optional[dict[str, Any]] = None


class AgencyShiftUpdateRequest(BaseModel):
    """Request schema for updating a shift."""

    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    shift_type: Optional[str] = Field(default=None, max_length=100)
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hourly_rate: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    location: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100)
    spots_total: Optional[int] = Field(default=None, ge=1)
    status: Optional[str] = Field(default=None, pattern="^(draft|open|filled|in_progress|completed|cancelled)$")
    requirements: Optional[dict[str, Any]] = None


class AgencyShiftResponse(BaseModel):
    """Response schema for agency shift data."""

    id: int
    title: str
    description: Optional[str]
    company_id: int
    client_id: Optional[int] = None
    shift_type: str
    date: date
    start_time: time
    end_time: time
    hourly_rate: Decimal
    location: str
    address: Optional[str]
    city: str
    spots_total: int
    spots_filled: int
    status: str
    requirements: Optional[dict[str, Any]]
    created_at: datetime
    assigned_staff: List[int] = []


class StaffAssignmentRequest(BaseModel):
    """Request schema for assigning staff to a shift."""

    staff_member_id: int


class StaffAssignmentResponse(BaseModel):
    """Response schema for staff assignment."""

    shift_id: int
    staff_member_id: int
    assigned_at: datetime
    message: str


class ApplicationResponse(BaseModel):
    """Response schema for application data."""

    id: int
    shift_id: int
    applicant_id: int
    status: str
    cover_message: Optional[str]
    applied_at: datetime
    applicant_name: Optional[str] = None


class ApplicationActionResponse(BaseModel):
    """Response schema for application accept/reject actions."""

    id: int
    status: str
    message: str


# --- Helper Functions ---


def require_agency_user(current_user: ActiveUserDep) -> None:
    """Verify that the current user is an agency user."""
    require_permission(
        current_user.user_type in (UserType.AGENCY, UserType.ADMIN),
        "Agency role required for this operation"
    )


# --- Endpoints ---


@router.post("/staff/invite", response_model=StaffInviteResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def invite_staff(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    invite_in: StaffInviteRequest,
) -> StaffInviteResponse:
    """
    Send invitations to potential staff members.

    Creates pending invitations for the provided email addresses.
    Existing pending invitations for the same email will not be duplicated.
    """
    require_agency_user(current_user)

    invited: List[str] = []
    already_invited: List[str] = []

    for email in invite_in.emails:
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
            message=invite_in.message,
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
@limiter.limit(DEFAULT_RATE_LIMIT)
def add_client(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_in: ClientCreateRequest,
) -> AgencyClient:
    """
    Add a new client business to the agency.

    Creates a new client relationship with optional billing rate markup and notes.
    """
    require_agency_user(current_user)

    email_lower = client_in.business_email.lower()

    # Check if client already exists for this agency
    statement = select(AgencyClient).where(
        AgencyClient.agency_id == current_user.id,
        AgencyClient.business_email == email_lower,
    )
    existing = session.exec(statement).first()

    if existing:
        if existing.is_active:
            raise_bad_request("Client with this email already exists")
        else:
            # Reactivate existing client
            existing.is_active = True
            existing.billing_rate_markup = client_in.billing_rate_markup
            existing.notes = client_in.notes
            existing.updated_at = datetime.now(UTC)
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
        billing_rate_markup=client_in.billing_rate_markup,
        notes=client_in.notes,
    )
    session.add(client)
    session.commit()
    session.refresh(client)

    logger.info(f"Agency {current_user.id} added client {email_lower}")

    return client


@router.get("/clients", response_model=List[ClientResponse])
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_clients(
    request: Request,
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
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_invitations(
    request: Request,
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
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_staff(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
) -> List[StaffMemberResponse]:
    """
    List all staff members for the current agency.

    Optionally filter by status (active, inactive, pending).
    """
    from app.models.profile import StaffProfile
    from app.models.review import Review, ReviewType
    from app.models.user import User

    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id
    )

    if status_filter:
        statement = statement.where(AgencyStaffMember.status == status_filter)

    statement = statement.offset(skip).limit(limit)
    staff_members = session.exec(statement).all()

    # Build response with real user data
    result = []
    for member in staff_members:
        # Get user details
        user = session.get(User, member.staff_user_id)

        # Get staff profile for skills
        profile = session.exec(
            select(StaffProfile).where(StaffProfile.user_id == member.staff_user_id)
        ).first()

        # Calculate average rating
        avg_rating_query = (
            select(func.coalesce(func.avg(Review.rating), 0))
            .where(Review.reviewee_id == member.staff_user_id)
            .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
        )
        avg_rating = float(session.exec(avg_rating_query).one() or 0)

        result.append(
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
                name=user.full_name if user else f"Staff Member {member.staff_user_id}",
                email=user.email if user else None,
                skills=profile.skills or [] if profile else [],
                rating=round(avg_rating, 2),
            )
        )

    return result


@router.delete("/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(DEFAULT_RATE_LIMIT)
def remove_staff(
    request: Request,
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

    require_found(staff_member, "Staff member")

    session.delete(staff_member)
    session.commit()

    logger.info(
        f"Agency {current_user.id} removed staff member {staff_id}"
    )


@router.get("/stats", response_model=AgencyStatsResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_stats(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyStatsResponse:
    """
    Get agency dashboard statistics.

    Returns counts and metrics for the agency dashboard.
    """
    from datetime import timedelta

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

    # Count active shifts (open, filled, or in_progress)
    agency_shift_ids_stmt = select(AgencyShift.shift_id).where(
        AgencyShift.agency_id == current_user.id
    )
    agency_shift_ids = session.exec(agency_shift_ids_stmt).all()

    active_shifts = 0
    if agency_shift_ids:
        active_shifts_stmt = select(func.count()).select_from(Shift).where(
            Shift.id.in_(agency_shift_ids),
            Shift.status.in_([ShiftStatus.OPEN, ShiftStatus.FILLED, ShiftStatus.IN_PROGRESS]),
        )
        active_shifts = session.exec(active_shifts_stmt).one() or 0

    # Calculate revenue this week from completed shifts
    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday of current week

    revenue_this_week = 0.0
    if agency_shift_ids:
        revenue_query = (
            select(Shift)
            .where(Shift.id.in_(agency_shift_ids))
            .where(Shift.status == ShiftStatus.COMPLETED)
            .where(Shift.date >= week_start)
            .where(Shift.date <= today)
        )
        completed_shifts = session.exec(revenue_query).all()

        for shift in completed_shifts:
            if shift.actual_hours_worked:
                revenue_this_week += float(shift.actual_hours_worked * shift.hourly_rate)
            else:
                # Use scheduled hours
                start_dt = datetime.combine(shift.date, shift.start_time)
                end_dt = datetime.combine(shift.date, shift.end_time)
                hours = (end_dt - start_dt).seconds / 3600
                revenue_this_week += hours * float(shift.hourly_rate)

    # Count pending invoices (draft or sent status)
    pending_invoices_stmt = select(func.count()).select_from(AgencyClientInvoice).where(
        AgencyClientInvoice.agency_id == current_user.id,
        AgencyClientInvoice.status.in_(["draft", "sent"]),
    )
    pending_invoices = session.exec(pending_invoices_stmt).one() or 0

    # Count pending payroll entries
    pending_payroll_stmt = select(func.count()).select_from(PayrollEntry).where(
        PayrollEntry.agency_id == current_user.id,
        PayrollEntry.status == "pending",
    )
    pending_payroll = session.exec(pending_payroll_stmt).one() or 0

    return AgencyStatsResponse(
        total_staff=total_staff,
        available_staff=available_staff,
        total_clients=total_clients,
        pending_clients=pending_clients,
        active_shifts=active_shifts,
        revenue_this_week=round(revenue_this_week, 2),
        pending_invoices=pending_invoices,
        pending_payroll=pending_payroll,
    )


@router.get("/profile", response_model=AgencyProfile)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_agency_profile(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyProfile:
    """Get current agency's profile."""
    require_agency_user(current_user)

    # Count staff and clients for profile
    staff_count_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )
    staff_count = session.exec(staff_count_stmt).one() or 0

    client_count_stmt = select(func.count()).select_from(AgencyClient).where(
        AgencyClient.agency_id == current_user.id,
        AgencyClient.is_active == True,
    )
    client_count = session.exec(client_count_stmt).one() or 0

    return AgencyProfile(
        id=current_user.id,
        email=current_user.email,
        agency_name=current_user.full_name,
        description=None,
        logo_url=None,
        address=None,
        city=None,
        phone=None,
        website=None,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        staff_count=staff_count,
        client_count=client_count,
        created_at=current_user.created_at,
    )


@router.patch("/profile", response_model=AgencyProfile)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_agency_profile(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    profile_update: AgencyProfileUpdate,
) -> AgencyProfile:
    """Update current agency's profile."""
    require_agency_user(current_user)

    # Update agency name if provided
    if profile_update.agency_name is not None:
        current_user.full_name = profile_update.agency_name

    current_user.updated_at = datetime.now(UTC)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    # Get counts for response
    staff_count_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )
    staff_count = session.exec(staff_count_stmt).one() or 0

    client_count_stmt = select(func.count()).select_from(AgencyClient).where(
        AgencyClient.agency_id == current_user.id,
        AgencyClient.is_active == True,
    )
    client_count = session.exec(client_count_stmt).one() or 0

    return AgencyProfile(
        id=current_user.id,
        email=current_user.email,
        agency_name=current_user.full_name,
        description=None,
        logo_url=None,
        address=None,
        city=None,
        phone=None,
        website=None,
        is_verified=current_user.is_verified,
        average_rating=0.0,
        staff_count=staff_count,
        client_count=client_count,
        created_at=current_user.created_at,
    )


@router.get("/wallet", response_model=AgencyWallet)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_agency_wallet(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyWallet:
    """Get current agency's wallet information."""
    from app.models.payment import (
        Payout,
        PayoutStatus,
        Transaction,
        TransactionStatus,
        TransactionType,
    )
    from app.models.wallet import Wallet

    require_agency_user(current_user)

    # Get wallet for agency
    wallet = session.exec(
        select(Wallet).where(Wallet.user_id == current_user.id)
    ).first()

    if not wallet:
        return AgencyWallet(
            balance=0.0,
            pending_payments=0.0,
            pending_receivables=0.0,
            currency="EUR",
            total_revenue=0.0,
            total_payroll=0.0,
            last_payout_date=None,
        )

    # Calculate total revenue from completed transactions
    total_revenue_query = (
        select(func.coalesce(func.sum(Transaction.net_amount), 0))
        .where(Transaction.wallet_id == wallet.id)
        .where(Transaction.transaction_type == TransactionType.SETTLEMENT)
        .where(Transaction.status == TransactionStatus.COMPLETED)
    )
    total_revenue = float(session.exec(total_revenue_query).one() or 0)

    # Calculate total payroll paid
    total_payroll_query = (
        select(func.coalesce(func.sum(PayrollEntry.net_amount), 0))
        .where(PayrollEntry.agency_id == current_user.id)
        .where(PayrollEntry.status == "paid")
    )
    total_payroll = float(session.exec(total_payroll_query).one() or 0)

    # Calculate pending receivables (invoices sent but not paid)
    pending_receivables_query = (
        select(func.coalesce(func.sum(AgencyClientInvoice.amount), 0))
        .where(AgencyClientInvoice.agency_id == current_user.id)
        .where(AgencyClientInvoice.status == "sent")
    )
    pending_receivables = float(session.exec(pending_receivables_query).one() or 0)

    # Get last payout date
    last_payout = session.exec(
        select(Payout)
        .where(Payout.wallet_id == wallet.id)
        .where(Payout.status == PayoutStatus.PAID)
        .order_by(Payout.paid_at.desc())
        .limit(1)
    ).first()

    return AgencyWallet(
        balance=float(wallet.balance),
        pending_payments=float(wallet.reserved_balance),
        pending_receivables=round(pending_receivables, 2),
        currency=wallet.currency,
        total_revenue=round(total_revenue, 2),
        total_payroll=round(total_payroll, 2),
        last_payout_date=last_payout.paid_at if last_payout else None,
    )


# --- Staff Management Endpoints ---


@router.post("/staff", response_model=StaffMemberResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def add_staff(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    staff_in: StaffAddRequest,
) -> StaffMemberResponse:
    """
    Add a staff member to the agency pool.

    Creates a new agency-staff relationship with the specified user.
    """
    from app.models.profile import StaffProfile
    from app.models.review import Review, ReviewType
    from app.models.user import User

    require_agency_user(current_user)

    # Verify the user exists and is a staff user
    user = session.get(User, staff_in.staff_user_id)
    require_found(user, "User")

    if user.user_type != UserType.STAFF:
        raise_bad_request("User is not a staff member")

    # Check if staff member already exists for this agency
    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.staff_user_id == staff_in.staff_user_id,
    )
    existing = session.exec(statement).first()

    if existing:
        raise_bad_request("Staff member already exists in agency pool")

    # Create new staff member
    staff_member = AgencyStaffMember(
        agency_id=current_user.id,
        staff_user_id=staff_in.staff_user_id,
        notes=staff_in.notes,
        is_available=staff_in.is_available,
        status="active",
    )
    session.add(staff_member)
    session.commit()
    session.refresh(staff_member)

    logger.info(f"Agency {current_user.id} added staff member {staff_in.staff_user_id}")

    # Get profile for skills
    profile = session.exec(
        select(StaffProfile).where(StaffProfile.user_id == staff_in.staff_user_id)
    ).first()

    # Get average rating
    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == staff_in.staff_user_id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    avg_rating = float(session.exec(avg_rating_query).one() or 0)

    return StaffMemberResponse(
        id=staff_member.id,
        agency_id=staff_member.agency_id,
        staff_user_id=staff_member.staff_user_id,
        status=staff_member.status,
        is_available=staff_member.is_available,
        shifts_completed=staff_member.shifts_completed,
        total_hours=staff_member.total_hours,
        notes=staff_member.notes,
        joined_at=staff_member.joined_at,
        name=user.full_name,
        email=user.email,
        skills=profile.skills or [] if profile else [],
        rating=round(avg_rating, 2),
    )


@router.patch("/staff/{staff_id}", response_model=StaffMemberResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_staff(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    staff_id: int,
    staff_update_in: StaffUpdateRequest,
) -> StaffMemberResponse:
    """
    Update staff member details.

    Allows updating status, availability, and notes for a staff member.
    """
    from app.models.profile import StaffProfile
    from app.models.review import Review, ReviewType
    from app.models.user import User

    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.id == staff_id,
        AgencyStaffMember.agency_id == current_user.id,
    )
    staff_member = session.exec(statement).first()

    require_found(staff_member, "Staff member")

    # Update fields if provided
    if staff_update_in.status is not None:
        staff_member.status = staff_update_in.status
    if staff_update_in.is_available is not None:
        staff_member.is_available = staff_update_in.is_available
    if staff_update_in.notes is not None:
        staff_member.notes = staff_update_in.notes

    staff_member.updated_at = datetime.now(UTC)
    session.add(staff_member)
    session.commit()
    session.refresh(staff_member)

    logger.info(f"Agency {current_user.id} updated staff member {staff_id}")

    # Get user details
    user = session.get(User, staff_member.staff_user_id)

    # Get profile for skills
    profile = session.exec(
        select(StaffProfile).where(StaffProfile.user_id == staff_member.staff_user_id)
    ).first()

    # Get average rating
    avg_rating_query = (
        select(func.coalesce(func.avg(Review.rating), 0))
        .where(Review.reviewee_id == staff_member.staff_user_id)
        .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
    )
    avg_rating = float(session.exec(avg_rating_query).one() or 0)

    return StaffMemberResponse(
        id=staff_member.id,
        agency_id=staff_member.agency_id,
        staff_user_id=staff_member.staff_user_id,
        status=staff_member.status,
        is_available=staff_member.is_available,
        shifts_completed=staff_member.shifts_completed,
        total_hours=staff_member.total_hours,
        notes=staff_member.notes,
        joined_at=staff_member.joined_at,
        name=user.full_name if user else f"Staff Member {staff_member.staff_user_id}",
        email=user.email if user else None,
        skills=profile.skills or [] if profile else [],
        rating=round(avg_rating, 2),
    )


@router.get("/staff/{staff_id}/availability", response_model=StaffAvailabilityResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_staff_availability(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    staff_id: int,
) -> StaffAvailabilityResponse:
    """
    Get staff member availability.

    Returns the current availability status of a staff member.
    """
    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.id == staff_id,
        AgencyStaffMember.agency_id == current_user.id,
    )
    staff_member = session.exec(statement).first()

    require_found(staff_member, "Staff member")

    return StaffAvailabilityResponse(
        staff_id=staff_member.id,
        is_available=staff_member.is_available,
        status=staff_member.status,
        notes=staff_member.notes,
    )


@router.patch("/staff/{staff_id}/availability", response_model=StaffAvailabilityResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_staff_availability(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    staff_id: int,
    availability_in: StaffAvailabilityUpdateRequest,
) -> StaffAvailabilityResponse:
    """
    Update staff member availability.

    Allows updating the availability status and notes for a staff member.
    """
    require_agency_user(current_user)

    statement = select(AgencyStaffMember).where(
        AgencyStaffMember.id == staff_id,
        AgencyStaffMember.agency_id == current_user.id,
    )
    staff_member = session.exec(statement).first()

    require_found(staff_member, "Staff member")

    staff_member.is_available = availability_in.is_available
    if availability_in.notes is not None:
        staff_member.notes = availability_in.notes
    staff_member.updated_at = datetime.now(UTC)

    session.add(staff_member)
    session.commit()
    session.refresh(staff_member)

    logger.info(f"Agency {current_user.id} updated availability for staff member {staff_id}")

    return StaffAvailabilityResponse(
        staff_id=staff_member.id,
        is_available=staff_member.is_available,
        status=staff_member.status,
        notes=staff_member.notes,
    )


# --- Client Management Endpoints ---


@router.patch("/clients/{client_id}", response_model=ClientResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_client(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
    client_update_in: ClientUpdateRequest,
) -> AgencyClient:
    """
    Update client details.

    Allows updating billing rate markup, notes, and active status.
    """
    require_agency_user(current_user)

    statement = select(AgencyClient).where(
        AgencyClient.id == client_id,
        AgencyClient.agency_id == current_user.id,
    )
    client = session.exec(statement).first()

    require_found(client, "Client")

    # Update fields if provided
    if client_update_in.billing_rate_markup is not None:
        client.billing_rate_markup = client_update_in.billing_rate_markup
    if client_update_in.notes is not None:
        client.notes = client_update_in.notes
    if client_update_in.is_active is not None:
        client.is_active = client_update_in.is_active

    client.updated_at = datetime.now(UTC)
    session.add(client)
    session.commit()
    session.refresh(client)

    logger.info(f"Agency {current_user.id} updated client {client_id}")

    return client


@router.delete("/clients/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(DEFAULT_RATE_LIMIT)
def remove_client(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
) -> None:
    """
    Remove a client from the agency.

    This sets the client as inactive rather than deleting the record.
    """
    require_agency_user(current_user)

    statement = select(AgencyClient).where(
        AgencyClient.id == client_id,
        AgencyClient.agency_id == current_user.id,
    )
    client = session.exec(statement).first()

    require_found(client, "Client")

    client.is_active = False
    client.updated_at = datetime.now(UTC)
    session.add(client)
    session.commit()

    logger.info(f"Agency {current_user.id} removed client {client_id}")


# --- Shift Management Endpoints ---


@router.get("/shifts", response_model=List[AgencyShiftResponse])
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_agency_shifts(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
) -> List[AgencyShiftResponse]:
    """
    List all shifts posted by the agency.

    Optionally filter by status or client_id.
    """
    require_agency_user(current_user)

    # Get all agency shifts
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.agency_id == current_user.id
    )

    if client_id:
        agency_shift_stmt = agency_shift_stmt.where(AgencyShift.client_id == client_id)

    agency_shifts = session.exec(agency_shift_stmt).all()
    shift_ids = [as_.shift_id for as_ in agency_shifts]

    if not shift_ids:
        return []

    # Get the actual shifts
    shift_stmt = select(Shift).where(Shift.id.in_(shift_ids))

    if status_filter:
        shift_stmt = shift_stmt.where(Shift.status == status_filter)

    shift_stmt = shift_stmt.offset(skip).limit(limit)
    shifts = session.exec(shift_stmt).all()

    # Create a mapping of shift_id to client_id
    shift_client_map = {as_.shift_id: as_.client_id for as_ in agency_shifts}

    # Get assigned staff for each shift
    result = []
    for shift in shifts:
        assignments_stmt = select(AgencyShiftAssignment).where(
            AgencyShiftAssignment.shift_id == shift.id,
            AgencyShiftAssignment.agency_id == current_user.id,
        )
        assignments = session.exec(assignments_stmt).all()
        assigned_staff = [a.staff_member_id for a in assignments]

        result.append(AgencyShiftResponse(
            id=shift.id,
            title=shift.title,
            description=shift.description,
            company_id=shift.company_id,
            client_id=shift_client_map.get(shift.id),
            shift_type=shift.shift_type,
            date=shift.date,
            start_time=shift.start_time,
            end_time=shift.end_time,
            hourly_rate=shift.hourly_rate,
            location=shift.location,
            address=shift.address,
            city=shift.city,
            spots_total=shift.spots_total,
            spots_filled=shift.spots_filled,
            status=shift.status.value if hasattr(shift.status, 'value') else shift.status,
            requirements=shift.requirements,
            created_at=shift.created_at,
            assigned_staff=assigned_staff,
        ))

    return result


@router.post("/shifts", response_model=AgencyShiftResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def create_agency_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_in: AgencyShiftCreateRequest,
) -> AgencyShiftResponse:
    """
    Post a shift on behalf of a client.

    Creates a new shift and tracks it as an agency-posted shift.
    """
    require_agency_user(current_user)

    # Verify client exists and belongs to agency
    client_stmt = select(AgencyClient).where(
        AgencyClient.id == shift_in.client_id,
        AgencyClient.agency_id == current_user.id,
        AgencyClient.is_active == True,
    )
    client = session.exec(client_stmt).first()

    require_found(client, "Client not found or inactive")

    # Create the shift (agency posts as company_id = agency user id)
    shift = Shift(
        title=shift_in.title,
        description=shift_in.description,
        company_id=current_user.id,
        shift_type=shift_in.shift_type,
        date=shift_in.date,
        start_time=shift_in.start_time,
        end_time=shift_in.end_time,
        hourly_rate=shift_in.hourly_rate,
        location=shift_in.location,
        address=shift_in.address,
        city=shift_in.city,
        spots_total=shift_in.spots_total,
        spots_filled=0,
        status=ShiftStatus.OPEN,
        requirements=shift_in.requirements,
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)

    # Track this as an agency shift
    agency_shift = AgencyShift(
        agency_id=current_user.id,
        shift_id=shift.id,
        client_id=shift_in.client_id,
    )
    session.add(agency_shift)
    session.commit()

    logger.info(f"Agency {current_user.id} created shift {shift.id} for client {shift_in.client_id}")

    return AgencyShiftResponse(
        id=shift.id,
        title=shift.title,
        description=shift.description,
        company_id=shift.company_id,
        client_id=shift_in.client_id,
        shift_type=shift.shift_type,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hourly_rate=shift.hourly_rate,
        location=shift.location,
        address=shift.address,
        city=shift.city,
        spots_total=shift.spots_total,
        spots_filled=shift.spots_filled,
        status=shift.status.value if hasattr(shift.status, 'value') else shift.status,
        requirements=shift.requirements,
        created_at=shift.created_at,
        assigned_staff=[],
    )


@router.patch("/shifts/{shift_id}", response_model=AgencyShiftResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_agency_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    shift_update_in: AgencyShiftUpdateRequest,
) -> AgencyShiftResponse:
    """
    Update a shift posted by the agency.

    Allows updating shift details and status.
    """
    require_agency_user(current_user)

    # Verify shift belongs to agency
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.shift_id == shift_id,
        AgencyShift.agency_id == current_user.id,
    )
    agency_shift = session.exec(agency_shift_stmt).first()

    require_found(agency_shift, "Shift not found or not owned by agency")

    # Get the actual shift
    shift = session.get(Shift, shift_id)
    require_found(shift, "Shift")

    # Update fields if provided
    if shift_update_in.title is not None:
        shift.title = shift_update_in.title
    if shift_update_in.description is not None:
        shift.description = shift_update_in.description
    if shift_update_in.shift_type is not None:
        shift.shift_type = shift_update_in.shift_type
    if shift_update_in.date is not None:
        shift.date = shift_update_in.date
    if shift_update_in.start_time is not None:
        shift.start_time = shift_update_in.start_time
    if shift_update_in.end_time is not None:
        shift.end_time = shift_update_in.end_time
    if shift_update_in.hourly_rate is not None:
        shift.hourly_rate = shift_update_in.hourly_rate
    if shift_update_in.location is not None:
        shift.location = shift_update_in.location
    if shift_update_in.address is not None:
        shift.address = shift_update_in.address
    if shift_update_in.city is not None:
        shift.city = shift_update_in.city
    if shift_update_in.spots_total is not None:
        shift.spots_total = shift_update_in.spots_total
    if shift_update_in.status is not None:
        shift.status = ShiftStatus(shift_update_in.status)
    if shift_update_in.requirements is not None:
        shift.requirements = shift_update_in.requirements

    session.add(shift)
    session.commit()
    session.refresh(shift)

    # Get assigned staff
    assignments_stmt = select(AgencyShiftAssignment).where(
        AgencyShiftAssignment.shift_id == shift.id,
        AgencyShiftAssignment.agency_id == current_user.id,
    )
    assignments = session.exec(assignments_stmt).all()
    assigned_staff = [a.staff_member_id for a in assignments]

    logger.info(f"Agency {current_user.id} updated shift {shift_id}")

    return AgencyShiftResponse(
        id=shift.id,
        title=shift.title,
        description=shift.description,
        company_id=shift.company_id,
        client_id=agency_shift.client_id,
        shift_type=shift.shift_type,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hourly_rate=shift.hourly_rate,
        location=shift.location,
        address=shift.address,
        city=shift.city,
        spots_total=shift.spots_total,
        spots_filled=shift.spots_filled,
        status=shift.status.value if hasattr(shift.status, 'value') else shift.status,
        requirements=shift.requirements,
        created_at=shift.created_at,
        assigned_staff=assigned_staff,
    )


@router.delete("/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(DEFAULT_RATE_LIMIT)
def delete_agency_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
) -> None:
    """
    Cancel/delete a shift posted by the agency.

    Sets the shift status to cancelled.
    """
    require_agency_user(current_user)

    # Verify shift belongs to agency
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.shift_id == shift_id,
        AgencyShift.agency_id == current_user.id,
    )
    agency_shift = session.exec(agency_shift_stmt).first()

    require_found(agency_shift, "Shift not found or not owned by agency")

    # Get the actual shift
    shift = session.get(Shift, shift_id)
    require_found(shift, "Shift")

    shift.status = ShiftStatus.CANCELLED
    session.add(shift)
    session.commit()

    logger.info(f"Agency {current_user.id} cancelled shift {shift_id}")


@router.post("/shifts/{shift_id}/assign", response_model=StaffAssignmentResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def assign_staff_to_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    assignment_in: StaffAssignmentRequest,
) -> StaffAssignmentResponse:
    """
    Assign a staff member to a shift.

    Creates an assignment linking an agency staff member to a shift.
    """
    require_agency_user(current_user)

    # Verify shift belongs to agency
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.shift_id == shift_id,
        AgencyShift.agency_id == current_user.id,
    )
    agency_shift = session.exec(agency_shift_stmt).first()

    require_found(agency_shift, "Shift not found or not owned by agency")

    # Verify staff member belongs to agency
    staff_stmt = select(AgencyStaffMember).where(
        AgencyStaffMember.id == assignment_in.staff_member_id,
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )
    staff_member = session.exec(staff_stmt).first()

    require_found(staff_member, "Staff member not found or inactive")

    # Check if already assigned
    existing_stmt = select(AgencyShiftAssignment).where(
        AgencyShiftAssignment.shift_id == shift_id,
        AgencyShiftAssignment.staff_member_id == assignment_in.staff_member_id,
        AgencyShiftAssignment.agency_id == current_user.id,
    )
    existing = session.exec(existing_stmt).first()

    if existing:
        raise_bad_request("Staff member already assigned to this shift")

    # Get the shift to update spots_filled
    shift = session.get(Shift, shift_id)
    require_found(shift, "Shift")

    if shift.spots_filled >= shift.spots_total:
        raise_bad_request("Shift is fully staffed")

    # Create assignment
    assignment = AgencyShiftAssignment(
        agency_id=current_user.id,
        shift_id=shift_id,
        staff_member_id=assignment_in.staff_member_id,
    )
    session.add(assignment)

    # Update shift spots_filled
    shift.spots_filled += 1
    if shift.spots_filled >= shift.spots_total:
        shift.status = ShiftStatus.FILLED
    session.add(shift)

    session.commit()
    session.refresh(assignment)

    logger.info(f"Agency {current_user.id} assigned staff {assignment_in.staff_member_id} to shift {shift_id}")

    return StaffAssignmentResponse(
        shift_id=shift_id,
        staff_member_id=assignment_in.staff_member_id,
        assigned_at=assignment.assigned_at,
        message="Staff member assigned successfully",
    )


# --- Application Management Endpoints ---


@router.get("/applications", response_model=List[ApplicationResponse])
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_agency_applications(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    shift_id: Optional[int] = None,
) -> List[ApplicationResponse]:
    """
    List applications to agency shifts.

    Returns all applications for shifts posted by the agency.
    """
    require_agency_user(current_user)

    # Get all agency shifts
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.agency_id == current_user.id
    )
    agency_shifts = session.exec(agency_shift_stmt).all()
    shift_ids = [as_.shift_id for as_ in agency_shifts]

    if not shift_ids:
        return []

    # Get applications for those shifts
    app_stmt = select(Application).where(Application.shift_id.in_(shift_ids))

    if status_filter:
        app_stmt = app_stmt.where(Application.status == status_filter)
    if shift_id:
        if shift_id in shift_ids:
            app_stmt = app_stmt.where(Application.shift_id == shift_id)
        else:
            return []

    app_stmt = app_stmt.offset(skip).limit(limit)
    applications = session.exec(app_stmt).all()

    # Build response with real applicant names
    from app.models.user import User

    result = []
    for app in applications:
        # Get applicant user details
        applicant = session.get(User, app.applicant_id)
        result.append(
            ApplicationResponse(
                id=app.id,
                shift_id=app.shift_id,
                applicant_id=app.applicant_id,
                status=app.status.value if hasattr(app.status, 'value') else app.status,
                cover_message=app.cover_message,
                applied_at=app.applied_at,
                applicant_name=applicant.full_name if applicant else f"Applicant {app.applicant_id}",
            )
        )

    return result


@router.post("/applications/{application_id}/accept", response_model=ApplicationActionResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def accept_application(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> ApplicationActionResponse:
    """
    Accept an application to an agency shift.

    Changes the application status to accepted and updates shift spots.
    """
    require_agency_user(current_user)

    # Get the application
    application = session.get(Application, application_id)
    require_found(application, "Application")

    # Verify the shift belongs to this agency
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.shift_id == application.shift_id,
        AgencyShift.agency_id == current_user.id,
    )
    agency_shift = session.exec(agency_shift_stmt).first()

    require_permission(agency_shift is not None, "Not authorized to manage this application")

    if application.status != ApplicationStatus.PENDING:
        raise_bad_request(f"Application is already {application.status.value}")

    # Get the shift
    shift = session.get(Shift, application.shift_id)
    require_found(shift, "Shift")

    if shift.spots_filled >= shift.spots_total:
        raise_bad_request("Shift is fully staffed")

    # Accept the application
    application.status = ApplicationStatus.ACCEPTED
    session.add(application)

    # Update shift spots
    shift.spots_filled += 1
    if shift.spots_filled >= shift.spots_total:
        shift.status = ShiftStatus.FILLED
    session.add(shift)

    session.commit()

    logger.info(f"Agency {current_user.id} accepted application {application_id}")

    return ApplicationActionResponse(
        id=application_id,
        status="accepted",
        message="Application accepted successfully",
    )


@router.post("/applications/{application_id}/reject", response_model=ApplicationActionResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def reject_application(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    application_id: int,
) -> ApplicationActionResponse:
    """
    Reject an application to an agency shift.

    Changes the application status to rejected.
    """
    require_agency_user(current_user)

    # Get the application
    application = session.get(Application, application_id)
    require_found(application, "Application")

    # Verify the shift belongs to this agency
    agency_shift_stmt = select(AgencyShift).where(
        AgencyShift.shift_id == application.shift_id,
        AgencyShift.agency_id == current_user.id,
    )
    agency_shift = session.exec(agency_shift_stmt).first()

    require_permission(agency_shift is not None, "Not authorized to manage this application")

    if application.status != ApplicationStatus.PENDING:
        raise_bad_request(f"Application is already {application.status.value}")

    # Reject the application
    application.status = ApplicationStatus.REJECTED
    session.add(application)
    session.commit()

    logger.info(f"Agency {current_user.id} rejected application {application_id}")

    return ApplicationActionResponse(
        id=application_id,
        status="rejected",
        message="Application rejected",
    )


# --- Invoice Endpoints ---


def generate_invoice_number(agency_id: int, session: SessionDep) -> str:
    """Generate a unique invoice number."""
    # Count existing invoices for this agency to create sequential number
    count_stmt = select(func.count()).select_from(AgencyClientInvoice).where(
        AgencyClientInvoice.agency_id == agency_id
    )
    count = session.exec(count_stmt).one() or 0
    year = datetime.now(UTC).year
    return f"INV-{agency_id}-{year}-{count + 1:04d}"


@router.get("/invoices", response_model=InvoiceListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_invoices(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
) -> InvoiceListResponse:
    """
    List all invoices for the current agency.

    Optionally filter by status (draft, sent, paid, overdue) or client_id.
    """
    require_agency_user(current_user)

    statement = select(AgencyClientInvoice).where(AgencyClientInvoice.agency_id == current_user.id)

    if status_filter:
        statement = statement.where(AgencyClientInvoice.status == status_filter)

    if client_id:
        statement = statement.where(AgencyClientInvoice.client_id == client_id)

    # Count total before pagination
    count_stmt = select(func.count()).select_from(AgencyClientInvoice).where(
        AgencyClientInvoice.agency_id == current_user.id
    )
    if status_filter:
        count_stmt = count_stmt.where(AgencyClientInvoice.status == status_filter)
    if client_id:
        count_stmt = count_stmt.where(AgencyClientInvoice.client_id == client_id)
    total = session.exec(count_stmt).one() or 0

    statement = statement.order_by(AgencyClientInvoice.created_at.desc()).offset(skip).limit(limit)
    invoices = session.exec(statement).all()

    # Fetch client info for each invoice
    invoice_responses = []
    for inv in invoices:
        client_stmt = select(AgencyClient).where(AgencyClient.id == inv.client_id)
        client = session.exec(client_stmt).first()
        client_response = None
        if client:
            client_response = ClientResponse(
                id=client.id,
                agency_id=client.agency_id,
                business_email=client.business_email,
                billing_rate_markup=client.billing_rate_markup,
                notes=client.notes,
                is_active=client.is_active,
                created_at=client.created_at,
            )
        invoice_responses.append(
            InvoiceResponse(
                id=inv.id,
                agency_id=inv.agency_id,
                client_id=inv.client_id,
                invoice_number=inv.invoice_number,
                status=inv.status,
                amount=inv.amount,
                currency=inv.currency,
                period_start=inv.period_start,
                period_end=inv.period_end,
                due_date=inv.due_date,
                paid_date=inv.paid_date,
                notes=inv.notes,
                created_at=inv.created_at,
                updated_at=inv.updated_at,
                client=client_response,
            )
        )

    return InvoiceListResponse(items=invoice_responses, total=total)


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(PAYMENT_RATE_LIMIT)
def create_invoice(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_in: InvoiceCreateRequest,
) -> InvoiceResponse:
    """
    Create a new invoice for a client.

    The invoice is created in draft status and must be sent separately.
    """
    require_agency_user(current_user)

    # Verify client belongs to this agency
    client_stmt = select(AgencyClient).where(
        AgencyClient.id == invoice_in.client_id,
        AgencyClient.agency_id == current_user.id,
    )
    client = session.exec(client_stmt).first()

    require_found(client, "Client")

    # Generate invoice number
    invoice_number = generate_invoice_number(current_user.id, session)

    # Create invoice
    invoice = AgencyClientInvoice(
        agency_id=current_user.id,
        client_id=invoice_in.client_id,
        invoice_number=invoice_number,
        status="draft",
        amount=invoice_in.amount,
        currency=invoice_in.currency,
        period_start=invoice_in.period_start,
        period_end=invoice_in.period_end,
        due_date=invoice_in.due_date,
        notes=invoice_in.notes,
    )
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    logger.info(f"Agency {current_user.id} created invoice {invoice_number}")

    client_response = ClientResponse(
        id=client.id,
        agency_id=client.agency_id,
        business_email=client.business_email,
        billing_rate_markup=client.billing_rate_markup,
        notes=client.notes,
        is_active=client.is_active,
        created_at=client.created_at,
    )

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        client_id=invoice.client_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        amount=invoice.amount,
        currency=invoice.currency,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        client=client_response,
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_invoice(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> InvoiceResponse:
    """Get invoice details by ID."""
    require_agency_user(current_user)

    statement = select(AgencyClientInvoice).where(
        AgencyClientInvoice.id == invoice_id,
        AgencyClientInvoice.agency_id == current_user.id,
    )
    invoice = session.exec(statement).first()

    require_found(invoice, "Invoice")

    # Fetch client info
    client_stmt = select(AgencyClient).where(AgencyClient.id == invoice.client_id)
    client = session.exec(client_stmt).first()
    client_response = None
    if client:
        client_response = ClientResponse(
            id=client.id,
            agency_id=client.agency_id,
            business_email=client.business_email,
            billing_rate_markup=client.billing_rate_markup,
            notes=client.notes,
            is_active=client.is_active,
            created_at=client.created_at,
        )

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        client_id=invoice.client_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        amount=invoice.amount,
        currency=invoice.currency,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        client=client_response,
    )


@router.patch("/invoices/{invoice_id}/send", response_model=InvoiceResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
def send_invoice(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> InvoiceResponse:
    """
    Send an invoice to the client.

    Changes invoice status from draft to sent.
    """
    require_agency_user(current_user)

    statement = select(AgencyClientInvoice).where(
        AgencyClientInvoice.id == invoice_id,
        AgencyClientInvoice.agency_id == current_user.id,
    )
    invoice = session.exec(statement).first()

    require_found(invoice, "Invoice")

    if invoice.status != "draft":
        raise_bad_request(f"Cannot send invoice with status '{invoice.status}'. Only draft invoices can be sent.")

    invoice.status = "sent"
    invoice.updated_at = datetime.now(UTC)
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    logger.info(f"Agency {current_user.id} sent invoice {invoice.invoice_number}")

    # Fetch client info
    client_stmt = select(AgencyClient).where(AgencyClient.id == invoice.client_id)
    client = session.exec(client_stmt).first()
    client_response = None
    if client:
        client_response = ClientResponse(
            id=client.id,
            agency_id=client.agency_id,
            business_email=client.business_email,
            billing_rate_markup=client.billing_rate_markup,
            notes=client.notes,
            is_active=client.is_active,
            created_at=client.created_at,
        )

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        client_id=invoice.client_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        amount=invoice.amount,
        currency=invoice.currency,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        client=client_response,
    )


@router.patch("/invoices/{invoice_id}/mark-paid", response_model=InvoiceResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
def mark_invoice_paid(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    invoice_id: int,
) -> InvoiceResponse:
    """
    Mark an invoice as paid.

    Changes invoice status from sent to paid.
    """
    require_agency_user(current_user)

    statement = select(AgencyClientInvoice).where(
        AgencyClientInvoice.id == invoice_id,
        AgencyClientInvoice.agency_id == current_user.id,
    )
    invoice = session.exec(statement).first()

    require_found(invoice, "Invoice")

    if invoice.status not in ("sent", "overdue"):
        raise_bad_request(f"Cannot mark invoice with status '{invoice.status}' as paid. Only sent or overdue invoices can be marked as paid.")

    invoice.status = "paid"
    invoice.paid_date = date.today()
    invoice.updated_at = datetime.now(UTC)
    session.add(invoice)
    session.commit()
    session.refresh(invoice)

    logger.info(f"Agency {current_user.id} marked invoice {invoice.invoice_number} as paid")

    # Fetch client info
    client_stmt = select(AgencyClient).where(AgencyClient.id == invoice.client_id)
    client = session.exec(client_stmt).first()
    client_response = None
    if client:
        client_response = ClientResponse(
            id=client.id,
            agency_id=client.agency_id,
            business_email=client.business_email,
            billing_rate_markup=client.billing_rate_markup,
            notes=client.notes,
            is_active=client.is_active,
            created_at=client.created_at,
        )

    return InvoiceResponse(
        id=invoice.id,
        agency_id=invoice.agency_id,
        client_id=invoice.client_id,
        invoice_number=invoice.invoice_number,
        status=invoice.status,
        amount=invoice.amount,
        currency=invoice.currency,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        due_date=invoice.due_date,
        paid_date=invoice.paid_date,
        notes=invoice.notes,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
        client=client_response,
    )


# --- Client Invoice Generation Endpoints (Mode B) ---


@router.post("/clients/{client_id}/invoices/generate", response_model=InvoiceGenerateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def generate_client_invoice(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
    invoice_gen_in: InvoiceGenerateRequest,
) -> InvoiceGenerateResponse:
    """
    Generate an invoice for a client based on completed shifts in the period.

    For Mode B (FULL_INTERMEDIARY) agencies:
    - Finds all completed shifts for this client in the specified period
    - Calculates total including agency markup (if configured)
    - Creates an invoice record for off-platform billing reference

    The invoice is created in 'draft' status and must be sent separately.
    """
    require_agency_user(current_user)

    from app.services.agency_billing_service import (
        AgencyBillingError,
        AgencyBillingService,
    )

    billing_service = AgencyBillingService(session)

    try:
        invoice_data = await billing_service.create_client_invoice(
            agency_id=current_user.id,
            client_id=client_id,
            period_start=invoice_gen_in.period_start,
            period_end=invoice_gen_in.period_end,
            include_markup=invoice_gen_in.include_markup,
            custom_due_date=invoice_gen_in.custom_due_date,
            notes=invoice_gen_in.notes,
        )

        return InvoiceGenerateResponse(**invoice_data)

    except AgencyBillingError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/clients/{client_id}/invoices", response_model=InvoiceListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_client_invoices(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
) -> InvoiceListResponse:
    """
    List all invoices for a specific client.

    Optionally filter by status (draft, sent, paid, overdue).
    """
    require_agency_user(current_user)

    # Verify client belongs to this agency
    client_stmt = select(AgencyClient).where(
        AgencyClient.id == client_id,
        AgencyClient.agency_id == current_user.id,
    )
    client = session.exec(client_stmt).first()

    require_found(client, "Client")

    statement = select(AgencyClientInvoice).where(
        AgencyClientInvoice.agency_id == current_user.id,
        AgencyClientInvoice.client_id == client_id,
    )

    if status_filter:
        statement = statement.where(AgencyClientInvoice.status == status_filter)

    # Count total before pagination
    count_stmt = select(func.count()).select_from(AgencyClientInvoice).where(
        AgencyClientInvoice.agency_id == current_user.id,
        AgencyClientInvoice.client_id == client_id,
    )
    if status_filter:
        count_stmt = count_stmt.where(AgencyClientInvoice.status == status_filter)
    total = session.exec(count_stmt).one() or 0

    statement = statement.order_by(AgencyClientInvoice.created_at.desc()).offset(skip).limit(limit)
    invoices = session.exec(statement).all()

    # Build responses with client info
    client_response = ClientResponse(
        id=client.id,
        agency_id=client.agency_id,
        business_email=client.business_email,
        billing_rate_markup=client.billing_rate_markup,
        notes=client.notes,
        is_active=client.is_active,
        created_at=client.created_at,
    )

    invoice_responses = [
        InvoiceResponse(
            id=inv.id,
            agency_id=inv.agency_id,
            client_id=inv.client_id,
            invoice_number=inv.invoice_number,
            status=inv.status,
            amount=inv.amount,
            currency=inv.currency,
            period_start=inv.period_start,
            period_end=inv.period_end,
            due_date=inv.due_date,
            paid_date=inv.paid_date,
            notes=inv.notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            client=client_response,
        )
        for inv in invoices
    ]

    return InvoiceListResponse(items=invoice_responses, total=total)


@router.get("/clients/{client_id}/billing-summary", response_model=ClientBillingSummaryResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_client_billing_summary(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
) -> ClientBillingSummaryResponse:
    """
    Get billing summary for a client including outstanding and paid amounts.

    Returns:
    - Total invoiced amount
    - Paid amount
    - Outstanding amount
    - Overdue amount
    - Uninvoiced shifts count and amount
    - Invoice breakdown by status
    """
    require_agency_user(current_user)

    from app.services.agency_billing_service import (
        AgencyBillingError,
        AgencyBillingService,
    )

    billing_service = AgencyBillingService(session)

    try:
        summary = billing_service.get_client_invoice_summary(
            agency_id=current_user.id,
            client_id=client_id,
        )

        return ClientBillingSummaryResponse(**summary)

    except AgencyBillingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e


@router.get("/clients/{client_id}/unbilled-shifts", response_model=List[UnbilledShiftResponse])
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_client_unbilled_shifts(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
) -> List[UnbilledShiftResponse]:
    """
    Get all completed shifts for a client that haven't been invoiced yet.

    Use this to see what shifts are available to be included in the next invoice.
    """
    require_agency_user(current_user)

    from app.services.agency_billing_service import (
        AgencyBillingError,
        AgencyBillingService,
    )

    billing_service = AgencyBillingService(session)

    try:
        unbilled_shifts = billing_service.get_client_unbilled_shifts(
            agency_id=current_user.id,
            client_id=client_id,
        )

        return [UnbilledShiftResponse(**shift) for shift in unbilled_shifts]

    except AgencyBillingError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        ) from e


# --- Payroll Endpoints ---


@router.get("/payroll", response_model=PayrollListResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_payroll(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    staff_member_id: Optional[int] = None,
) -> PayrollListResponse:
    """
    List all payroll entries for the current agency.

    Optionally filter by status (pending, approved, paid) or staff_member_id.
    """
    require_agency_user(current_user)

    statement = select(PayrollEntry).where(PayrollEntry.agency_id == current_user.id)

    if status_filter:
        statement = statement.where(PayrollEntry.status == status_filter)

    if staff_member_id:
        statement = statement.where(PayrollEntry.staff_member_id == staff_member_id)

    # Count total before pagination
    count_stmt = select(func.count()).select_from(PayrollEntry).where(
        PayrollEntry.agency_id == current_user.id
    )
    if status_filter:
        count_stmt = count_stmt.where(PayrollEntry.status == status_filter)
    if staff_member_id:
        count_stmt = count_stmt.where(PayrollEntry.staff_member_id == staff_member_id)
    total = session.exec(count_stmt).one() or 0

    statement = statement.order_by(PayrollEntry.created_at.desc()).offset(skip).limit(limit)
    entries = session.exec(statement).all()

    # Fetch staff member info for each entry
    payroll_responses = []
    for entry in entries:
        staff_stmt = select(AgencyStaffMember).where(AgencyStaffMember.id == entry.staff_member_id)
        staff = session.exec(staff_stmt).first()
        staff_response = None
        if staff:
            staff_response = StaffMemberResponse(
                id=staff.id,
                agency_id=staff.agency_id,
                staff_user_id=staff.staff_user_id,
                status=staff.status,
                is_available=staff.is_available,
                shifts_completed=staff.shifts_completed,
                total_hours=staff.total_hours,
                notes=staff.notes,
                joined_at=staff.joined_at,
                name=f"Staff Member {staff.staff_user_id}",
                email=None,
                skills=[],
                rating=0.0,
            )
        payroll_responses.append(
            PayrollEntryResponse(
                id=entry.id,
                agency_id=entry.agency_id,
                staff_member_id=entry.staff_member_id,
                period_start=entry.period_start,
                period_end=entry.period_end,
                status=entry.status,
                hours_worked=entry.hours_worked,
                gross_amount=entry.gross_amount,
                deductions=entry.deductions,
                net_amount=entry.net_amount,
                currency=entry.currency,
                paid_at=entry.paid_at,
                notes=entry.notes,
                created_at=entry.created_at,
                updated_at=entry.updated_at,
                staff_member=staff_response,
            )
        )

    return PayrollListResponse(items=payroll_responses, total=total)


@router.post("/payroll/process", response_model=PayrollProcessResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
def process_payroll(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    payroll_in: PayrollProcessRequest,
) -> PayrollProcessResponse:
    """
    Process payroll for a given period.

    Creates payroll entries for all active staff members (or specified staff members)
    for the given period. Calculates hours and amounts based on completed shifts.
    """
    from decimal import Decimal

    from app.models.profile import StaffProfile
    from app.models.review import Review, ReviewType
    from app.models.user import User

    require_agency_user(current_user)

    # Get staff members to process
    staff_stmt = select(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )

    if payroll_in.staff_member_ids:
        staff_stmt = staff_stmt.where(AgencyStaffMember.id.in_(payroll_in.staff_member_ids))

    staff_members = session.exec(staff_stmt).all()

    if not staff_members:
        raise_bad_request("No active staff members found to process payroll")

    # Get agency shifts for the period
    agency_shift_ids_stmt = select(AgencyShift.shift_id).where(
        AgencyShift.agency_id == current_user.id
    )
    agency_shift_ids = session.exec(agency_shift_ids_stmt).all()

    created_entries = []
    for staff in staff_members:
        # Check if payroll entry already exists for this period
        existing_stmt = select(PayrollEntry).where(
            PayrollEntry.agency_id == current_user.id,
            PayrollEntry.staff_member_id == staff.id,
            PayrollEntry.period_start == payroll_in.period_start,
            PayrollEntry.period_end == payroll_in.period_end,
        )
        existing = session.exec(existing_stmt).first()

        if existing:
            # Skip if already processed
            continue

        # Calculate hours and amounts from completed shifts in the period
        # Get assignments for this staff member in the period
        assignments_stmt = select(AgencyShiftAssignment).where(
            AgencyShiftAssignment.agency_id == current_user.id,
            AgencyShiftAssignment.staff_member_id == staff.id,
        )
        assignments = session.exec(assignments_stmt).all()
        assigned_shift_ids = [a.shift_id for a in assignments]

        # Get completed shifts in the period
        hours_worked = Decimal("0.00")
        gross_amount = Decimal("0.00")

        if assigned_shift_ids and agency_shift_ids:
            shifts_in_period = session.exec(
                select(Shift)
                .where(Shift.id.in_(assigned_shift_ids))
                .where(Shift.id.in_(agency_shift_ids))
                .where(Shift.status == ShiftStatus.COMPLETED)
                .where(Shift.date >= payroll_in.period_start)
                .where(Shift.date <= payroll_in.period_end)
            ).all()

            for shift in shifts_in_period:
                # Calculate hours
                if shift.actual_hours_worked:
                    shift_hours = shift.actual_hours_worked
                else:
                    start_dt = datetime.combine(shift.date, shift.start_time)
                    end_dt = datetime.combine(shift.date, shift.end_time)
                    shift_hours = Decimal(str((end_dt - start_dt).seconds / 3600))

                hours_worked += shift_hours
                gross_amount += shift_hours * shift.hourly_rate

        # Apply standard deductions (configurable in production)
        deduction_rate = Decimal("0.20")  # 20% for taxes/insurance
        deductions = gross_amount * deduction_rate
        net_amount = gross_amount - deductions

        # Only create entry if there's work to pay for
        if hours_worked > 0:
            entry = PayrollEntry(
                agency_id=current_user.id,
                staff_member_id=staff.id,
                period_start=payroll_in.period_start,
                period_end=payroll_in.period_end,
                status="pending",
                hours_worked=float(hours_worked),
                gross_amount=float(gross_amount),
                deductions=float(deductions),
                net_amount=float(net_amount),
                currency="EUR",
            )
            session.add(entry)

            # Update staff member total hours
            staff.total_hours += float(hours_worked)
            staff.shifts_completed += len(shifts_in_period) if 'shifts_in_period' in dir() else 0
            staff.updated_at = datetime.now(UTC)
            session.add(staff)

            created_entries.append((entry, staff))

    session.commit()

    # Build response with real user data
    payroll_responses = []
    for entry, staff in created_entries:
        session.refresh(entry)

        # Get user details
        user = session.get(User, staff.staff_user_id)
        profile = session.exec(
            select(StaffProfile).where(StaffProfile.user_id == staff.staff_user_id)
        ).first()

        # Get average rating
        avg_rating_query = (
            select(func.coalesce(func.avg(Review.rating), 0))
            .where(Review.reviewee_id == staff.staff_user_id)
            .where(Review.review_type == ReviewType.COMPANY_TO_STAFF)
        )
        avg_rating = float(session.exec(avg_rating_query).one() or 0)

        staff_response = StaffMemberResponse(
            id=staff.id,
            agency_id=staff.agency_id,
            staff_user_id=staff.staff_user_id,
            status=staff.status,
            is_available=staff.is_available,
            shifts_completed=staff.shifts_completed,
            total_hours=staff.total_hours,
            notes=staff.notes,
            joined_at=staff.joined_at,
            name=user.full_name if user else f"Staff Member {staff.staff_user_id}",
            email=user.email if user else None,
            skills=profile.skills or [] if profile else [],
            rating=round(avg_rating, 2),
        )
        payroll_responses.append(
            PayrollEntryResponse(
                id=entry.id,
                agency_id=entry.agency_id,
                staff_member_id=entry.staff_member_id,
                period_start=entry.period_start,
                period_end=entry.period_end,
                status=entry.status,
                hours_worked=entry.hours_worked,
                gross_amount=entry.gross_amount,
                deductions=entry.deductions,
                net_amount=entry.net_amount,
                currency=entry.currency,
                paid_at=entry.paid_at,
                notes=entry.notes,
                created_at=entry.created_at,
                updated_at=entry.updated_at,
                staff_member=staff_response,
            )
        )

    logger.info(
        f"Agency {current_user.id} processed payroll for {len(created_entries)} staff members"
    )

    return PayrollProcessResponse(
        processed=len(created_entries),
        entries=payroll_responses,
        message=f"Successfully created {len(created_entries)} payroll entries",
    )


@router.get("/payroll/{payroll_id}", response_model=PayrollEntryResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_payroll_entry(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    payroll_id: int,
) -> PayrollEntryResponse:
    """Get payroll entry details by ID."""
    require_agency_user(current_user)

    statement = select(PayrollEntry).where(
        PayrollEntry.id == payroll_id,
        PayrollEntry.agency_id == current_user.id,
    )
    entry = session.exec(statement).first()

    require_found(entry, "Payroll entry")

    # Fetch staff member info
    staff_stmt = select(AgencyStaffMember).where(AgencyStaffMember.id == entry.staff_member_id)
    staff = session.exec(staff_stmt).first()
    staff_response = None
    if staff:
        staff_response = StaffMemberResponse(
            id=staff.id,
            agency_id=staff.agency_id,
            staff_user_id=staff.staff_user_id,
            status=staff.status,
            is_available=staff.is_available,
            shifts_completed=staff.shifts_completed,
            total_hours=staff.total_hours,
            notes=staff.notes,
            joined_at=staff.joined_at,
            name=f"Staff Member {staff.staff_user_id}",
            email=None,
            skills=[],
            rating=0.0,
        )

    return PayrollEntryResponse(
        id=entry.id,
        agency_id=entry.agency_id,
        staff_member_id=entry.staff_member_id,
        period_start=entry.period_start,
        period_end=entry.period_end,
        status=entry.status,
        hours_worked=entry.hours_worked,
        gross_amount=entry.gross_amount,
        deductions=entry.deductions,
        net_amount=entry.net_amount,
        currency=entry.currency,
        paid_at=entry.paid_at,
        notes=entry.notes,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        staff_member=staff_response,
    )


# ==================== Agency Mode Endpoints ====================




def get_or_create_agency_profile(session: SessionDep, user_id: int) -> AgencyProfileModel:
    """Get existing agency profile or create a new one."""
    statement = select(AgencyProfileModel).where(AgencyProfileModel.user_id == user_id)
    profile = session.exec(statement).first()

    if not profile:
        profile = AgencyProfileModel(user_id=user_id)
        session.add(profile)
        session.commit()
        session.refresh(profile)

    return profile


@router.get("/mode/profile", response_model=AgencyProfileRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_agency_mode_profile(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyProfileModel:
    """
    Get the agency's mode profile.

    Returns the agency's current mode (STAFF_PROVIDER or FULL_INTERMEDIARY)
    and related settings.
    """
    require_agency_user(current_user)
    return get_or_create_agency_profile(session, current_user.id)


@router.patch("/mode/profile", response_model=AgencyProfileRead)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_agency_mode_profile(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    profile_update: AgencyProfileUpdateSchema,
) -> AgencyProfileModel:
    """
    Update agency profile settings (not mode - use /mode endpoint for that).

    Allows updating business information, contact details, and markup rates.
    """
    require_agency_user(current_user)

    profile = get_or_create_agency_profile(session, current_user.id)

    # Update fields if provided
    update_data = profile_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.updated_at = datetime.now(UTC)
    session.add(profile)
    session.commit()
    session.refresh(profile)

    logger.info(f"Agency {current_user.id} updated mode profile")
    return profile


@router.get("/mode/requirements", response_model=AgencyModeRequirements)
@limiter.limit(DEFAULT_RATE_LIMIT)
def check_mode_requirements(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    target_mode: AgencyMode,
) -> AgencyModeRequirements:
    """
    Check if agency meets requirements for a specific mode.

    Mode B (FULL_INTERMEDIARY) requires:
    - Agency must be verified
    - Must have at least one active client
    - Must have sufficient wallet balance (minimum $1000)
    """
    require_agency_user(current_user)

    profile = get_or_create_agency_profile(session, current_user.id)
    requirements = []
    is_eligible = True

    if target_mode == AgencyMode.FULL_INTERMEDIARY:
        # Requirement 1: Verified agency
        verified_check = {
            "name": "Agency Verification",
            "description": "Agency must be verified to operate as Full Intermediary",
            "met": current_user.is_verified or profile.is_verified,
        }
        requirements.append(verified_check)
        if not verified_check["met"]:
            is_eligible = False

        # Requirement 2: Active clients
        client_count_stmt = select(func.count()).select_from(AgencyClient).where(
            AgencyClient.agency_id == current_user.id,
            AgencyClient.is_active == True,
        )
        client_count = session.exec(client_count_stmt).one() or 0
        client_check = {
            "name": "Active Clients",
            "description": "Must have at least 1 active client",
            "met": client_count >= 1,
            "current": client_count,
            "required": 1,
        }
        requirements.append(client_check)
        if not client_check["met"]:
            is_eligible = False

        # Requirement 3: Sufficient balance
        wallet_stmt = select(Wallet).where(Wallet.user_id == current_user.id)
        wallet = session.exec(wallet_stmt).first()
        current_balance = wallet.balance if wallet else Decimal("0.00")
        balance_check = {
            "name": "Wallet Balance",
            "description": f"Must have at least {profile.minimum_balance_required} in wallet",
            "met": current_balance >= profile.minimum_balance_required,
            "current": str(current_balance),
            "required": str(profile.minimum_balance_required),
        }
        requirements.append(balance_check)
        if not balance_check["met"]:
            is_eligible = False

    elif target_mode == AgencyMode.STAFF_PROVIDER:
        # Mode A has no special requirements - always eligible
        requirements.append({
            "name": "No Requirements",
            "description": "Staff Provider mode has no special requirements",
            "met": True,
        })

    message = (
        "All requirements met. You can switch to this mode."
        if is_eligible
        else "Some requirements are not met. Please address them before switching modes."
    )

    return AgencyModeRequirements(
        target_mode=target_mode,
        is_eligible=is_eligible,
        requirements=requirements,
        message=message,
    )


@router.patch("/mode", response_model=AgencyModeUpdateResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def update_agency_mode(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    mode_request: AgencyModeUpdateRequest,
) -> AgencyModeUpdateResponse:
    """
    Switch agency operating mode.

    Mode A (STAFF_PROVIDER): Agency places their staff in shifts posted by other companies.
        - Platform takes 15%, Agency gets 85%
        - Agency pays staff off-platform

    Mode B (FULL_INTERMEDIARY): Agency is the client-facing entity.
        - Agency posts shifts for their clients
        - Agency pays from their wallet
        - Platform still takes 15%

    Switching to Mode B requires meeting eligibility requirements.
    """
    require_agency_user(current_user)

    profile = get_or_create_agency_profile(session, current_user.id)
    new_mode = mode_request.mode

    # If switching to same mode, just return current state
    if profile.mode == new_mode:
        return AgencyModeUpdateResponse(
            mode=profile.mode,
            can_post_for_clients=profile.can_post_for_clients,
            message="Already operating in this mode",
            requirements_checked=[],
        )

    # Check requirements for Mode B
    requirements_result = check_mode_requirements(
        request=request,
        session=session,
        current_user=current_user,
        target_mode=new_mode,
    )

    if not requirements_result.is_eligible:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Requirements not met for mode change",
                "requirements": requirements_result.requirements,
            }
        )

    # Record the mode change request for audit
    mode_change = AgencyModeChangeRequest(
        agency_profile_id=profile.id,
        from_mode=profile.mode,
        to_mode=new_mode,
        status="approved",  # Auto-approved if requirements met
        processed_at=datetime.now(UTC),
        requirements_met=True,
        requirements_details=str(requirements_result.requirements),
    )
    session.add(mode_change)

    # Update profile
    profile.mode = new_mode
    profile.can_post_for_clients = (new_mode == AgencyMode.FULL_INTERMEDIARY)
    profile.updated_at = datetime.now(UTC)
    session.add(profile)

    session.commit()
    session.refresh(profile)

    logger.info(f"Agency {current_user.id} switched mode to {new_mode.value}")

    return AgencyModeUpdateResponse(
        mode=profile.mode,
        can_post_for_clients=profile.can_post_for_clients,
        message=f"Successfully switched to {new_mode.value} mode",
        requirements_checked=requirements_result.requirements,
    )


@router.get("/dashboard", response_model=AgencyDashboardResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_agency_dashboard(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> AgencyDashboardResponse:
    """
    Get agency dashboard with mode-specific statistics.

    Returns different stats based on whether agency is in Mode A or Mode B.
    """
    require_agency_user(current_user)

    profile = get_or_create_agency_profile(session, current_user.id)

    # Staff counts
    total_staff_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
    )
    staff_count = session.exec(total_staff_stmt).one() or 0

    active_staff_stmt = select(func.count()).select_from(AgencyStaffMember).where(
        AgencyStaffMember.agency_id == current_user.id,
        AgencyStaffMember.status == "active",
    )
    active_staff_count = session.exec(active_staff_stmt).one() or 0

    # Client count (Mode B only)
    client_count = None
    if profile.mode == AgencyMode.FULL_INTERMEDIARY:
        client_count_stmt = select(func.count()).select_from(AgencyClient).where(
            AgencyClient.agency_id == current_user.id,
            AgencyClient.is_active == True,
        )
        client_count = session.exec(client_count_stmt).one() or 0

    # Active shifts (shifts the agency has staff assigned to or has posted)
    agency_shift_ids_stmt = select(AgencyShift.shift_id).where(
        AgencyShift.agency_id == current_user.id
    )
    agency_shift_ids = session.exec(agency_shift_ids_stmt).all()

    active_shifts = 0
    if agency_shift_ids:
        active_shifts_stmt = select(func.count()).select_from(Shift).where(
            Shift.id.in_(agency_shift_ids),
            Shift.status.in_([ShiftStatus.OPEN, ShiftStatus.FILLED, ShiftStatus.IN_PROGRESS]),
        )
        active_shifts = session.exec(active_shifts_stmt).one() or 0

    # Completed shifts this month
    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    completed_this_month = 0
    if agency_shift_ids:
        completed_stmt = select(func.count()).select_from(Shift).where(
            Shift.id.in_(agency_shift_ids),
            Shift.status == ShiftStatus.COMPLETED,
            Shift.date >= month_start.date(),
        )
        completed_this_month = session.exec(completed_stmt).one() or 0

    # Wallet info
    wallet_stmt = select(Wallet).where(Wallet.user_id == current_user.id)
    wallet = session.exec(wallet_stmt).first()
    wallet_balance = wallet.balance if wallet else Decimal("0.00")
    wallet_reserved = wallet.reserved_balance if wallet else Decimal("0.00")

    # Calculate pending payouts and earnings (placeholder - would integrate with payment service)
    pending_payouts = Decimal("0.00")
    total_earnings_this_month = Decimal("0.00")

    # Mode-specific stats
    mode_a_stats = None
    mode_b_stats = None

    if profile.mode == AgencyMode.STAFF_PROVIDER:
        mode_a_stats = {
            "staff_placements_this_month": completed_this_month,
            "available_staff": active_staff_count,
            "pending_applications": 0,  # Would count pending applications
        }
    else:
        mode_b_stats = {
            "active_clients": client_count,
            "pending_invoices": 0,  # Would count pending invoices
            "shifts_posted_this_month": active_shifts,
        }

    return AgencyDashboardResponse(
        mode=profile.mode,
        staff_count=staff_count,
        active_staff_count=active_staff_count,
        client_count=client_count,
        active_shifts=active_shifts,
        completed_shifts_this_month=completed_this_month,
        pending_payouts=pending_payouts,
        total_earnings_this_month=total_earnings_this_month,
        wallet_balance=wallet_balance,
        wallet_reserved=wallet_reserved,
        mode_a_stats=mode_a_stats,
        mode_b_stats=mode_b_stats,
    )


# ==================== Mode B: Client Shift Management ====================


def require_full_intermediary_mode(session: SessionDep, user_id: int) -> AgencyProfileModel:
    """Verify agency is in FULL_INTERMEDIARY mode."""
    profile = get_or_create_agency_profile(session, user_id)

    require_permission(
        profile.mode == AgencyMode.FULL_INTERMEDIARY,
        "This operation requires Full Intermediary (Mode B) mode. "
        "Please switch your agency mode to access this feature."
    )

    return profile


@router.post("/clients/{client_id}/shifts", response_model=AgencyModeShiftResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(DEFAULT_RATE_LIMIT)
def create_shift_for_client(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    client_id: int,
    shift_data: AgencyShiftCreateForClient,
) -> AgencyModeShiftResponse:
    """
    Create a shift on behalf of a client (Mode B only).

    Agency must be in FULL_INTERMEDIARY mode.
    Funds are reserved from the AGENCY's wallet, not the client's.
    """
    require_agency_user(current_user)
    _profile = require_full_intermediary_mode(session, current_user.id)

    # Verify client exists and belongs to agency
    client_stmt = select(AgencyClient).where(
        AgencyClient.id == client_id,
        AgencyClient.agency_id == current_user.id,
        AgencyClient.is_active == True,
    )
    client = session.exec(client_stmt).first()

    require_found(client, "Client not found or inactive")

    # Create the shift with agency as the poster
    shift = Shift(
        title=shift_data.title,
        description=shift_data.description,
        company_id=current_user.id,  # Agency is the "company" posting
        posted_by_agency_id=current_user.id,
        client_company_id=client_id,  # Track the actual client
        is_agency_managed=True,  # Mark as Mode B shift
        shift_type=shift_data.shift_type,
        date=shift_data.date,
        start_time=shift_data.start_time,
        end_time=shift_data.end_time,
        hourly_rate=shift_data.hourly_rate,
        location=shift_data.location,
        address=shift_data.address,
        city=shift_data.city,
        spots_total=shift_data.spots_total,
        spots_filled=0,
        status=ShiftStatus.OPEN,
        requirements=shift_data.requirements,
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)

    # Track in AgencyShift table for listing purposes
    agency_shift = AgencyShift(
        agency_id=current_user.id,
        shift_id=shift.id,
        client_id=client_id,
    )
    session.add(agency_shift)
    session.commit()

    logger.info(f"Agency {current_user.id} (Mode B) created shift {shift.id} for client {client_id}")

    return AgencyModeShiftResponse(
        id=shift.id,
        title=shift.title,
        description=shift.description,
        company_id=shift.company_id,
        posted_by_agency_id=shift.posted_by_agency_id,
        client_company_id=shift.client_company_id,
        is_agency_managed=shift.is_agency_managed,
        shift_type=shift.shift_type,
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        hourly_rate=shift.hourly_rate,
        location=shift.location,
        address=shift.address,
        city=shift.city,
        spots_total=shift.spots_total,
        spots_filled=shift.spots_filled,
        status=shift.status.value,
        requirements=shift.requirements,
        created_at=shift.created_at,
        client_name=client.business_email,  # Would ideally be business name
        assigned_staff_count=0,
    )


@router.get("/mode/shifts", response_model=List[AgencyModeShiftResponse])
@limiter.limit(DEFAULT_RATE_LIMIT)
def list_agency_mode_shifts(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = 100,
    is_agency_managed: Optional[bool] = None,
) -> List[AgencyModeShiftResponse]:
    """
    List all shifts associated with this agency.

    Optionally filter by is_agency_managed to see only Mode B shifts.
    """
    require_agency_user(current_user)

    # Get all shifts where agency is involved
    # This includes Mode B shifts (posted_by_agency_id) and Mode A placements (via AgencyShift)
    agency_shift_ids = select(AgencyShift.shift_id).where(
        AgencyShift.agency_id == current_user.id
    )
    agency_shift_id_list = session.exec(agency_shift_ids).all()

    if not agency_shift_id_list:
        return []

    shift_stmt = select(Shift).where(Shift.id.in_(agency_shift_id_list))

    if is_agency_managed is not None:
        shift_stmt = shift_stmt.where(Shift.is_agency_managed == is_agency_managed)

    shift_stmt = shift_stmt.offset(skip).limit(limit)
    shifts = session.exec(shift_stmt).all()

    # Get client info mapping
    agency_shifts = session.exec(
        select(AgencyShift).where(AgencyShift.agency_id == current_user.id)
    ).all()
    shift_client_map = {as_.shift_id: as_.client_id for as_ in agency_shifts}

    # Get client names
    client_ids = list(set(shift_client_map.values()))
    clients = {}
    if client_ids:
        client_list = session.exec(
            select(AgencyClient).where(AgencyClient.id.in_(client_ids))
        ).all()
        clients = {c.id: c for c in client_list}

    result = []
    for shift in shifts:
        client_id = shift_client_map.get(shift.id)
        client = clients.get(client_id) if client_id else None

        # Count assigned staff
        assign_count_stmt = select(func.count()).select_from(AgencyShiftAssignment).where(
            AgencyShiftAssignment.shift_id == shift.id,
            AgencyShiftAssignment.agency_id == current_user.id,
        )
        assigned_count = session.exec(assign_count_stmt).one() or 0

        result.append(AgencyModeShiftResponse(
            id=shift.id,
            title=shift.title,
            description=shift.description,
            company_id=shift.company_id,
            posted_by_agency_id=shift.posted_by_agency_id,
            client_company_id=shift.client_company_id,
            is_agency_managed=shift.is_agency_managed,
            shift_type=shift.shift_type,
            date=shift.date,
            start_time=shift.start_time,
            end_time=shift.end_time,
            hourly_rate=shift.hourly_rate,
            location=shift.location,
            address=shift.address,
            city=shift.city,
            spots_total=shift.spots_total,
            spots_filled=shift.spots_filled,
            status=shift.status.value if hasattr(shift.status, 'value') else shift.status,
            requirements=shift.requirements,
            created_at=shift.created_at,
            client_name=client.business_email if client else None,
            assigned_staff_count=assigned_count,
        ))

    return result


# ==================== Agency Payouts ====================


class AgencyPayoutRequest(BaseModel):
    amount: float = Field(gt=0, description="Amount to payout")
    bank_account_id: str = Field(description="Bank account identifier")


class AgencyPayoutResponse(BaseModel):
    id: int
    status: str
    message: str


@router.post("/payouts/request", response_model=AgencyPayoutResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def request_agency_payout(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    payout_in: AgencyPayoutRequest,
):
    """Request a payout for agency wallet balance."""
    from app.models.payment import Payout, PayoutType
    from app.models.payment import PayoutStatus as PayoutStatusEnum
    from app.models.wallet import Wallet
    from app.services.stripe_service import StripeService, StripeServiceError

    require_permission(
        current_user.user_type == UserType.AGENCY,
        "Agency access required",
    )

    wallet = session.exec(
        select(Wallet).where(Wallet.user_id == current_user.id)
    ).first()

    if not wallet:
        raise_not_found("Wallet", "current user")

    if wallet.available_balance < Decimal(str(payout_in.amount)):
        raise_bad_request(
            f"Insufficient balance. Available: €{wallet.available_balance}, "
            f"Requested: €{payout_in.amount}"
        )

    amount_decimal = Decimal(str(payout_in.amount))

    # Create payout record
    payout = Payout(
        wallet_id=wallet.id,
        amount=amount_decimal,
        fee=Decimal("0.00"),
        net_amount=amount_decimal,
        payout_type=PayoutType.STANDARD,
        status=PayoutStatusEnum.PENDING,
        scheduled_date=date.today(),
    )
    session.add(payout)

    # Attempt Stripe payout if connected
    if wallet.stripe_account_id:
        try:
            stripe_svc = StripeService()
            amount_cents = int(amount_decimal * 100)
            stripe_payout = stripe_svc.create_payout(
                amount=amount_cents,
                connected_account_id=wallet.stripe_account_id,
                currency=wallet.currency.lower(),
                description=f"Agency payout request (user {current_user.id})",
                metadata={"user_id": str(current_user.id), "payout_type": "agency"},
            )
            payout.stripe_payout_id = stripe_payout.id
            payout.status = PayoutStatusEnum.PROCESSING
        except StripeServiceError as e:
            logger.warning(f"Stripe payout failed for agency {current_user.id}: {e}")
            payout.status = PayoutStatusEnum.FAILED

    session.commit()
    session.refresh(payout)

    return AgencyPayoutResponse(
        id=payout.id,
        status=payout.status.value,
        message="Payout request submitted. Funds will be transferred within 2-3 business days.",
    )
