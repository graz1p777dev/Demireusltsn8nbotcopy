"""Add ai_reasoning to approval_requests

Revision ID: 0010_approval_ai_reasoning
Revises: 0009_consultation_notify_flags
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_approval_ai_reasoning"
down_revision = "0009_consultation_notify_flags"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "approval_requests",
        sa.Column("ai_reasoning", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("approval_requests", "ai_reasoning")
