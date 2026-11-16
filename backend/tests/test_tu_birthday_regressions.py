import unittest
import uuid
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.services import birthday_service as service


class BirthdayTests(unittest.IsolatedAsyncioTestCase):
    async def test_daily_cap_keeps_card_but_does_not_add_points(self):
        db = MagicMock(spec=AsyncSession)
        sender = SimpleNamespace(user_id=uuid.uuid4(), total_green_points=100, full_name="A")
        recipient = SimpleNamespace(user_id=uuid.uuid4(), status="ACTIVE", deleted_at=None,
            full_name="B", show_birthday=True, date_of_birth=date(2000, 1, 1))
        db.scalar = AsyncMock(side_effect=[recipient, None])
        db.execute, db.flush, db.commit, db.refresh = AsyncMock(), AsyncMock(), AsyncMock(), AsyncMock()
        with patch.object(service, "_are_friends", AsyncMock(return_value=True)), patch.object(service, "_birthday_today", return_value=True), patch.object(service, "_daily_points_earned", AsyncMock(return_value=25)):
            response = await service.send_birthday_wish(db, sender, recipient.user_id,
                "CARD", "Chúc mừng sinh nhật", "TREE_OF_HOPE")
        self.assertEqual(response["points_awarded"], 0)
        self.assertTrue(response["daily_limit_reached"])
        self.assertEqual(sender.total_green_points, 100)
        db.add_all.assert_not_called()
        db.commit.assert_awaited_once()
