"""create_extensions

Revision ID: 001_extensions
Revises: None
Create Date: 2026-09-21 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "001_extensions"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS btree_gist;")
    op.execute("DROP EXTENSION IF EXISTS unaccent;")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm;")
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp";')
    op.execute("DROP EXTENSION IF EXISTS postgis;")
