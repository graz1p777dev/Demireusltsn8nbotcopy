"""Add reject_reason to approval_requests

Revision ID: 0012_reject_reason
Revises: 0011_copilot
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0012_reject_reason"
down_revision = "0011_copilot"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("approval_requests", sa.Column("reject_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("approval_requests", "reject_reason")
