"""Add AI Copilot tables (conversations, messages, pending actions) and expenses

Revision ID: 0011_copilot
Revises: 0010_approval_ai_reasoning
Create Date: 2026-07-18
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0011_copilot"
down_revision = "0010_approval_ai_reasoning"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "copilot_conversations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(64), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default="Новый чат"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_copilot_conversations_username", "copilot_conversations", ["username"])

    op.create_table(
        "copilot_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("buttons", postgresql.JSONB(), nullable=True),
        sa.Column("quick_actions", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["copilot_conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_copilot_messages_conversation_id", "copilot_messages", ["conversation_id"])

    op.create_table(
        "copilot_pending_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("tool_name", sa.String(128), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["copilot_conversations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_copilot_pending_actions_conversation_id", "copilot_pending_actions", ["conversation_id"])
    op.create_index("ix_copilot_pending_actions_status", "copilot_pending_actions", ["status"])

    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="KGS"),
        sa.Column("category", sa.String(128), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("created_by", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])


def downgrade() -> None:
    op.drop_index("ix_expenses_expense_date", table_name="expenses")
    op.drop_table("expenses")
    op.drop_index("ix_copilot_pending_actions_status", table_name="copilot_pending_actions")
    op.drop_index("ix_copilot_pending_actions_conversation_id", table_name="copilot_pending_actions")
    op.drop_table("copilot_pending_actions")
    op.drop_index("ix_copilot_messages_conversation_id", table_name="copilot_messages")
    op.drop_table("copilot_messages")
    op.drop_index("ix_copilot_conversations_username", table_name="copilot_conversations")
    op.drop_table("copilot_conversations")
