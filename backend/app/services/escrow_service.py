"""Escrow service for ExtraShifty dispute fund management."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlmodel import Session, select

from app.models.payment import (
    FundsHold,
    FundsHoldStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from app.models.wallet import Wallet

if TYPE_CHECKING:
    pass


class EscrowService:
    """Service for managing escrowed funds during disputes."""

    ESCROW_DESCRIPTION_PREFIX = "ESCROW:"

    async def hold_funds(
        self,
        db: Session,
        shift_id: int,
        amount: Decimal,
        wallet_id: int,
    ) -> FundsHold:
        """
        Move funds to escrow during a dispute.

        This creates a FundsHold record that represents escrowed funds.
        The funds are moved from the company's reserved balance to escrow.

        Args:
            db: Database session
            shift_id: ID of the disputed shift
            amount: Amount to hold in escrow
            wallet_id: ID of the wallet to hold funds from

        Returns:
            FundsHold record representing the escrowed funds
        """
        # Get the wallet with row lock to prevent race conditions
        wallet = db.exec(
            select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        ).first()
        if not wallet:
            raise ValueError(f"Wallet {wallet_id} not found")

        # Verify sufficient reserved balance
        if wallet.reserved_balance < amount:
            raise ValueError(
                f"Insufficient reserved balance. Required: {amount}, "
                f"Available: {wallet.reserved_balance}"
            )

        # Create escrow hold
        escrow_hold = FundsHold(
            wallet_id=wallet_id,
            shift_id=shift_id,
            amount=amount,
            status=FundsHoldStatus.ACTIVE,
            expires_at=None,  # Escrow holds don't expire until resolved
        )
        db.add(escrow_hold)

        # Create escrow transaction record
        idempotency_key = f"escrow_hold_{shift_id}_{uuid.uuid4().hex[:8]}"
        escrow_transaction = Transaction(
            wallet_id=wallet_id,
            transaction_type=TransactionType.RESERVE,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
            description=f"{self.ESCROW_DESCRIPTION_PREFIX} Funds held for dispute on shift #{shift_id}",
            completed_at=datetime.now(UTC),
        )
        db.add(escrow_transaction)

        db.commit()
        db.refresh(escrow_hold)

        return escrow_hold

    async def release_to_worker(
        self,
        db: Session,
        shift_id: int,
        worker_wallet_id: int,
    ) -> Transaction:
        """
        Release all escrowed funds to the worker.

        Called when dispute is resolved in favor of the worker.

        Args:
            db: Database session
            shift_id: ID of the disputed shift
            worker_wallet_id: ID of the worker's wallet

        Returns:
            Settlement transaction
        """
        # Find the escrow hold
        escrow_hold = await self._get_escrow_hold(db, shift_id)
        if not escrow_hold:
            raise ValueError(f"No escrow hold found for shift {shift_id}")

        amount = escrow_hold.amount

        # Update worker wallet balance (with row lock)
        worker_wallet = db.exec(
            select(Wallet).where(Wallet.id == worker_wallet_id).with_for_update()
        ).first()
        if not worker_wallet:
            raise ValueError(f"Worker wallet {worker_wallet_id} not found")

        worker_wallet.balance += amount
        worker_wallet.updated_at = datetime.now(UTC)

        # Update company wallet reserved balance (with row lock)
        company_wallet = db.exec(
            select(Wallet).where(Wallet.id == escrow_hold.wallet_id).with_for_update()
        ).first()
        if company_wallet:
            company_wallet.reserved_balance -= amount
            company_wallet.updated_at = datetime.now(UTC)

        # Mark escrow as settled
        escrow_hold.status = FundsHoldStatus.SETTLED
        escrow_hold.released_at = datetime.now(UTC)

        # Create settlement transaction for worker
        idempotency_key = f"escrow_release_worker_{shift_id}_{uuid.uuid4().hex[:8]}"
        settlement_transaction = Transaction(
            wallet_id=worker_wallet_id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
            description=f"Dispute resolution: Full payment for shift #{shift_id}",
            completed_at=datetime.now(UTC),
        )
        db.add(settlement_transaction)

        db.commit()
        db.refresh(settlement_transaction)

        return settlement_transaction

    async def release_to_company(
        self,
        db: Session,
        shift_id: int,
    ) -> Transaction:
        """
        Release all escrowed funds back to the company.

        Called when dispute is resolved against the worker.

        Args:
            db: Database session
            shift_id: ID of the disputed shift

        Returns:
            Refund transaction
        """
        # Find the escrow hold
        escrow_hold = await self._get_escrow_hold(db, shift_id)
        if not escrow_hold:
            raise ValueError(f"No escrow hold found for shift {shift_id}")

        amount = escrow_hold.amount

        # Update company wallet - move from reserved to available (with row lock)
        company_wallet = db.exec(
            select(Wallet).where(Wallet.id == escrow_hold.wallet_id).with_for_update()
        ).first()
        if not company_wallet:
            raise ValueError(f"Company wallet {escrow_hold.wallet_id} not found")

        company_wallet.reserved_balance -= amount
        company_wallet.balance += amount  # Add back to available balance
        company_wallet.updated_at = datetime.now(UTC)

        # Mark escrow as released
        escrow_hold.status = FundsHoldStatus.RELEASED
        escrow_hold.released_at = datetime.now(UTC)

        # Create refund transaction
        idempotency_key = f"escrow_release_company_{shift_id}_{uuid.uuid4().hex[:8]}"
        refund_transaction = Transaction(
            wallet_id=company_wallet.id,
            transaction_type=TransactionType.REFUND,
            amount=amount,
            fee=Decimal("0.00"),
            net_amount=amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=idempotency_key,
            related_shift_id=shift_id,
            description=f"Dispute resolution: Refund for shift #{shift_id}",
            completed_at=datetime.now(UTC),
        )
        db.add(refund_transaction)

        db.commit()
        db.refresh(refund_transaction)

        return refund_transaction

    async def split_release(
        self,
        db: Session,
        shift_id: int,
        worker_wallet_id: int,
        worker_pct: float,
    ) -> tuple[Transaction, Transaction]:
        """
        Split escrowed funds between worker and company.

        Called when dispute is resolved with a split decision.

        Args:
            db: Database session
            shift_id: ID of the disputed shift
            worker_wallet_id: ID of the worker's wallet
            worker_pct: Percentage (0-100) to give to the worker

        Returns:
            Tuple of (worker_transaction, company_transaction)
        """
        if worker_pct < 0 or worker_pct > 100:
            raise ValueError("Worker percentage must be between 0 and 100")

        # Find the escrow hold
        escrow_hold = await self._get_escrow_hold(db, shift_id)
        if not escrow_hold:
            raise ValueError(f"No escrow hold found for shift {shift_id}")

        total_amount = escrow_hold.amount
        worker_amount = (total_amount * Decimal(str(worker_pct))) / Decimal("100")
        company_amount = total_amount - worker_amount

        # Get wallets (with row locks)
        worker_wallet = db.exec(
            select(Wallet).where(Wallet.id == worker_wallet_id).with_for_update()
        ).first()
        company_wallet = db.exec(
            select(Wallet).where(Wallet.id == escrow_hold.wallet_id).with_for_update()
        ).first()

        if not worker_wallet:
            raise ValueError(f"Worker wallet {worker_wallet_id} not found")
        if not company_wallet:
            raise ValueError(f"Company wallet {escrow_hold.wallet_id} not found")

        # Update worker wallet
        worker_wallet.balance += worker_amount
        worker_wallet.updated_at = datetime.now(UTC)

        # Update company wallet
        company_wallet.reserved_balance -= total_amount
        company_wallet.balance += company_amount  # Add refund portion back
        company_wallet.updated_at = datetime.now(UTC)

        # Mark escrow as settled
        escrow_hold.status = FundsHoldStatus.SETTLED
        escrow_hold.released_at = datetime.now(UTC)

        # Create worker transaction
        worker_idempotency_key = f"escrow_split_worker_{shift_id}_{uuid.uuid4().hex[:8]}"
        worker_transaction = Transaction(
            wallet_id=worker_wallet_id,
            transaction_type=TransactionType.SETTLEMENT,
            amount=worker_amount,
            fee=Decimal("0.00"),
            net_amount=worker_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=worker_idempotency_key,
            related_shift_id=shift_id,
            description=f"Dispute resolution: {worker_pct}% payment for shift #{shift_id}",
            completed_at=datetime.now(UTC),
        )
        db.add(worker_transaction)

        # Create company refund transaction
        company_idempotency_key = f"escrow_split_company_{shift_id}_{uuid.uuid4().hex[:8]}"
        company_transaction = Transaction(
            wallet_id=company_wallet.id,
            transaction_type=TransactionType.REFUND,
            amount=company_amount,
            fee=Decimal("0.00"),
            net_amount=company_amount,
            status=TransactionStatus.COMPLETED,
            idempotency_key=company_idempotency_key,
            related_shift_id=shift_id,
            description=f"Dispute resolution: {100 - worker_pct}% refund for shift #{shift_id}",
            completed_at=datetime.now(UTC),
        )
        db.add(company_transaction)

        db.commit()
        db.refresh(worker_transaction)
        db.refresh(company_transaction)

        return worker_transaction, company_transaction

    async def get_escrow_amount(self, db: Session, shift_id: int) -> Decimal | None:
        """
        Get the amount currently held in escrow for a shift.

        Args:
            db: Database session
            shift_id: ID of the shift

        Returns:
            Amount in escrow or None if no escrow exists
        """
        escrow_hold = await self._get_escrow_hold(db, shift_id)
        return escrow_hold.amount if escrow_hold else None

    async def _get_escrow_hold(self, db: Session, shift_id: int) -> FundsHold | None:
        """
        Get the active escrow hold for a shift.

        Args:
            db: Database session
            shift_id: ID of the shift

        Returns:
            FundsHold record or None
        """
        statement = select(FundsHold).where(
            FundsHold.shift_id == shift_id,
            FundsHold.status == FundsHoldStatus.ACTIVE,
        )
        return db.exec(statement).first()


# Singleton instance
escrow_service = EscrowService()
