"""create_incident_media_table

Revision ID: 011_incident_media
Revises: 010_incidents
Create Date: 2026-09-21 14:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "011_incident_media"
down_revision: Union[str, None] = "010_incidents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incident_media",
        sa.Column("media_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("media_type", sa.String(length=20), nullable=False),
        sa.Column("phase", sa.String(length=20), server_default="BEFORE", nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("thumbnail_url", sa.String(length=500), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("uploader_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.incident_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploader_id"], ["users.user_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("media_id"),
    )


def downgrade() -> None:
    op.drop_table("incident_media")
