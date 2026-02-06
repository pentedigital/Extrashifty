"""Initialize first superuser and other initial data."""

import logging

from sqlmodel import Session

from app.core.config import settings
from app.core.db import engine
from app.core.security import get_password_hash
from app.crud import user as user_crud
from app.models.user import User, UserType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_superuser() -> None:
    """Create first superuser if it doesn't exist."""
    with Session(engine) as session:
        existing = user_crud.get_by_email(session, email=settings.FIRST_SUPERUSER_EMAIL)
        if existing:
            logger.info(f"Superuser already exists: {settings.FIRST_SUPERUSER_EMAIL}")
            return

        superuser = User(
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
            full_name="Admin",
            user_type=UserType.ADMIN,
            is_active=True,
            is_verified=True,
            is_superuser=True,
        )
        session.add(superuser)
        session.commit()
        logger.info(f"Created superuser: {settings.FIRST_SUPERUSER_EMAIL}")


def main() -> None:
    """Run all initialization tasks."""
    logger.info("Creating initial data...")
    init_superuser()
    logger.info("Initial data created!")


if __name__ == "__main__":
    main()
