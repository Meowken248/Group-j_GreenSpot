"""create_waste_categories_table

Revision ID: 009_waste_categories
Revises: 008_recycling_facilities
Create Date: 2026-09-21 14:08:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_waste_categories"
down_revision: Union[str, None] = "008_recycling_facilities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "waste_categories",
        sa.Column("category_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_severity", sa.String(length=20), server_default="MEDIUM", nullable=False),
        sa.Column("sla_hours", sa.Integer(), server_default="48", nullable=False),
        sa.Column("color_hex", sa.String(length=10), server_default="#22C55E", nullable=False),
        sa.Column("icon_name", sa.String(length=50), server_default="trash-2", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("category_id"),
        sa.UniqueConstraint("category_code"),
    )


def downgrade() -> None:
    op.drop_table("waste_categories")
