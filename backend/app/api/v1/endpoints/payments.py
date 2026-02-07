"""Payment flow API endpoints for ExtraShifty."""

import logging
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.api.deps import ActiveUserDep, CompanyUserDep, SessionDep
from app.core.config import settings
from app.core.rate_limit import DEFAULT_RATE_LIMIT, PAYMENT_RATE_LIMIT, limiter
from app.crud.wallet import wallet as wallet_crud
from app.models.user import UserType
from app.schemas.payment import (
    AutoTopupConfigRequest,
    AutoTopupConfigResponse,
    BalanceResponse,
    CancellationPolicy,
    CancellationRequest,
    CancellationResponse,
    InsufficientFundsResponse,
    MinimumBalanceRequest,
    MinimumBalanceResponse,
    PayoutHistoryItem,
    PayoutHistoryResponse,
    PayoutRequest,
    PayoutResponse,
    PayoutScheduleResponse,
    PayoutStatus,
    ReserveRequest,
    ReserveResponse,
    SettlementResponse,
    SettlementSplit,
    TopupRequest,
    TopupResponse,
)
from app.services.payment_service import (
    InsufficientFundsError,
    PaymentError,
    PaymentService,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ==================== Wallet Operations ====================


@router.post("/wallets/topup", response_model=TopupResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def topup_wallet(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    body: TopupRequest,
) -> TopupResponse:
    """
    Top up company wallet with card, bank, or ACH.

    Requires company user role. In production, this integrates with Stripe
    to charge the specified payment method.

    On payment failure, the wallet is placed in a 48-hour grace period.
    If not resolved, the wallet will be suspended and cannot accept new shifts.
    """
    payment_service = PaymentService(session)

    try:
        transaction = await payment_service.topup_wallet(
            user_id=current_user.id,
            amount=body.amount,
            payment_method_id=body.payment_method_id,
            idempotency_key=body.idempotency_key,
        )

        # Get updated balance
        wallet = wallet_crud.get_by_user(session, user_id=current_user.id)

        return TopupResponse(
            transaction_id=transaction.id,
            amount=transaction.amount,
            new_balance=Decimal(str(wallet.balance)) if wallet else Decimal("0.00"),
            status=transaction.status.value,
            message="Wallet topped up successfully",
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/wallets/auto-topup/configure", response_model=AutoTopupConfigResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
def configure_auto_topup(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    body: AutoTopupConfigRequest,
) -> AutoTopupConfigResponse:
    """
    Configure auto-topup for company wallet.

    When enabled, wallet is automatically topped up when balance falls
    below the specified threshold.
    """
    payment_service = PaymentService(session)

    try:
        wallet = payment_service.configure_auto_topup(
            user_id=current_user.id,
            enabled=body.enabled,
            threshold=body.threshold,
            topup_amount=body.topup_amount,
            payment_method_id=body.payment_method_id,
        )

        return AutoTopupConfigResponse(
            enabled=wallet.auto_topup_enabled,
            threshold=wallet.auto_topup_threshold,
            topup_amount=wallet.auto_topup_amount,
            payment_method_id=body.payment_method_id if body.enabled else None,
            message="Auto-topup configuration updated",
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/wallets/auto-topup/configure", response_model=AutoTopupConfigResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_auto_topup_config(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
) -> AutoTopupConfigResponse:
    """
    Get current auto-topup configuration for company wallet.
    """
    wallet = wallet_crud.get_by_user(session, user_id=current_user.id)

    if not wallet:
        return AutoTopupConfigResponse(
            enabled=False,
            threshold=None,
            topup_amount=None,
            payment_method_id=None,
            message="No wallet configured",
        )

    return AutoTopupConfigResponse(
        enabled=wallet.auto_topup_enabled,
        threshold=wallet.auto_topup_threshold,
        topup_amount=wallet.auto_topup_amount,
        payment_method_id=None,
        message="Auto-topup configuration retrieved",
    )


@router.get("/wallets/balance", response_model=BalanceResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_wallet_balance(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> BalanceResponse:
    """
    Get current wallet balance with breakdown.

    Returns available balance, reserved funds, and pending payouts.
    """
    payment_service = PaymentService(session)
    balance_data = payment_service.get_wallet_balance(current_user.id)

    return BalanceResponse(**balance_data)


@router.patch("/wallets/minimum-balance", response_model=MinimumBalanceResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
def update_minimum_balance(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    body: MinimumBalanceRequest,
) -> MinimumBalanceResponse:
    """
    Set or update the minimum balance requirement for a company wallet.

    The minimum balance is a buffer that must remain in the wallet after
    accepting a shift. When accepting shifts, the system checks:
    available_balance >= shift_cost + minimum_balance

    This helps companies ensure they always have enough funds for operations.
    """
    from datetime import datetime

    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    # Update the minimum balance
    wallet.minimum_balance = body.minimum_balance
    wallet.updated_at = datetime.utcnow()
    session.add(wallet)
    session.commit()
    session.refresh(wallet)

    logger.info(
        f"Updated minimum balance for wallet {wallet.id} to {body.minimum_balance}"
    )

    return MinimumBalanceResponse(
        wallet_id=wallet.id,
        minimum_balance=wallet.minimum_balance,
        available_balance=wallet.available_balance,
        message=f"Minimum balance updated to {body.minimum_balance}",
    )


@router.get("/wallets/status")
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_wallet_status(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """
    Get current wallet status including suspension information.

    Returns wallet status (active, grace_period, suspended) and
    relevant dates/reasons if applicable.
    """
    from app.models.wallet import WalletStatus

    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    response = {
        "wallet_id": wallet.id,
        "status": wallet.status.value,
        "is_active": wallet.status == WalletStatus.ACTIVE,
        "can_accept_shifts": wallet.status != WalletStatus.SUSPENDED,
    }

    if wallet.status == WalletStatus.GRACE_PERIOD:
        response["grace_period_ends_at"] = wallet.grace_period_ends_at.isoformat() if wallet.grace_period_ends_at else None
        response["last_failed_topup_at"] = wallet.last_failed_topup_at.isoformat() if wallet.last_failed_topup_at else None
        response["suspension_reason"] = wallet.suspension_reason

    elif wallet.status == WalletStatus.SUSPENDED:
        response["suspension_reason"] = wallet.suspension_reason
        response["last_failed_topup_at"] = wallet.last_failed_topup_at.isoformat() if wallet.last_failed_topup_at else None

    return response


@router.post("/wallets/reactivate")
@limiter.limit(PAYMENT_RATE_LIMIT)
async def reactivate_wallet(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    minimum_balance: Decimal = Query(
        default=Decimal("0.00"),
        ge=0,
        description="Minimum balance required for reactivation (optional)",
    ),
) -> dict:
    """
    Reactivate a suspended or grace-period wallet.

    Verifies user has sufficient balance before reactivation.
    Resets wallet status to ACTIVE and clears grace period fields.
    Sends reactivation email notification.

    Requirements:
    - Wallet must be in GRACE_PERIOD or SUSPENDED status
    - Wallet must have at least the minimum_balance specified (if any)
    """
    from app.models.wallet import WalletStatus

    payment_service = PaymentService(session)
    wallet = wallet_crud.get_by_user(session, user_id=current_user.id)

    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found",
        )

    if wallet.status == WalletStatus.ACTIVE:
        return {
            "wallet_id": wallet.id,
            "status": wallet.status.value,
            "message": "Wallet is already active",
        }

    try:
        reactivated_wallet = await payment_service.reactivate_wallet(
            wallet_id=wallet.id,
            minimum_balance=minimum_balance if minimum_balance > 0 else None,
        )

        return {
            "wallet_id": reactivated_wallet.id,
            "status": reactivated_wallet.status.value,
            "available_balance": str(reactivated_wallet.available_balance),
            "message": "Wallet reactivated successfully",
        }

    except InsufficientFundsError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "insufficient_funds",
                "message": e.message,
                "required": str(e.required),
                "available": str(e.available),
                "shortfall": str(e.shortfall),
            },
        ) from e
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


# ==================== Shift Payment Flow ====================


@router.post(
    "/shifts/{shift_id}/reserve",
    response_model=ReserveResponse,
    responses={
        402: {"model": InsufficientFundsResponse, "description": "Insufficient funds"},
    },
)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def reserve_shift_funds(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
    body: ReserveRequest | None = None,
) -> ReserveResponse | JSONResponse:
    """
    Reserve funds when accepting a worker for a shift.

    Checks company wallet balance against shift cost. Returns HTTP 402
    with shortfall details if insufficient funds.

    For multi-day shifts, only the first day is reserved initially.
    """
    payment_service = PaymentService(session)

    # Get company wallet
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    try:
        hold = await payment_service.reserve_shift_funds(
            shift_id=shift_id,
            company_wallet_id=wallet.id,
            idempotency_key=body.idempotency_key if body else None,
        )

        return ReserveResponse(
            hold_id=hold.id,
            shift_id=hold.shift_id,
            amount_reserved=hold.amount,
            remaining_balance=Decimal(str(wallet.available_balance)) - hold.amount,
            expires_at=hold.expires_at,
            message="Funds reserved successfully",
        )

    except InsufficientFundsError as e:
        return JSONResponse(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            content=InsufficientFundsResponse(
                required_amount=e.required,
                available_amount=e.available,
                shortfall=e.shortfall,
                minimum_balance=e.minimum_balance,
                message=e.message,
            ).model_dump(mode="json"),
        )

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/shifts/{shift_id}/settle", response_model=SettlementResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def settle_shift(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
    actual_hours: Decimal = Query(..., gt=0, description="Actual hours worked"),
) -> SettlementResponse:
    """
    Settle payment after shift completion.

    Triggered by clock-out + manager approval OR 24hr auto-approve.
    Payment is split: 15% platform fee, 85% to worker/agency.
    Partial shifts are pro-rated based on actual hours worked.
    """
    payment_service = PaymentService(session)

    try:
        transactions = await payment_service.settle_shift(
            shift_id=shift_id,
            actual_hours=actual_hours,
            approved_by=current_user.id,
        )

        # Calculate totals from transactions
        gross_amount = Decimal("0.00")
        platform_fee = Decimal("0.00")
        worker_amount = Decimal("0.00")

        transaction_list = []
        for tx in transactions:
            transaction_list.append({
                "transaction_id": tx.id,
                "type": tx.transaction_type.value,
                "amount": str(tx.amount),
                "fee": str(tx.fee),
                "net_amount": str(tx.net_amount),
            })

            if tx.transaction_type.value == "settlement":
                gross_amount = tx.amount
                platform_fee = tx.fee
                worker_amount = tx.net_amount
            elif tx.transaction_type.value == "commission":
                platform_fee = tx.amount

        return SettlementResponse(
            shift_id=shift_id,
            settlement_id=transactions[0].id if transactions else 0,
            actual_hours=actual_hours,
            gross_amount=gross_amount,
            split=SettlementSplit(
                gross_amount=gross_amount,
                platform_fee=platform_fee,
                platform_fee_rate=PaymentService.PLATFORM_COMMISSION_RATE,
                worker_amount=worker_amount,
            ),
            transactions=transaction_list,
            message="Shift settled successfully",
        )

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.post("/shifts/{shift_id}/cancel", response_model=CancellationResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def cancel_shift(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    body: CancellationRequest,
) -> CancellationResponse:
    """
    Handle shift cancellation with appropriate refund policy.

    Cancellation policy based on timing:
    - >= 48 hours before shift: Full refund
    - >= 24 hours before shift: 50% refund
    - < 24 hours (company cancels): Worker gets 2 hours pay
    - < 24 hours (worker cancels): Full refund to company
    """
    payment_service = PaymentService(session)

    try:
        transactions = await payment_service.process_cancellation(
            shift_id=shift_id,
            cancelled_by=body.cancelled_by.value,
            reason=body.reason,
        )

        # Calculate totals
        refund_amount = Decimal("0.00")
        worker_compensation = Decimal("0.00")

        transaction_list = []
        for tx in transactions:
            transaction_list.append({
                "transaction_id": tx.id,
                "type": tx.transaction_type.value,
                "amount": str(tx.amount),
            })

            if tx.transaction_type.value == "refund":
                refund_amount = tx.amount
            elif tx.transaction_type.value == "settlement":
                worker_compensation = tx.amount

        # Determine policy applied
        if worker_compensation > 0:
            policy = CancellationPolicy.WORKER_COMPENSATION
        elif refund_amount > 0:
            # Check if full or partial
            policy = CancellationPolicy.FULL_REFUND  # Simplified
        else:
            policy = CancellationPolicy.NO_REFUND

        return CancellationResponse(
            shift_id=shift_id,
            cancelled_by=body.cancelled_by,
            policy_applied=policy,
            refund_amount=refund_amount,
            worker_compensation=worker_compensation,
            transactions=transaction_list,
            message="Shift cancelled successfully",
        )

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


# ==================== Payout Operations ====================


@router.post("/payouts/request-instant", response_model=PayoutResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def request_instant_payout(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    body: PayoutRequest | None = None,
) -> PayoutResponse:
    """
    Request instant payout (1.5% fee, $10 minimum).

    Only available for staff and agency users. Funds are transferred
    immediately to the linked bank account.
    """
    # Only staff and agency can request payouts
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff and agency users can request payouts",
        )

    payment_service = PaymentService(session)

    # Get wallet
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    try:
        payout = await payment_service.process_instant_payout(
            wallet_id=wallet.id,
            amount=body.amount if body else None,
            idempotency_key=body.idempotency_key if body else None,
        )

        return PayoutResponse(
            payout_id=payout.id,
            amount=payout.amount,
            fee=payout.fee,
            net_amount=payout.net_amount,
            status=PayoutStatus(payout.status.value),
            estimated_arrival=None,  # Instant payouts are immediate
            message=f"Instant payout initiated. Fee: {payout.fee}",
        )

    except InsufficientFundsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/payouts/schedule", response_model=PayoutScheduleResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_payout_schedule(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
) -> PayoutScheduleResponse:
    """
    View payout schedule.

    Shows next payout date and any pending/scheduled payouts.
    Weekly payouts occur every Friday for balances >= $50.
    """
    # Only staff and agency can view payout schedule
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff and agency users can view payout schedule",
        )

    payment_service = PaymentService(session)
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    try:
        schedule = payment_service.get_payout_schedule(wallet.id)
        return PayoutScheduleResponse(**schedule)

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


@router.get("/payouts/history", response_model=PayoutHistoryResponse)
@limiter.limit(DEFAULT_RATE_LIMIT)
def get_payout_history(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, le=100),
) -> PayoutHistoryResponse:
    """
    Get payout history.

    Returns paginated list of past payouts with status and details.
    """
    # Only staff and agency can view payout history
    if current_user.user_type not in (UserType.STAFF, UserType.AGENCY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff and agency users can view payout history",
        )

    payment_service = PaymentService(session)
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    try:
        payouts, total = payment_service.get_payout_history(
            wallet_id=wallet.id,
            skip=skip,
            limit=limit,
        )

        items = [
            PayoutHistoryItem(
                payout_id=p.id,
                amount=p.amount,
                fee=p.fee,
                net_amount=p.net_amount,
                status=PayoutStatus(p.status.value),
                payout_type=p.payout_type.value,
                created_at=p.created_at,
                completed_at=p.paid_at,
            )
            for p in payouts
        ]

        return PayoutHistoryResponse(items=items, total=total)

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        ) from e


