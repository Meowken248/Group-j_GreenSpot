"""merge_tu20_and_tuan48

Revision ID: 12c1eac9d115
Revises: 033_fundraiser_campaigns, 037_exported_incident_files
Create Date: 2026-10-29 14:26:52.705589

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '12c1eac9d115'
down_revision: Union[str, None] = ('033_fundraiser_campaigns', '037_exported_incident_files')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

