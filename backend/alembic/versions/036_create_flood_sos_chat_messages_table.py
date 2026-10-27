"""create_flood_sos_chat_messages_table

Revision ID: 036_flood_sos_chat_messages
Revises: 035_volunteer_profiles
Create Date: 2026-10-27 14:13:00.000000

STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Bảng: flood_sos_chat_messages
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "036_flood_sos_chat_messages"
down_revision: Union[str, None] = "035_volunteer_profiles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "flood_sos_chat_messages" not in existing_tables:
        op.create_table(
            "flood_sos_chat_messages",
            sa.Column("message_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("flood_sos_requests.request_id", ondelete="CASCADE"), nullable=False),
            sa.Column("sender_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("sender_type", sa.String(length=20), nullable=False),
            sa.Column("sender_name", sa.String(length=200), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_flood_chat_request", "flood_sos_chat_messages", ["request_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "flood_sos_chat_messages" in existing_tables:
        op.drop_table("flood_sos_chat_messages")
