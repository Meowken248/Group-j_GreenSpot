"""create_user_safety_checks_table

Revision ID: 032_user_safety_checks
Revises: 031_emergency_sos_signals
Create Date: 2026-10-27 14:09:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
Bảng: user_safety_checks
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "032_user_safety_checks"
down_revision: Union[str, None] = "031_emergency_sos_signals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "user_safety_checks" not in existing_tables:
        op.create_table(
            "user_safety_checks",
            sa.Column("check_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="SET NULL"), nullable=True),
            sa.Column("is_safe", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("status_message", sa.String(length=255), server_default="Đã an toàn", nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("location_address", sa.String(length=500), nullable=False),
            sa.Column("shared_with_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("sms_fallback_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_safety_check_user", "user_safety_checks", ["user_id"])
        op.create_index("idx_safety_check_alert", "user_safety_checks", ["alert_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "user_safety_checks" in existing_tables:
        op.drop_table("user_safety_checks")
