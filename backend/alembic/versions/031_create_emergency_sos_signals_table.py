"""create_emergency_sos_signals_table

Revision ID: 031_emergency_sos_signals
Revises: 030_emergency_alert_recipients
Create Date: 2026-10-27 14:08:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí
Bảng: emergency_sos_signals
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "031_emergency_sos_signals"
down_revision: Union[str, None] = "030_emergency_alert_recipients"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_sos_signals" not in existing_tables:
        op.create_table(
            "emergency_sos_signals",
            sa.Column("sos_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("emergency_broadcast_alerts.alert_id", ondelete="SET NULL"), nullable=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("location_address", sa.String(length=500), nullable=False),
            sa.Column("phone_number", sa.String(length=50), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="PENDING", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_emerg_sos_user", "emergency_sos_signals", ["user_id"])
        op.create_index("idx_emerg_sos_status", "emergency_sos_signals", ["status"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_sos_signals" in existing_tables:
        op.drop_table("emergency_sos_signals")
