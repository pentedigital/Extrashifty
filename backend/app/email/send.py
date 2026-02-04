"""Email sending functionality using the emails library."""

import logging
from pathlib import Path
from typing import Any

import emails
from jinja2 import Environment, FileSystemLoader

from app.core.config import settings

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent / "templates"

# Jinja2 environment for templates
env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))


def send_email(
    email_to: str,
    subject: str,
    template_name: str,
    context: dict[str, Any] | None = None,
) -> bool:
    """
    Send an email using a Jinja2 template.

    Args:
        email_to: Recipient email address
        subject: Email subject line
        template_name: Name of the template file (without .html)
        context: Variables to pass to the template

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST not configured, skipping email send")
        return False

    context = context or {}
    context.update(
        {
            "project_name": settings.PROJECT_NAME,
            "email": email_to,
        }
    )

    # Load and render the template
    template = env.get_template(f"{template_name}.html")
    html_content = template.render(**context)

    # Create the email message
    from_name = settings.EMAILS_FROM_NAME or settings.PROJECT_NAME
    from_email = settings.EMAILS_FROM_EMAIL or "noreply@extrashifty.com"

    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(from_name, from_email),
    )

    # SMTP options
    smtp_options: dict[str, Any] = {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
    }

    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    if settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD

    try:
        response = message.send(to=email_to, smtp=smtp_options)
        if response.status_code not in (250, 251):
            logger.error(
                f"Email send failed: {response.status_code} - {response.status_text}"
            )
            return False
        logger.info(f"Email sent successfully to {email_to}")
        return True
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return False


def send_welcome_email(email_to: str, full_name: str) -> bool:
    """Send welcome email to new user."""
    return send_email(
        email_to=email_to,
        subject=f"Welcome to {settings.PROJECT_NAME}!",
        template_name="welcome",
        context={"full_name": full_name},
    )


def send_password_reset_email(
    email_to: str, reset_token: str, full_name: str
) -> bool:
    """Send password reset email."""
    reset_link = f"https://extrashifty.com/reset-password?token={reset_token}"
    return send_email(
        email_to=email_to,
        subject=f"Password Reset - {settings.PROJECT_NAME}",
        template_name="password_reset",
        context={
            "full_name": full_name,
            "reset_link": reset_link,
            "valid_hours": 24,
        },
    )


def send_shift_application_email(
    email_to: str,
    company_name: str,
    applicant_name: str,
    shift_title: str,
    shift_date: str,
) -> bool:
    """Send email to company when someone applies to their shift."""
    return send_email(
        email_to=email_to,
        subject=f"New Application for {shift_title}",
        template_name="shift_application",
        context={
            "company_name": company_name,
            "applicant_name": applicant_name,
            "shift_title": shift_title,
            "shift_date": shift_date,
        },
    )


def send_shift_assigned_email(
    email_to: str,
    applicant_name: str,
    shift_title: str,
    shift_date: str,
    shift_time: str,
    location: str,
) -> bool:
    """Send email to applicant when they are assigned to a shift."""
    return send_email(
        email_to=email_to,
        subject=f"You've been assigned to: {shift_title}",
        template_name="shift_assigned",
        context={
            "applicant_name": applicant_name,
            "shift_title": shift_title,
            "shift_date": shift_date,
            "shift_time": shift_time,
            "location": location,
        },
    )
