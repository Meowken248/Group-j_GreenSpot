"""create_incidents_table

Revision ID: 010_incidents
Revises: 009_waste_categories
Create Date: 2026-09-21 14:09:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = "010_incidents"
down_revision: Union[str, None] = "009_waste_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incidents",
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tracking_code", sa.String(length=30), nullable=False),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("address_text", sa.String(length=500), nullable=False),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("latitude", sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column("longitude", sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column("severity", sa.String(length=20), server_default="MEDIUM", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="PENDING", nullable=False),
        sa.Column("risk_score", sa.Numeric(precision=5, scale=2), server_default="0.00", nullable=False),
        sa.Column("estimated_volume_m3", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("reporter_phone_masked", sa.String(length=20), nullable=True),
        sa.Column("upvotes_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["waste_categories.category_id"]),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["unit_id"], ["administrative_units.unit_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("incident_id"),
        sa.UniqueConstraint("tracking_code"),
    )


def downgrade() -> None:
    op.drop_table("incidents")
