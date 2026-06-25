"""add conversation_summary to approval_requests

Revision ID: 0003_approval_summary
Revises: 0002_crm_users
Create Date: 2026-06-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_approval_summary"
down_revision: str | None = "0002_crm_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("approval_requests", sa.Column("conversation_summary", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("approval_requests", "conversation_summary")
