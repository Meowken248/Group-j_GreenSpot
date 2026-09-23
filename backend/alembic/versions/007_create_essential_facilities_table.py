"""create_essential_facilities_table

Revision ID: 007_essential_facilities
Revises: 006_admin_units
Create Date: 2026-09-21 14:06:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = "007_essential_facilities"
down_revision: Union[str, None] = "006_admin_units"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "essential_facilities",
        sa.Column("facility_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("facility_name", sa.String(length=200), nullable=False),
        sa.Column("facility_type", sa.String(length=50), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("capacity_people", sa.Integer(), nullable=True),
        sa.Column("vulnerability_level", sa.String(length=20), server_default="HIGH", nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["administrative_units.unit_id"]),
        sa.PrimaryKeyConstraint("facility_id"),
    )


def downgrade() -> None:
    op.drop_table("essential_facilities")
