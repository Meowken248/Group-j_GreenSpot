"""create_emergency_alert_recipients_table

Revision ID: 030_emergency_alert_recipients
Revises: 029_emergency_broadcast_alerts
Create Date: 2026-10-27 14:07:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí
Bảng: emergency_alert_recipients
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "030_emergency_alert_recipients"
down_revision: Union[str, None] = "029_emergency_broadcast_alerts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_alert_recipients" not in existing_tables:
        op.create_table(
            "emergency_alert_recipients",
            sa.Column("recipient_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_latitude", sa.Float(), nullable=False),
            sa.Column("user_longitude", sa.Float(), nullable=False),
            sa.Column("distance_meters", sa.Float(), nullable=False),
            sa.Column("status", sa.String(length=50), server_default="DELIVERED", nullable=False),
            sa.Column("action_taken", sa.String(length=50), server_default="NONE", nullable=False),
            sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("action_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_emerg_recip_alert", "emergency_alert_recipients", ["alert_id"])
        op.create_index("idx_emerg_recip_user", "emergency_alert_recipients", ["user_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_alert_recipients" in existing_tables:
        op.drop_table("emergency_alert_recipients")
