"""create_user_device_locations_table

Revision ID: 028_user_device_locations
Revises: 027_hotspot_daily_forecasts
Create Date: 2026-10-27 14:05:00.000000

STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí
Bảng: user_device_locations
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "028_user_device_locations"
down_revision: Union[str, None] = "027_hotspot_daily_forecasts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "user_device_locations" not in existing_tables:
        op.create_table(
            "user_device_locations",
            sa.Column("location_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
            sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("address_text", sa.String(length=500), nullable=True),
            sa.Column("district", sa.String(length=100), nullable=True),
            sa.Column("ward", sa.String(length=100), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("last_ping_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_user_dev_loc_user", "user_device_locations", ["user_id"])
        op.create_index("idx_user_dev_loc_district", "user_device_locations", ["district"])
        op.create_index("idx_user_dev_loc_active", "user_device_locations", ["is_active"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "user_device_locations" in existing_tables:
        op.drop_table("user_device_locations")
