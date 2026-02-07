"""Application configuration using pydantic-settings."""

import logging
from typing import Annotated, Any, Self

from pydantic import BeforeValidator, computed_field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def parse_cors(v: Any) -> list[str] | str:
    """Parse CORS origins from string or list."""
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    # Project
    PROJECT_NAME: str = "ExtraShifty"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Sentry
    SENTRY_DSN: str | None = None

    # Security
    SECRET_KEY: str = "changeme-in-production-use-openssl-rand-hex-32"
    REFRESH_SECRET_KEY: str = "changeme-refresh-secret-key-different-from-access"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 minutes for access token
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days for refresh token
    ALGORITHM: str = "HS256"

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "extrashifty"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL from components."""
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[list[str] | str, BeforeValidator(parse_cors)] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://extrashifty.com",
        "https://www.extrashifty.com",
    ]

    # Email (optional, for future use)
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: str | None = None
    EMAILS_FROM_NAME: str | None = None

    # First superuser
    FIRST_SUPERUSER_EMAIL: str = "admin@extrashifty.com"
    FIRST_SUPERUSER_PASSWORD: str = "changeme"

    # Storage
    DATA_EXPORT_DIR: str | None = None

    # Rate Limiting
    RATE_LIMIT_REDIS_URL: str | None = None

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PLATFORM_ACCOUNT_ID: str = ""

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        """
        Enforce that default secrets are not used in production/staging.
        Logs warnings in development, raises ValueError in production/staging.
        """
        default_secrets = []

        if "changeme" in self.SECRET_KEY.lower():
            default_secrets.append("SECRET_KEY")

        if "changeme" in self.REFRESH_SECRET_KEY.lower():
            default_secrets.append("REFRESH_SECRET_KEY")

        if "changeme" in self.FIRST_SUPERUSER_PASSWORD.lower():
            default_secrets.append("FIRST_SUPERUSER_PASSWORD")

        if self.POSTGRES_PASSWORD == "postgres":
            default_secrets.append("POSTGRES_PASSWORD")

        if not default_secrets:
            return self

        secret_list = ", ".join(default_secrets)

        if self.ENVIRONMENT in ("production", "staging"):
            raise ValueError(
                f"Default secrets detected in {self.ENVIRONMENT} environment! "
                f"The following settings MUST be changed: {secret_list}. "
                "Generate secure values using: openssl rand -hex 32"
            )

        logger.warning(
            "=" * 60 + "\n"
            "SECURITY WARNING: Default secrets detected!\n"
            "The following settings contain default values and MUST be updated:\n"
            f"  - {secret_list}\n"
            "These default values are NOT secure for production use.\n"
            "Generate secure secrets using: openssl rand -hex 32\n"
            + "=" * 60
        )

        return self


settings = Settings()
