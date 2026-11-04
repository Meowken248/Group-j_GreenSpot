"""add payload_hash and unique constraint to offline_submissions

Revision ID: 039_offline_payload_hash_constraints
Revises: 038_offline_sync_tables
Create Date: 2026-11-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '039_offline_payload_hash_constraints'
down_revision: Union[str, None] = '038_offline_sync_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Bổ sung cột payload_hash để kiểm soát tính toàn vẹn idempotency
    op.add_column(
        'offline_submissions',
        sa.Column('payload_hash', sa.String(64), nullable=True)
    )
    op.create_index(
        'ix_offline_submissions_payload_hash',
        'offline_submissions',
        ['payload_hash']
    )

    # 2. Tạo ràng buộc duy nhất (user_id, idempotency_key) chống gửi lặp giữa các tài khoản
    op.create_unique_constraint(
        'uq_offline_user_idempotency',
        'offline_submissions',
        ['user_id', 'idempotency_key']
    )


def downgrade() -> None:
    op.drop_constraint('uq_offline_user_idempotency', 'offline_submissions', type_='unique')
    op.drop_index('ix_offline_submissions_payload_hash', table_name='offline_submissions')
    op.drop_column('offline_submissions', 'payload_hash')
