"""CRUD operations for User model."""

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User, UserType
from app.schemas.user import UserCreate, UserUpdate

# Pre-computed Argon2 hash used to prevent timing attacks in authentication.
# When a login attempt targets a non-existent email, we still run the password
# hash comparison against this dummy value so the response time is identical
# to a real-user lookup, preventing email-enumeration via timing side-channels.
DUMMY_HASH = get_password_hash("__extrashifty_dummy_timing_safe__")


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
        """Authenticate user by email and password.

        Always runs a password hash comparison to prevent timing-based
        email enumeration attacks. If the user's hash is outdated (bcrypt),
        it is transparently upgraded to Argon2.
        """
        user = self.get_by_email(db, email=email)
        hashed_password = user.hashed_password if user else DUMMY_HASH
        valid, updated_hash = verify_password(password, hashed_password)
        if not valid:
            return None
        if not user:
            return None
        # Transparently upgrade legacy bcrypt hashes to Argon2
        if updated_hash:
            user.hashed_password = updated_hash
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    def is_active(self, user: User) -> bool:
        """Check if user is active."""
        return user.is_active

    def is_admin(self, user: User) -> bool:
        """Check if user is admin."""
        return user.user_type == UserType.ADMIN


user = CRUDUser(User)
