"""Bổ sung trường version cho bảng recycling_facilities phục vụ Khóa lạc quan (Optimistic Locking)

Revision ID: 032_recycling_facility_version
Revises: 031_green_sunday_events
Create Date: 2026-10-26 22:00:00.000000

Tuân thủ:
- Quy tắc 6 (PROJECT_RULES.md): Optimistic Locking
- Đặc tả SRS Mục 4.2.23 (Trang 190 của Báo Cáo.docx.pdf)
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '032_recycling_facility_version'
down_revision: Union[str, None] = '031_green_sunday_events'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Thêm cột version với giá trị mặc định là 1
    op.add_column(
        'recycling_facilities',
        sa.Column('version', sa.Integer(), server_default=sa.text('1'), nullable=False)
    )


def downgrade() -> None:
    # Gỡ bỏ cột version nếu rollback
    op.drop_column('recycling_facilities', 'version')

