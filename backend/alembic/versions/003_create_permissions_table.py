"""create_permissions_table

Revision ID: 003_permissions
Revises: 002_roles
Create Date: 2026-09-21 14:02:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_permissions"
down_revision: Union[str, None] = "002_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "permissions",
        sa.Column("permission_id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("permission_code", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("permission_id"),
        sa.UniqueConstraint("permission_code"),
    )


def downgrade() -> None:
    op.drop_table("permissions")
