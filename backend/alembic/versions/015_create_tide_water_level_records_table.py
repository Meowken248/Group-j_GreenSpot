"""create_tide_water_level_records_table

Revision ID: 015_tide_water_records
Revises: 014_tide_constituents
Create Date: 2026-09-21 14:14:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "015_tide_water_records"
down_revision: Union[str, None] = "014_tide_constituents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tide_water_level_records",
        sa.Column("record_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("station_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("water_level_meters", sa.Numeric(precision=5, scale=3), nullable=False),
        sa.Column("tide_state", sa.String(length=20), server_default="RISING", nullable=False),
        sa.Column("alert_level", sa.String(length=20), server_default="NORMAL", nullable=False),
        sa.Column("is_forecast", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("water_level_meters >= -3.0 AND water_level_meters <= 4.0", name="chk_valid_water_level"),
        sa.ForeignKeyConstraint(["station_id"], ["tide_stations.station_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("record_id"),
    )
    op.create_index("idx_tide_station_time", "tide_water_level_records", ["station_id", "timestamp"], unique=False)
    op.create_index(op.f("ix_tide_water_level_records_station_id"), "tide_water_level_records", ["station_id"], unique=False)
    op.create_index(op.f("ix_tide_water_level_records_timestamp"), "tide_water_level_records", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tide_water_level_records_timestamp"), table_name="tide_water_level_records")
    op.drop_index(op.f("ix_tide_water_level_records_station_id"), table_name="tide_water_level_records")
    op.drop_index("idx_tide_station_time", table_name="tide_water_level_records")
    op.drop_table("tide_water_level_records")
