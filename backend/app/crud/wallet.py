"""CRUD operations for Wallet and PaymentMethod models."""

from datetime import datetime
from decimal import Decimal

from sqlmodel import Session, select

from app.models.wallet import (
    PaymentMethod,
    Wallet,
    WalletType,
)
from app.schemas.wallet import PaymentMethodCreate


class CRUDWallet:
    """CRUD operations for Wallet."""

    def get(
        self,
        db: Session,
        *,
        id: int,
    ) -> Wallet | None:
        """Get wallet by ID."""
        return db.get(Wallet, id)

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

    def get_by_stripe_account_id(
        self,
        db: Session,
        *,
        stripe_account_id: str,
    ) -> Wallet | None:
        """Get wallet by Stripe Connect account ID."""
        return db.exec(
            select(Wallet).where(Wallet.stripe_account_id == stripe_account_id)
        ).first()

    def get_or_create(
        self,
        db: Session,
        *,
        user_id: int,
        wallet_type: WalletType = WalletType.STAFF,
    ) -> Wallet:
        """Get or create wallet for a user."""
        wallet = self.get_by_user(db, user_id=user_id)

        if not wallet:
            wallet = Wallet(
                user_id=user_id,
                wallet_type=wallet_type,
            )
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        return wallet

    def update_balance(
        self,
        db: Session,
        *,
        wallet: Wallet,
        amount: Decimal,
    ) -> Wallet:
        """Update wallet balance by adding amount (can be negative for withdrawals)."""
        wallet.balance += amount
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def update_reserved_balance(
        self,
        db: Session,
        *,
        wallet: Wallet,
        amount: Decimal,
    ) -> Wallet:
        """Update wallet reserved balance by adding amount (can be negative to release)."""
        wallet.reserved_balance += amount
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def set_stripe_account(
        self,
        db: Session,
        *,
        wallet: Wallet,
        stripe_account_id: str,
    ) -> Wallet:
        """Set the Stripe Connect account ID for a wallet."""
        wallet.stripe_account_id = stripe_account_id
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def complete_onboarding(
        self,
        db: Session,
        *,
        wallet: Wallet,
    ) -> Wallet:
        """Mark Stripe onboarding as complete."""
        wallet.stripe_onboarding_complete = True
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def configure_auto_topup(
        self,
        db: Session,
        *,
        wallet: Wallet,
        enabled: bool,
        threshold: Decimal | None = None,
        amount: Decimal | None = None,
    ) -> Wallet:
        """Configure auto top-up settings for a wallet."""
        wallet.auto_topup_enabled = enabled
        wallet.auto_topup_threshold = threshold
        wallet.auto_topup_amount = amount
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def deactivate(
        self,
        db: Session,
        *,
        wallet: Wallet,
    ) -> Wallet:
        """Deactivate a wallet."""
        wallet.is_active = False
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def activate(
        self,
        db: Session,
        *,
        wallet: Wallet,
    ) -> Wallet:
        """Activate a wallet."""
        wallet.is_active = True
        wallet.updated_at = datetime.utcnow()
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet

    def has_sufficient_balance(
        self,
        db: Session,
        *,
        wallet: Wallet,
        amount: Decimal,
    ) -> bool:
        """Check if wallet has sufficient available balance for an amount."""
        available = wallet.balance - wallet.reserved_balance
        return available >= amount

    def get_wallets_needing_topup(
        self,
        db: Session,
    ) -> list[Wallet]:
        """Get all wallets that need auto top-up."""
        return list(
            db.exec(
                select(Wallet).where(
                    Wallet.is_active == True,
                    Wallet.auto_topup_enabled == True,
                    Wallet.auto_topup_threshold.isnot(None),
                    Wallet.auto_topup_amount.isnot(None),
                    (Wallet.balance - Wallet.reserved_balance) < Wallet.auto_topup_threshold,
                )
            ).all()
        )


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

    def get_by_external_id(
        self,
        db: Session,
        *,
        external_id: str,
    ) -> PaymentMethod | None:
        """Get payment method by Stripe payment method ID."""
        return db.exec(
            select(PaymentMethod).where(PaymentMethod.external_id == external_id)
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


# Create singleton instances
wallet = CRUDWallet()
payment_method = CRUDPaymentMethod()
