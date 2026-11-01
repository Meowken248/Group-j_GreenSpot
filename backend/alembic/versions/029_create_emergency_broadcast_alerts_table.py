"""create_emergency_broadcast_alerts_table

Revision ID: 029_emergency_broadcast_alerts
Revises: 028_user_device_locations
Create Date: 2026-10-27 14:06:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí
Bảng: emergency_broadcast_alerts
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "029_emergency_broadcast_alerts"
down_revision: Union[str, None] = "028_user_device_locations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_broadcast_alerts" not in existing_tables:
        op.create_table(
            "emergency_broadcast_alerts",
            sa.Column("alert_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("alert_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("alert_type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("center_location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
            sa.Column("center_latitude", sa.Float(), nullable=False),
            sa.Column("center_longitude", sa.Float(), nullable=False),
            sa.Column("radius_meters", sa.Float(), nullable=False),
            sa.Column("severity_level", sa.String(length=50), server_default="CRITICAL", nullable=False),
            sa.Column("estimated_recipients", sa.Integer(), server_default="0", nullable=False),
            sa.Column("actual_sent_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("status", sa.String(length=50), server_default="BROADCASTED", nullable=False),
            sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("broadcasted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_emerg_alert_code", "emergency_broadcast_alerts", ["alert_code"])
        op.create_index("idx_emerg_alert_status", "emergency_broadcast_alerts", ["status"])
        op.create_index("idx_emerg_alert_type", "emergency_broadcast_alerts", ["alert_type"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "emergency_broadcast_alerts" in existing_tables:
        op.drop_table("emergency_broadcast_alerts")
