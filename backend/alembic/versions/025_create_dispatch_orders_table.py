"""create_dispatch_orders_table

Revision ID: 025_dispatch_orders
Revises: 024_incident_duplicate_clusters
Create Date: 2026-10-27 14:02:00.000000

STT 43: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường
Bảng: dispatch_orders
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "025_dispatch_orders"
down_revision: Union[str, None] = "024_incident_duplicate_clusters"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "dispatch_orders" not in existing_tables:
        op.create_table(
            "dispatch_orders",
            sa.Column("order_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("order_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("incident_title", sa.String(length=255), nullable=False),
            sa.Column("incident_type", sa.String(length=100), server_default="DOMESTIC_WASTE", nullable=False),
            sa.Column("location_address", sa.String(length=500), nullable=False),
            sa.Column("district", sa.String(length=100), nullable=False),
            sa.Column("ward", sa.String(length=100), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("team_id", sa.String(length=100), nullable=False),
            sa.Column("team_name", sa.String(length=200), nullable=False),
            sa.Column("team_phone", sa.String(length=50), server_default="0912.345.678", nullable=False),
            sa.Column("team_distance_km", sa.Float(), server_default="1.8", nullable=False),
            sa.Column("team_latitude", sa.Float(), nullable=False),
            sa.Column("team_longitude", sa.Float(), nullable=False),
            sa.Column("status", sa.String(length=50), server_default="ASSIGNED", nullable=False),
            sa.Column("priority", sa.String(length=50), server_default="MEDIUM", nullable=False),
            sa.Column("deadline", sa.DateTime(timezone=True), nullable=False),
            sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancel_reason", sa.Text(), nullable=True),
            sa.Column("adjustment_notes", sa.Text(), nullable=True),
            sa.Column("before_image_url", sa.String(length=1000), nullable=True),
            sa.Column("after_image_url", sa.String(length=1000), nullable=True),
            sa.Column("is_gps_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("last_gps_update", sa.DateTime(timezone=True), nullable=True),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_dispatch_orders_code", "dispatch_orders", ["order_code"])
        op.create_index("idx_dispatch_orders_status", "dispatch_orders", ["status"])
        op.create_index("idx_dispatch_orders_district", "dispatch_orders", ["district"])
        op.create_index("idx_dispatch_orders_team", "dispatch_orders", ["team_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "dispatch_orders" in existing_tables:
        op.drop_table("dispatch_orders")
