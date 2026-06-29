"""Add age column to ai_extracted_fields

Revision ID: 0006
Revises: 0005_consultation_reminders
Create Date: 2026-06-29
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_age_field"
down_revision = "0005_consultation_reminders"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("ai_extracted_fields", sa.Column("age", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_extracted_fields", "age")
