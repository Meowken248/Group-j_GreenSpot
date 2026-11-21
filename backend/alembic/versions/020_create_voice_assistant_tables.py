"""create_voice_assistant_tables

Revision ID: 020_voice_assistant
Revises: 019_safe_routes
Create Date: 2026-10-02 15:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "020_voice_assistant"
down_revision: Union[str, None] = "019_safe_routes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Bảng voice_sample_commands
    if "voice_sample_commands" not in existing_tables:
        op.create_table(
            "voice_sample_commands",
            sa.Column("command_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("command_text", sa.String(length=255), nullable=False),
            sa.Column("intent_code", sa.String(length=50), nullable=False),
            sa.Column("action_type", sa.String(length=20), nullable=False, server_default="LOOKUP"),
            sa.Column("action_target", sa.String(length=100), nullable=True),
            sa.Column("default_response", sa.Text(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("command_id"),
            sa.UniqueConstraint("command_text"),
        )
        op.create_index(op.f("ix_voice_sample_commands_category"), "voice_sample_commands", ["category"], unique=False)
        op.create_index(op.f("ix_voice_sample_commands_intent_code"), "voice_sample_commands", ["intent_code"], unique=False)
        op.create_index("idx_voice_sample_active_order", "voice_sample_commands", ["is_active", "display_order"], unique=False)

    # 2. Bảng voice_interaction_logs
    if "voice_interaction_logs" not in existing_tables:
        op.create_table(
            "voice_interaction_logs",
            sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("raw_transcript", sa.Text(), nullable=False),
            sa.Column("normalized_text", sa.Text(), nullable=False),
            sa.Column("detected_intent", sa.String(length=50), nullable=True),
            sa.Column("confidence_score", sa.Float(), nullable=False, server_default="1.0"),
            sa.Column("action_type", sa.String(length=20), nullable=True),
            sa.Column("response_text", sa.Text(), nullable=False),
            sa.Column("is_success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("session_source", sa.String(length=20), nullable=False, server_default="VOICE"),
            sa.Column("processing_time_ms", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("log_id"),
        )
        op.create_index(op.f("ix_voice_interaction_logs_user_id"), "voice_interaction_logs", ["user_id"], unique=False)
        op.create_index(op.f("ix_voice_interaction_logs_detected_intent"), "voice_interaction_logs", ["detected_intent"], unique=False)
        op.create_index(op.f("ix_voice_interaction_logs_created_at"), "voice_interaction_logs", ["created_at"], unique=False)
        op.create_index("idx_voice_log_created_at", "voice_interaction_logs", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_voice_log_created_at", table_name="voice_interaction_logs")
    op.drop_index(op.f("ix_voice_interaction_logs_created_at"), table_name="voice_interaction_logs")
    op.drop_index(op.f("ix_voice_interaction_logs_detected_intent"), table_name="voice_interaction_logs")
    op.drop_index(op.f("ix_voice_interaction_logs_user_id"), table_name="voice_interaction_logs")
    op.drop_table("voice_interaction_logs")

    op.drop_index("idx_voice_sample_active_order", table_name="voice_sample_commands")
    op.drop_index(op.f("ix_voice_sample_commands_intent_code"), table_name="voice_sample_commands")
    op.drop_index(op.f("ix_voice_sample_commands_category"), table_name="voice_sample_commands")
    op.drop_table("voice_sample_commands")
