"""merge birthday/posts head voi triage head

Revision ID: ad23e2d738c1
Revises: 028_posts_group_id_index, 48346281bb5a
Create Date: 2026-10-21 14:18:55.725535

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = 'ad23e2d738c1'
down_revision: Union[str, None] = ('028_posts_group_id_index', '48346281bb5a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

