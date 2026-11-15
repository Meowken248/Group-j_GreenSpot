"""add version and index to group_members

Revision ID: 040_group_members_version
Revises: 039_offline_payload_hash_constraints
Create Date: 2026-11-06 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '040_group_members_version'
down_revision: Union[str, None] = '039_offline_payload_hash_constraints'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("group_members")}
    indexes = {i["name"] for i in inspector.get_indexes("group_members")}

    # 1. Bổ sung trường version cho bảng group_members để kiểm soát xung đột vai trò (Optimistic Locking)
    if "version" not in cols:
        op.add_column(
            'group_members',
            sa.Column('version', sa.Integer(), nullable=False, server_default='1')
        )
    # 2. Tạo index tối ưu hóa truy vấn lọc vai trò và trạng thái
    if "ix_group_members_group_role_status" not in indexes:
        op.create_index(
            'ix_group_members_group_role_status',
            'group_members',
            ['group_id', 'role', 'status']
        )


def downgrade() -> None:
    op.drop_index('ix_group_members_group_role_status', table_name='group_members')
    op.drop_column('group_members', 'version')
