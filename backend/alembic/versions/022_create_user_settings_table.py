"""create_user_settings_table

Revision ID: 022_user_settings
Revises: 021_friends_domain
Create Date: 2026-10-09 14:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "022_user_settings"
down_revision: Union[str, Sequence[str], None] = ("021_friends_domain", "020_voice_assistant")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_settings" not in existing_tables:
        op.create_table(
            "user_settings",
            sa.Column("setting_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                unique=True,
                nullable=False,
                index=True,
            ),
            sa.Column("theme", sa.String(length=10), server_default="LIGHT", nullable=False),
            sa.Column("language", sa.String(length=10), server_default="VI", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.CheckConstraint("theme IN ('LIGHT', 'DARK')", name="check_user_settings_theme"),
            sa.CheckConstraint("language IN ('VI', 'EN')", name="check_user_settings_language"),
        )


def downgrade() -> None:
    op.drop_table("user_settings")
