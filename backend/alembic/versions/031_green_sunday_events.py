"""Tạo các bảng cho Chức năng 21: Sự kiện và Chiến dịch Chủ Nhật Xanh

Revision ID: 031_green_sunday_events
Revises: 030_chatbot_f24
Create Date: 2026-10-25 21:30:00.000000

Tạo 4 bảng nghiệp vụ:
- events: Thông tin sự kiện và chiến dịch Chủ Nhật Xanh
- event_participants: Danh sách thành viên đăng ký tham gia sự kiện
- event_interests: Danh sách thành viên quan tâm sự kiện
- event_checkins: Lịch sử check-in GPS tại hiện trường sự kiện (+50 Điểm Xanh)
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = '031_green_sunday_events'
down_revision: Union[str, None] = '030_chatbot_f24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    # 1. Bảng events
    if 'events' not in existing_tables:
        op.create_table(
            'events',
            sa.Column('event_id', UUID(as_uuid=True), primary_key=True),
            sa.Column('title', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('cover_image_url', sa.String(length=500), nullable=False),
            sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
            sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
            sa.Column('latitude', sa.Float(), nullable=False),
            sa.Column('longitude', sa.Float(), nullable=False),
            sa.Column('address', sa.String(length=255), nullable=False),
            sa.Column('district', sa.String(length=100), nullable=False),
            sa.Column('max_participants', sa.Integer(), nullable=False, server_default='50'),
            sa.Column('current_participants', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('interested_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
            sa.Column('reject_reason', sa.String(length=500), nullable=True),
            sa.Column('checkin_radius_meters', sa.Integer(), nullable=False, server_default='100'),
            sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('idx_events_status_start_time', 'events', ['status', 'start_time'])
        op.create_index('idx_events_creator_id', 'events', ['creator_id'])
        op.create_index('idx_events_district', 'events', ['district'])
        op.create_index('idx_events_is_deleted', 'events', ['is_deleted'])

    # 2. Bảng event_participants
    if 'event_participants' not in existing_tables:
        op.create_table(
            'event_participants',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.event_id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('is_creator', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('event_id', 'user_id', name='uq_event_participant')
        )
        op.create_index('idx_event_participants_user_id', 'event_participants', ['user_id'])
        op.create_index('idx_event_participants_event_id', 'event_participants', ['event_id'])

    # 3. Bảng event_interests
    if 'event_interests' not in existing_tables:
        op.create_table(
            'event_interests',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.event_id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('event_id', 'user_id', name='uq_event_interest')
        )
        op.create_index('idx_event_interests_event_id', 'event_interests', ['event_id'])
        op.create_index('idx_event_interests_user_id', 'event_interests', ['user_id'])

    # 4. Bảng event_checkins
    if 'event_checkins' not in existing_tables:
        op.create_table(
            'event_checkins',
            sa.Column('id', UUID(as_uuid=True), primary_key=True),
            sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.event_id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False),
            sa.Column('latitude', sa.Float(), nullable=False),
            sa.Column('longitude', sa.Float(), nullable=False),
            sa.Column('distance_meters', sa.Float(), nullable=False),
            sa.Column('accuracy_meters', sa.Float(), nullable=False),
            sa.Column('points_awarded', sa.Integer(), nullable=False, server_default='50'),
            sa.Column('checkin_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('device_info', sa.String(length=255), nullable=True),
            sa.UniqueConstraint('event_id', 'user_id', name='uq_event_checkin')
        )
        op.create_index('idx_event_checkins_event_user', 'event_checkins', ['event_id', 'user_id'])


def downgrade() -> None:
    op.drop_table('event_checkins')
    op.drop_table('event_interests')
    op.drop_table('event_participants')
    op.drop_table('events')
