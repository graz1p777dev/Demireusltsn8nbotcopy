"""Add is_test flag to leads (AI Laboratory test users)

Тестовый лид проходит весь пайплайн как настоящий: буфер, классификация,
ответ ИИ, карточка менеджеру. Отличается ровно одним — наружу, в amoCRM и
Google Sheets, от него ничего не уходит.

Revision ID: 0008_test_leads
Revises: 0007_blacklist
Create Date: 2026-07-10
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_test_leads"
down_revision = "0007_blacklist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leads",
        sa.Column("is_test", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    # Лаборатория выбирает тестовые лиды, пайплайн — проверяет флаг у одного.
    # Частичный индекс: тестовых лидов единицы, обычных тысячи.
    op.create_index(
        "ix_leads_is_test",
        "leads",
        ["is_test"],
        postgresql_where=sa.text("is_test"),
    )


def downgrade() -> None:
    op.drop_index("ix_leads_is_test", table_name="leads")
    op.drop_column("leads", "is_test")
