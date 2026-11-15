"""create_exported_incident_files_table

Revision ID: 037_exported_incident_files
Revises: 036_flood_sos_chat_messages
Create Date: 2026-10-27 14:14:00.000000

STT 47: Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc
Bảng: exported_incident_files
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "037_exported_incident_files"
down_revision: Union[str, None] = "036_flood_sos_chat_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "exported_incident_files" not in existing_tables:
        op.create_table(
            "exported_incident_files",
            sa.Column("export_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("file_type", sa.String(length=10), nullable=False),
            sa.Column("mime_type", sa.String(length=100), nullable=False),
            sa.Column("file_size_bytes", sa.BigInteger(), server_default="0", nullable=False),
            sa.Column("file_size_formatted", sa.String(length=50), server_default="0 KB", nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("filters_applied", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("total_records", sa.Integer(), server_default="0", nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("is_downloaded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
            sa.Column("download_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )
        op.create_index("idx_exported_files_user", "exported_incident_files", ["user_id"])
        op.create_index("idx_exported_files_expires", "exported_incident_files", ["expires_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "exported_incident_files" in existing_tables:
        op.drop_table("exported_incident_files")
