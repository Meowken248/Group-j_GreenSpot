"""Initial schema for EcoReport system with 54 tables and PostGIS support

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-15 20:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import geoalchemy2

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Kích hoạt PostGIS & Tiện ích CSDL
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")

    # 2. Tạo toàn bộ 54 bảng từ metadata của SQLAlchemy
    from app.database import Base
    import app.models
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    from app.database import Base
    import app.models
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
