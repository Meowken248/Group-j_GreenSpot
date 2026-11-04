"""create_community_groups_tables

Revision ID: 025_community_groups
Revises: 024_reactions_comments
Create Date: 2026-10-19 15:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "025_community_groups"
down_revision: Union[str, Sequence[str], None] = "024_reactions_comments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. BẢNG GROUPS (Feature STT 16: Tạo nhóm theo quận, phường hoặc chủ đề)
    if "groups" not in existing_tables:
        op.create_table(
            "groups",
            sa.Column("group_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(50), nullable=False, index=True),
            sa.Column("description", sa.String(300), nullable=True),
            sa.Column("cover_image_url", sa.String(500), nullable=True),
            sa.Column("avatar_url", sa.String(500), nullable=True),
            sa.Column("group_type", sa.String(20), nullable=False, server_default="DISTRICT", index=True),
            sa.Column("district", sa.String(100), nullable=True, index=True),
            sa.Column("ward", sa.String(100), nullable=True, index=True),
            sa.Column("theme_topic", sa.String(100), nullable=True, index=True),
            sa.Column("privacy", sa.String(20), nullable=False, server_default="PUBLIC"),
            sa.Column(
                "creator_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("members_count", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("posts_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE", index=True),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True, index=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        )
        op.create_index("idx_groups_active_type", "groups", ["status", "group_type", "deleted_at"])
        op.create_index("idx_groups_district_ward", "groups", ["district", "ward"])

    # 2. BẢNG GROUP_MEMBERS
    if "group_members" not in existing_tables:
        op.create_table(
            "group_members",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "group_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("groups.group_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("role", sa.String(20), nullable=False, server_default="MEMBER"),
            sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
            sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("group_id", "user_id", name="uq_group_user_member"),
        )

    # 3. BẢNG GROUP_INVITATIONS (Mời bạn bè ở Màn 3)
    if "group_invitations" not in existing_tables:
        op.create_table(
            "group_invitations",
            sa.Column("invitation_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "group_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("groups.group_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "inviter_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "invitee_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade() -> None:
    op.drop_table("group_invitations")
    op.drop_table("group_members")
    op.drop_table("groups")
