"""Stripe Connect service for ExtraShifty payment system."""

import logging
import time
from typing import Any

import stripe
from stripe import StripeError

from app.core.config import settings
from app.models.user import UserType

logger = logging.getLogger(__name__)

# Initialize Stripe SDK with API key and timeout
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.max_network_retries = 2  # Auto-retry on connection errors


class StripeServiceError(Exception):
    """Custom exception for Stripe service errors."""

    def __init__(self, message: str, stripe_error_code: str | None = None):
        self.message = message
        self.stripe_error_code = stripe_error_code
        super().__init__(self.message)


class StripeService:
    """Service class for Stripe Connect operations."""

    def __init__(self) -> None:
        """Initialize the Stripe service."""
        if not settings.STRIPE_SECRET_KEY:
            logger.warning("Stripe secret key not configured")

    # =========================================================================
    # Connect Account Creation Methods
    # =========================================================================

    def create_custom_account(
        self,
        email: str,
        country: str = "US",
        business_type: str = "company",
        company_name: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> stripe.Account:
        """
        Create a Custom Connect account for Company wallets.

        Custom accounts provide full control over the user experience and
        payout schedules. Best for platforms that want complete control.

        Args:
            email: Business email address
            country: Two-letter ISO country code
            business_type: 'individual' or 'company'
            company_name: Legal business name (for company type)
            metadata: Additional metadata to store

        Returns:
            Stripe Account object

        Raises:
            StripeServiceError: If account creation fails
        """
        try:
            account_params: dict[str, Any] = {
                "type": "custom",
                "country": country,
                "email": email,
                "business_type": business_type,
                "capabilities": {
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                "metadata": metadata or {},
            }

            if business_type == "company" and company_name:
                account_params["company"] = {"name": company_name}

            # Set TOS acceptance - in production, this should be done by the user
            account_params["tos_acceptance"] = {
                "service_agreement": "full",
            }

            account = stripe.Account.create(**account_params)
            logger.info(f"Created custom Connect account: {account.id}")
            return account

        except StripeError as e:
            logger.error(f"Failed to create custom account: {e}")
            raise StripeServiceError(
                message=f"Failed to create custom account: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def create_express_account(
        self,
        email: str,
        country: str = "US",
        business_type: str = "individual",
        metadata: dict[str, str] | None = None,
    ) -> stripe.Account:
        """
        Create an Express Connect account for Staff wallets.

        Express accounts offer a balance between control and ease of use.
        Stripe handles identity verification and provides a dashboard.

        Args:
            email: Staff email address
            country: Two-letter ISO country code
            business_type: 'individual' or 'company'
            metadata: Additional metadata to store

        Returns:
            Stripe Account object

        Raises:
            StripeServiceError: If account creation fails
        """
        try:
            account = stripe.Account.create(
                type="express",
                country=country,
                email=email,
                business_type=business_type,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                metadata=metadata or {},
            )
            logger.info(f"Created express Connect account: {account.id}")
            return account

        except StripeError as e:
            logger.error(f"Failed to create express account: {e}")
            raise StripeServiceError(
                message=f"Failed to create express account: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def create_standard_account(
        self,
        email: str,
        country: str = "US",
        metadata: dict[str, str] | None = None,
    ) -> stripe.Account:
        """
        Create a Standard Connect account for Agency wallets.

        Standard accounts are the simplest to integrate. Users manage their
        own Stripe dashboard and handle disputes directly.

        Args:
            email: Agency email address
            country: Two-letter ISO country code
            metadata: Additional metadata to store

        Returns:
            Stripe Account object

        Raises:
            StripeServiceError: If account creation fails
        """
        try:
            account = stripe.Account.create(
                type="standard",
                country=country,
                email=email,
                metadata=metadata or {},
            )
            logger.info(f"Created standard Connect account: {account.id}")
            return account

        except StripeError as e:
            logger.error(f"Failed to create standard account: {e}")
            raise StripeServiceError(
                message=f"Failed to create standard account: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def create_account_for_user_type(
        self,
        user_type: UserType,
        email: str,
        country: str = "US",
        company_name: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> stripe.Account:
        """
        Create the appropriate Connect account based on user type.

        Args:
            user_type: The ExtraShifty user type
            email: User's email address
            country: Two-letter ISO country code
            company_name: Company name (for company users)
            metadata: Additional metadata

        Returns:
            Stripe Account object

        Raises:
            StripeServiceError: If account creation fails
            ValueError: If user type is not supported
        """
        if user_type == UserType.COMPANY:
            return self.create_custom_account(
                email=email,
                country=country,
                business_type="company",
                company_name=company_name,
                metadata=metadata,
            )
        elif user_type == UserType.STAFF:
            return self.create_express_account(
                email=email,
                country=country,
                business_type="individual",
                metadata=metadata,
            )
        elif user_type == UserType.AGENCY:
            return self.create_standard_account(
                email=email,
                country=country,
                metadata=metadata,
            )
        else:
            raise ValueError(f"Unsupported user type for Connect account: {user_type}")

    # =========================================================================
    # Account Link Generation for Onboarding
    # =========================================================================

    def create_account_link(
        self,
        account_id: str,
        refresh_url: str,
        return_url: str,
        link_type: str = "account_onboarding",
    ) -> stripe.AccountLink:
        """
        Create an account link for Connect onboarding.

        Account links are used to send users to Stripe-hosted pages for
        onboarding or account management.

        Args:
            account_id: The Stripe Connect account ID
            refresh_url: URL to redirect if the link expires
            return_url: URL to redirect after completion
            link_type: Type of link ('account_onboarding' or 'account_update')

        Returns:
            Stripe AccountLink object with the URL

        Raises:
            StripeServiceError: If link creation fails
        """
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type=link_type,
            )
            logger.info(f"Created account link for: {account_id}")
            return account_link

        except StripeError as e:
            logger.error(f"Failed to create account link: {e}")
            raise StripeServiceError(
                message=f"Failed to create account link: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def create_login_link(self, account_id: str) -> stripe.LoginLink:
        """
        Create a login link for Express dashboard access.

        Only works for Express and Custom accounts.

        Args:
            account_id: The Stripe Connect account ID

        Returns:
            Stripe LoginLink object with the URL

        Raises:
            StripeServiceError: If link creation fails
        """
        try:
            login_link = stripe.Account.create_login_link(account_id)
            logger.info(f"Created login link for: {account_id}")
            return login_link

        except StripeError as e:
            logger.error(f"Failed to create login link: {e}")
            raise StripeServiceError(
                message=f"Failed to create login link: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    # =========================================================================
    # Payment Intent Operations
    # =========================================================================

    def create_payment_intent(
        self,
        amount: int,
        currency: str = "eur",
        customer_id: str | None = None,
        payment_method_id: str | None = None,
        destination_account_id: str | None = None,
        application_fee_amount: int | None = None,
        idempotency_key: str | None = None,
        metadata: dict[str, str] | None = None,
        description: str | None = None,
        on_behalf_of: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Create a payment intent with optional Connect destination.

        Args:
            amount: Amount in smallest currency unit (e.g., cents)
            currency: Three-letter ISO currency code
            customer_id: Stripe Customer ID
            payment_method_id: Stripe PaymentMethod ID
            destination_account_id: Connect account to receive funds
            application_fee_amount: Platform fee in smallest currency unit
            idempotency_key: Unique key to prevent duplicate charges
            metadata: Additional metadata
            description: Description for the payment
            on_behalf_of: Connected account the payment is on behalf of

        Returns:
            Stripe PaymentIntent object

        Raises:
            StripeServiceError: If payment intent creation fails
        """
        try:
            params: dict[str, Any] = {
                "amount": amount,
                "currency": currency,
                "metadata": metadata or {},
            }

            if customer_id:
                params["customer"] = customer_id

            if payment_method_id:
                params["payment_method"] = payment_method_id
                params["confirm"] = True

            if description:
                params["description"] = description

            if on_behalf_of:
                params["on_behalf_of"] = on_behalf_of

            # Set up Connect transfer if destination specified
            if destination_account_id:
                params["transfer_data"] = {
                    "destination": destination_account_id,
                }
                if application_fee_amount:
                    params["application_fee_amount"] = application_fee_amount

            # Create with idempotency key if provided
            if idempotency_key:
                payment_intent = stripe.PaymentIntent.create(
                    **params,
                    idempotency_key=idempotency_key,
                )
            else:
                payment_intent = stripe.PaymentIntent.create(**params)

            logger.info(f"Created payment intent: {payment_intent.id}")
            return payment_intent

        except StripeError as e:
            logger.error(f"Failed to create payment intent: {e}")
            raise StripeServiceError(
                message=f"Failed to create payment intent: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def confirm_payment_intent(
        self,
        payment_intent_id: str,
        payment_method_id: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Confirm a payment intent.

        Args:
            payment_intent_id: The PaymentIntent ID to confirm
            payment_method_id: Optional payment method to use

        Returns:
            Updated PaymentIntent object

        Raises:
            StripeServiceError: If confirmation fails
        """
        try:
            params: dict[str, Any] = {}
            if payment_method_id:
                params["payment_method"] = payment_method_id

            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent_id, **params
            )
            logger.info(f"Confirmed payment intent: {payment_intent_id}")
            return payment_intent

        except StripeError as e:
            logger.error(f"Failed to confirm payment intent: {e}")
            raise StripeServiceError(
                message=f"Failed to confirm payment intent: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def retrieve_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """
        Retrieve a payment intent by ID.

        Args:
            payment_intent_id: The PaymentIntent ID

        Returns:
            PaymentIntent object

        Raises:
            StripeServiceError: If retrieval fails
        """
        try:
            return stripe.PaymentIntent.retrieve(payment_intent_id)
        except StripeError as e:
            logger.error(f"Failed to retrieve payment intent: {e}")
            raise StripeServiceError(
                message=f"Failed to retrieve payment intent: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def cancel_payment_intent(
        self,
        payment_intent_id: str,
        cancellation_reason: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Cancel a payment intent.

        Args:
            payment_intent_id: The PaymentIntent ID
            cancellation_reason: Reason for cancellation

        Returns:
            Canceled PaymentIntent object

        Raises:
            StripeServiceError: If cancellation fails
        """
        try:
            params: dict[str, Any] = {}
            if cancellation_reason:
                params["cancellation_reason"] = cancellation_reason

            payment_intent = stripe.PaymentIntent.cancel(
                payment_intent_id, **params
            )
            logger.info(f"Canceled payment intent: {payment_intent_id}")
            return payment_intent

        except StripeError as e:
            logger.error(f"Failed to cancel payment intent: {e}")
            raise StripeServiceError(
                message=f"Failed to cancel payment intent: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    # =========================================================================
    # Transfer Operations
    # =========================================================================

    def create_transfer(
        self,
        amount: int,
        destination_account_id: str,
        currency: str = "eur",
        source_transaction: str | None = None,
        transfer_group: str | None = None,
        description: str | None = None,
        metadata: dict[str, str] | None = None,
        idempotency_key: str | None = None,
    ) -> stripe.Transfer:
        """
        Create a transfer to a connected account.

        Args:
            amount: Amount in smallest currency unit
            destination_account_id: The Connect account ID to receive funds
            currency: Three-letter ISO currency code
            source_transaction: Charge to transfer funds from (optional)
            transfer_group: Group ID for related transfers
            description: Description of the transfer
            metadata: Additional metadata
            idempotency_key: Unique key to prevent duplicate transfers

        Returns:
            Stripe Transfer object

        Raises:
            StripeServiceError: If transfer creation fails
        """
        try:
            params: dict[str, Any] = {
                "amount": amount,
                "currency": currency,
                "destination": destination_account_id,
                "metadata": metadata or {},
            }

            if source_transaction:
                params["source_transaction"] = source_transaction

            if transfer_group:
                params["transfer_group"] = transfer_group

            if description:
                params["description"] = description

            if idempotency_key:
                transfer = stripe.Transfer.create(
                    **params,
                    idempotency_key=idempotency_key,
                )
            else:
                transfer = stripe.Transfer.create(**params)

            logger.info(
                f"Created transfer: {transfer.id} to {destination_account_id}"
            )
            return transfer

        except StripeError as e:
            logger.error(f"Failed to create transfer: {e}")
            raise StripeServiceError(
                message=f"Failed to create transfer: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def reverse_transfer(
        self,
        transfer_id: str,
        amount: int | None = None,
        description: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> stripe.Reversal:
        """
        Reverse a transfer (full or partial).

        Args:
            transfer_id: The Transfer ID to reverse
            amount: Amount to reverse (None for full reversal)
            description: Reason for reversal
            metadata: Additional metadata

        Returns:
            Stripe Reversal object

        Raises:
            StripeServiceError: If reversal fails
        """
        try:
            params: dict[str, Any] = {
                "metadata": metadata or {},
            }

            if amount:
                params["amount"] = amount

            if description:
                params["description"] = description

            reversal = stripe.Transfer.create_reversal(transfer_id, **params)
            logger.info(f"Reversed transfer: {transfer_id}")
            return reversal

        except StripeError as e:
            logger.error(f"Failed to reverse transfer: {e}")
            raise StripeServiceError(
                message=f"Failed to reverse transfer: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    # =========================================================================
    # Payout Operations
    # =========================================================================

    def create_payout(
        self,
        amount: int,
        connected_account_id: str,
        currency: str = "eur",
        destination: str | None = None,
        description: str | None = None,
        metadata: dict[str, str] | None = None,
        method: str = "standard",
        idempotency_key: str | None = None,
    ) -> stripe.Payout:
        """
        Create a payout from a connected account to their bank.

        Args:
            amount: Amount in smallest currency unit
            connected_account_id: The Connect account ID
            currency: Three-letter ISO currency code
            destination: External account ID (bank account or card)
            description: Description of the payout
            metadata: Additional metadata
            method: 'standard' or 'instant'
            idempotency_key: Unique key to prevent duplicate payouts

        Returns:
            Stripe Payout object

        Raises:
            StripeServiceError: If payout creation fails
        """
        try:
            params: dict[str, Any] = {
                "amount": amount,
                "currency": currency,
                "method": method,
                "metadata": metadata or {},
            }

            if destination:
                params["destination"] = destination

            if description:
                params["description"] = description

            # Create payout on behalf of connected account
            if idempotency_key:
                payout = stripe.Payout.create(
                    **params,
                    stripe_account=connected_account_id,
                    idempotency_key=idempotency_key,
                )
            else:
                payout = stripe.Payout.create(
                    **params,
                    stripe_account=connected_account_id,
                )

            logger.info(f"Created payout: {payout.id} for {connected_account_id}")
            return payout

        except StripeError as e:
            logger.error(f"Failed to create payout: {e}")
            raise StripeServiceError(
                message=f"Failed to create payout: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def cancel_payout(
        self,
        payout_id: str,
        connected_account_id: str,
    ) -> stripe.Payout:
        """
        Cancel a pending payout.

        Args:
            payout_id: The Payout ID to cancel
            connected_account_id: The Connect account ID

        Returns:
            Canceled Payout object

        Raises:
            StripeServiceError: If cancellation fails
        """
        try:
            payout = stripe.Payout.cancel(
                payout_id,
                stripe_account=connected_account_id,
            )
            logger.info(f"Canceled payout: {payout_id}")
            return payout

        except StripeError as e:
            logger.error(f"Failed to cancel payout: {e}")
            raise StripeServiceError(
                message=f"Failed to cancel payout: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def retrieve_payout(
        self,
        payout_id: str,
        connected_account_id: str | None = None,
    ) -> stripe.Payout:
        """
        Retrieve a payout by ID.

        Args:
            payout_id: The Payout ID
            connected_account_id: Optional Connect account ID

        Returns:
            Payout object

        Raises:
            StripeServiceError: If retrieval fails
        """
        try:
            params: dict[str, Any] = {}
            if connected_account_id:
                params["stripe_account"] = connected_account_id

            return stripe.Payout.retrieve(payout_id, **params)

        except StripeError as e:
            logger.error(f"Failed to retrieve payout: {e}")
            raise StripeServiceError(
                message=f"Failed to retrieve payout: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    # =========================================================================
    # Account Management
    # =========================================================================

    def retrieve_account(self, account_id: str) -> stripe.Account:
        """
        Retrieve a Connect account by ID.

        Args:
            account_id: The Connect account ID

        Returns:
            Account object

        Raises:
            StripeServiceError: If retrieval fails
        """
        try:
            return stripe.Account.retrieve(account_id)
        except StripeError as e:
            logger.error(f"Failed to retrieve account: {e}")
            raise StripeServiceError(
                message=f"Failed to retrieve account: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def get_account_balance(
        self,
        connected_account_id: str | None = None,
    ) -> stripe.Balance:
        """
        Get the balance for an account.

        Args:
            connected_account_id: Optional Connect account ID

        Returns:
            Balance object

        Raises:
            StripeServiceError: If retrieval fails
        """
        try:
            params: dict[str, Any] = {}
            if connected_account_id:
                params["stripe_account"] = connected_account_id

            return stripe.Balance.retrieve(**params)

        except StripeError as e:
            logger.error(f"Failed to get account balance: {e}")
            raise StripeServiceError(
                message=f"Failed to get account balance: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    def delete_account(self, account_id: str) -> stripe.Account:
        """
        Delete a Connect account.

        Args:
            account_id: The Connect account ID

        Returns:
            Deleted Account object

        Raises:
            StripeServiceError: If deletion fails
        """
        try:
            deleted = stripe.Account.delete(account_id)
            logger.info(f"Deleted account: {account_id}")
            return deleted

        except StripeError as e:
            logger.error(f"Failed to delete account: {e}")
            raise StripeServiceError(
                message=f"Failed to delete account: {str(e)}",
                stripe_error_code=getattr(e, "code", None),
            ) from e

    # =========================================================================
    # Webhook Verification
    # =========================================================================

    @staticmethod
    def verify_webhook_signature(
        payload: bytes,
        signature: str,
        webhook_secret: str | None = None,
    ) -> stripe.Event:
        """
        Verify a webhook signature and construct the event.

        Args:
            payload: Raw webhook payload bytes
            signature: Stripe-Signature header value
            webhook_secret: Webhook signing secret (defaults to settings)

        Returns:
            Verified Stripe Event object

        Raises:
            StripeServiceError: If verification fails
        """
        secret = webhook_secret or settings.STRIPE_WEBHOOK_SECRET

        if not secret:
            raise StripeServiceError(
                message="Webhook secret not configured",
                stripe_error_code="missing_config",
            )

        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=secret,
            )
            return event

        except stripe.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise StripeServiceError(
                message="Invalid webhook signature",
                stripe_error_code="invalid_signature",
            ) from e
        except ValueError as e:
            logger.error(f"Invalid webhook payload: {e}")
            raise StripeServiceError(
                message="Invalid webhook payload",
                stripe_error_code="invalid_payload",
            ) from e


# Global service instance
stripe_service = StripeService()
