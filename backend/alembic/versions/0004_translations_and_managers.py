"""Add translation fields and expand telegram_message_id

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("approval_requests", sa.Column("client_message_translation", sa.Text(), nullable=True))
    op.add_column("approval_requests", sa.Column("ai_reply_translation", sa.Text(), nullable=True))
    op.alter_column("approval_requests", "telegram_message_id", type_=sa.String(512), existing_nullable=True)


def downgrade() -> None:
    op.drop_column("approval_requests", "client_message_translation")
    op.drop_column("approval_requests", "ai_reply_translation")
    op.alter_column("approval_requests", "telegram_message_id", type_=sa.String(128), existing_nullable=True)
