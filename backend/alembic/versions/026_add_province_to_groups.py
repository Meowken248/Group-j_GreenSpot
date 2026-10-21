"""Add province column to groups table

Revision ID: 026_add_province_to_groups
Revises: 025_community_groups
Create Date: 2026-10-19 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "026_add_province_to_groups"
down_revision: Union[str, None] = "025_community_groups"
branch_labels: Union[Sequence[str], None] = None
depends_on: Union[Sequence[str], None] = None


def upgrade() -> None:
    # 1. Thêm cột province vào bảng groups
    op.add_column(
        "groups",
        sa.Column("province", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_groups_province", "groups", ["province"], unique=False)

    # 2. Xóa index cũ idx_groups_district_ward và tạo index mới idx_groups_geo_scope
    op.drop_index("idx_groups_district_ward", table_name="groups")
    op.create_index(
        "idx_groups_geo_scope",
        "groups",
        ["province", "district", "ward"],
        unique=False,
    )

    # 3. Gán giá trị mặc định cho các nhóm đã tồn tại là 'Thành phố Hồ Chí Minh'
    op.execute(
        "UPDATE groups SET province = 'Thành phố Hồ Chí Minh' WHERE province IS NULL AND (district IS NOT NULL OR ward IS NOT NULL);"
    )


def downgrade() -> None:
    op.drop_index("idx_groups_geo_scope", table_name="groups")
    op.create_index(
        "idx_groups_district_ward",
        "groups",
        ["district", "ward"],
        unique=False,
    )
    op.drop_index("ix_groups_province", table_name="groups")
    op.drop_column("groups", "province")

