"""create_hotspot_daily_forecasts_table

Revision ID: 027_hotspot_daily_forecasts
Revises: 026_hotspot_clusters
Create Date: 2026-10-27 14:04:00.000000

STT 44: Phân tích điểm nóng + dự báo 7 ngày
Bảng: hotspot_daily_forecasts
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "027_hotspot_daily_forecasts"
down_revision: Union[str, None] = "026_hotspot_clusters"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "hotspot_daily_forecasts" not in existing_tables:
        op.create_table(
            "hotspot_daily_forecasts",
            sa.Column("forecast_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("target_type", sa.String(length=20), nullable=False),
            sa.Column("target_id", sa.String(length=100), nullable=False),
            sa.Column("target_name", sa.String(length=255), nullable=False),
            sa.Column("forecast_date", sa.DateTime(timezone=False), nullable=False),
            sa.Column("day_offset", sa.Integer(), nullable=False),
            sa.Column("predicted_incidents", sa.Float(), nullable=False),
            sa.Column("ci_lower_95", sa.Float(), nullable=False),
            sa.Column("ci_upper_95", sa.Float(), nullable=False),
            sa.Column("rainfall_mm", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("tidal_peak_m", sa.Float(), server_default="0.0", nullable=False),
            sa.Column("risk_level", sa.String(length=20), server_default="NORMAL", nullable=False),
            sa.Column("risk_reason", sa.Text(), nullable=True),
            sa.Column("model_accuracy_pct", sa.Float(), server_default="87.5", nullable=False),
            sa.Column("is_weather_synced", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_hotspot_forecast_target", "hotspot_daily_forecasts", ["target_id"])
        op.create_index("idx_hotspot_forecast_date", "hotspot_daily_forecasts", ["forecast_date"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "hotspot_daily_forecasts" in existing_tables:
        op.drop_table("hotspot_daily_forecasts")
