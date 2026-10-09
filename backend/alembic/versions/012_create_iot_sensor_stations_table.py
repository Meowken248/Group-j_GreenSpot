"""create_iot_sensor_stations_table

Revision ID: 012_iot_sensors
Revises: 011_incident_media
Create Date: 2026-09-21 14:11:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = "012_iot_sensors"
down_revision: Union[str, None] = "011_incident_media"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "iot_sensor_stations",
        sa.Column("station_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("station_code", sa.String(length=50), nullable=False),
        sa.Column("station_name", sa.String(length=150), nullable=False),
        sa.Column("station_type", sa.String(length=50), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("installation_date", sa.Date(), nullable=True),
        sa.Column("firmware_version", sa.String(length=50), server_default="v1.4.2", nullable=False),
        sa.Column("battery_powered", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("solar_powered", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("status", sa.String(length=30), server_default="ONLINE", nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["administrative_units.unit_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("station_id"),
        sa.UniqueConstraint("station_code"),
    )


def downgrade() -> None:
    op.drop_table("iot_sensor_stations")
