import unittest
import uuid
from datetime import datetime, timezone, date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
import app.models  # noqa
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.fundraiser import FundraiserDonation
from app.schemas.fundraiser import FundraiserCampaignUpdateRequest, FundraiserDonationCreateRequest, FundraiserExpenseCreateRequest
from app.services.fundraiser_service import FundraiserService


def result(value):
    r = MagicMock()
    r.scalar_one_or_none.return_value = value
    return r


class FundraiserTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.user = SimpleNamespace(user_id=uuid.uuid4(), full_name="Người gửi", email="u@example.com")
        self.camp = SimpleNamespace(campaign_id=uuid.uuid4(), creator_id=self.user.user_id,
            status="approved", total_donated=0, donation_count=0, target_amount=100000,
            end_date=date.today()+timedelta(days=10), updated_at=datetime.now(timezone.utc))
        self.db = MagicMock(spec=AsyncSession)
        self.db.commit = AsyncMock()
        self.db.refresh = AsyncMock()

    async def test_user_confirmation_does_not_create_money(self):
        self.db.execute = AsyncMock(side_effect=[result(self.camp), result(None)])
        def add(row):
            if isinstance(row, FundraiserDonation):
                row.donation_id = uuid.uuid4()
                row.created_at = datetime.now(timezone.utc)
        self.db.add.side_effect = add
        receipt = await FundraiserService.donate(self.db, self.camp.campaign_id,
            FundraiserDonationCreateRequest(amount=50000, client_reference=uuid.uuid4()), self.user)
        self.assertEqual(receipt.payment_status, "pending")
        self.assertEqual(self.camp.total_donated, 0)
        self.assertEqual(self.camp.donation_count, 0)

    async def test_repeated_request_returns_existing_receipt(self):
        req = FundraiserDonationCreateRequest(amount=50000, client_reference=uuid.uuid4())
        receipt = SimpleNamespace(donation_id=uuid.uuid4(), campaign_id=self.camp.campaign_id,
            donor_id=self.user.user_id, donor_name="Người gửi", amount=50000, message=None,
            is_anonymous=False, payment_status="pending", transaction_code=f"DON-{req.client_reference.hex}",
            created_at=datetime.now(timezone.utc))
        self.db.execute = AsyncMock(side_effect=[result(self.camp), result(receipt)])
        returned = await FundraiserService.donate(self.db, self.camp.campaign_id, req, self.user)
        self.assertEqual(returned.donation_id, receipt.donation_id)
        self.db.add.assert_not_called()
        self.db.commit.assert_not_awaited()

    async def test_second_tab_cannot_confirm_twice(self):
        admin = SimpleNamespace(user_id=uuid.uuid4(), email="admin@example.com", role_id=1)
        self.db.execute = AsyncMock(side_effect=[result(self.camp), result(SimpleNamespace(payment_status="completed"))])
        with self.assertRaises(HTTPException) as error:
            await FundraiserService.confirm_donation(self.db, self.camp.campaign_id, uuid.uuid4(), admin)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.camp.total_donated, 0)
        self.db.commit.assert_not_awaited()

    async def test_stale_description_update_has_clear_conflict(self):
        self.db.execute = AsyncMock(return_value=result(self.camp))
        with self.assertRaises(HTTPException) as error:
            await FundraiserService.update_campaign(self.db, self.camp.campaign_id,
                FundraiserCampaignUpdateRequest(updated_at=self.camp.updated_at-timedelta(seconds=1), description="Mới"), self.user)
        self.assertEqual(error.exception.status_code, 409)
        self.db.commit.assert_not_awaited()

    async def test_guest_cannot_submit_donation(self):
        with self.assertRaises(HTTPException) as error:
            await FundraiserService.donate(self.db, self.camp.campaign_id, FundraiserDonationCreateRequest(amount=50000, client_reference=uuid.uuid4()))
        self.assertEqual(error.exception.status_code, 401)

    async def test_retry_expense_does_not_charge_balance_twice(self):
        req = FundraiserExpenseCreateRequest(client_reference=uuid.uuid4(), content="Mua cây", amount=10000,
            expense_date=date.today(), proof_image_url="/uploads/proof.png")
        existing = SimpleNamespace(expense_id=req.client_reference, campaign_id=self.camp.campaign_id,
            created_by=self.user.user_id, content=req.content, amount=req.amount, expense_date=req.expense_date,
            proof_image_url=req.proof_image_url, created_at=datetime.now(timezone.utc))
        self.camp.total_spent = 10000
        self.db.execute = AsyncMock(side_effect=[result(self.camp), result(existing)])
        returned = await FundraiserService.add_expense(self.db, self.camp.campaign_id, req, self.user)
        self.assertEqual(returned.expense_id, existing.expense_id)
        self.assertEqual(self.camp.total_spent, 10000)
        self.db.commit.assert_not_awaited()

    async def test_updated_deadline_cannot_be_in_past(self):
        self.db.execute = AsyncMock(return_value=result(self.camp))
        with self.assertRaises(HTTPException) as error:
            await FundraiserService.update_campaign(self.db, self.camp.campaign_id,
                FundraiserCampaignUpdateRequest(updated_at=self.camp.updated_at, end_date=date.today()-timedelta(days=1)), self.user)
        self.assertEqual(error.exception.status_code, 400)
        self.db.commit.assert_not_awaited()
