"""create_incident_triage_audit_tables

Revision ID: 022_triage_audit_domain
Revises: 021_friends_domain
Create Date: 2026-10-09 14:15:00.000000

Mô tả:
1. Tạo bảng incident_audit_logs:
   - Ghi nhận đầy đủ vết can thiệp của thuật toán AI và cán bộ thẩm định (Human-in-the-loop).
   - Tuân thủ Quy tắc 6 (Soft Delete với deleted_at) và Quy tắc 7 (Optimistic Locking với version).
2. Bổ sung các trường AI Triage & SLA vào bảng incidents.
3. Bổ sung các trường liên hệ, version, deleted_at vào bảng essential_facilities.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "022_triage_audit_domain"
down_revision: Union[str, Sequence[str], None] = ("021_friends_domain", "020_voice_assistant")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Bổ sung các cột mới vào bảng incidents (nếu chưa có)
    incidents_cols = [c["name"] for c in inspector.get_columns("incidents")]
    
    if "ai_summary" not in incidents_cols:
        op.add_column("incidents", sa.Column("ai_summary", sa.Text(), nullable=True))
    if "ai_triage_score" not in incidents_cols:
        op.add_column("incidents", sa.Column("ai_triage_score", sa.Numeric(precision=5, scale=2), nullable=True))
    if "ai_suggested_priority" not in incidents_cols:
        op.add_column("incidents", sa.Column("ai_suggested_priority", sa.String(length=30), nullable=True))
    if "ai_factors" not in incidents_cols:
        op.add_column("incidents", sa.Column("ai_factors", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    if "ai_generated_at" not in incidents_cols:
        op.add_column("incidents", sa.Column("ai_generated_at", sa.DateTime(timezone=True), nullable=True))
    if "priority_modified_by" not in incidents_cols:
        op.add_column("incidents", sa.Column("priority_modified_by", postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            "fk_incidents_priority_modified_by",
            "incidents",
            "users",
            ["priority_modified_by"],
            ["user_id"],
            ondelete="SET NULL",
        )
    if "priority_modified_reason" not in incidents_cols:
        op.add_column("incidents", sa.Column("priority_modified_reason", sa.String(length=255), nullable=True))
    if "priority_modified_at" not in incidents_cols:
        op.add_column("incidents", sa.Column("priority_modified_at", sa.DateTime(timezone=True), nullable=True))
    if "sla_response_deadline" not in incidents_cols:
        op.add_column("incidents", sa.Column("sla_response_deadline", sa.DateTime(timezone=True), nullable=True))

    # 2. Bổ sung các cột mới vào bảng essential_facilities (nếu chưa có)
    facilities_cols = [c["name"] for c in inspector.get_columns("essential_facilities")]

    if "contact_person" not in facilities_cols:
        op.add_column("essential_facilities", sa.Column("contact_person", sa.String(length=100), nullable=True))
    if "contact_email" not in facilities_cols:
        op.add_column("essential_facilities", sa.Column("contact_email", sa.String(length=100), nullable=True))
    if "version" not in facilities_cols:
        op.add_column("essential_facilities", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    if "deleted_at" not in facilities_cols:
        op.add_column("essential_facilities", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    # Cập nhật kiểu cột vulnerability_level thành VARCHAR(255)
    op.alter_column(
        "essential_facilities",
        "vulnerability_level",
        existing_type=sa.String(length=20),
        type_=sa.String(length=255),
        existing_nullable=True,
    )

    # 3. Tạo bảng mới incident_audit_logs (Tuân thủ Quy tắc 6 & 7)
    if "incident_audit_logs" not in existing_tables:
        op.create_table(
            "incident_audit_logs",
            sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("old_priority", sa.String(length=30), nullable=True),
            sa.Column("new_priority", sa.String(length=30), nullable=True),
            sa.Column("risk_score", sa.Integer(), nullable=True),
            sa.Column("reason", sa.String(length=255), nullable=True),
            sa.Column("performed_by", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            # Optimistic Locking (Quy tắc 7)
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            # Soft Delete (Quy tắc 6)
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            # Timestamps
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["incident_id"], ["incidents.incident_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["performed_by"], ["users.user_id"], ondelete="SET NULL"),
        )
        op.create_index("idx_incident_audit_logs_incident", "incident_audit_logs", ["incident_id", "deleted_at"])
        op.create_index("idx_incident_audit_logs_action", "incident_audit_logs", ["action", "deleted_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "incident_audit_logs" in existing_tables:
        op.drop_table("incident_audit_logs")

    # Xóa các cột đã thêm nếu cần rollback
    incidents_cols = [c["name"] for c in inspector.get_columns("incidents")]
    for col in [
        "sla_response_deadline", "priority_modified_at", "priority_modified_reason",
        "priority_modified_by", "ai_generated_at", "ai_factors", "ai_suggested_priority",
        "ai_triage_score", "ai_summary"
    ]:
        if col in incidents_cols:
            op.drop_column("incidents", col)

    facilities_cols = [c["name"] for c in inspector.get_columns("essential_facilities")]
    for col in ["deleted_at", "version", "contact_email", "contact_person"]:
        if col in facilities_cols:
            op.drop_column("essential_facilities", col)
