"""add_post_coordinates_and_tags

Revision ID: 023_post_coords_tags
Revises: 022_user_settings
Create Date: 2026-10-11 11:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "023_post_coords_tags"
down_revision: Union[str, Sequence[str], None] = "022_user_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. ALTER TABLE posts: Thêm toạ độ, địa chỉ, version (Optimistic Locking)
    if "posts" in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("posts")]
        if "latitude" not in existing_cols:
            op.add_column("posts", sa.Column("latitude", sa.Float(), nullable=True))
        if "longitude" not in existing_cols:
            op.add_column("posts", sa.Column("longitude", sa.Float(), nullable=True))
        if "address" not in existing_cols:
            op.add_column("posts", sa.Column("address", sa.String(length=500), nullable=True))
        if "version" not in existing_cols:
            op.add_column("posts", sa.Column("version", sa.Integer(), server_default="1", nullable=False))

        # Index cho việc tìm kiếm toạ độ theo bán kính (hỗ trợ STT 8 Geo-Feed)
        existing_indexes = [idx["name"] for idx in inspector.get_indexes("posts")]
        if "idx_posts_lat_lng" not in existing_indexes:
            op.create_index("idx_posts_lat_lng", "posts", ["latitude", "longitude"])

    # 2. CREATE TABLE post_tagged_friends: Bảng lưu danh sách bạn bè được gắn thẻ trong bài viết
    if "post_tagged_friends" not in existing_tables:
        op.create_table(
            "post_tagged_friends",
            sa.Column("tag_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("friend_user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["post_id"], ["posts.post_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["friend_user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.UniqueConstraint("post_id", "friend_user_id", name="uq_post_tagged_friend"),
        )
        op.create_index("idx_tagged_friends_post_id", "post_tagged_friends", ["post_id"])
        op.create_index("idx_tagged_friends_friend_id", "post_tagged_friends", ["friend_user_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if "post_tagged_friends" in existing_tables:
        op.drop_table("post_tagged_friends")

    if "posts" in existing_tables:
        existing_cols = [c["name"] for c in inspector.get_columns("posts")]
        if "idx_posts_lat_lng" in [idx["name"] for idx in inspector.get_indexes("posts")]:
            op.drop_index("idx_posts_lat_lng", table_name="posts")
        if "version" in existing_cols:
            op.drop_column("posts", "version")
        if "address" in existing_cols:
            op.drop_column("posts", "address")
        if "longitude" in existing_cols:
            op.drop_column("posts", "longitude")
        if "latitude" in existing_cols:
            op.drop_column("posts", "latitude")
