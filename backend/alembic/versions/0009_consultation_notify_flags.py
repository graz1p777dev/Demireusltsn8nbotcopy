"""Add notify_30min_sent to consultation_reminders

Revision ID: 0009_consultation_notify_flags
Revises: 0008_test_leads
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_consultation_notify_flags"
down_revision = "0008_test_leads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultation_reminders",
        sa.Column("notify_30min_sent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("consultation_reminders", "notify_30min_sent")
