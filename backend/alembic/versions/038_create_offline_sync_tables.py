"""create offline sync submissions and media uploads tables

Revision ID: 038_offline_sync_tables
Revises: 12c1eac9d115
Create Date: 2026-11-01 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '038_offline_sync_tables'
down_revision: Union[str, None] = '12c1eac9d115'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tạo bảng offline_submissions (STT 19 - Chế độ Offline-First)
    op.create_table(
        'offline_submissions',
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('client_submission_id', sa.String(64), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('incident_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('idempotency_key', sa.String(64), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=True),
        sa.Column('status', sa.String(30), server_default='PROCESSED', nullable=False),
        sa.Column('client_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('server_received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('response_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.incident_id'], ondelete='SET NULL'),
        sa.UniqueConstraint('client_submission_id', name='uq_offline_submissions_client_submission_id'),
        sa.UniqueConstraint('user_id', 'idempotency_key', name='uq_offline_user_idempotency')
    )
    op.create_index('ix_offline_submissions_client_submission_id', 'offline_submissions', ['client_submission_id'])
    op.create_index('ix_offline_submissions_user_id', 'offline_submissions', ['user_id'])
    op.create_index('ix_offline_submissions_incident_id', 'offline_submissions', ['incident_id'])
    op.create_index('ix_offline_submissions_idempotency_key', 'offline_submissions', ['idempotency_key'])
    op.create_index('ix_offline_submissions_status', 'offline_submissions', ['status'])

    # 2. Tạo bảng offline_media_uploads
    op.create_table(
        'offline_media_uploads',
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('submission_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_file_id', sa.String(64), nullable=False),
        sa.Column('media_type', sa.String(20), nullable=False),
        sa.Column('media_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=True),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(30), server_default='COMPLETED', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['submission_id'], ['offline_submissions.submission_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['media_id'], ['incident_media.media_id'], ondelete='SET NULL')
    )
    op.create_index('ix_offline_media_uploads_submission_id', 'offline_media_uploads', ['submission_id'])
    op.create_index('ix_offline_media_uploads_client_file_id', 'offline_media_uploads', ['client_file_id'])


def downgrade() -> None:
    op.drop_index('ix_offline_media_uploads_client_file_id', table_name='offline_media_uploads')
    op.drop_index('ix_offline_media_uploads_submission_id', table_name='offline_media_uploads')
    op.drop_table('offline_media_uploads')

    op.drop_index('ix_offline_submissions_status', table_name='offline_submissions')
    op.drop_index('ix_offline_submissions_idempotency_key', table_name='offline_submissions')
    op.drop_index('ix_offline_submissions_incident_id', table_name='offline_submissions')
    op.drop_index('ix_offline_submissions_user_id', table_name='offline_submissions')
    op.drop_index('ix_offline_submissions_client_submission_id', table_name='offline_submissions')
    op.drop_table('offline_submissions')
