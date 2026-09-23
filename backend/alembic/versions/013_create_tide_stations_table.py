"""create_tide_stations_table

Revision ID: 013_tide_stations
Revises: 012_iot_sensors
Create Date: 2026-09-21 14:12:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision: str = "013_tide_stations"
down_revision: Union[str, None] = "012_iot_sensors"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tide_stations",
        sa.Column("station_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("station_code", sa.String(length=30), nullable=False, comment="Mã trạm (VD: PHU_AN, NHA_BE)"),
        sa.Column("station_name", sa.String(length=150), nullable=False, comment="Tên trạm thủy văn"),
        sa.Column("river_system", sa.String(length=100), server_default="Sông Sài Gòn", nullable=False),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("datum_offset_meters", sa.Numeric(precision=5, scale=3), server_default="0.000", nullable=False),
        sa.Column("mean_sea_level_meters", sa.Numeric(precision=5, scale=3), server_default="0.000", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("station_id"),
        sa.UniqueConstraint("station_code"),
    )
    op.create_index(op.f("ix_tide_stations_station_code"), "tide_stations", ["station_code"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_tide_stations_station_code"), table_name="tide_stations")
    op.drop_table("tide_stations")
