"""Payment flow API endpoints for ExtraShifty."""

import logging
from decimal import Decimal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import ActiveUserDep, CompanyUserDep, SessionDep
from app.crud.wallet import wallet as wallet_crud
from app.models.user import UserType
from app.schemas.payment import (
    AutoTopupConfigRequest,
    AutoTopupConfigResponse,
    BalanceResponse,
    CancellationRequest,
    CancellationResponse,
    CancellationPolicy,
    InsufficientFundsResponse,
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
def topup_wallet(
    session: SessionDep,
    current_user: CompanyUserDep,
    request: TopupRequest,
) -> TopupResponse:
    """
    Top up company wallet with card, bank, or ACH.

    Requires company user role. In production, this integrates with Stripe
    to charge the specified payment method.
    """
    payment_service = PaymentService(session)

    try:
        transaction = payment_service.topup_wallet(
            user_id=current_user.id,
            amount=request.amount,
            payment_method_id=request.payment_method_id,
            idempotency_key=request.idempotency_key,
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
        )


@router.post("/wallets/auto-topup/configure", response_model=AutoTopupConfigResponse)
def configure_auto_topup(
    session: SessionDep,
    current_user: CompanyUserDep,
    request: AutoTopupConfigRequest,
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
            enabled=request.enabled,
            threshold=request.threshold,
            topup_amount=request.topup_amount,
            payment_method_id=request.payment_method_id,
        )

        return AutoTopupConfigResponse(
            enabled=wallet.auto_topup_enabled,
            threshold=wallet.auto_topup_threshold,
            topup_amount=wallet.auto_topup_amount,
            payment_method_id=request.payment_method_id if request.enabled else None,
            message="Auto-topup configuration updated",
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get("/wallets/balance", response_model=BalanceResponse)
def get_wallet_balance(
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


# ==================== Shift Payment Flow ====================


@router.post(
    "/shifts/{shift_id}/reserve",
    response_model=ReserveResponse,
    responses={
        402: {"model": InsufficientFundsResponse, "description": "Insufficient funds"},
    },
)
async def reserve_shift_funds(
    session: SessionDep,
    current_user: CompanyUserDep,
    shift_id: int,
    request: ReserveRequest | None = None,
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
            idempotency_key=request.idempotency_key if request else None,
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
                message=e.message,
            ).model_dump(mode="json"),
        )

    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post("/shifts/{shift_id}/settle", response_model=SettlementResponse)
async def settle_shift(
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
        )


@router.post("/shifts/{shift_id}/cancel", response_model=CancellationResponse)
async def cancel_shift(
    session: SessionDep,
    current_user: ActiveUserDep,
    shift_id: int,
    request: CancellationRequest,
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
            cancelled_by=request.cancelled_by.value,
            reason=request.reason,
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
            cancelled_by=request.cancelled_by,
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
        )


# ==================== Payout Operations ====================


@router.post("/payouts/request-instant", response_model=PayoutResponse)
async def request_instant_payout(
    session: SessionDep,
    current_user: ActiveUserDep,
    request: PayoutRequest | None = None,
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
            amount=request.amount if request else None,
            idempotency_key=request.idempotency_key if request else None,
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
        )
    except PaymentError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get("/payouts/schedule", response_model=PayoutScheduleResponse)
def get_payout_schedule(
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
        )


@router.get("/payouts/history", response_model=PayoutHistoryResponse)
def get_payout_history(
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
        )
