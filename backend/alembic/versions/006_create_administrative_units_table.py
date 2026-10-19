"""create_administrative_units_table

Revision ID: 006_admin_units
Revises: 005_users
Create Date: 2026-09-21 14:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision: str = "006_admin_units"
down_revision: Union[str, None] = "005_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "administrative_units",
        sa.Column("unit_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("unit_code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("level", sa.String(length=20), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("boundary", geoalchemy2.types.Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True),
        sa.Column("centroid", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("area_km2", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("population", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["administrative_units.unit_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("unit_id"),
        sa.UniqueConstraint("unit_code"),
    )


def downgrade() -> None:
    op.drop_table("administrative_units")
