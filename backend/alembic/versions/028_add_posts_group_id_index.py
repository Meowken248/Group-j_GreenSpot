"""add_posts_group_id_index

Revision ID: 028_posts_group_id_index
Revises: 027_birthday_wishes
Create Date: 2026-10-21 14:50:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "028_posts_group_id_index"
down_revision: Union[str, Sequence[str], None] = "027_birthday_wishes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indices = [idx["name"] for idx in inspector.get_indexes("posts")]
    if "idx_posts_group_id" not in existing_indices:
        op.create_index("idx_posts_group_id", "posts", ["group_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indices = [idx["name"] for idx in inspector.get_indexes("posts")]
    if "idx_posts_group_id" in existing_indices:
        op.drop_index("idx_posts_group_id", table_name="posts")

