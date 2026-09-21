"""create_flood_hotspots_table

Revision ID: 016_flood_hotspots
Revises: 015_tide_water_records
Create Date: 2026-09-21 14:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision: str = "016_flood_hotspots"
down_revision: Union[str, None] = "015_tide_water_records"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flood_hotspots",
        sa.Column("hotspot_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("hotspot_code", sa.String(length=50), nullable=False),
        sa.Column("street_name", sa.String(length=200), nullable=False, comment="Tên tuyến đường"),
        sa.Column("ward_name", sa.String(length=100), nullable=True),
        sa.Column("district_name", sa.String(length=100), nullable=True),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("road_corridor", geoalchemy2.types.Geometry(geometry_type="LINESTRING", srid=4326), nullable=True),
        sa.Column("elevation_meters", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("primary_cause", sa.String(length=20), server_default="COMBINED", nullable=False),
        sa.Column("threshold_tide_meters", sa.Numeric(precision=4, scale=2), server_default="1.50", nullable=False),
        sa.Column("threshold_rain_mm_per_hour", sa.Numeric(precision=5, scale=2), server_default="25.0", nullable=False),
        sa.Column("historical_max_depth_cm", sa.Numeric(precision=5, scale=1), server_default="30.0", nullable=True),
        sa.Column("drainage_system_rating", sa.Integer(), server_default="3", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("drainage_system_rating BETWEEN 1 AND 5", name="chk_drainage_rating_range"),
        sa.PrimaryKeyConstraint("hotspot_id"),
        sa.UniqueConstraint("hotspot_code"),
    )
    op.create_index(op.f("ix_flood_hotspots_district_name"), "flood_hotspots", ["district_name"], unique=False)
    op.create_index(op.f("ix_flood_hotspots_hotspot_code"), "flood_hotspots", ["hotspot_code"], unique=True)
    op.create_index(op.f("ix_flood_hotspots_street_name"), "flood_hotspots", ["street_name"], unique=False)
    op.create_index("idx_flood_hotspot_loc", "flood_hotspots", ["location"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_index("idx_flood_hotspot_loc", table_name="flood_hotspots", postgresql_using="gist")
    op.drop_index(op.f("ix_flood_hotspots_street_name"), table_name="flood_hotspots")
    op.drop_index(op.f("ix_flood_hotspots_hotspot_code"), table_name="flood_hotspots")
    op.drop_index(op.f("ix_flood_hotspots_district_name"), table_name="flood_hotspots")
    op.drop_table("flood_hotspots")
