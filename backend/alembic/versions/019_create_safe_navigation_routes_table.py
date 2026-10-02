"""create_safe_navigation_routes_table

Revision ID: 019_safe_routes
Revises: 018_flood_community_reports
Create Date: 2026-09-21 14:18:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import geoalchemy2
from sqlalchemy.dialects import postgresql

revision: str = "019_safe_routes"
down_revision: Union[str, None] = "018_flood_community_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "safe_navigation_routes",
        sa.Column("route_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("origin_point", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("destination_point", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
        sa.Column("default_route_geom", geoalchemy2.types.Geometry(geometry_type="LINESTRING", srid=4326), nullable=True),
        sa.Column("default_distance_meters", sa.Numeric(precision=10, scale=1), server_default="0.0", nullable=False),
        sa.Column("default_duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column("default_route_hazard_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("recommended_safe_geom", geoalchemy2.types.Geometry(geometry_type="LINESTRING", srid=4326), nullable=True),
        sa.Column("recommended_distance_meters", sa.Numeric(precision=10, scale=1), server_default="0.0", nullable=False),
        sa.Column("recommended_duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column("safety_status", sa.String(length=20), server_default="CLEAR", nullable=False),
        sa.Column("avoided_hotspots_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("route_details_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("route_id"),
    )
    op.create_index("idx_nav_dest", "safe_navigation_routes", ["destination_point"], postgresql_using="gist")
    op.create_index("idx_nav_origin", "safe_navigation_routes", ["origin_point"], postgresql_using="gist")
    op.create_index(op.f("ix_safe_navigation_routes_user_id"), "safe_navigation_routes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_safe_navigation_routes_user_id"), table_name="safe_navigation_routes")
    op.drop_index("idx_nav_origin", table_name="safe_navigation_routes", postgresql_using="gist")
    op.drop_index("idx_nav_dest", table_name="safe_navigation_routes", postgresql_using="gist")
    op.drop_table("safe_navigation_routes")
