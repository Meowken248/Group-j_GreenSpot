"""add_sla_warning_hours_and_soft_delete_to_waste_categories_and_ensure_audit_logs

Revision ID: 021_sla_warning_audit_logs
Revises: 020_profile_domain
Create Date: 2026-10-11 11:10:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "021_sla_warning_audit_logs"
down_revision: Union[str, None] = "020_profile_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1. Bổ sung các cột vào bảng waste_categories
    existing_waste_cols = [c["name"] for c in inspector.get_columns("waste_categories")]
    if "sla_warning_hours" not in existing_waste_cols:
        op.add_column("waste_categories", sa.Column("sla_warning_hours", sa.Integer(), nullable=False, server_default="4"))
    if "is_deleted" not in existing_waste_cols:
        op.add_column("waste_categories", sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"))
    if "deleted_at" not in existing_waste_cols:
        op.add_column("waste_categories", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # 2. Tạo bảng audit_logs nếu chưa có
    tables = inspector.get_table_names()
    if "audit_logs" not in tables:
        op.create_table(
            "audit_logs",
            sa.Column("log_id", sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("user_email", sa.String(length=255), nullable=True),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("table_name", sa.String(length=50), nullable=False, server_default="waste_categories"),
            sa.Column("record_id", sa.String(length=50), nullable=False),
            sa.Column("old_values", postgresql.JSONB(), nullable=True),
            sa.Column("new_values", postgresql.JSONB(), nullable=True),
            sa.Column("ip_address", sa.String(length=50), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("idx_audit_logs_table_record", "audit_logs", ["table_name", "record_id"])
        op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if "audit_logs" in tables:
        op.drop_table("audit_logs")

    existing_waste_cols = [c["name"] for c in inspector.get_columns("waste_categories")]
    if "deleted_at" in existing_waste_cols:
        op.drop_column("waste_categories", "deleted_at")
    if "is_deleted" in existing_waste_cols:
        op.drop_column("waste_categories", "is_deleted")
    if "sla_warning_hours" in existing_waste_cols:
        op.drop_column("waste_categories", "sla_warning_hours")
