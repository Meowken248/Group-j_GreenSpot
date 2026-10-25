"""create_birthday_wishes_and_show_birthday

Feature STT 17: Banner Sinh nhật bạn bè hôm nay trên Bảng tin Geo-Feed
- Thêm cờ hiển thị ngày sinh (show_birthday) cho người dùng
- Tạo bảng lời chúc / thiệp xanh sinh nhật (birthday_wishes)

Revision ID: 027_birthday_wishes
Revises: 026_add_province_to_groups
Create Date: 2026-10-21 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "027_birthday_wishes"
down_revision: Union[str, Sequence[str], None] = "026_add_province_to_groups"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    user_columns = {col["name"] for col in inspector.get_columns("users")}

    # 1. Cờ "Hiển thị ngày sinh với bạn bè" (mặc định bật để không phá dữ liệu cũ)
    if "show_birthday" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "show_birthday",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
        )
        op.execute("COMMENT ON COLUMN users.show_birthday IS 'Cho phép bạn bè xem và chúc mừng sinh nhật';")

    # 2. Bảng lời chúc / thiệp xanh sinh nhật
    existing_tables = set(inspector.get_table_names())
    if "birthday_wishes" not in existing_tables:
        op.create_table(
            "birthday_wishes",
            sa.Column("wish_id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "sender_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "recipient_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.user_id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("wish_type", sa.String(20), nullable=False, server_default="MESSAGE"),
            sa.Column("card_template_id", sa.String(50), nullable=True),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("birthday_date", sa.Date(), nullable=False),
            sa.Column("points_awarded", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("sender_id <> recipient_id", name="ck_birthday_wishes_not_self"),
            sa.CheckConstraint("wish_type IN ('MESSAGE', 'CARD')", name="ck_birthday_wishes_type"),
            sa.CheckConstraint(
                "char_length(message) BETWEEN 1 AND 200",
                name="ck_birthday_wishes_message_length",
            ),
            sa.CheckConstraint("points_awarded >= 0", name="ck_birthday_wishes_points"),
        )

        op.create_index(
            "ix_birthday_wishes_sender_id", "birthday_wishes", ["sender_id"], unique=False
        )
        op.create_index(
            "ix_birthday_wishes_recipient_id", "birthday_wishes", ["recipient_id"], unique=False
        )
        op.create_index(
            "ix_birthday_wishes_birthday_date", "birthday_wishes", ["birthday_date"], unique=False
        )
        # Mỗi cặp bạn bè tối đa 1 lời chúc + 1 thiệp xanh / ngày sinh nhật (bỏ qua bản ghi đã xoá mềm)
        op.create_index(
            "uq_birthday_wishes_sender_recipient_day_type",
            "birthday_wishes",
            ["sender_id", "recipient_id", "birthday_date", "wish_type"],
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL"),
        )
        op.create_index(
            "idx_birthday_wishes_recipient_date",
            "birthday_wishes",
            ["recipient_id", "birthday_date"],
            unique=False,
        )
        op.create_index(
            "idx_birthday_wishes_sender_date",
            "birthday_wishes",
            ["sender_id", "birthday_date"],
            unique=False,
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "birthday_wishes" in set(inspector.get_table_names()):
        for index_name in (
            "idx_birthday_wishes_sender_date",
            "idx_birthday_wishes_recipient_date",
            "uq_birthday_wishes_sender_recipient_day_type",
            "ix_birthday_wishes_birthday_date",
            "ix_birthday_wishes_recipient_id",
            "ix_birthday_wishes_sender_id",
        ):
            op.drop_index(index_name, table_name="birthday_wishes")
        op.drop_table("birthday_wishes")

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "show_birthday" in user_columns:
        op.drop_column("users", "show_birthday")
