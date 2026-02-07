"""Add index on shifts.date for faster marketplace queries.

Revision ID: 004_shift_date_index
Revises: 003_profile_tables
Create Date: 2026-02-07
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "004_shift_date_index"
down_revision: str | None = "003_profile_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_shifts_date", "shifts", ["date"])


def downgrade() -> None:
    op.drop_index("ix_shifts_date", table_name="shifts")
