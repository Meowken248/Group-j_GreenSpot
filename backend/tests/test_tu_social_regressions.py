import sqlite3
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import app.models  # noqa
from fastapi import HTTPException
from sqlalchemy.dialects import sqlite
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.chat import Conversation, ConversationMember, ConversationType
from app.models.notification import Notification
from app.schemas.event import EventUpdate
from app.services.chat_service import ChatService
from app.services.event_service import EventService
from app.services.group_service import GroupService
from app.schemas.group import GroupMemberRoleUpdateRequest
from app.models.audit_log import AuditLog
from app.schemas.chat import SendMessageRequest
from pydantic import ValidationError


def result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    r.scalars.return_value.first.return_value = value
    return r


class SocialTests(unittest.IsolatedAsyncioTestCase):
    async def test_blank_chat_message_cannot_bypass_missing_media_validator(self):
        for payload in [{}, {"content": "　"}, {"content": "  "}, {"media_url": "blob:missing"}]:
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                SendMessageRequest(**payload)
        self.assertEqual(SendMessageRequest(content="Xin chào").content, "Xin chào")

    async def test_second_tab_clear_chat_reports_missing(self):
        db = MagicMock(spec=AsyncSession)
        now = datetime.now(timezone.utc)
        db.get = AsyncMock(return_value=SimpleNamespace(type="DIRECT", deleted_at=None, last_message_at=now-timedelta(minutes=1)))
        db.execute = AsyncMock(return_value=result(SimpleNamespace(cleared_at=now)))
        db.commit = AsyncMock()
        with self.assertRaises(HTTPException) as error:
            await ChatService().clear_direct_conversation(db, SimpleNamespace(user_id=uuid.uuid4()), uuid.uuid4())
        self.assertEqual(error.exception.status_code, 404)
        db.commit.assert_not_awaited()

    async def test_role_update_writes_valid_audit_and_advances_version(self):
        db = MagicMock(spec=AsyncSession)
        db.get = AsyncMock(return_value=SimpleNamespace(deleted_at=None, status="ACTIVE"))
        user_id = uuid.uuid4()
        target = SimpleNamespace(id=uuid.uuid4(), user_id=user_id, role="MEMBER", version=1,
            joined_at=datetime.now(timezone.utc), user=SimpleNamespace(full_name="A", avatar_url=None, district=None))
        db.execute = AsyncMock(return_value=result(target))
        db.commit, db.refresh = AsyncMock(), AsyncMock()
        caller = SimpleNamespace(user_id=uuid.uuid4(), email="a@example.com", role_id=1)
        from unittest.mock import patch
        with patch.object(GroupService, "_check_system_admin", AsyncMock(return_value=True)):
            response = await GroupService.update_member_role(db, uuid.uuid4(), user_id,
                GroupMemberRoleUpdateRequest(version=1, new_role="MODERATOR"), caller)
        self.assertEqual(response.version, 2)
        audit = [c.args[0] for c in db.add.call_args_list if isinstance(c.args[0], AuditLog)][0]
        self.assertEqual(audit.old_values["role"], "MEMBER")
        self.assertEqual(audit.new_values["role"], "MODERATOR")
        db.commit.assert_awaited_once()

    async def test_disband_notifies_members_and_soft_deletes_content(self):
        db = MagicMock(spec=AsyncSession)
        group = SimpleNamespace(name="Nhóm xanh", status="ACTIVE", deleted_at=None, version=1)
        recipients = result(None)
        recipients.scalars.return_value.all.return_value = [uuid.uuid4(), uuid.uuid4()]
        db.execute = AsyncMock(side_effect=[result(None), result(group), result(SimpleNamespace(role="ADMIN")),
                                           recipients, result(None), result(None), result(None)])
        db.commit = AsyncMock()
        await GroupService.disband_group(db, uuid.uuid4(), uuid.uuid4(), "Nhóm xanh")
        self.assertEqual(group.status, "DISBANDED")
        self.assertEqual(len([c for c in db.add.call_args_list if isinstance(c.args[0], Notification)]), 2)
        sql = [str(c.args[0]) for c in db.execute.call_args_list]
        self.assertTrue(any("UPDATE comments SET deleted_at" in q for q in sql))
        self.assertTrue(any("UPDATE posts SET" in q and "deleted_at" in q for q in sql))
        db.commit.assert_awaited_once()

    async def test_disband_second_tab_reports_missing(self):
        db = MagicMock(spec=AsyncSession)
        db.execute = AsyncMock(return_value=result(None))
        db.commit = AsyncMock()
        with self.assertRaises(HTTPException) as error:
            await GroupService.disband_group(db, uuid.uuid4(), uuid.uuid4(), "Nhóm xanh")
        self.assertEqual(error.exception.status_code, 404)
        db.commit.assert_not_awaited()

    async def test_event_stale_tab_cannot_save(self):
        db = MagicMock(spec=AsyncSession)
        event = SimpleNamespace(creator_id=uuid.uuid4(), status="APPROVED", version=2,
                                start_time=datetime.now(timezone.utc) + timedelta(days=3))
        db.execute = AsyncMock(return_value=result(event))
        db.commit = AsyncMock()
        service = EventService(db)
        service.is_admin = AsyncMock(return_value=False)
        with self.assertRaises(HTTPException) as error:
            await service.update_event(uuid.uuid4(), event.creator_id, EventUpdate(version=1, title="Mới"))
        self.assertEqual(error.exception.status_code, 409)
        db.commit.assert_not_awaited()

    async def test_cleared_chat_stays_hidden_until_a_new_message(self):
        # Execute the real list COUNT query on a disposable in-memory database.
        connection = sqlite3.connect(":memory:")
        for table in [Conversation.__table__, ConversationMember.__table__]:
            columns = ",".join(f'"{c.name}" TEXT' for c in table.columns)
            connection.execute(f'CREATE TABLE "{table.name}" ({columns})')
        user_id, conv_id = uuid.uuid4(), uuid.uuid4()
        connection.execute("INSERT INTO conversations(conversation_id,type,last_message_at) VALUES (?,?,?)",
                           (conv_id.hex, ConversationType.DIRECT.value, "2026-11-16 01:00:00"))
        connection.execute("INSERT INTO conversation_members(conversation_id,user_id,cleared_at) VALUES (?,?,?)",
                           (conv_id.hex, user_id.hex, "2026-11-16 02:00:00"))
        db = MagicMock(spec=AsyncSession)

        async def execute(statement):
            query = str(statement.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
            rows = connection.execute(query).fetchall() if query.startswith("SELECT count(") else []
            r = MagicMock()
            r.scalar.return_value = rows[0][0] if rows else 0
            r.all.return_value = []  # DTO mapping is covered by the existing chat suite.
            return r

        db.execute = AsyncMock(side_effect=execute)
        try:
            hidden = await ChatService().get_user_conversations(db, SimpleNamespace(user_id=user_id))
            self.assertEqual(hidden.total, 0)
            connection.execute("UPDATE conversations SET last_message_at='2026-11-16 03:00:00'")
            visible = await ChatService().get_user_conversations(db, SimpleNamespace(user_id=user_id))
            self.assertEqual(visible.total, 1)
        finally:
            connection.close()
