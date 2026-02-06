"""Tax compliance service for ExtraShifty 1099-NEC tracking.

Handles:
- Tracking cumulative earnings per user per tax year
- W9 collection when $600 threshold is reached
- 1099-NEC generation and filing workflow
"""

import logging
from datetime import datetime
from decimal import Decimal

from sqlmodel import Session, func, select

from app.models.notification import Notification
from app.models.tax import TaxDocument, TaxFormStatus, TaxFormType, TaxYear
from app.models.user import User, UserType
from app.schemas.tax import TaxYearSummary, W9SubmitRequest

logger = logging.getLogger(__name__)


class TaxError(Exception):
    """Tax-related error."""

    def __init__(self, message: str, code: str = "tax_error"):
        self.message = message
        self.code = code
        super().__init__(message)


class TaxService:
    """Service class for tax compliance operations."""

    # IRS 1099-NEC threshold for non-employee compensation
    US_1099_THRESHOLD = Decimal("600.00")

    def __init__(self, db: Session):
        self.db = db

    def _get_current_tax_year(self) -> int:
        """Get the current tax year."""
        return datetime.utcnow().year

    def _get_or_create_tax_year(
        self,
        user_id: int,
        tax_year: int | None = None,
    ) -> TaxYear:
        """Get or create a TaxYear record for a user."""
        if tax_year is None:
            tax_year = self._get_current_tax_year()

        # Try to find existing record
        tax_year_record = self.db.exec(
            select(TaxYear).where(
                TaxYear.user_id == user_id,
                TaxYear.tax_year == tax_year,
            )
        ).first()

        if not tax_year_record:
            # Create new record
            tax_year_record = TaxYear(
                user_id=user_id,
                tax_year=tax_year,
                country="US",
                total_earnings=Decimal("0.00"),
                threshold_amount=self.US_1099_THRESHOLD,
                threshold_reached=False,
                status=TaxFormStatus.NOT_REQUIRED,
            )
            self.db.add(tax_year_record)
            self.db.commit()
            self.db.refresh(tax_year_record)
            logger.info(f"Created tax year record for user {user_id}, year {tax_year}")

        return tax_year_record

    async def record_earnings(
        self,
        user_id: int,
        amount: Decimal,
        tax_year: int | None = None,
    ) -> TaxYear:
        """
        Record earnings for a user. Called after each payout.

        Args:
            user_id: The user receiving the payment
            amount: The net amount paid to the user
            tax_year: The tax year (defaults to current year)

        Returns:
            Updated TaxYear record
        """
        if amount <= 0:
            logger.warning(f"Attempted to record non-positive earnings: {amount}")
            return self._get_or_create_tax_year(user_id, tax_year)

        tax_year_record = self._get_or_create_tax_year(user_id, tax_year)

        # Update total earnings
        previous_earnings = tax_year_record.total_earnings
        tax_year_record.total_earnings += amount
        tax_year_record.updated_at = datetime.utcnow()

        # Check if threshold was just crossed
        if (
            not tax_year_record.threshold_reached
            and tax_year_record.total_earnings >= self.US_1099_THRESHOLD
        ):
            tax_year_record.threshold_reached = True
            tax_year_record.threshold_reached_at = datetime.utcnow()
            tax_year_record.status = TaxFormStatus.PENDING_W9

            logger.info(
                f"User {user_id} crossed $600 threshold for tax year "
                f"{tax_year_record.tax_year}. Previous: {previous_earnings}, "
                f"New total: {tax_year_record.total_earnings}"
            )

            notification = Notification(
                user_id=user_id,
                type="w9_required",
                title="W9 Form Required",
                message=(
                    f"Your earnings have exceeded ${self.US_1099_THRESHOLD} for tax year "
                    f"{tax_year_record.tax_year}. Please submit your W9 form."
                ),
                data={
                    "tax_year": tax_year_record.tax_year,
                    "total_earnings": str(tax_year_record.total_earnings),
                },
            )
            self.db.add(notification)

        self.db.add(tax_year_record)
        self.db.commit()
        self.db.refresh(tax_year_record)

        return tax_year_record

    async def check_threshold_status(
        self,
        user_id: int,
        tax_year: int | None = None,
    ) -> dict:
        """
        Check if user needs to submit W9.

        Args:
            user_id: The user to check
            tax_year: The tax year to check (defaults to current year)

        Returns:
            Dictionary with threshold status information
        """
        if tax_year is None:
            tax_year = self._get_current_tax_year()

        tax_year_record = self._get_or_create_tax_year(user_id, tax_year)

        return {
            "tax_year": tax_year,
            "total_earnings": tax_year_record.total_earnings,
            "threshold": self.US_1099_THRESHOLD,
            "threshold_reached": tax_year_record.threshold_reached,
            "threshold_reached_at": tax_year_record.threshold_reached_at,
            "w9_required": tax_year_record.threshold_reached,
            "w9_submitted": tax_year_record.w9_submitted_at is not None,
            "w9_submitted_at": tax_year_record.w9_submitted_at,
            "status": tax_year_record.status.value,
            "form_generated": tax_year_record.form_generated_at is not None,
            "form_sent": tax_year_record.form_sent_at is not None,
        }

    async def submit_w9(
        self,
        user_id: int,
        tax_year: int,
        w9_data: W9SubmitRequest,
    ) -> TaxYear:
        """
        Process W9 submission.

        Args:
            user_id: The user submitting the W9
            tax_year: The tax year for the W9
            w9_data: The W9 form data

        Returns:
            Updated TaxYear record
        """
        tax_year_record = self.db.exec(
            select(TaxYear).where(
                TaxYear.user_id == user_id,
                TaxYear.tax_year == tax_year,
            )
        ).first()

        if not tax_year_record:
            raise TaxError(
                f"No tax year record found for user {user_id}, year {tax_year}",
                "tax_year_not_found",
            )

        if not tax_year_record.threshold_reached:
            raise TaxError(
                "W9 not required - earnings below $600 threshold",
                "w9_not_required",
            )

        if tax_year_record.w9_submitted_at is not None:
            raise TaxError(
                "W9 already submitted for this tax year",
                "w9_already_submitted",
            )

        if not w9_data.certification:
            raise TaxError(
                "Must certify the W9 information is correct",
                "certification_required",
            )

        # Store W9 information
        # Only store last 4 digits of SSN in database
        ssn_cleaned = w9_data.ssn.replace("-", "").replace(" ", "")
        tax_year_record.ssn_last_four = ssn_cleaned[-4:]

        # In production, store full SSN in secure vault (e.g., Stripe Identity)
        # and save the token reference
        # tax_year_record.ssn_token = await secure_vault.store_ssn(ssn_cleaned)
        tax_year_record.ssn_token = f"ssn_vault_{user_id}_{tax_year}"  # Placeholder

        tax_year_record.legal_name = w9_data.legal_name
        tax_year_record.business_name = w9_data.business_name
        tax_year_record.tax_classification = w9_data.tax_classification
        tax_year_record.address_line1 = w9_data.address_line1
        tax_year_record.address_line2 = w9_data.address_line2
        tax_year_record.city = w9_data.city
        tax_year_record.state = w9_data.state
        tax_year_record.zip_code = w9_data.zip_code

        tax_year_record.w9_submitted_at = datetime.utcnow()
        tax_year_record.status = TaxFormStatus.W9_RECEIVED
        tax_year_record.updated_at = datetime.utcnow()

        self.db.add(tax_year_record)

        # Create W9 document record
        w9_document = TaxDocument(
            tax_year_id=tax_year_record.id,
            document_type=TaxFormType.FORM_W9,
            file_name=f"W9_{user_id}_{tax_year}.pdf",
            # file_url would be set after generating and storing the PDF
        )
        self.db.add(w9_document)

        self.db.commit()
        self.db.refresh(tax_year_record)

        logger.info(f"W9 submitted for user {user_id}, tax year {tax_year}")

        return tax_year_record

    async def generate_1099_nec(
        self,
        user_id: int,
        tax_year: int,
    ) -> TaxDocument:
        """
        Generate 1099-NEC form for a user.

        Called in January for prior year earnings.

        Args:
            user_id: The user to generate 1099 for
            tax_year: The tax year

        Returns:
            Created TaxDocument record
        """
        tax_year_record = self.db.exec(
            select(TaxYear).where(
                TaxYear.user_id == user_id,
                TaxYear.tax_year == tax_year,
            )
        ).first()

        if not tax_year_record:
            raise TaxError(
                f"No tax year record found for user {user_id}, year {tax_year}",
                "tax_year_not_found",
            )

        if not tax_year_record.threshold_reached:
            raise TaxError(
                "1099-NEC not required - earnings below $600 threshold",
                "1099_not_required",
            )

        if tax_year_record.w9_submitted_at is None:
            raise TaxError(
                "W9 must be submitted before generating 1099-NEC",
                "w9_required",
            )

        if tax_year_record.form_generated_at is not None:
            raise TaxError(
                "1099-NEC already generated for this tax year",
                "1099_already_generated",
            )

        # In production, generate the actual 1099-NEC PDF
        # using IRS Form 1099-NEC template with tax year data

        # Create 1099 document record
        form_1099 = TaxDocument(
            tax_year_id=tax_year_record.id,
            document_type=TaxFormType.FORM_1099_NEC,
            file_name=f"1099-NEC_{user_id}_{tax_year}.pdf",
            # file_url would be set after generating and storing the PDF
        )
        self.db.add(form_1099)

        # Update tax year status
        tax_year_record.form_generated_at = datetime.utcnow()
        tax_year_record.status = TaxFormStatus.FORM_GENERATED
        tax_year_record.updated_at = datetime.utcnow()
        self.db.add(tax_year_record)

        self.db.commit()
        self.db.refresh(form_1099)

        logger.info(f"Generated 1099-NEC for user {user_id}, tax year {tax_year}")

        return form_1099

    async def get_users_needing_w9(
        self,
        tax_year: int | None = None,
    ) -> list[TaxYearSummary]:
        """
        Get all users who crossed threshold but haven't submitted W9.

        Args:
            tax_year: The tax year to check (defaults to current year)

        Returns:
            List of TaxYearSummary for users needing W9
        """
        if tax_year is None:
            tax_year = self._get_current_tax_year()

        # Query tax years with pending W9 status
        results = self.db.exec(
            select(TaxYear, User)
            .join(User, TaxYear.user_id == User.id)
            .where(
                TaxYear.tax_year == tax_year,
                TaxYear.threshold_reached == True,
                TaxYear.status == TaxFormStatus.PENDING_W9,
            )
            .order_by(TaxYear.threshold_reached_at.desc())
        ).all()

        summaries = []
        for tax_year_record, user in results:
            summaries.append(
                TaxYearSummary(
                    tax_year_id=tax_year_record.id,
                    user_id=user.id,
                    user_email=user.email,
                    user_name=user.full_name,
                    tax_year=tax_year_record.tax_year,
                    total_earnings=tax_year_record.total_earnings,
                    threshold_reached=tax_year_record.threshold_reached,
                    status=tax_year_record.status.value,
                    w9_submitted=tax_year_record.w9_submitted_at is not None,
                    form_generated=tax_year_record.form_generated_at is not None,
                    form_filed=tax_year_record.form_filed_at is not None,
                    form_sent=tax_year_record.form_sent_at is not None,
                )
            )

        return summaries

    async def get_users_needing_1099(
        self,
        tax_year: int,
    ) -> list[TaxYearSummary]:
        """
        Get all users who need 1099-NEC generated.

        Args:
            tax_year: The tax year

        Returns:
            List of TaxYearSummary for users needing 1099
        """
        # Query tax years with W9 received but no 1099 generated
        results = self.db.exec(
            select(TaxYear, User)
            .join(User, TaxYear.user_id == User.id)
            .where(
                TaxYear.tax_year == tax_year,
                TaxYear.threshold_reached == True,
                TaxYear.status == TaxFormStatus.W9_RECEIVED,
            )
            .order_by(TaxYear.total_earnings.desc())
        ).all()

        summaries = []
        for tax_year_record, user in results:
            summaries.append(
                TaxYearSummary(
                    tax_year_id=tax_year_record.id,
                    user_id=user.id,
                    user_email=user.email,
                    user_name=user.full_name,
                    tax_year=tax_year_record.tax_year,
                    total_earnings=tax_year_record.total_earnings,
                    threshold_reached=tax_year_record.threshold_reached,
                    status=tax_year_record.status.value,
                    w9_submitted=tax_year_record.w9_submitted_at is not None,
                    form_generated=tax_year_record.form_generated_at is not None,
                    form_filed=tax_year_record.form_filed_at is not None,
                    form_sent=tax_year_record.form_sent_at is not None,
                )
            )

        return summaries

    async def batch_generate_1099s(
        self,
        tax_year: int,
        user_ids: list[int] | None = None,
    ) -> dict:
        """
        Generate 1099-NEC forms for multiple users.

        Args:
            tax_year: The tax year
            user_ids: Specific user IDs to generate for (None = all eligible)

        Returns:
            Dictionary with generation results
        """
        # Build query for eligible users
        query = (
            select(TaxYear)
            .where(
                TaxYear.tax_year == tax_year,
                TaxYear.threshold_reached == True,
                TaxYear.status == TaxFormStatus.W9_RECEIVED,
            )
        )

        if user_ids:
            query = query.where(TaxYear.user_id.in_(user_ids))

        eligible_records = self.db.exec(query).all()

        generated_count = 0
        failed_count = 0
        errors = []

        for tax_year_record in eligible_records:
            try:
                await self.generate_1099_nec(
                    user_id=tax_year_record.user_id,
                    tax_year=tax_year,
                )
                generated_count += 1
            except TaxError as e:
                failed_count += 1
                errors.append(f"User {tax_year_record.user_id}: {e.message}")
                logger.error(
                    f"Failed to generate 1099 for user {tax_year_record.user_id}: {e.message}"
                )
            except Exception as e:
                failed_count += 1
                errors.append(f"User {tax_year_record.user_id}: {str(e)}")
                logger.exception(
                    f"Unexpected error generating 1099 for user {tax_year_record.user_id}"
                )

        return {
            "generated_count": generated_count,
            "failed_count": failed_count,
            "errors": errors,
        }

    def get_tax_documents(
        self,
        user_id: int,
        tax_year: int | None = None,
    ) -> list[TaxDocument]:
        """
        Get tax documents for a user.

        Args:
            user_id: The user ID
            tax_year: Optional tax year filter

        Returns:
            List of TaxDocument records
        """
        query = (
            select(TaxDocument)
            .join(TaxYear, TaxDocument.tax_year_id == TaxYear.id)
            .where(TaxYear.user_id == user_id)
        )

        if tax_year is not None:
            query = query.where(TaxYear.tax_year == tax_year)

        query = query.order_by(TaxDocument.created_at.desc())

        return list(self.db.exec(query).all())

    def get_document_by_id(
        self,
        document_id: int,
        user_id: int,
    ) -> TaxDocument | None:
        """
        Get a specific tax document, verifying ownership.

        Args:
            document_id: The document ID
            user_id: The user ID (for authorization)

        Returns:
            TaxDocument if found and owned by user, None otherwise
        """
        result = self.db.exec(
            select(TaxDocument)
            .join(TaxYear, TaxDocument.tax_year_id == TaxYear.id)
            .where(
                TaxDocument.id == document_id,
                TaxYear.user_id == user_id,
            )
        ).first()

        return result


# Singleton instance for use across the application
tax_service: TaxService | None = None


def get_tax_service(db: Session) -> TaxService:
    """Get a TaxService instance with the given database session."""
    return TaxService(db)
