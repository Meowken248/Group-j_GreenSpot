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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    cols = {c["name"] for c in inspector.get_columns("offline_submissions")}
    indexes = {i["name"] for i in inspector.get_indexes("offline_submissions")}
    constraints = {c["name"] for c in inspector.get_unique_constraints("offline_submissions")}

    # 1. Bổ sung cột payload_hash để kiểm soát tính toàn vẹn idempotency
    if "payload_hash" not in cols:
        op.add_column(
            'offline_submissions',
            sa.Column('payload_hash', sa.String(64), nullable=True)
        )
    if "ix_offline_submissions_payload_hash" not in indexes:
        op.create_index(
            'ix_offline_submissions_payload_hash',
            'offline_submissions',
            ['payload_hash']
        )

    # 2. Tạo ràng buộc duy nhất (user_id, idempotency_key) chống gửi lặp giữa các tài khoản
    if "uq_offline_user_idempotency" not in constraints:
        try:
            op.create_unique_constraint(
                'uq_offline_user_idempotency',
                'offline_submissions',
                ['user_id', 'idempotency_key']
            )
        except Exception:
            pass


def downgrade() -> None:
    op.drop_constraint('uq_offline_user_idempotency', 'offline_submissions', type_='unique')
    op.drop_index('ix_offline_submissions_payload_hash', table_name='offline_submissions')
    op.drop_column('offline_submissions', 'payload_hash')
