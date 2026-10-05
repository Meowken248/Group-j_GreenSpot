"""create_flood_community_reports_table

Revision ID: 018_flood_community_reports
Revises: 017_flood_risk_assessments
Create Date: 2026-09-21 14:17:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = "018_flood_community_reports"
down_revision: Union[str, None] = "017_flood_risk_assessments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flood_community_reports",
        sa.Column("report_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hotspot_id", sa.Integer(), nullable=True),
        sa.Column("reporter_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("address_description", sa.String(length=255), nullable=False),
        sa.Column("actual_depth_cm", sa.Numeric(precision=5, scale=1), nullable=True),
        sa.Column("severity_level", sa.String(length=20), server_default="MINOR", nullable=False),
        sa.Column("can_motorbike_pass", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("can_car_pass", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("upvotes", sa.Integer(), server_default="1", nullable=False),
        sa.Column("downvotes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["hotspot_id"], ["flood_hotspots.hotspot_id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("report_id"),
    )
    op.create_index("idx_flood_report_loc", "flood_community_reports", ["location"], postgresql_using="gist")
    op.create_index(op.f("ix_flood_community_reports_hotspot_id"), "flood_community_reports", ["hotspot_id"], unique=False)
    op.create_index(op.f("ix_flood_community_reports_reporter_id"), "flood_community_reports", ["reporter_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_flood_community_reports_reporter_id"), table_name="flood_community_reports")
    op.drop_index(op.f("ix_flood_community_reports_hotspot_id"), table_name="flood_community_reports")
    op.drop_index("idx_flood_report_loc", table_name="flood_community_reports", postgresql_using="gist")
    op.drop_table("flood_community_reports")
