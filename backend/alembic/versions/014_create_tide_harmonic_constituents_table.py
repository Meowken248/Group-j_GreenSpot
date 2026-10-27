"""create_tide_harmonic_constituents_table

Revision ID: 014_tide_constituents
Revises: 013_tide_stations
Create Date: 2026-09-21 14:13:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "014_tide_constituents"
down_revision: Union[str, None] = "013_tide_stations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tide_harmonic_constituents",
        sa.Column("constituent_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("station_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=10), nullable=False, comment="Ký hiệu sóng (M2, S2, K1, O1...)"),
        sa.Column("angular_speed_deg_per_hour", sa.Numeric(precision=10, scale=6), nullable=False),
        sa.Column("amplitude_meters", sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column("phase_lag_degrees", sa.Numeric(precision=7, scale=3), nullable=False),
        sa.ForeignKeyConstraint(["station_id"], ["tide_stations.station_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("constituent_id"),
    )
    op.create_index("uq_station_constituent", "tide_harmonic_constituents", ["station_id", "name"], unique=True)
    op.create_index(op.f("ix_tide_harmonic_constituents_station_id"), "tide_harmonic_constituents", ["station_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tide_harmonic_constituents_station_id"), table_name="tide_harmonic_constituents")
    op.drop_index("uq_station_constituent", table_name="tide_harmonic_constituents")
    op.drop_table("tide_harmonic_constituents")
