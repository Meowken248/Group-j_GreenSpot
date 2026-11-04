"""bo sung bang/cot con thieu so voi models (chat, thong bao, xu phat, phien dang nhap, dedup)

Revision ID: 029_sync_models
Revises: ad23e2d738c1
Create Date: 2026-10-21 14:19:56.678123

Migration nay chi BO SUNG cac bang/cot ma cac migration truoc do trong nhanh hien tai
chua tao (do gop nhanh bi thieu file migration), dam bao `alembic upgrade head` tao du
schema cho toan bo models hien co.

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '029_sync_models'
down_revision: Union[str, None] = 'ad23e2d738c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.create_table('air_quality_records',
    sa.Column('record_id', sa.UUID(), nullable=False),
    sa.Column('province', sa.String(length=100), nullable=False),
    sa.Column('location_name', sa.String(length=150), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=False),
    sa.Column('lat', sa.Float(), nullable=False),
    sa.Column('lon', sa.Float(), nullable=False),
    sa.Column('aqi', sa.Float(), nullable=True),
    sa.Column('temp', sa.Float(), nullable=True),
    sa.Column('humidity', sa.Float(), nullable=True),
    sa.Column('rain', sa.Float(), nullable=True),
    sa.Column('wind_speed', sa.Float(), nullable=True),
    sa.Column('wind_dir', sa.Float(), nullable=True),
    sa.Column('pressure', sa.Float(), nullable=True),
    sa.Column('cloud', sa.Float(), nullable=True),
    sa.Column('pm2_5', sa.Float(), nullable=True),
    sa.Column('pm10', sa.Float(), nullable=True),
    sa.Column('co', sa.Float(), nullable=True),
    sa.Column('no2', sa.Float(), nullable=True),
    sa.Column('o3', sa.Float(), nullable=True),
    sa.Column('so2', sa.Float(), nullable=True),
    sa.Column('pollution_level', sa.String(length=50), nullable=True),
    sa.Column('pollution_class', sa.Float(), nullable=True),
    sa.PrimaryKeyConstraint('record_id')
    )
    op.create_index(op.f('ix_air_quality_records_location_name'), 'air_quality_records', ['location_name'], unique=False)
    op.create_index(op.f('ix_air_quality_records_province'), 'air_quality_records', ['province'], unique=False)
    op.create_index(op.f('ix_air_quality_records_timestamp'), 'air_quality_records', ['timestamp'], unique=False)
    op.create_table('login_attempts',
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('failed_count', sa.Integer(), nullable=False),
    sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_attempt_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('email')
    )
    op.create_index(op.f('ix_login_attempts_email'), 'login_attempts', ['email'], unique=False)
    op.create_table('penalty_regulations',
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('domain', sa.String(length=100), nullable=False),
    sa.Column('quick_category', sa.String(length=50), nullable=True),
    sa.Column('min_fine_individual', sa.BigInteger(), nullable=False),
    sa.Column('max_fine_individual', sa.BigInteger(), nullable=False),
    sa.Column('avg_fine_individual', sa.BigInteger(), nullable=False),
    sa.Column('min_fine_organization', sa.BigInteger(), nullable=False),
    sa.Column('max_fine_organization', sa.BigInteger(), nullable=False),
    sa.Column('avg_fine_organization', sa.BigInteger(), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('aggravating_circumstances', sa.Text(), nullable=True),
    sa.Column('supplementary_measures', sa.Text(), nullable=True),
    sa.Column('legal_basis', sa.String(length=255), nullable=False),
    sa.Column('effective_date', sa.Date(), nullable=True),
    sa.Column('amendment_warning', sa.String(length=255), nullable=True),
    sa.Column('keywords', sa.Text(), nullable=True),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_penalty_regulations_deleted_at'), 'penalty_regulations', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_penalty_regulations_domain'), 'penalty_regulations', ['domain'], unique=False)
    op.create_index(op.f('ix_penalty_regulations_legal_basis'), 'penalty_regulations', ['legal_basis'], unique=False)
    op.create_index(op.f('ix_penalty_regulations_quick_category'), 'penalty_regulations', ['quick_category'], unique=False)
    op.create_index(op.f('ix_penalty_regulations_title'), 'penalty_regulations', ['title'], unique=False)
    op.create_index('ix_penalty_search_composite', 'penalty_regulations', ['deleted_at', 'domain', 'quick_category'], unique=False)
    op.create_table('user_otps',
    sa.Column('otp_id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('otp_code_hash', sa.String(length=255), nullable=False),
    sa.Column('otp_plain', sa.String(length=10), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('failed_attempts', sa.Integer(), nullable=False),
    sa.Column('is_used', sa.Boolean(), nullable=False),
    sa.Column('purpose', sa.String(length=50), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('otp_id')
    )
    op.create_index(op.f('ix_user_otps_email'), 'user_otps', ['email'], unique=False)
    op.create_table('conversations',
    sa.Column('conversation_id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(length=20), nullable=False),
    sa.Column('title', sa.String(length=100), nullable=True),
    sa.Column('avatar_url', sa.String(length=500), nullable=True),
    sa.Column('district_name', sa.String(length=100), nullable=True),
    sa.Column('created_by', sa.UUID(), nullable=True),
    sa.Column('last_message_id', sa.UUID(), nullable=True),
    sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_message_preview', sa.String(length=255), nullable=True),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.user_id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('conversation_id')
    )
    op.create_index(op.f('ix_conversations_district_name'), 'conversations', ['district_name'], unique=False)
    op.create_index(op.f('ix_conversations_last_message_at'), 'conversations', ['last_message_at'], unique=False)
    op.create_index(op.f('ix_conversations_type'), 'conversations', ['type'], unique=False)
    op.create_table('notifications',
    sa.Column('notification_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('notification_type', sa.String(length=50), nullable=False),
    sa.Column('reference_id', sa.String(length=100), nullable=True),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('notification_id')
    )
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_notification_type'), 'notifications', ['notification_type'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_table('penalty_reports',
    sa.Column('tracking_code', sa.String(length=30), nullable=False),
    sa.Column('penalty_id', sa.UUID(), nullable=True),
    sa.Column('violation_title', sa.String(length=255), nullable=False),
    sa.Column('legal_basis', sa.String(length=255), nullable=False),
    sa.Column('fine_range', sa.String(length=100), nullable=False),
    sa.Column('address_text', sa.String(length=500), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('is_anonymous', sa.Boolean(), nullable=False),
    sa.Column('reporter_id', sa.UUID(), nullable=True),
    sa.Column('reporter_name', sa.String(length=150), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('officer_note', sa.Text(), nullable=True),
    sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['penalty_id'], ['penalty_regulations.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['reporter_id'], ['users.user_id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_penalty_reports_deleted_at'), 'penalty_reports', ['deleted_at'], unique=False)
    op.create_index(op.f('ix_penalty_reports_penalty_id'), 'penalty_reports', ['penalty_id'], unique=False)
    op.create_index(op.f('ix_penalty_reports_reporter_id'), 'penalty_reports', ['reporter_id'], unique=False)
    op.create_index(op.f('ix_penalty_reports_status'), 'penalty_reports', ['status'], unique=False)
    op.create_index(op.f('ix_penalty_reports_tracking_code'), 'penalty_reports', ['tracking_code'], unique=True)
    op.create_table('user_blocks',
    sa.Column('block_id', sa.UUID(), nullable=False),
    sa.Column('blocker_id', sa.UUID(), nullable=False),
    sa.Column('blocked_id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('blocker_id != blocked_id', name='ck_user_blocks_not_self'),
    sa.ForeignKeyConstraint(['blocked_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['blocker_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('block_id'),
    sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_user_blocks_pair')
    )
    op.create_index(op.f('ix_user_blocks_blocked_id'), 'user_blocks', ['blocked_id'], unique=False)
    op.create_index(op.f('ix_user_blocks_blocker_id'), 'user_blocks', ['blocker_id'], unique=False)
    op.create_table('user_sessions',
    sa.Column('session_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('refresh_token_hash', sa.String(length=64), nullable=False),
    sa.Column('device_name', sa.String(length=150), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.Text(), nullable=True),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_active_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('session_id')
    )
    op.create_index(op.f('ix_user_sessions_refresh_token_hash'), 'user_sessions', ['refresh_token_hash'], unique=False)
    op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
    op.create_table('conversation_members',
    sa.Column('member_id', sa.UUID(), nullable=False),
    sa.Column('conversation_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('unread_count', sa.Integer(), nullable=False),
    sa.Column('last_read_message_id', sa.UUID(), nullable=True),
    sa.Column('cleared_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('left_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.conversation_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('member_id'),
    sa.UniqueConstraint('conversation_id', 'user_id', name='uq_conversation_user')
    )
    op.create_index('idx_conversation_members_user_left', 'conversation_members', ['user_id', 'left_at'], unique=False)
    op.create_index(op.f('ix_conversation_members_conversation_id'), 'conversation_members', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_members_user_id'), 'conversation_members', ['user_id'], unique=False)
    op.create_table('incident_duplicate_clusters',
    sa.Column('cluster_id', sa.UUID(), nullable=False),
    sa.Column('cluster_code', sa.String(length=50), nullable=False),
    sa.Column('cluster_name', sa.String(length=150), nullable=False),
    sa.Column('unit_id', sa.Integer(), nullable=True),
    sa.Column('district_name', sa.String(length=100), nullable=True),
    sa.Column('incident_a_id', sa.UUID(), nullable=False),
    sa.Column('incident_b_id', sa.UUID(), nullable=False),
    sa.Column('report_count', sa.Integer(), nullable=False),
    sa.Column('similarity_rate', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('gps_distance_m', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('time_diff_hours', sa.Numeric(precision=8, scale=2), nullable=False),
    sa.Column('visual_similarity', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('ai_conclusion', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('master_incident_id', sa.UUID(), nullable=True),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['incident_a_id'], ['incidents.incident_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['incident_b_id'], ['incidents.incident_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['master_incident_id'], ['incidents.incident_id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['unit_id'], ['administrative_units.unit_id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('cluster_id'),
    sa.UniqueConstraint('cluster_code')
    )
    op.create_table('messages',
    sa.Column('message_id', sa.UUID(), nullable=False),
    sa.Column('conversation_id', sa.UUID(), nullable=False),
    sa.Column('sender_id', sa.UUID(), nullable=False),
    sa.Column('content', sa.String(length=1000), nullable=True),
    sa.Column('media_url', sa.String(length=500), nullable=True),
    sa.Column('is_system_message', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.conversation_id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('message_id')
    )
    op.create_index('idx_messages_conversation_created', 'messages', ['conversation_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messages_created_at'), 'messages', ['created_at'], unique=False)
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)
    op.add_column('comments', sa.Column('media_url', sa.String(length=1000), nullable=True))
    op.create_index(op.f('ix_friend_requests_receiver_id'), 'friend_requests', ['receiver_id'], unique=False)
    op.create_index(op.f('ix_friend_requests_sender_id'), 'friend_requests', ['sender_id'], unique=False)
    op.create_index(op.f('ix_friendships_user_id_1'), 'friendships', ['user_id_1'], unique=False)
    op.create_index(op.f('ix_friendships_user_id_2'), 'friendships', ['user_id_2'], unique=False)
    op.create_index(op.f('ix_incident_audit_logs_incident_id'), 'incident_audit_logs', ['incident_id'], unique=False)
    op.add_column('incidents', sa.Column('version', sa.Integer(), nullable=False, server_default=sa.text('1')))
    op.add_column('incidents', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('incidents', sa.Column('master_incident_id', sa.UUID(), nullable=True))
    op.add_column('incidents', sa.Column('is_duplicate_merged', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.create_foreign_key('fk_incidents_master_incident_id', 'incidents', 'incidents', ['master_incident_id'], ['incident_id'], ondelete='SET NULL')
    op.create_index(op.f('ix_post_tagged_friends_friend_user_id'), 'post_tagged_friends', ['friend_user_id'], unique=False)
    op.create_index(op.f('ix_post_tagged_friends_post_id'), 'post_tagged_friends', ['post_id'], unique=False)
    op.add_column('posts', sa.Column('shares_count', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('posts', sa.Column('shared_post_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_posts_group_id'), 'posts', ['group_id'], unique=False)
    op.create_index(op.f('ix_posts_shared_post_id'), 'posts', ['shared_post_id'], unique=False)
    op.create_index(op.f('ix_posts_user_id'), 'posts', ['user_id'], unique=False)
    op.create_foreign_key('fk_posts_shared_post_id', 'posts', 'posts', ['shared_post_id'], ['post_id'], ondelete='SET NULL')
    op.add_column('recycling_facilities', sa.Column('open_time', sa.String(length=10), nullable=True))
    op.add_column('recycling_facilities', sa.Column('close_time', sa.String(length=10), nullable=True))
    op.add_column('recycling_facilities', sa.Column('qr_code', sa.String(length=100), nullable=True))
    op.add_column('recycling_facilities', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('recycling_facilities', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_unique_constraint('uq_recycling_facilities_qr_code', 'recycling_facilities', ['qr_code'])
    op.create_index(op.f('ix_user_activities_activity_type'), 'user_activities', ['activity_type'], unique=False)
    op.create_index(op.f('ix_user_activities_created_at'), 'user_activities', ['created_at'], unique=False)
    op.create_index(op.f('ix_user_activities_user_id'), 'user_activities', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_badges_badge_id'), 'user_badges', ['badge_id'], unique=False)
    op.create_index(op.f('ix_user_badges_user_id'), 'user_badges', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_follows_follower_id'), 'user_follows', ['follower_id'], unique=False)
    op.create_index(op.f('ix_user_follows_following_id'), 'user_follows', ['following_id'], unique=False)
    op.add_column('users', sa.Column('district', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'district')
    op.drop_index(op.f('ix_user_follows_following_id'), table_name='user_follows')
    op.drop_index(op.f('ix_user_follows_follower_id'), table_name='user_follows')
    op.drop_index(op.f('ix_user_badges_user_id'), table_name='user_badges')
    op.drop_index(op.f('ix_user_badges_badge_id'), table_name='user_badges')
    op.drop_index(op.f('ix_user_activities_user_id'), table_name='user_activities')
    op.drop_index(op.f('ix_user_activities_created_at'), table_name='user_activities')
    op.drop_index(op.f('ix_user_activities_activity_type'), table_name='user_activities')
    op.drop_constraint('uq_recycling_facilities_qr_code', 'recycling_facilities', type_='unique')
    op.drop_column('recycling_facilities', 'deleted_at')
    op.drop_column('recycling_facilities', 'is_deleted')
    op.drop_column('recycling_facilities', 'qr_code')
    op.drop_column('recycling_facilities', 'close_time')
    op.drop_column('recycling_facilities', 'open_time')
    op.drop_constraint('fk_posts_shared_post_id', 'posts', type_='foreignkey')
    op.drop_index(op.f('ix_posts_user_id'), table_name='posts')
    op.drop_index(op.f('ix_posts_shared_post_id'), table_name='posts')
    op.drop_index(op.f('ix_posts_group_id'), table_name='posts')
    op.drop_column('posts', 'shared_post_id')
    op.drop_column('posts', 'shares_count')
    op.drop_index(op.f('ix_post_tagged_friends_post_id'), table_name='post_tagged_friends')
    op.drop_index(op.f('ix_post_tagged_friends_friend_user_id'), table_name='post_tagged_friends')
    op.drop_constraint('fk_incidents_master_incident_id', 'incidents', type_='foreignkey')
    op.drop_column('incidents', 'is_duplicate_merged')
    op.drop_column('incidents', 'master_incident_id')
    op.drop_column('incidents', 'deleted_at')
    op.drop_column('incidents', 'version')
    op.drop_index(op.f('ix_incident_audit_logs_incident_id'), table_name='incident_audit_logs')
    op.drop_index(op.f('ix_friendships_user_id_2'), table_name='friendships')
    op.drop_index(op.f('ix_friendships_user_id_1'), table_name='friendships')
    op.drop_index(op.f('ix_friend_requests_sender_id'), table_name='friend_requests')
    op.drop_index(op.f('ix_friend_requests_receiver_id'), table_name='friend_requests')
    op.drop_column('comments', 'media_url')
    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_created_at'), table_name='messages')
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='messages')
    op.drop_index('idx_messages_conversation_created', table_name='messages')
    op.drop_table('messages')
    op.drop_table('incident_duplicate_clusters')
    op.drop_index(op.f('ix_conversation_members_user_id'), table_name='conversation_members')
    op.drop_index(op.f('ix_conversation_members_conversation_id'), table_name='conversation_members')
    op.drop_index('idx_conversation_members_user_left', table_name='conversation_members')
    op.drop_table('conversation_members')
    op.drop_index(op.f('ix_user_sessions_user_id'), table_name='user_sessions')
    op.drop_index(op.f('ix_user_sessions_refresh_token_hash'), table_name='user_sessions')
    op.drop_table('user_sessions')
    op.drop_index(op.f('ix_user_blocks_blocker_id'), table_name='user_blocks')
    op.drop_index(op.f('ix_user_blocks_blocked_id'), table_name='user_blocks')
    op.drop_table('user_blocks')
    op.drop_index(op.f('ix_penalty_reports_tracking_code'), table_name='penalty_reports')
    op.drop_index(op.f('ix_penalty_reports_status'), table_name='penalty_reports')
    op.drop_index(op.f('ix_penalty_reports_reporter_id'), table_name='penalty_reports')
    op.drop_index(op.f('ix_penalty_reports_penalty_id'), table_name='penalty_reports')
    op.drop_index(op.f('ix_penalty_reports_deleted_at'), table_name='penalty_reports')
    op.drop_table('penalty_reports')
    op.drop_index(op.f('ix_notifications_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_notification_type'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_is_read'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_created_at'), table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_conversations_type'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_last_message_at'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_district_name'), table_name='conversations')
    op.drop_table('conversations')
    op.drop_index(op.f('ix_user_otps_email'), table_name='user_otps')
    op.drop_table('user_otps')
    op.drop_index('ix_penalty_search_composite', table_name='penalty_regulations')
    op.drop_index(op.f('ix_penalty_regulations_title'), table_name='penalty_regulations')
    op.drop_index(op.f('ix_penalty_regulations_quick_category'), table_name='penalty_regulations')
    op.drop_index(op.f('ix_penalty_regulations_legal_basis'), table_name='penalty_regulations')
    op.drop_index(op.f('ix_penalty_regulations_domain'), table_name='penalty_regulations')
    op.drop_index(op.f('ix_penalty_regulations_deleted_at'), table_name='penalty_regulations')
    op.drop_table('penalty_regulations')
    op.drop_index(op.f('ix_login_attempts_email'), table_name='login_attempts')
    op.drop_table('login_attempts')
    op.drop_index(op.f('ix_air_quality_records_timestamp'), table_name='air_quality_records')
    op.drop_index(op.f('ix_air_quality_records_province'), table_name='air_quality_records')
    op.drop_index(op.f('ix_air_quality_records_location_name'), table_name='air_quality_records')
    op.drop_table('air_quality_records')
