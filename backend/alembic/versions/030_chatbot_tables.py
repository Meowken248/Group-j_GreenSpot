"""bo sung bang chatbot (Chuc nang 24 - AI chat box)

Revision ID: 030_chatbot_f24
Revises: 029_sync_models
Create Date: 2026-10-21 23:59:00.000000

Cac bang `chatbot_conversations` / `chatbot_messages` truoc day chi duoc tao boi
`Base.metadata.create_all` luc khoi dong backend. Migration nay bo sung DDL de
`alembic upgrade head` mot minh cung tao du schema cho Chuc nang 24.
Su dung kiem tra inspector de an toan voi CSDL da co bang (do create_all da tao).
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '030_chatbot_f24'
down_revision: Union[str, None] = '029_sync_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if 'chatbot_conversations' not in existing_tables:
        op.create_table(
            'chatbot_conversations',
            sa.Column('conversation_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('title', sa.String(length=100), nullable=False),
            sa.Column('message_count', sa.Integer(), nullable=False),
            sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('is_pinned', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('conversation_id'),
        )
        op.create_index('ix_chatbot_conversations_user_id', 'chatbot_conversations', ['user_id'], unique=False)
        op.create_index('ix_chatbot_conversations_last_message_at', 'chatbot_conversations', ['last_message_at'], unique=False)
        op.create_index('idx_chatbot_conv_user_updated', 'chatbot_conversations', ['user_id', 'updated_at'], unique=False)

    if 'chatbot_messages' not in existing_tables:
        op.create_table(
            'chatbot_messages',
            sa.Column('message_id', sa.UUID(), nullable=False),
            sa.Column('conversation_id', sa.UUID(), nullable=False),
            sa.Column('sender_type', sa.String(length=20), nullable=False),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('is_out_of_scope', sa.Boolean(), nullable=False),
            sa.Column('is_stopped', sa.Boolean(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(
                ['conversation_id'], ['chatbot_conversations.conversation_id'], ondelete='CASCADE'
            ),
            sa.PrimaryKeyConstraint('message_id'),
        )
        op.create_index('ix_chatbot_messages_conversation_id', 'chatbot_messages', ['conversation_id'], unique=False)
        op.create_index('ix_chatbot_messages_created_at', 'chatbot_messages', ['created_at'], unique=False)
        op.create_index('idx_chatbot_msg_conv_created', 'chatbot_messages', ['conversation_id', 'created_at'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if 'chatbot_messages' in existing_tables:
        op.drop_table('chatbot_messages')
    if 'chatbot_conversations' in existing_tables:
        op.drop_table('chatbot_conversations')
