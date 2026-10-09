"""add_profile_columns_to_users_and_ensure_profile_tables

Revision ID: 020_profile_domain
Revises: 019_safe_routes
Create Date: 2026-10-06 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "020_profile_domain"
down_revision: Union[str, None] = "019_safe_routes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Bổ sung các cột thông tin Profile & Concurrency & Soft Delete cho bảng users
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_user_cols = [c["name"] for c in inspector.get_columns("users")]

    if "cover_image_url" not in existing_user_cols:
        op.add_column("users", sa.Column("cover_image_url", sa.String(length=500), nullable=True))
    if "bio" not in existing_user_cols:
        op.add_column("users", sa.Column("bio", sa.String(length=200), nullable=True))
    if "date_of_birth" not in existing_user_cols:
        op.add_column("users", sa.Column("date_of_birth", sa.Date(), nullable=True))
    if "activated_at" not in existing_user_cols:
        op.add_column("users", sa.Column("activated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    if "total_green_points" not in existing_user_cols:
        op.add_column("users", sa.Column("total_green_points", sa.Integer(), server_default="0", nullable=False))
    if "friends_count" not in existing_user_cols:
        op.add_column("users", sa.Column("friends_count", sa.Integer(), server_default="0", nullable=False))
    if "version" not in existing_user_cols:
        op.add_column("users", sa.Column("version", sa.Integer(), server_default="1", nullable=False))
    if "deleted_at" not in existing_user_cols:
        op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    existing_tables = inspector.get_table_names()

    # 2. Bảng cấp bậc Công dân Xanh (Citizen Levels)
    if "citizen_levels" not in existing_tables:
        op.create_table(
            "citizen_levels",
            sa.Column("level_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("level_name", sa.String(length=100), unique=True, nullable=False),
            sa.Column("min_points", sa.Integer(), unique=True, nullable=False),
            sa.Column("badge_icon_url", sa.String(length=500), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="1", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 3. Bảng Huy hiệu vinh danh (Badges)
    if "badges" not in existing_tables:
        op.create_table(
            "badges",
            sa.Column("badge_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("badge_code", sa.String(length=50), unique=True, nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("icon_url", sa.String(length=500), nullable=False),
            sa.Column("unlock_condition", sa.String(length=255), nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="1", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        )

    # 4. Bảng liên kết Huy hiệu người dùng (User Badges)
    if "user_badges" not in existing_tables:
        op.create_table(
            "user_badges",
            sa.Column("user_badge_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("badge_id", sa.Integer(), nullable=False),
            sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["badge_id"], ["badges.badge_id"], ondelete="CASCADE"),
            sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badges_user_badge"),
        )
        op.create_index("idx_user_badges_user_id", "user_badges", ["user_id"])

    # 5. Bảng Nhật ký hoạt động đóng góp (User Activities)
    if "user_activities" not in existing_tables:
        op.create_table(
            "user_activities",
            sa.Column("activity_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("activity_type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("points", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        )
        op.create_index("idx_user_activities_user_id", "user_activities", ["user_id"])
        op.create_index("idx_user_activities_created_at", "user_activities", ["created_at"])

    # 6. Bảng Bài viết Timeline (Posts)
    if "posts" not in existing_tables:
        op.create_table(
            "posts",
            sa.Column("post_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("media_urls", sa.Text(), nullable=True),
            sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("visibility", sa.String(length=20), server_default="PUBLIC", nullable=False),
            sa.Column("is_hidden", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("reactions_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("comments_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        )
        op.create_index("idx_posts_user_id", "posts", ["user_id"])
        op.create_index("idx_posts_created_at", "posts", ["created_at"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_user_cols = [c["name"] for c in inspector.get_columns("users")]

    if "deleted_at" in existing_user_cols:
        op.drop_column("users", "deleted_at")
    if "version" in existing_user_cols:
        op.drop_column("users", "version")
    if "friends_count" in existing_user_cols:
        op.drop_column("users", "friends_count")
    if "total_green_points" in existing_user_cols:
        op.drop_column("users", "total_green_points")
    if "activated_at" in existing_user_cols:
        op.drop_column("users", "activated_at")
    if "date_of_birth" in existing_user_cols:
        op.drop_column("users", "date_of_birth")
    if "bio" in existing_user_cols:
        op.drop_column("users", "bio")
    if "cover_image_url" in existing_user_cols:
        op.drop_column("users", "cover_image_url")
