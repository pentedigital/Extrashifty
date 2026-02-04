"""Initial database schema with users, shifts, and applications tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("hashed_password", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("full_name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column(
            "user_type",
            sa.Enum("staff", "company", "agency", "admin", name="usertype"),
            nullable=False,
            server_default="staff",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # Create shifts table
    op.create_table(
        "shifts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("shift_type", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("hourly_rate", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("location", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("city", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("spots_total", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("spots_filled", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column(
            "status",
            sa.Enum("draft", "open", "filled", "in_progress", "completed", "cancelled", name="shiftstatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("requirements", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["company_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shifts_company_id"), "shifts", ["company_id"], unique=False)
    op.create_index(op.f("ix_shifts_date"), "shifts", ["date"], unique=False)
    op.create_index(op.f("ix_shifts_status"), "shifts", ["status"], unique=False)

    # Create applications table
    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("shift_id", sa.Integer(), nullable=False),
        sa.Column("applicant_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "accepted", "rejected", "withdrawn", name="applicationstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("cover_message", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["applicant_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shift_id"], ["shifts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_applications_shift_id"), "applications", ["shift_id"], unique=False)
    op.create_index(op.f("ix_applications_applicant_id"), "applications", ["applicant_id"], unique=False)
    # Unique constraint: one application per user per shift
    op.create_unique_constraint(
        "uq_applications_shift_applicant",
        "applications",
        ["shift_id", "applicant_id"],
    )


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table("applications")
    op.drop_table("shifts")
    op.drop_table("users")

    # Drop enum types
    sa.Enum(name="applicationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="shiftstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="usertype").drop(op.get_bind(), checkfirst=True)
