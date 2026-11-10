"""create_safety_check_deliveries_table

Revision ID: 033_safety_check_deliveries
Revises: 032_user_safety_checks
Create Date: 2026-10-27 14:10:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
Bảng: safety_check_deliveries
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "033_safety_check_deliveries"
down_revision: Union[str, None] = "032_user_safety_checks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "safety_check_deliveries" not in existing_tables:
        op.create_table(
            "safety_check_deliveries",
            sa.Column("delivery_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("check_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("user_safety_checks.check_id", ondelete="CASCADE"), nullable=False),
            sa.Column("friend_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
            sa.Column("delivery_channel", sa.String(length=50), server_default="PUSH_NOTIFICATION", nullable=False),
            sa.Column("status", sa.String(length=50), server_default="SENT", nullable=False),
            sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_safety_deliv_check", "safety_check_deliveries", ["check_id"])
        op.create_index("idx_safety_deliv_friend", "safety_check_deliveries", ["friend_user_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "safety_check_deliveries" in existing_tables:
        op.drop_table("safety_check_deliveries")
