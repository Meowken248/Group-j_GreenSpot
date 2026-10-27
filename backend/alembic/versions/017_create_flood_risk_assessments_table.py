"""create_flood_risk_assessments_table

Revision ID: 017_flood_risk_assessments
Revises: 016_flood_hotspots
Create Date: 2026-09-21 14:16:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "017_flood_risk_assessments"
down_revision: Union[str, None] = "016_flood_hotspots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flood_risk_assessments",
        sa.Column("assessment_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("hotspot_id", sa.Integer(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_rainfall_mmh", sa.Numeric(precision=5, scale=2), server_default="0.0", nullable=False),
        sa.Column("tide_water_level_m", sa.Numeric(precision=5, scale=3), server_default="1.0", nullable=False),
        sa.Column("calculated_risk_score", sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column("predicted_depth_cm", sa.Numeric(precision=5, scale=1), server_default="0.0", nullable=False),
        sa.Column("severity_level", sa.String(length=20), server_default="SAFE", nullable=False),
        sa.Column("is_impassable_for_bikes", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_impassable_for_cars", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("advisory_notice", sa.String(length=255), nullable=True),
        sa.CheckConstraint("calculated_risk_score >= 0.00 AND calculated_risk_score <= 10.00", name="chk_risk_score_bounds"),
        sa.ForeignKeyConstraint(["hotspot_id"], ["flood_hotspots.hotspot_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("assessment_id"),
    )
    op.create_index("idx_flood_assessment_time", "flood_risk_assessments", ["hotspot_id", "evaluated_at"], unique=False)
    op.create_index(op.f("ix_flood_risk_assessments_evaluated_at"), "flood_risk_assessments", ["evaluated_at"], unique=False)
    op.create_index(op.f("ix_flood_risk_assessments_hotspot_id"), "flood_risk_assessments", ["hotspot_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_flood_risk_assessments_hotspot_id"), table_name="flood_risk_assessments")
    op.drop_index(op.f("ix_flood_risk_assessments_evaluated_at"), table_name="flood_risk_assessments")
    op.drop_index("idx_flood_assessment_time", table_name="flood_risk_assessments")
    op.drop_table("flood_risk_assessments")
