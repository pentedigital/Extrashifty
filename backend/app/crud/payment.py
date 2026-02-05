"""CRUD operations for Payment, Transaction, FundsHold, Payout, and Dispute models."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import uuid4

from sqlmodel import Session, func, select

from app.models.payment import (
    Dispute,
    DisputeStatus,
    FundsHold,
    FundsHoldStatus,
    Payout,
    PayoutStatus,
    PayoutType,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from app.models.wallet import Wallet


class CRUDTransaction:
    """CRUD operations for Transaction."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> Transaction | None:
        """Get transaction by ID."""
        return db.get(Transaction, id)

    def get_by_idempotency_key(
        self,
        db: Session,
        *,
        idempotency_key: str,
    ) -> Transaction | None:
        """Get transaction by idempotency key."""
        return db.exec(
            select(Transaction).where(Transaction.idempotency_key == idempotency_key)
        ).first()

    def get_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
        skip: int = 0,
        limit: int = 50,
        type_filter: TransactionType | None = None,
        status_filter: TransactionStatus | None = None,
    ) -> list[Transaction]:
        """Get transactions for a wallet with optional filters."""
        statement = select(Transaction).where(Transaction.wallet_id == wallet_id)

        if type_filter:
            statement = statement.where(Transaction.transaction_type == type_filter)

        if status_filter:
            statement = statement.where(Transaction.status == status_filter)

        statement = (
            statement.offset(skip)
            .limit(limit)
            .order_by(Transaction.created_at.desc())
        )
        return list(db.exec(statement).all())

    def get_by_shift(
        self,
        db: Session,
        *,
        shift_id: int,
    ) -> list[Transaction]:
        """Get all transactions related to a shift."""
        return list(
            db.exec(
                select(Transaction)
                .where(Transaction.related_shift_id == shift_id)
                .order_by(Transaction.created_at.desc())
            ).all()
        )

    def get_count_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
        type_filter: TransactionType | None = None,
        status_filter: TransactionStatus | None = None,
    ) -> int:
        """Get transaction count for a wallet."""
        statement = select(func.count(Transaction.id)).where(
            Transaction.wallet_id == wallet_id
        )

        if type_filter:
            statement = statement.where(Transaction.transaction_type == type_filter)

        if status_filter:
            statement = statement.where(Transaction.status == status_filter)

        return db.exec(statement).one()

    def create(
        self,
        db: Session,
        *,
        wallet_id: int,
        transaction_type: TransactionType,
        amount: Decimal,
        description: str,
        fee: Decimal = Decimal("0.00"),
        net_amount: Decimal | None = None,
        status: TransactionStatus = TransactionStatus.PENDING,
        stripe_payment_intent_id: str | None = None,
        stripe_transfer_id: str | None = None,
        idempotency_key: str | None = None,
        related_shift_id: int | None = None,
        extra_data: dict[str, Any] | None = None,
    ) -> Transaction:
        """Create a new transaction with auto-generated idempotency key if not provided."""
        if idempotency_key is None:
            idempotency_key = str(uuid4())

        if net_amount is None:
            net_amount = amount - fee

        db_obj = Transaction(
            wallet_id=wallet_id,
            transaction_type=transaction_type,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            status=status,
            stripe_payment_intent_id=stripe_payment_intent_id,
            stripe_transfer_id=stripe_transfer_id,
            idempotency_key=idempotency_key,
            related_shift_id=related_shift_id,
            description=description,
            extra_data=extra_data,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update_status(
        self,
        db: Session,
        *,
        transaction_id: int,
        status: TransactionStatus,
        stripe_payment_intent_id: str | None = None,
        stripe_transfer_id: str | None = None,
    ) -> Transaction | None:
        """Update transaction status and optionally Stripe IDs."""
        transaction = db.get(Transaction, transaction_id)
        if transaction:
            transaction.status = status
            if status == TransactionStatus.COMPLETED:
                transaction.completed_at = datetime.utcnow()
            if stripe_payment_intent_id:
                transaction.stripe_payment_intent_id = stripe_payment_intent_id
            if stripe_transfer_id:
                transaction.stripe_transfer_id = stripe_transfer_id
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
        return transaction

    def create_topup(
        self,
        db: Session,
        *,
        wallet_id: int,
        amount: Decimal,
        stripe_payment_intent_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> Transaction:
        """Create a wallet top-up transaction."""
        return self.create(
            db,
            wallet_id=wallet_id,
            transaction_type=TransactionType.TOPUP,
            amount=amount,
            description=f"Wallet top-up: {amount} EUR",
            stripe_payment_intent_id=stripe_payment_intent_id,
            idempotency_key=idempotency_key,
        )

    def create_settlement(
        self,
        db: Session,
        *,
        wallet_id: int,
        amount: Decimal,
        shift_id: int,
        fee: Decimal = Decimal("0.00"),
        stripe_transfer_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> Transaction:
        """Create a settlement transaction for completed shift payment."""
        return self.create(
            db,
            wallet_id=wallet_id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=amount,
            fee=fee,
            description=f"Shift payment settlement for shift #{shift_id}",
            stripe_transfer_id=stripe_transfer_id,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
        )


class CRUDFundsHold:
    """CRUD operations for FundsHold."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> FundsHold | None:
        """Get funds hold by ID."""
        return db.get(FundsHold, id)

    def get_by_shift(
        self,
        db: Session,
        *,
        shift_id: int,
    ) -> FundsHold | None:
        """Get active funds hold for a shift."""
        return db.exec(
            select(FundsHold).where(
                FundsHold.shift_id == shift_id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()

    def get_active_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
    ) -> list[FundsHold]:
        """Get all active funds holds for a wallet."""
        return list(
            db.exec(
                select(FundsHold).where(
                    FundsHold.wallet_id == wallet_id,
                    FundsHold.status == FundsHoldStatus.ACTIVE,
                )
            ).all()
        )

    def get_expired(
        self,
        db: Session,
        *,
        as_of: datetime | None = None,
    ) -> list[FundsHold]:
        """Get all expired but still active funds holds."""
        if as_of is None:
            as_of = datetime.utcnow()
        return list(
            db.exec(
                select(FundsHold).where(
                    FundsHold.status == FundsHoldStatus.ACTIVE,
                    FundsHold.expires_at.isnot(None),
                    FundsHold.expires_at < as_of,
                )
            ).all()
        )

    def create(
        self,
        db: Session,
        *,
        wallet_id: int,
        shift_id: int,
        amount: Decimal,
        expires_at: datetime | None = None,
    ) -> FundsHold:
        """Create a new funds hold and update wallet reserved balance."""
        # Create the hold
        db_obj = FundsHold(
            wallet_id=wallet_id,
            shift_id=shift_id,
            amount=amount,
            expires_at=expires_at,
            status=FundsHoldStatus.ACTIVE,
        )
        db.add(db_obj)

        # Update wallet reserved balance
        wallet = db.get(Wallet, wallet_id)
        if wallet:
            wallet.reserved_balance += amount
            wallet.updated_at = datetime.utcnow()
            db.add(wallet)

        db.commit()
        db.refresh(db_obj)
        return db_obj

    def release(
        self,
        db: Session,
        *,
        funds_hold_id: int,
    ) -> FundsHold | None:
        """Release a funds hold back to available balance."""
        funds_hold = db.get(FundsHold, funds_hold_id)
        if funds_hold and funds_hold.status == FundsHoldStatus.ACTIVE:
            funds_hold.status = FundsHoldStatus.RELEASED
            funds_hold.released_at = datetime.utcnow()
            db.add(funds_hold)

            # Update wallet reserved balance
            wallet = db.get(Wallet, funds_hold.wallet_id)
            if wallet:
                wallet.reserved_balance -= funds_hold.amount
                wallet.updated_at = datetime.utcnow()
                db.add(wallet)

            db.commit()
            db.refresh(funds_hold)
        return funds_hold

    def settle(
        self,
        db: Session,
        *,
        funds_hold_id: int,
    ) -> FundsHold | None:
        """Settle a funds hold (convert to payment)."""
        funds_hold = db.get(FundsHold, funds_hold_id)
        if funds_hold and funds_hold.status == FundsHoldStatus.ACTIVE:
            funds_hold.status = FundsHoldStatus.SETTLED
            funds_hold.released_at = datetime.utcnow()
            db.add(funds_hold)

            # Update wallet balances (remove from both balance and reserved)
            wallet = db.get(Wallet, funds_hold.wallet_id)
            if wallet:
                wallet.balance -= funds_hold.amount
                wallet.reserved_balance -= funds_hold.amount
                wallet.updated_at = datetime.utcnow()
                db.add(wallet)

            db.commit()
            db.refresh(funds_hold)
        return funds_hold

    def expire(
        self,
        db: Session,
        *,
        funds_hold_id: int,
    ) -> FundsHold | None:
        """Mark a funds hold as expired and release back to available balance."""
        funds_hold = db.get(FundsHold, funds_hold_id)
        if funds_hold and funds_hold.status == FundsHoldStatus.ACTIVE:
            funds_hold.status = FundsHoldStatus.EXPIRED
            funds_hold.released_at = datetime.utcnow()
            db.add(funds_hold)

            # Update wallet reserved balance
            wallet = db.get(Wallet, funds_hold.wallet_id)
            if wallet:
                wallet.reserved_balance -= funds_hold.amount
                wallet.updated_at = datetime.utcnow()
                db.add(wallet)

            db.commit()
            db.refresh(funds_hold)
        return funds_hold

    def get_total_held_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
    ) -> Decimal:
        """Get total amount held for a wallet."""
        result = db.exec(
            select(func.sum(FundsHold.amount)).where(
                FundsHold.wallet_id == wallet_id,
                FundsHold.status == FundsHoldStatus.ACTIVE,
            )
        ).first()
        return result or Decimal("0.00")


class CRUDPayout:
    """CRUD operations for Payout."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> Payout | None:
        """Get payout by ID."""
        return db.get(Payout, id)

    def get_by_stripe_payout_id(
        self,
        db: Session,
        *,
        stripe_payout_id: str,
    ) -> Payout | None:
        """Get payout by Stripe payout ID."""
        return db.exec(
            select(Payout).where(Payout.stripe_payout_id == stripe_payout_id)
        ).first()

    def get_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
        skip: int = 0,
        limit: int = 50,
        status_filter: PayoutStatus | None = None,
    ) -> list[Payout]:
        """Get payouts for a wallet."""
        statement = select(Payout).where(Payout.wallet_id == wallet_id)

        if status_filter:
            statement = statement.where(Payout.status == status_filter)

        statement = (
            statement.offset(skip)
            .limit(limit)
            .order_by(Payout.created_at.desc())
        )
        return list(db.exec(statement).all())

    def get_pending_by_date(
        self,
        db: Session,
        *,
        scheduled_date: date,
    ) -> list[Payout]:
        """Get all pending payouts scheduled for a specific date."""
        return list(
            db.exec(
                select(Payout).where(
                    Payout.scheduled_date == scheduled_date,
                    Payout.status == PayoutStatus.PENDING,
                )
            ).all()
        )

    def create(
        self,
        db: Session,
        *,
        wallet_id: int,
        amount: Decimal,
        scheduled_date: date,
        payout_type: PayoutType = PayoutType.WEEKLY,
        fee: Decimal | None = None,
    ) -> Payout:
        """Create a new payout request."""
        # Calculate fee for instant payouts (1.5%)
        if fee is None:
            if payout_type == PayoutType.INSTANT:
                fee = amount * Decimal("0.015")
            else:
                fee = Decimal("0.00")

        net_amount = amount - fee

        db_obj = Payout(
            wallet_id=wallet_id,
            amount=amount,
            fee=fee,
            net_amount=net_amount,
            payout_type=payout_type,
            scheduled_date=scheduled_date,
            status=PayoutStatus.PENDING,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def create_instant_payout(
        self,
        db: Session,
        *,
        wallet_id: int,
        amount: Decimal,
    ) -> Payout:
        """Create an instant payout (scheduled for today)."""
        return self.create(
            db,
            wallet_id=wallet_id,
            amount=amount,
            scheduled_date=date.today(),
            payout_type=PayoutType.INSTANT,
        )

    def update_status(
        self,
        db: Session,
        *,
        payout_id: int,
        status: PayoutStatus,
        stripe_payout_id: str | None = None,
    ) -> Payout | None:
        """Update payout status."""
        payout = db.get(Payout, payout_id)
        if payout:
            payout.status = status
            if status == PayoutStatus.PAID:
                payout.paid_at = datetime.utcnow()
            if stripe_payout_id:
                payout.stripe_payout_id = stripe_payout_id
            db.add(payout)
            db.commit()
            db.refresh(payout)
        return payout

    def mark_in_transit(
        self,
        db: Session,
        *,
        payout_id: int,
        stripe_payout_id: str,
    ) -> Payout | None:
        """Mark payout as in transit with Stripe payout ID."""
        return self.update_status(
            db,
            payout_id=payout_id,
            status=PayoutStatus.IN_TRANSIT,
            stripe_payout_id=stripe_payout_id,
        )

    def mark_paid(
        self,
        db: Session,
        *,
        payout_id: int,
    ) -> Payout | None:
        """Mark payout as paid."""
        return self.update_status(
            db,
            payout_id=payout_id,
            status=PayoutStatus.PAID,
        )

    def mark_failed(
        self,
        db: Session,
        *,
        payout_id: int,
    ) -> Payout | None:
        """Mark payout as failed."""
        return self.update_status(
            db,
            payout_id=payout_id,
            status=PayoutStatus.FAILED,
        )


class CRUDDispute:
    """CRUD operations for Dispute."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> Dispute | None:
        """Get dispute by ID."""
        return db.get(Dispute, id)

    def get_by_shift(
        self,
        db: Session,
        *,
        shift_id: int,
    ) -> list[Dispute]:
        """Get all disputes for a shift."""
        return list(
            db.exec(
                select(Dispute)
                .where(Dispute.shift_id == shift_id)
                .order_by(Dispute.created_at.desc())
            ).all()
        )

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
        as_raiser: bool = True,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Dispute]:
        """Get disputes raised by or against a user."""
        if as_raiser:
            statement = select(Dispute).where(Dispute.raised_by_user_id == user_id)
        else:
            statement = select(Dispute).where(Dispute.against_user_id == user_id)

        statement = (
            statement.offset(skip)
            .limit(limit)
            .order_by(Dispute.created_at.desc())
        )
        return list(db.exec(statement).all())

    def get_open_disputes(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Dispute]:
        """Get all open disputes for admin review."""
        return list(
            db.exec(
                select(Dispute)
                .where(
                    Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW])
                )
                .offset(skip)
                .limit(limit)
                .order_by(Dispute.created_at.asc())
            ).all()
        )

    def create(
        self,
        db: Session,
        *,
        shift_id: int,
        raised_by_user_id: int,
        against_user_id: int,
        amount_disputed: Decimal,
        reason: str,
        evidence: str | None = None,
    ) -> Dispute:
        """Create a new dispute."""
        db_obj = Dispute(
            shift_id=shift_id,
            raised_by_user_id=raised_by_user_id,
            against_user_id=against_user_id,
            amount_disputed=amount_disputed,
            reason=reason,
            evidence=evidence,
            status=DisputeStatus.OPEN,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def start_review(
        self,
        db: Session,
        *,
        dispute_id: int,
    ) -> Dispute | None:
        """Mark dispute as under review."""
        dispute = db.get(Dispute, dispute_id)
        if dispute and dispute.status == DisputeStatus.OPEN:
            dispute.status = DisputeStatus.UNDER_REVIEW
            db.add(dispute)
            db.commit()
            db.refresh(dispute)
        return dispute

    def resolve(
        self,
        db: Session,
        *,
        dispute_id: int,
        resolved_for_raiser: bool,
        resolution_notes: str | None = None,
    ) -> Dispute | None:
        """Resolve a dispute."""
        dispute = db.get(Dispute, dispute_id)
        if dispute and dispute.status in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            dispute.status = (
                DisputeStatus.RESOLVED_FOR_RAISER
                if resolved_for_raiser
                else DisputeStatus.RESOLVED_AGAINST_RAISER
            )
            dispute.resolution_notes = resolution_notes
            dispute.resolved_at = datetime.utcnow()
            db.add(dispute)
            db.commit()
            db.refresh(dispute)
        return dispute

    def close(
        self,
        db: Session,
        *,
        dispute_id: int,
        resolution_notes: str | None = None,
    ) -> Dispute | None:
        """Close a dispute without resolution (e.g., withdrawn)."""
        dispute = db.get(Dispute, dispute_id)
        if dispute:
            dispute.status = DisputeStatus.CLOSED
            dispute.resolution_notes = resolution_notes
            dispute.resolved_at = datetime.utcnow()
            db.add(dispute)
            db.commit()
            db.refresh(dispute)
        return dispute

    def add_evidence(
        self,
        db: Session,
        *,
        dispute_id: int,
        additional_evidence: str,
    ) -> Dispute | None:
        """Add evidence to an existing dispute."""
        dispute = db.get(Dispute, dispute_id)
        if dispute and dispute.status in [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]:
            if dispute.evidence:
                dispute.evidence = f"{dispute.evidence}\n\n---\n\n{additional_evidence}"
            else:
                dispute.evidence = additional_evidence
            db.add(dispute)
            db.commit()
            db.refresh(dispute)
        return dispute


# Create singleton instances
transaction = CRUDTransaction()
funds_hold = CRUDFundsHold()
payout = CRUDPayout()
dispute = CRUDDispute()
