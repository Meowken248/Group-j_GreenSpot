"""create_hotspot_clusters_table

Revision ID: 026_hotspot_clusters
Revises: 025_dispatch_orders
Create Date: 2026-10-27 14:03:00.000000

STT 44: Phân tích điểm nóng + dự báo 7 ngày
Bảng: hotspot_clusters
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "026_hotspot_clusters"
down_revision: Union[str, None] = "025_dispatch_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "hotspot_clusters" not in existing_tables:
        op.create_table(
            "hotspot_clusters",
            sa.Column("hotspot_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("hotspot_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("incident_type", sa.String(length=50), nullable=False),
            sa.Column("district", sa.String(length=100), nullable=False),
            sa.Column("ward", sa.String(length=100), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("radius_meters", sa.Float(), server_default="250.0", nullable=False),
            sa.Column("kde_density_score", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("incident_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("severity_level", sa.String(length=20), server_default="MEDIUM", nullable=False),
            sa.Column("trend_description", sa.String(length=255), nullable=False),
            sa.Column("forecast_48h", sa.Text(), nullable=False),
            sa.Column("active_dispatch_order_id", sa.String(length=100), nullable=True),
            sa.Column("active_dispatch_order_code", sa.String(length=50), nullable=True),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_hotspot_clusters_code", "hotspot_clusters", ["hotspot_code"])
        op.create_index("idx_hotspot_clusters_district", "hotspot_clusters", ["district"])
        op.create_index("idx_hotspot_clusters_type", "hotspot_clusters", ["incident_type"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "hotspot_clusters" in existing_tables:
        op.drop_table("hotspot_clusters")
