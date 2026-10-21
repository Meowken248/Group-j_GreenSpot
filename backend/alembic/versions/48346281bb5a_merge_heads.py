"""merge_heads

Revision ID: 48346281bb5a
Revises: 022_triage_audit_domain, 023_post_coords_tags
Create Date: 2026-10-13 14:15:45.901242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '48346281bb5a'
down_revision: Union[str, None] = ('022_triage_audit_domain', '023_post_coords_tags')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