# ==================== Stripe Connect Onboarding ====================


class ConnectOnboardingRequest(BaseModel):
    account_type: str = "express"


class ConnectOnboardingResponse(BaseModel):
    url: str


@router.post("/connect/onboarding-link", response_model=ConnectOnboardingResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def get_connect_onboarding_link(
    request: Request,
    session: SessionDep,
    current_user: ActiveUserDep,
    body: ConnectOnboardingRequest,
) -> ConnectOnboardingResponse:
    """
    Create a Stripe Connect onboarding link for the current user.

    If the user doesn't have a Connect account yet, one is created first.
    """
    from app.services.stripe_service import StripeService, StripeServiceError

    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)
    stripe_svc = StripeService()

    try:
        # Create Connect account if needed
        if not wallet.stripe_account_id:
            if body.account_type == "express":
                account = stripe_svc.create_express_account(
                    email=current_user.email,
                    country="IE",
                    metadata={"user_id": str(current_user.id)},
                )
            else:
                account = stripe_svc.create_custom_account(
                    email=current_user.email,
                    country="IE",
                    metadata={"user_id": str(current_user.id)},
                )
            wallet.stripe_account_id = account.id
            session.add(wallet)
            session.commit()

        # Create onboarding link
        base_url = settings.BACKEND_CORS_ORIGINS[0] if settings.BACKEND_CORS_ORIGINS else "http://localhost:5173"
        account_link = stripe_svc.create_account_link(
            account_id=wallet.stripe_account_id,
            refresh_url=f"{base_url}/dashboard/wallet?stripe_refresh=true",
            return_url=f"{base_url}/dashboard/wallet?stripe_onboarding=complete",
        )

        return ConnectOnboardingResponse(url=account_link.url)

    except StripeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message),
        ) from e


