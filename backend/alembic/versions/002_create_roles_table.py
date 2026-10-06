"""create_roles_table

Revision ID: 002_roles
Revises: 001_extensions
Create Date: 2026-09-21 14:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_roles"
down_revision: Union[str, None] = "001_extensions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("role_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("role_code", sa.String(length=50), nullable=False),
        sa.Column("role_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("role_id"),
        sa.UniqueConstraint("role_code"),
    )


def downgrade() -> None:
    op.drop_table("roles")
