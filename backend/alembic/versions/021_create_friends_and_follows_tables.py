"""create_friends_and_follows_tables

Revision ID: 021_friends_domain
Revises: 020_profile_domain
Create Date: 2026-10-08 14:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "021_friends_domain"
down_revision: Union[str, None] = "020_profile_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Bảng Lời mời kết bạn (friend_requests)
    if "friend_requests" not in existing_tables:
        op.create_table(
            "friend_requests",
            sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("receiver_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("status", sa.String(length=20), server_default="PENDING", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["sender_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["receiver_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.CheckConstraint("sender_id != receiver_id", name="ck_friend_requests_not_self"),
        )
        op.create_index("idx_friend_requests_receiver_status", "friend_requests", ["receiver_id", "status", "deleted_at"])
        op.create_index("idx_friend_requests_sender_status", "friend_requests", ["sender_id", "status", "deleted_at"])

    # 2. Bảng Quan hệ Bạn bè (friendships)
    if "friendships" not in existing_tables:
        op.create_table(
            "friendships",
            sa.Column("friendship_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id_1", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id_2", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id_1"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id_2"], ["users.user_id"], ondelete="CASCADE"),
            sa.CheckConstraint("user_id_1 < user_id_2", name="ck_friendships_ordered_users"),
            sa.UniqueConstraint("user_id_1", "user_id_2", name="uq_friendships_user1_user2"),
        )
        op.create_index("idx_friendships_user_id_1", "friendships", ["user_id_1", "deleted_at"])
        op.create_index("idx_friendships_user_id_2", "friendships", ["user_id_2", "deleted_at"])

    # 3. Bảng Theo dõi một chiều (user_follows)
    if "user_follows" not in existing_tables:
        op.create_table(
            "user_follows",
            sa.Column("follow_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("follower_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("following_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["follower_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["following_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.CheckConstraint("follower_id != following_id", name="ck_user_follows_not_self"),
            sa.UniqueConstraint("follower_id", "following_id", name="uq_user_follows_pair"),
        )
        op.create_index("idx_user_follows_follower", "user_follows", ["follower_id", "deleted_at"])
        op.create_index("idx_user_follows_following", "user_follows", ["following_id", "deleted_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "user_follows" in existing_tables:
        op.drop_table("user_follows")
    if "friendships" in existing_tables:
        op.drop_table("friendships")
    if "friend_requests" in existing_tables:
        op.drop_table("friend_requests")
