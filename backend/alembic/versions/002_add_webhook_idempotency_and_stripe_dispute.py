"""Add ProcessedWebhookEvent table and stripe_dispute_id to disputes.

Revision ID: 002_webhook_stripe
Revises: 001_initial
Create Date: 2026-02-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_webhook_stripe"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create processed_webhook_events table for idempotency checking
    op.create_table(
        "processed_webhook_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "event_id",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=False,
        ),
        sa.Column(
            "event_type",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=False,
        ),
        sa.Column(
            "processed_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_processed_webhook_events_event_id",
        "processed_webhook_events",
        ["event_id"],
        unique=True,
    )
    op.create_index(
        "ix_processed_webhook_events_processed_at",
        "processed_webhook_events",
        ["processed_at"],
        unique=False,
    )

    # Add stripe_dispute_id column to disputes table
    op.add_column(
        "disputes",
        sa.Column(
            "stripe_dispute_id",
            sqlmodel.sql.sqltypes.AutoString(length=255),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_disputes_stripe_dispute_id",
        "disputes",
        ["stripe_dispute_id"],
        unique=False,
    )


def downgrade() -> None:
    # Remove stripe_dispute_id from disputes
    op.drop_index("ix_disputes_stripe_dispute_id", table_name="disputes")
    op.drop_column("disputes", "stripe_dispute_id")

    # Drop processed_webhook_events table
    op.drop_index(
        "ix_processed_webhook_events_processed_at",
        table_name="processed_webhook_events",
    )
    op.drop_index(
        "ix_processed_webhook_events_event_id",
        table_name="processed_webhook_events",
    )
    op.drop_table("processed_webhook_events")
