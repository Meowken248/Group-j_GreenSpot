"""Privacy and group-sharing regressions; no application database is used."""
import unittest
import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, MagicMock

import app.models  # noqa: F401
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.post import Post
from app.schemas.comment import SharePostRequest, CreateCommentRequest
from app.services.comment_service import CommentService


def result(value=None, items=None):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    r.scalar_one.return_value = value or 0
    r.scalars.return_value.first.return_value = value
    r.scalars.return_value.all.return_value = items or []
    return r


class CommentRegressionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.viewer, self.author, self.pid = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        self.post = NS(post_id=self.pid, user_id=self.author, visibility="PUBLIC",
                       is_hidden=False, deleted_at=None, group_id=None, shares_count=0)
        self.db = MagicMock(spec=AsyncSession)
        self.db.execute = AsyncMock()
        self.db.get = AsyncMock()
        self.db.commit = AsyncMock()
        self.service = CommentService()

    async def assert_unreadable(self, **changes):
        self.post.__dict__.update(changes)
        self.db.execute.side_effect = [result(self.post)]
        with self.assertRaises(HTTPException) as error:
            await self.service.get_post_comments(self.db, self.pid)
        self.assertEqual(error.exception.status_code, 404)

    async def test_guest_cannot_read_private_comments(self):
        await self.assert_unreadable(visibility="ONLY_ME")

    async def test_guest_cannot_read_hidden_comments(self):
        await self.assert_unreadable(is_hidden=True)

    async def test_guest_cannot_read_friend_comments(self):
        await self.assert_unreadable(visibility="FRIENDS")

    async def test_guest_can_read_public_comments(self):
        self.db.execute.side_effect = [result(self.post), result(0), result()]
        response = await self.service.get_post_comments(self.db, self.pid)
        self.assertEqual(response.items, [])

    async def test_owner_can_read_private_comments(self):
        self.post.visibility = "ONLY_ME"
        self.db.execute.side_effect = [result(self.post), result(0), result()]
        response = await self.service.get_post_comments(self.db, self.pid, viewer_id=self.author)
        self.assertEqual(response.total, 0)

    async def test_nonmember_cannot_read_private_group(self):
        self.post.group_id = uuid.uuid4()
        self.db.get.return_value = NS(deleted_at=None, status="ACTIVE", privacy="PRIVATE")
        self.db.execute.side_effect = [result(self.post), result()]
        with self.assertRaises(HTTPException) as error:
            await self.service.get_post_comments(self.db, self.pid, viewer_id=self.viewer)
        self.assertEqual(error.exception.status_code, 404)

    async def test_replies_do_not_bypass_post_privacy(self):
        parent = NS(post_id=self.pid)
        self.post.visibility = "ONLY_ME"
        self.db.execute.side_effect = [result(parent), result(self.post)]
        with self.assertRaises(HTTPException) as error:
            await self.service.get_comment_replies(self.db, uuid.uuid4())
        self.assertEqual(error.exception.status_code, 404)

    async def test_cannot_write_comment_on_inaccessible_post(self):
        self.post.visibility = "ONLY_ME"
        self.db.execute.side_effect = [result(self.post)]
        with self.assertRaises(HTTPException):
            await self.service.create_comment(self.db, self.viewer, self.pid,
                                               CreateCommentRequest(content="Forbidden"))
        self.db.add.assert_not_called()

    async def test_group_share_creates_one_repost_per_distinct_group(self):
        gid = uuid.uuid4()
        group = NS(deleted_at=None, status="ACTIVE", posts_count=3)
        self.db.get.return_value = group
        self.db.execute.side_effect = [result(), result(self.post), result(NS())]
        response = await self.service.share_post(self.db, self.viewer, self.pid,
            SharePostRequest(share_type="GROUP", target_group_ids=[gid, gid], caption="Join us"))
        posts = [c.args[0] for c in self.db.add.call_args_list if isinstance(c.args[0], Post)]
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].group_id, gid)
        self.assertEqual(posts[0].shared_post_id, self.pid)
        self.assertEqual(posts[0].content, "Join us")
        self.assertEqual(response.shares_count, 1)
        self.assertEqual(group.posts_count, 4)

    async def test_nonmember_cannot_share_into_group(self):
        self.db.get.return_value = NS(deleted_at=None, status="ACTIVE")
        self.db.execute.side_effect = [result(), result(self.post), result()]
        with self.assertRaises(HTTPException) as error:
            await self.service.share_post(self.db, self.viewer, self.pid,
                SharePostRequest(share_type="GROUP", target_group_ids=[uuid.uuid4()]))
        self.assertEqual(error.exception.status_code, 403)
        self.db.add.assert_not_called()

