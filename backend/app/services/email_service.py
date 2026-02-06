"""Email service for ExtraShifty notifications."""

import logging
import smtplib
from datetime import datetime
from decimal import Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import TYPE_CHECKING

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlmodel import Session, select

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.user import User

logger = logging.getLogger(__name__)

# Set up Jinja2 template environment
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"
jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


class EmailService:
    """Service for sending email notifications."""

    def __init__(self, db: Session | None = None):
        """Initialize email service with optional database session."""
        self.db = db
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_tls = settings.SMTP_TLS
        self.smtp_ssl = settings.SMTP_SSL
        self.from_email = settings.EMAILS_FROM_EMAIL or "noreply@extrashifty.com"
        self.from_name = settings.EMAILS_FROM_NAME or "ExtraShifty"
        self.base_url = "https://extrashifty.com"  # Configure from settings in production

    def _get_user(self, user_id: int) -> "User | None":
        """Get user by ID from database."""
        if not self.db:
            return None

        from app.models.user import User

        return self.db.exec(
            select(User).where(User.id == user_id)
        ).first()

    def _render_template(self, template_name: str, context: dict) -> str:
        """Render an email template with the given context."""
        template = jinja_env.get_template(template_name)
        return template.render(**context)

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """
        Send an email using SMTP.

        In development/testing, logs the email instead of sending.
        """
        if not self.smtp_host:
            # Log email in development mode
            logger.info(
                f"[EMAIL - DEV MODE] To: {to_email}, Subject: {subject}\n"
                f"Content preview: {html_content[:200]}..."
            )
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Attach HTML content
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)

            # Connect to SMTP server
            if self.smtp_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)

            if self.smtp_tls and not self.smtp_ssl:
                server.starttls()

            if self.smtp_user and self.smtp_password:
                server.login(self.smtp_user, self.smtp_password)

            server.sendmail(self.from_email, to_email, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
            return False

    async def send_failed_topup_alert(
        self,
        user_id: int,
        amount: Decimal,
        failure_reason: str,
        grace_period_ends: datetime,
    ) -> bool:
        """
        Send failed top-up alert email.

        Includes: amount, reason, deadline to fix, link to retry.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send failed topup alert: user {user_id} not found")
            return False

        context = {
            "user_name": user.full_name,
            "amount": f"{amount:.2f}",
            "currency": "EUR",
            "failure_reason": failure_reason,
            "grace_period_ends": grace_period_ends.strftime("%B %d, %Y at %H:%M UTC"),
            "retry_url": f"{self.base_url}/dashboard/wallet?action=topup",
        }

        html_content = self._render_template("failed_topup.html", context)

        return self._send_email(
            to_email=user.email,
            subject="Action Required: Payment Failed - ExtraShifty",
            html_content=html_content,
        )

    async def send_suspension_warning(
        self,
        user_id: int,
        hours_remaining: int,
    ) -> bool:
        """
        Send 24hr warning before account suspension.

        Urgent notification to encourage immediate action.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send suspension warning: user {user_id} not found")
            return False

        context = {
            "user_name": user.full_name,
            "hours_remaining": hours_remaining,
            "retry_url": f"{self.base_url}/dashboard/wallet?action=topup",
        }

        html_content = self._render_template("suspension_warning.html", context)

        return self._send_email(
            to_email=user.email,
            subject="URGENT: Account Suspension in 24 Hours - ExtraShifty",
            html_content=html_content,
        )

    async def send_account_suspended(
        self,
        user_id: int,
        reason: str,
    ) -> bool:
        """
        Send account suspended notification.

        Notifies user their account is now suspended.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send suspension notice: user {user_id} not found")
            return False

        context = {
            "user_name": user.full_name,
            "reason": reason,
            "reactivate_url": f"{self.base_url}/dashboard/wallet?action=reactivate",
        }

        html_content = self._render_template("account_suspended.html", context)

        return self._send_email(
            to_email=user.email,
            subject="Account Suspended - ExtraShifty",
            html_content=html_content,
        )

    async def send_account_reactivated(
        self,
        user_id: int,
    ) -> bool:
        """
        Send account reactivated notification.

        Confirms account is now active again.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send reactivation notice: user {user_id} not found")
            return False

        context = {
            "user_name": user.full_name,
            "dashboard_url": f"{self.base_url}/dashboard",
        }

        html_content = self._render_template("account_reactivated.html", context)

        return self._send_email(
            to_email=user.email,
            subject="Account Reactivated - ExtraShifty",
            html_content=html_content,
        )

    # =========================================================================
    # Appeal-related email notifications
    # =========================================================================

    async def send_appeal_submitted_confirmation(
        self,
        user_id: int,
        appeal_type: str,
        appeal_id: int,
    ) -> bool:
        """
        Send confirmation that appeal has been submitted.

        Includes expected review timeline (3 business days).
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send appeal confirmation: user {user_id} not found")
            return False

        context = {
            "user_name": user.full_name,
            "appeal_type": appeal_type,
            "appeal_id": appeal_id,
            "review_timeline": "3 business days",
            "appeals_url": f"{self.base_url}/dashboard/appeals/{appeal_id}",
        }

        # Simple HTML template inline for now
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Appeal Submitted - ExtraShifty</h2>
            <p>Hi {context['user_name']},</p>
            <p>Your appeal for the <strong>{context['appeal_type']}</strong> has been submitted successfully.</p>
            <p><strong>Appeal ID:</strong> {context['appeal_id']}</p>
            <p><strong>Expected Review Time:</strong> {context['review_timeline']}</p>
            <p>We will review your appeal and notify you of the decision. You can track the status of your appeal in your dashboard.</p>
            <p><a href="{context['appeals_url']}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">View Appeal Status</a></p>
            <p>Thank you,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject=f"Appeal Submitted - {appeal_type.title()} #{appeal_id}",
            html_content=html_content,
        )

    async def send_appeal_approved(
        self,
        user_id: int,
        appeal_type: str,
        appeal_id: int,
        reviewer_notes: str,
        emergency_waiver_used: bool = False,
    ) -> bool:
        """
        Send appeal approved notification.

        Notifies user their appeal was successful.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send appeal approved notice: user {user_id} not found")
            return False

        waiver_note = ""
        if emergency_waiver_used:
            waiver_note = "<p><em>Note: Your annual emergency waiver has been used for this appeal.</em></p>"

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Appeal Approved - ExtraShifty</h2>
            <p>Hi {user.full_name},</p>
            <p>Great news! Your appeal for the <strong>{appeal_type}</strong> has been <strong style="color: #4CAF50;">approved</strong>.</p>
            <p><strong>Appeal ID:</strong> {appeal_id}</p>
            <p><strong>Decision:</strong> Approved</p>
            <p><strong>Notes:</strong> {reviewer_notes}</p>
            {waiver_note}
            <p>The {appeal_type} has been removed from your record.</p>
            <p>Thank you for using ExtraShifty,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject=f"Appeal Approved - {appeal_type.title()} #{appeal_id}",
            html_content=html_content,
        )

    async def send_appeal_denied(
        self,
        user_id: int,
        appeal_type: str,
        appeal_id: int,
        reviewer_notes: str,
        frivolous_fee_charged: bool = False,
    ) -> bool:
        """
        Send appeal denied notification.

        Notifies user their appeal was rejected.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send appeal denied notice: user {user_id} not found")
            return False

        fee_note = ""
        if frivolous_fee_charged:
            fee_note = """
            <p style="color: #dc3545;"><strong>Note:</strong> A $25 frivolous appeal fee has been charged
            to your account as this appeal was determined to be without merit.</p>
            """

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Appeal Denied - ExtraShifty</h2>
            <p>Hi {user.full_name},</p>
            <p>We regret to inform you that your appeal for the <strong>{appeal_type}</strong> has been <strong style="color: #dc3545;">denied</strong>.</p>
            <p><strong>Appeal ID:</strong> {appeal_id}</p>
            <p><strong>Decision:</strong> Denied</p>
            <p><strong>Reason:</strong> {reviewer_notes}</p>
            {fee_note}
            <p>The {appeal_type} will remain on your record.</p>
            <p>If you have questions, please contact support.</p>
            <p>Thank you,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject=f"Appeal Denied - {appeal_type.title()} #{appeal_id}",
            html_content=html_content,
        )

    async def send_suspension_notice_with_appeal_rights(
        self,
        user_id: int,
        suspension_reason: str,
        suspension_ends_at: datetime,
        appeal_deadline: datetime,
    ) -> bool:
        """
        Send 30-day suspension notice with appeal rights information.

        Includes:
        - Suspension reason and duration
        - Appeal window (72 hours)
        - Reinstatement information
        - Probation warning
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send suspension notice: user {user_id} not found")
            return False

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Account Suspended - ExtraShifty</h2>
            <p>Hi {user.full_name},</p>
            <p>Your ExtraShifty account has been <strong>suspended for 30 days</strong> due to repeated policy violations.</p>

            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Reason:</strong> {suspension_reason}</p>
                <p><strong>Suspension Ends:</strong> {suspension_ends_at.strftime("%B %d, %Y at %H:%M UTC")}</p>
            </div>

            <h3>Your Appeal Rights</h3>
            <p>You have the right to appeal this suspension within <strong>72 hours</strong>.</p>
            <p><strong>Appeal Deadline:</strong> {appeal_deadline.strftime("%B %d, %Y at %H:%M UTC")}</p>

            <p><a href="{self.base_url}/dashboard/appeals/new?type=suspension" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Submit Appeal</a></p>

            <h3>Reinstatement</h3>
            <p>Your account will be automatically reinstated after 30 days if there are no new violations.</p>
            <p>Upon reinstatement:</p>
            <ul>
                <li>All strikes will be cleared</li>
                <li>You will be on a <strong>90-day probation period</strong></li>
                <li>Any no-show during probation will result in <strong>permanent ban</strong></li>
            </ul>

            <p>If you have questions, please contact support.</p>
            <p>Thank you,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject="IMPORTANT: Account Suspended - Appeal Within 72 Hours",
            html_content=html_content,
        )

    async def send_suspension_lifted(
        self,
        user_id: int,
        probation_ends_at: datetime,
    ) -> bool:
        """
        Send suspension lifted notification (via appeal approval).

        Includes probation warning.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send suspension lifted notice: user {user_id} not found")
            return False

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">Suspension Lifted - ExtraShifty</h2>
            <p>Hi {user.full_name},</p>
            <p>Your appeal has been approved and your account suspension has been <strong style="color: #4CAF50;">lifted</strong>.</p>

            <p>Your account is now active and you can resume using ExtraShifty.</p>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0;">Important: Probation Period</h4>
                <p>You are now on a <strong>90-day probation period</strong> until {probation_ends_at.strftime("%B %d, %Y")}.</p>
                <p style="color: #dc3545; margin-bottom: 0;"><strong>Warning:</strong> Any no-show during this period will result in a <strong>permanent ban</strong>.</p>
            </div>

            <p><a href="{self.base_url}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>

            <p>Thank you for your continued use of ExtraShifty,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject="Account Suspension Lifted - ExtraShifty",
            html_content=html_content,
        )

    # =========================================================================
    # GDPR-related email notifications
    # =========================================================================

    async def send_deletion_confirmation(
        self,
        user_id: int,
        deletion_request_id: int,
    ) -> bool:
        """
        Send account deletion confirmation with cancellation link.

        Includes 30-day grace period information.
        """
        user = self._get_user(user_id)
        if not user:
            logger.warning(f"Cannot send deletion confirmation: user {user_id} not found")
            return False

        cancel_url = (
            f"{self.base_url}/dashboard/settings/gdpr?cancel={deletion_request_id}"
        )

        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Account Deletion Requested - ExtraShifty</h2>
            <p>Hi {user.full_name},</p>
            <p>We've received your request to delete your ExtraShifty account.</p>

            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h4 style="margin-top: 0;">30-Day Grace Period</h4>
                <p>Your account will be permanently deleted after a <strong>30-day grace period</strong>. During this time:</p>
                <ul>
                    <li>Your account will remain accessible</li>
                    <li>You can cancel the deletion at any time</li>
                    <li>Any remaining wallet balance will be paid out before deletion</li>
                </ul>
            </div>

            <p>If you did not request this, or if you change your mind, you can cancel the deletion:</p>
            <p><a href="{cancel_url}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Cancel Deletion</a></p>

            <p>If you have questions, please contact support.</p>
            <p>Thank you,<br>The ExtraShifty Team</p>
        </body>
        </html>
        """

        return self._send_email(
            to_email=user.email,
            subject="Account Deletion Requested - ExtraShifty",
            html_content=html_content,
        )


# Singleton instance for use without database context
email_service = EmailService()
