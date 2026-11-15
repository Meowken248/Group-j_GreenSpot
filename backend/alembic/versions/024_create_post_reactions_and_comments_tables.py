"""create_post_reactions_and_comments_tables

Revision ID: 024_reactions_comments
Revises: 023_post_coords_tags
Create Date: 2026-10-14 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "024_reactions_comments"
down_revision: Union[str, Sequence[str], None] = "023_post_coords_tags"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. BẢNG COMMENTS (Feature STT 14)
    if "comments" not in existing_tables:
        op.create_table(
            "comments",
            sa.Column("comment_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("comments.comment_id", ondelete="CASCADE"), nullable=True, index=True),
            sa.Column("reply_to_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True),
            sa.Column("content", sa.String(500), nullable=False),
            sa.Column("replies_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        )

    # 2. BẢNG POST_SHARES (Feature STT 14 Màn 3)
    if "post_shares" not in existing_tables:
        op.create_table(
            "post_shares",
            sa.Column("share_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("share_type", sa.String(20), nullable=False),
            sa.Column("caption", sa.String(500), nullable=True),
            sa.Column("target_ids", sa.Text(), nullable=True),
            sa.Column("new_post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 3. BẢNG POST_REACTIONS (Feature STT 10)
    if "post_reactions" not in existing_tables:
        op.create_table(
            "post_reactions",
            sa.Column("reaction_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("post_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("reaction_type", sa.String(20), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.UniqueConstraint("post_id", "user_id", name="uq_post_user_reaction"),
        )


def downgrade() -> None:
    op.drop_table("post_reactions", if_exists=True)
    op.drop_table("post_shares", if_exists=True)
    op.drop_table("comments", if_exists=True)
