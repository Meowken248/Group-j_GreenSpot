"""create_incident_duplicate_clusters_table

Revision ID: 024_incident_duplicate_clusters
Revises: 48346281bb5a
Create Date: 2026-10-27 14:01:00.000000

STT 38: AI phát hiện và gom cụm báo cáo sự cố trùng lặp
Bảng: incident_duplicate_clusters
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "024_incident_duplicate_clusters"
down_revision: Union[str, None] = "48346281bb5a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "incident_duplicate_clusters" not in existing_tables:
        op.create_table(
            "incident_duplicate_clusters",
            sa.Column("cluster_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("cluster_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("cluster_name", sa.String(length=150), nullable=False),
            sa.Column("unit_id", sa.Integer(), sa.ForeignKey("administrative_units.unit_id", ondelete="SET NULL"), nullable=True),
            sa.Column("district_name", sa.String(length=100), nullable=True),
            sa.Column("incident_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False),
            sa.Column("incident_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False),
            sa.Column("report_count", sa.Integer(), server_default="2", nullable=False),
            sa.Column("similarity_rate", sa.Numeric(precision=5, scale=2), nullable=False),
            sa.Column("gps_distance_m", sa.Numeric(precision=8, scale=2), server_default="0.0", nullable=True),
            sa.Column("time_diff_hours", sa.Numeric(precision=8, scale=2), server_default="0.0", nullable=True),
            sa.Column("visual_similarity", sa.Numeric(precision=5, scale=2), server_default="0.0", nullable=True),
            sa.Column("ai_conclusion", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), server_default="PENDING_REVIEW", nullable=False),
            sa.Column("master_incident_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("incidents.incident_id", ondelete="SET NULL"), nullable=True),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_inc_dup_cluster_status", "incident_duplicate_clusters", ["status"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "incident_duplicate_clusters" in existing_tables:
        op.drop_table("incident_duplicate_clusters")
