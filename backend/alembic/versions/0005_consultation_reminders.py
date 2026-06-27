"""Add consultation_reminders table

Revision ID: 0005
Revises: 0004_translations
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_consultation_reminders"
down_revision = "0004_translations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consultation_reminders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sheet_name", sa.String(128), nullable=False),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("consultation_date", sa.String(16), nullable=False),
        sa.Column("consultation_time", sa.String(8), nullable=False),
        sa.Column("client_name", sa.String(255), nullable=True),
        sa.Column("client_phone", sa.String(64), nullable=True),
        sa.Column("lead_id_amo", sa.String(128), nullable=True),
        sa.Column("telegram_message_ids", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_consultation_reminders_status", "consultation_reminders", ["status"])


def downgrade() -> None:
    op.drop_index("ix_consultation_reminders_status", "consultation_reminders")
    op.drop_table("consultation_reminders")
