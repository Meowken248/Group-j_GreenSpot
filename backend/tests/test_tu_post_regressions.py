"""Regression tests for editing group assignments, without a live database."""
import unittest
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import app.models  # noqa: F401
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.post import UpdatePostRequest
from app.services.post_service import PostService


class PostGroupRegressionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.author = uuid.uuid4()
        self.group = uuid.uuid4()
        self.post = SimpleNamespace(post_id=uuid.uuid4(), user_id=self.author,
                                    group_id=self.group, version=1, content="Nội dung", media_urls="[]")
        result = MagicMock()
        result.scalars.return_value.first.return_value = self.post
        self.db = MagicMock(spec=AsyncSession)
        self.db.execute = AsyncMock(return_value=result)
        self.db.get = AsyncMock(return_value=None)
        self.db.commit = AsyncMock()
        self.db.refresh = AsyncMock()
        self.service = PostService()
        self.service.get_post_by_id = AsyncMock(return_value=self.post)

    async def test_explicit_null_removes_group(self):
        await self.service.update_post(self.db, self.post.post_id, self.author,
                                       UpdatePostRequest(version=1, group_id=None))
        self.assertIsNone(self.post.group_id)
        self.assertEqual(self.post.version, 2)

    async def test_omitted_group_keeps_assignment(self):
        await self.service.update_post(self.db, self.post.post_id, self.author,
                                       UpdatePostRequest(version=1, content="Edited"))
        self.assertEqual(self.post.group_id, self.group)

    async def test_cannot_move_to_missing_group(self):
        with self.assertRaises(HTTPException) as error:
            await self.service.update_post(self.db, self.post.post_id, self.author,
                UpdatePostRequest(version=1, group_id=uuid.uuid4()))
        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(self.post.group_id, self.group)
        self.db.commit.assert_not_awaited()

    async def test_stale_version_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            await self.service.update_post(self.db, self.post.post_id, self.author,
                                           UpdatePostRequest(version=2, group_id=None))
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.post.group_id, self.group)

    async def test_removing_last_media_cannot_leave_empty_post(self):
        self.post.content = "　"
        self.post.media_urls = '[{"url":"/uploads/a.jpg","media_type":"IMAGE"}]'
        with self.assertRaises(HTTPException) as error:
            await self.service.update_post(self.db, self.post.post_id, self.author,
                UpdatePostRequest(version=1, media_urls=[]))
        self.assertEqual(error.exception.status_code, 422)
        self.db.commit.assert_not_awaited()

    async def test_edit_text_preserves_previous_uploaded_media(self):
        self.post.media_urls = '[{"url":"/uploads/a.jpg","media_type":"IMAGE"}]'
        previous = self.post.media_urls
        await self.service.update_post(self.db, self.post.post_id, self.author,
            UpdatePostRequest(version=1, content="Lần sửa thứ hai"))
        self.assertEqual(self.post.media_urls, previous)

