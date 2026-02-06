"""Add StaffProfile, CompanyProfile, ClockRecord, and Venue tables.

Revision ID: 003_profile_tables
Revises: 002_webhook_stripe
Create Date: 2026-02-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_profile_tables"
down_revision: str | None = "002_webhook_stripe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create staff_profiles table
    op.create_table(
        "staff_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "avatar_url",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "phone",
            sqlmodel.sql.sqltypes.AutoString(length=50),
            nullable=True,
        ),
        sa.Column(
            "bio",
            sqlmodel.sql.sqltypes.AutoString(length=2000),
            nullable=True,
        ),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("hourly_rate", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "address",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "city",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_staff_profiles_user_id",
        "staff_profiles",
        ["user_id"],
        unique=True,
    )

    # Create company_profiles table
    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "business_type",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column(
            "logo_url",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "description",
            sqlmodel.sql.sqltypes.AutoString(length=2000),
            nullable=True,
        ),
        sa.Column(
            "address",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "city",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column(
            "phone",
            sqlmodel.sql.sqltypes.AutoString(length=50),
            nullable=True,
        ),
        sa.Column(
            "website",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_company_profiles_user_id",
        "company_profiles",
        ["user_id"],
        unique=True,
    )

    # Create clock_records table
    op.create_table(
        "clock_records",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("shift_id", sa.Integer(), nullable=False),
        sa.Column("staff_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "clock_in",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("clock_out", sa.DateTime(), nullable=True),
        sa.Column(
            "clock_in_notes",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column(
            "clock_out_notes",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=True,
        ),
        sa.Column("hours_worked", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column(
            "status",
            sqlmodel.sql.sqltypes.AutoString(length=50),
            nullable=False,
            server_default="clocked_in",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["shift_id"], ["shifts.id"]),
        sa.ForeignKeyConstraint(["staff_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_clock_records_shift_id",
        "clock_records",
        ["shift_id"],
        unique=False,
    )
    op.create_index(
        "ix_clock_records_staff_user_id",
        "clock_records",
        ["staff_user_id"],
        unique=False,
    )

    # Create venues table
    op.create_table(
        "venues",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column(
            "name",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=False,
        ),
        sa.Column(
            "address",
            sqlmodel.sql.sqltypes.AutoString(length=500),
            nullable=False,
        ),
        sa.Column(
            "city",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=False,
        ),
        sa.Column("is_primary", sa.Boolean(), nullable=False, default=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["company_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_venues_company_id",
        "venues",
        ["company_id"],
        unique=False,
    )


def downgrade() -> None:
    # Drop venues table
    op.drop_index("ix_venues_company_id", table_name="venues")
    op.drop_table("venues")

    # Drop clock_records table
    op.drop_index("ix_clock_records_staff_user_id", table_name="clock_records")
    op.drop_index("ix_clock_records_shift_id", table_name="clock_records")
    op.drop_table("clock_records")

    # Drop company_profiles table
    op.drop_index("ix_company_profiles_user_id", table_name="company_profiles")
    op.drop_table("company_profiles")

    # Drop staff_profiles table
    op.drop_index("ix_staff_profiles_user_id", table_name="staff_profiles")
    op.drop_table("staff_profiles")