# ==================== Payment Intent ====================


class CreateIntentRequest(BaseModel):
    """Request to create a Stripe PaymentIntent for wallet top-up."""

    amount: int = Field(..., gt=0, description="Amount in cents (EUR)")


class CreateIntentResponse(BaseModel):
    """Response with PaymentIntent client secret."""

    client_secret: str
    payment_intent_id: str
    amount: int
    currency: str


@router.post("/create-intent", response_model=CreateIntentResponse)
@limiter.limit(PAYMENT_RATE_LIMIT)
async def create_payment_intent(
    request: Request,
    session: SessionDep,
    current_user: CompanyUserDep,
    body: CreateIntentRequest,
) -> CreateIntentResponse:
    """
    Create a Stripe PaymentIntent for card-based wallet top-up.

    Returns the client secret for Stripe.js to confirm payment on the frontend.
    """
    from app.services.stripe_service import StripeService, StripeServiceError

    stripe_svc = StripeService()
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    try:
        payment_intent = stripe_svc.create_payment_intent(
            amount=body.amount,
            currency="eur",
            metadata={
                "user_id": str(current_user.id),
                "wallet_id": str(wallet.id),
                "type": "wallet_topup",
            },
            description=f"Wallet top-up for user {current_user.id}",
        )

        return CreateIntentResponse(
            client_secret=payment_intent.client_secret,
            payment_intent_id=payment_intent.id,
            amount=payment_intent.amount,
            currency=payment_intent.currency,
        )
    except StripeServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e.message),
        ) from e
