"""create_volunteer_profiles_table

Revision ID: 035_volunteer_profiles
Revises: 034_flood_sos_requests
Create Date: 2026-10-27 14:12:00.000000

STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Bảng: volunteer_profiles
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

revision: str = "035_volunteer_profiles"
down_revision: Union[str, None] = "034_flood_sos_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "volunteer_profiles" not in existing_tables:
        op.create_table(
            "volunteer_profiles",
            sa.Column("volunteer_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False),
            sa.Column("full_name", sa.String(length=200), nullable=False),
            sa.Column("team_name", sa.String(length=200), server_default="Đội Phản ứng nhanh cơ sở", nullable=False),
            sa.Column("vehicle_type", sa.String(length=100), server_default="Xuồng máy cứu nạn", nullable=False),
            sa.Column("phone_number", sa.String(length=50), nullable=False),
            sa.Column("is_available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("location", geoalchemy2.types.Geometry(geometry_type="POINT", srid=4326), nullable=False),
            sa.Column("current_latitude", sa.Float(), nullable=False),
            sa.Column("current_longitude", sa.Float(), nullable=False),
            sa.Column("last_ping_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("completed_missions_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("rating_average", sa.Float(), server_default="5.0", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_vol_prof_user", "volunteer_profiles", ["user_id"])
        op.create_index("idx_vol_prof_avail", "volunteer_profiles", ["is_available"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "volunteer_profiles" in existing_tables:
        op.drop_table("volunteer_profiles")
