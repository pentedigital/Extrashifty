"""Wallet and payment endpoints."""

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import ActiveUserDep, SessionDep
from app.crud.wallet import payment_method as payment_method_crud
from app.crud.wallet import transaction as transaction_crud
from app.crud.wallet import wallet as wallet_crud
from app.models.user import UserType
from app.models.wallet import TransactionStatus, TransactionType
from app.schemas.wallet import (
    PaymentMethodCreate,
    PaymentMethodListResponse,
    PaymentMethodRead,
    TopUpRequest,
    TopUpResponse,
    TransactionListResponse,
    TransactionRead,
    WalletRead,
    WithdrawRequest,
    WithdrawResponse,
)

router = APIRouter()


@router.get("/balance", response_model=WalletRead)
def get_wallet_balance(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> WalletRead:
    """Get current user's wallet balance."""
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)
    return wallet


@router.get("/transactions", response_model=TransactionListResponse)
def get_transactions(
    session: SessionDep,
    current_user: ActiveUserDep,
    skip: int = 0,
    limit: int = Query(default=20, le=100),
    type_filter: TransactionType | None = Query(None, alias="type"),
    status_filter: TransactionStatus | None = Query(None, alias="status"),
) -> dict:
    """
    Get current user's transaction history.

    Supports filtering by:
    - type: Transaction type (earning, withdrawal, top_up, payment)
    - status: Transaction status (pending, completed, failed)
    """
    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    transactions = transaction_crud.get_by_wallet(
        session,
        wallet_id=wallet.id,
        skip=skip,
        limit=limit,
        type_filter=type_filter,
        status_filter=status_filter,
    )

    total = transaction_crud.get_count_by_wallet(
        session,
        wallet_id=wallet.id,
        type_filter=type_filter,
        status_filter=status_filter,
    )

    return {
        "items": transactions,
        "total": total,
    }


@router.post("/withdraw", response_model=WithdrawResponse)
def withdraw_funds(
    session: SessionDep,
    current_user: ActiveUserDep,
    withdraw_in: WithdrawRequest,
) -> WithdrawResponse:
    """
    Withdraw funds from wallet (staff only).

    Creates a pending withdrawal transaction. In production, this would
    integrate with a payment processor to execute the actual transfer.
    """
    # Only staff can withdraw funds
    if current_user.user_type != UserType.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can withdraw funds",
        )

    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    # Check sufficient balance
    if wallet.balance < withdraw_in.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance",
        )

    # Verify payment method belongs to user
    payment_method = payment_method_crud.get(session, id=withdraw_in.payment_method_id)
    if not payment_method or payment_method.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )

    # Create withdrawal transaction
    transaction = transaction_crud.create_transaction(
        session,
        wallet_id=wallet.id,
        type=TransactionType.WITHDRAWAL,
        amount=withdraw_in.amount,
        description=f"Withdrawal to {payment_method.type.value} ending in {payment_method.last_four}",
        status=TransactionStatus.PENDING,  # Would be updated by payment processor webhook
    )

    # Deduct from balance (in production, might wait for confirmation)
    wallet_crud.update_balance(session, wallet=wallet, amount=-withdraw_in.amount)

    return WithdrawResponse(
        transaction_id=transaction.id,
        amount=transaction.amount,
        status=transaction.status,
        message="Withdrawal initiated. Funds will be transferred within 1-3 business days.",
    )


@router.post("/top-up", response_model=TopUpResponse)
def top_up_wallet(
    session: SessionDep,
    current_user: ActiveUserDep,
    top_up_in: TopUpRequest,
) -> TopUpResponse:
    """
    Add funds to wallet (companies only).

    Creates a top-up transaction. In production, this would integrate
    with a payment processor to charge the payment method.
    """
    # Only companies can top up
    if current_user.user_type != UserType.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only companies can add funds",
        )

    wallet = wallet_crud.get_or_create(session, user_id=current_user.id)

    # Verify payment method belongs to user
    payment_method = payment_method_crud.get(session, id=top_up_in.payment_method_id)
    if not payment_method or payment_method.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )

    # Create top-up transaction
    # In production, this would first charge the payment method via Stripe/etc.
    transaction = transaction_crud.create_transaction(
        session,
        wallet_id=wallet.id,
        type=TransactionType.TOP_UP,
        amount=top_up_in.amount,
        description=f"Top-up from {payment_method.type.value} ending in {payment_method.last_four}",
        status=TransactionStatus.COMPLETED,  # Assuming immediate success for demo
    )

    # Add to balance
    wallet = wallet_crud.update_balance(session, wallet=wallet, amount=top_up_in.amount)

    return TopUpResponse(
        transaction_id=transaction.id,
        amount=transaction.amount,
        status=transaction.status,
        new_balance=wallet.balance,
        message="Funds added successfully.",
    )


@router.get("/payment-methods", response_model=PaymentMethodListResponse)
def get_payment_methods(
    session: SessionDep,
    current_user: ActiveUserDep,
) -> dict:
    """Get current user's saved payment methods."""
    payment_methods = payment_method_crud.get_by_user(session, user_id=current_user.id)
    return {
        "items": payment_methods,
        "total": len(payment_methods),
    }


@router.post("/payment-methods", response_model=PaymentMethodRead, status_code=status.HTTP_201_CREATED)
def add_payment_method(
    session: SessionDep,
    current_user: ActiveUserDep,
    payment_method_in: PaymentMethodCreate,
) -> PaymentMethodRead:
    """
    Add a new payment method.

    In production, this would integrate with a payment processor to
    tokenize and securely store payment details.
    """
    payment_method = payment_method_crud.create(
        session, user_id=current_user.id, obj_in=payment_method_in
    )
    return payment_method


@router.delete("/payment-methods/{payment_method_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_payment_method(
    session: SessionDep,
    current_user: ActiveUserDep,
    payment_method_id: int,
) -> None:
    """Remove a payment method."""
    deleted = payment_method_crud.delete(
        session, payment_method_id=payment_method_id, user_id=current_user.id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found",
        )
