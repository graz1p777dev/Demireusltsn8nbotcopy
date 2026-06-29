"""Add blacklists table

Revision ID: 0007
Revises: 0006_age_field
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_blacklist"
down_revision = "0006_age_field"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "blacklists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(64), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone"),
    )
    op.create_index("ix_blacklists_phone", "blacklists", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_blacklists_phone", table_name="blacklists")
    op.drop_table("blacklists")
