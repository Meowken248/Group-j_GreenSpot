"""create_recycling_facilities_table

Revision ID: 008_recycling_facilities
Revises: 007_essential_facilities
Create Date: 2026-09-21 14:07:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision: str = "008_recycling_facilities"
down_revision: Union[str, None] = "007_essential_facilities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recycling_facilities",
        sa.Column("facility_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("facility_code", sa.String(length=50), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("accepted_waste_types", sa.ARRAY(sa.Text()), nullable=False),
        sa.Column("operating_hours", sa.String(length=100), nullable=True),
        sa.Column("contact_phone", sa.String(length=20), nullable=True),
        sa.Column("managing_org", sa.String(length=150), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["administrative_units.unit_id"]),
        sa.PrimaryKeyConstraint("facility_id"),
        sa.UniqueConstraint("facility_code"),
    )


def downgrade() -> None:
    op.drop_table("recycling_facilities")
