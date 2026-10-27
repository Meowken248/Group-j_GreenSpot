"""Tạo bảng cho Chức năng 20: Gây quỹ cộng đồng (Fundraiser)

Revision ID: 033_fundraiser_campaigns
Revises: 032_recycling_facility_version
Create Date: 2026-10-27 21:15:00.000000

Bao gồm:
- fundraiser_campaigns: Chiến dịch gây quỹ, quản lý mục tiêu, tiến độ, tài khoản nhận bí mật, trạng thái
- fundraiser_donations: Giao dịch quyên góp tiền, hỗ trợ ẩn danh, lời nhắn
- fundraiser_expenses: Báo cáo sử dụng quỹ, minh chứng chứng từ, bảo đảm tổng chi <= tổng quyên
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '033_fundraiser_campaigns'
down_revision: Union[str, None] = '032_recycling_facility_version'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. Bảng fundraiser_campaigns
    if 'fundraiser_campaigns' not in existing_tables:
        op.create_table(
            'fundraiser_campaigns',
            sa.Column('campaign_id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('creator_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('cover_image_url', sa.String(length=500), nullable=True),
            sa.Column('target_amount', sa.BigInteger(), nullable=False),
            sa.Column('total_donated', sa.BigInteger(), server_default='0', nullable=False),
            sa.Column('donation_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('total_spent', sa.BigInteger(), server_default='0', nullable=False),
            sa.Column('district', sa.String(length=50), nullable=False),
            sa.Column('end_date', sa.Date(), nullable=False),
            sa.Column('bank_account_name', sa.String(length=100), nullable=False),
            sa.Column('bank_account_number', sa.String(length=50), nullable=False),
            sa.Column('bank_name', sa.String(length=100), nullable=False),
            sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('is_deleted', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_fundraiser_creator', 'fundraiser_campaigns', ['creator_id'])
        op.create_index('idx_fundraiser_district', 'fundraiser_campaigns', ['district'])
        op.create_index('idx_fundraiser_status_end_date', 'fundraiser_campaigns', ['status', 'end_date'])
        op.create_index('idx_fundraiser_district_status', 'fundraiser_campaigns', ['district', 'status'])
        op.create_index('idx_fundraiser_is_deleted', 'fundraiser_campaigns', ['is_deleted'])

    # 2. Bảng fundraiser_donations
    if 'fundraiser_donations' not in existing_tables:
        op.create_table(
            'fundraiser_donations',
            sa.Column('donation_id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fundraiser_campaigns.campaign_id', ondelete='CASCADE'), nullable=False),
            sa.Column('donor_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='SET NULL'), nullable=True),
            sa.Column('donor_name', sa.String(length=100), nullable=False),
            sa.Column('amount', sa.BigInteger(), nullable=False),
            sa.Column('message', sa.String(length=200), nullable=True),
            sa.Column('is_anonymous', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('payment_status', sa.String(length=20), server_default='completed', nullable=False),
            sa.Column('transaction_code', sa.String(length=50), nullable=False, unique=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_donation_campaign_created', 'fundraiser_donations', ['campaign_id', 'created_at'])
        op.create_index('idx_donation_donor', 'fundraiser_donations', ['donor_id'])

    # 3. Bảng fundraiser_expenses
    if 'fundraiser_expenses' not in existing_tables:
        op.create_table(
            'fundraiser_expenses',
            sa.Column('expense_id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('fundraiser_campaigns.campaign_id', ondelete='CASCADE'), nullable=False),
            sa.Column('content', sa.String(length=255), nullable=False),
            sa.Column('amount', sa.BigInteger(), nullable=False),
            sa.Column('expense_date', sa.Date(), nullable=False),
            sa.Column('proof_image_url', sa.String(length=500), nullable=False),
            sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_expense_campaign_date', 'fundraiser_expenses', ['campaign_id', 'expense_date'])


def downgrade() -> None:
    op.drop_table('fundraiser_expenses')
    op.drop_table('fundraiser_donations')
    op.drop_table('fundraiser_campaigns')
