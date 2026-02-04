"""CRUD operations for User model."""

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User, UserType
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations for User."""

    def get_by_email(self, db: Session, *, email: str) -> User | None:
        """Get user by email."""
        statement = select(User).where(User.email == email)
        return db.exec(statement).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create a new user with hashed password."""
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            user_type=obj_in.user_type,
            is_active=True,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: User,
        obj_in: UserUpdate,
    ) -> User:
        """Update user, handling password separately."""
        update_data = obj_in.model_dump(exclude_unset=True)

        # Handle password update
        if "password" in update_data:
            hashed_password = get_password_hash(update_data.pop("password"))
            update_data["hashed_password"] = hashed_password

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, email: str, password: str) -> User | None:
        """Authenticate user by email and password."""
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        """Check if user is active."""
        return user.is_active

    def is_admin(self, user: User) -> bool:
        """Check if user is admin."""
        return user.user_type == UserType.ADMIN


user = CRUDUser(User)
