"""create_flood_sos_requests_table

Revision ID: 034_flood_sos_requests
Revises: 033_safety_check_deliveries
Create Date: 2026-10-27 14:11:00.000000

STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Bảng: flood_sos_requests
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "034_flood_sos_requests"
down_revision: Union[str, None] = "033_safety_check_deliveries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "flood_sos_requests" not in existing_tables:
        op.create_table(
            "flood_sos_requests",
            sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("sos_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("victim_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("victim_name", sa.String(length=200), nullable=False),
            sa.Column("victim_phone", sa.String(length=50), nullable=False),
            sa.Column("total_victims", sa.Integer(), nullable=False),
            sa.Column("elderly_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("children_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("medical_urgent_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("address_text", sa.String(length=500), nullable=False),
            sa.Column("district", sa.String(length=100), nullable=True),
            sa.Column("ward", sa.String(length=100), nullable=True),
            sa.Column("severity_level", sa.String(length=50), server_default="CRITICAL", nullable=False),
            sa.Column("flood_depth_meters", sa.Float(), server_default="1.0", nullable=True),
            sa.Column("status", sa.String(length=50), server_default="PENDING", nullable=False),
            sa.Column("assigned_volunteer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("assigned_team_name", sa.String(length=200), nullable=True),
            sa.Column("assigned_vehicle_type", sa.String(length=100), nullable=True),
            sa.Column("assigned_rescuer_name", sa.String(length=200), nullable=True),
            sa.Column("assigned_rescuer_phone", sa.String(length=50), nullable=True),
            sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("rescuer_latitude", sa.Float(), nullable=True),
            sa.Column("rescuer_longitude", sa.Float(), nullable=True),
            sa.Column("rescuer_distance_meters", sa.Float(), nullable=True),
            sa.Column("rescuer_eta_minutes", sa.Integer(), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=True),
            sa.Column("feedback_notes", sa.Text(), nullable=True),
            sa.Column("cancel_reason", sa.String(length=255), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_flood_sos_code", "flood_sos_requests", ["sos_code"])
        op.create_index("idx_flood_sos_status", "flood_sos_requests", ["status"])
        op.create_index("idx_flood_sos_victim", "flood_sos_requests", ["victim_id"])
        op.create_index("idx_flood_sos_volunteer", "flood_sos_requests", ["assigned_volunteer_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "flood_sos_requests" in existing_tables:
        op.drop_table("flood_sos_requests")
