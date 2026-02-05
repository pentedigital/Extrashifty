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


# Singleton instance for use without database context
email_service = EmailService()
