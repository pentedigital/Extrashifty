"""CRUD operations for Wallet, Transaction, and PaymentMethod models."""

from datetime import datetime

from sqlmodel import Session, func, select

from app.crud.base import CRUDBase
from app.models.wallet import (
    PaymentMethod,
    PaymentMethodType,
    Transaction,
    TransactionStatus,
    TransactionType,
    Wallet,
)
from app.schemas.wallet import PaymentMethodCreate


class CRUDWallet:
    """CRUD operations for Wallet."""

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> Wallet | None:
        """Get wallet for a user."""
        return db.exec(
            select(Wallet).where(Wallet.user_id == user_id)
        ).first()

    def get_or_create(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> Wallet:
        """Get or create wallet for a user."""
        wallet = self.get_by_user(db, user_id=user_id)

        if not wallet:
            wallet = Wallet(user_id=user_id)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        return wallet

    def update_balance(
        self,
        db: Session,
        *,
        wallet: Wallet,
        amount: float,
    ) -> Wallet:
        """Update wallet balance by adding amount (can be negative for withdrawals)."""
        wallet.balance += amount
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet


class CRUDTransaction:
    """CRUD operations for Transaction."""

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
        """Get transactions for a wallet."""
        statement = select(Transaction).where(Transaction.wallet_id == wallet_id)

        if type_filter:
            statement = statement.where(Transaction.type == type_filter)

        if status_filter:
            statement = statement.where(Transaction.status == status_filter)

        statement = statement.offset(skip).limit(limit).order_by(Transaction.created_at.desc())
        return list(db.exec(statement).all())

    def get_count_by_wallet(
        self,
        db: Session,
        *,
        wallet_id: int,
        type_filter: TransactionType | None = None,
        status_filter: TransactionStatus | None = None,
    ) -> int:
        """Get transaction count for a wallet."""
        statement = select(func.count(Transaction.id)).where(Transaction.wallet_id == wallet_id)

        if type_filter:
            statement = statement.where(Transaction.type == type_filter)

        if status_filter:
            statement = statement.where(Transaction.status == status_filter)

        return db.exec(statement).one()

    def create_transaction(
        self,
        db: Session,
        *,
        wallet_id: int,
        type: TransactionType,
        amount: float,
        description: str,
        status: TransactionStatus = TransactionStatus.PENDING,
        reference_id: str | None = None,
    ) -> Transaction:
        """Create a new transaction."""
        db_obj = Transaction(
            wallet_id=wallet_id,
            type=type,
            amount=amount,
            description=description,
            status=status,
            reference_id=reference_id,
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
    ) -> Transaction | None:
        """Update transaction status."""
        transaction = db.get(Transaction, transaction_id)
        if transaction:
            transaction.status = status
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
        return transaction


class CRUDPaymentMethod:
    """CRUD operations for PaymentMethod."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> PaymentMethod | None:
        """Get payment method by ID."""
        return db.get(PaymentMethod, id)

    def get_by_user(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> list[PaymentMethod]:
        """Get all payment methods for a user."""
        statement = (
            select(PaymentMethod)
            .where(PaymentMethod.user_id == user_id)
            .order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc())
        )
        return list(db.exec(statement).all())

    def get_default(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> PaymentMethod | None:
        """Get default payment method for a user."""
        return db.exec(
            select(PaymentMethod).where(
                PaymentMethod.user_id == user_id,
                PaymentMethod.is_default == True,
            )
        ).first()

    def create(
        self,
        db: Session,
        *,
        user_id: int,
        obj_in: PaymentMethodCreate,
    ) -> PaymentMethod:
        """Create a new payment method."""
        # If this is the first payment method or marked as default, unset other defaults
        if obj_in.is_default:
            self._unset_defaults(db, user_id=user_id)

        # If this is the first payment method, make it default
        existing_methods = self.get_by_user(db, user_id=user_id)
        is_default = obj_in.is_default or len(existing_methods) == 0

        db_obj = PaymentMethod(
            user_id=user_id,
            type=obj_in.type,
            last_four=obj_in.last_four,
            brand=obj_in.brand,
            is_default=is_default,
            external_id=obj_in.external_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(
        self,
        db: Session,
        *,
        payment_method_id: int,
        user_id: int,
    ) -> bool:
        """Delete a payment method. Returns True if deleted."""
        payment_method = db.exec(
            select(PaymentMethod).where(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id,
            )
        ).first()

        if payment_method:
            was_default = payment_method.is_default
            db.delete(payment_method)
            db.commit()

            # If the deleted method was default, make another one default
            if was_default:
                remaining = self.get_by_user(db, user_id=user_id)
                if remaining:
                    remaining[0].is_default = True
                    db.add(remaining[0])
                    db.commit()

            return True

        return False

    def set_default(
        self,
        db: Session,
        *,
        payment_method_id: int,
        user_id: int,
    ) -> PaymentMethod | None:
        """Set a payment method as default."""
        payment_method = db.exec(
            select(PaymentMethod).where(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.user_id == user_id,
            )
        ).first()

        if payment_method:
            self._unset_defaults(db, user_id=user_id)
            payment_method.is_default = True
            db.add(payment_method)
            db.commit()
            db.refresh(payment_method)

        return payment_method

    def _unset_defaults(
        self,
        db: Session,
        *,
        user_id: int,
    ) -> None:
        """Unset all default payment methods for a user."""
        from sqlalchemy import update

        db.execute(
            update(PaymentMethod)
            .where(PaymentMethod.user_id == user_id, PaymentMethod.is_default == True)
            .values(is_default=False)
        )
        db.commit()


wallet = CRUDWallet()
transaction = CRUDTransaction()
payment_method = CRUDPaymentMethod()
