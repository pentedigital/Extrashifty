"""Database session and engine configuration using SQLModel."""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

# Create the database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.

    Yields a SQLModel Session that automatically closes after use.
    Use with FastAPI's Depends() for dependency injection.

    Yields:
        SQLModel Session instance.
    """
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """
    Initialize the database.

    This function should be called on application startup to create
    all tables defined in SQLModel models. In production, use Alembic
    migrations instead.
    """
    # Import all models here to ensure they are registered with SQLModel
    # from app.models import User, Shift, etc.
    from sqlmodel import SQLModel

    SQLModel.metadata.create_all(engine)
