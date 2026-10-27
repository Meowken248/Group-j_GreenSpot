import unittest
import asyncio
import uuid
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.fundraiser import (
    FundraiserCampaign,
    FundraiserDonation,
    FundraiserExpense,
    FundraiserStatus,
)
from app.models.rbac import Role, User
from app.schemas.fundraiser import (
    FundraiserApprovalRequest,
    FundraiserCampaignCreateRequest,
    FundraiserCampaignUpdateRequest,
    FundraiserDonationCreateRequest,
    FundraiserExpenseCreateRequest,
)
from app.services.fundraiser_service import FundraiserService


class TestFundraiserService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(cls.loop)
        cls.test_user = cls.loop.run_until_complete(cls._get_or_create_test_user("test_user_fundraiser@test.com", "Người Dùng Test"))
        cls.admin_user = cls.loop.run_until_complete(cls._get_or_create_test_user("test_admin_fundraiser@test.com", "Admin Test", is_admin=True))

    @classmethod
    def tearDownClass(cls):
        cls.loop.run_until_complete(cls._cleanup_test_data())
        cls.loop.close()

    @classmethod
    async def _get_or_create_test_user(cls, email: str, full_name: str, is_admin: bool = False) -> User:
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.email == email))
            u = res.scalar_one_or_none()
            if not u:
                role_res = await session.execute(select(Role).where(Role.role_name == ("admin" if is_admin else "citizen")))
                role = role_res.scalar_one_or_none()
                u = User(
                    email=email,
                    password_hash="test_hash",
                    full_name=full_name,
                    role_id=role.role_id if role else 1,
                )
                session.add(u)
                await session.commit()
                await session.refresh(u)
            return u

    @classmethod
    async def _cleanup_test_data(cls):
        async with AsyncSessionLocal() as session:
            # Xóa các chiến dịch test
            camps = await session.execute(
                select(FundraiserCampaign).where(
                    FundraiserCampaign.title.ilike("Test %")
                )
            )
            for c in camps.scalars().all():
                await session.delete(c)
            await session.commit()

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    def test_tc01_create_campaign_pending_and_privacy(self):
        """TC-01: Tạo chiến dịch mới lưu trạng thái PENDING, tài khoản ngân hàng không lộ trong public response"""
        async def _test():
            async with AsyncSessionLocal() as session:
                today = date.today()
                req = FundraiserCampaignCreateRequest(
                    title="Test Chiến Dịch Cứu Trợ 01",
                    description="Mô tả chiến dịch test bảo vệ môi trường",
                    district="Quận 1",
                    target_amount=10000000,
                    end_date=today + timedelta(days=30),
                    bank_account_name="NGUYEN VAN A",
                    bank_account_number="123456789",
                    bank_name="Vietcombank",
                )
                item = await FundraiserService.create_campaign(session, req, self.test_user)
                self.assertEqual(item.status, FundraiserStatus.PENDING.value)
                self.assertEqual(item.title, "Test Chiến Dịch Cứu Trợ 01")
                self.assertEqual(item.total_donated, 0)
                self.assertEqual(item.total_spent, 0)

                # Public detail (khi người xem không phải admin và không phải creator)
                other_user = User(user_id=uuid.uuid4(), email="other@test.com", full_name="Người Khác")
                # Với pending campaign, người khác không xem được
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.get_campaign_detail(session, item.campaign_id, other_user)
                self.assertEqual(cm.exception.status_code, 403)
        self.run_async(_test())

    def test_tc02_max_3_pending_campaigns(self):
        """TC-02: Báo lỗi khi người dùng đang có 3 chiến dịch chờ duyệt"""
        async def _test():
            async with AsyncSessionLocal() as session:
                today = date.today()
                # Tạo thêm chiến dịch pending cho user
                for i in range(2):
                    req = FundraiserCampaignCreateRequest(
                        title=f"Test Chiến Dịch Pending {i}",
                        description="Mô tả test pending",
                        district="Quận 3",
                        target_amount=5000000,
                        end_date=today + timedelta(days=20),
                        bank_account_name="NGUYEN VAN A",
                        bank_account_number="123456789",
                        bank_name="Vietcombank",
                    )
                    await FundraiserService.create_campaign(session, req, self.test_user)

                # Cố tạo chiến dịch thứ 4 khi đã có 3 chiến dịch pending
                req_overflow = FundraiserCampaignCreateRequest(
                    title="Test Chiến Dịch Overflow 4",
                    description="Mô tả test",
                    district="Quận 3",
                    target_amount=5000000,
                    end_date=today + timedelta(days=20),
                    bank_account_name="NGUYEN VAN A",
                    bank_account_number="123456789",
                    bank_name="Vietcombank",
                )
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.create_campaign(session, req_overflow, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)
                self.assertIn("Bạn đang có 3 chiến dịch chờ duyệt", str(cm.exception.detail))
        self.run_async(_test())

    def test_tc03_validate_deadline_90_days(self):
        """TC-03: Validate hạn chót (từ ngày mai và tối đa 90 ngày)"""
        async def _test():
            async with AsyncSessionLocal() as session:
                today = date.today()
                # Hạn chót trong quá khứ hoặc hôm nay
                req_past = FundraiserCampaignCreateRequest(
                    title="Test Chiến Dịch Hạn Chót Quá Khứ",
                    description="Mô tả",
                    district="Quận 1",
                    target_amount=5000000,
                    end_date=today,
                    bank_account_name="NGUYEN VAN A",
                    bank_account_number="123456789",
                    bank_name="Vietcombank",
                )
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.create_campaign(session, req_past, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)

                # Hạn chót vượt quá 90 ngày
                req_far = FundraiserCampaignCreateRequest(
                    title="Test Chiến Dịch Hạn Chót Quá 90 Ngày",
                    description="Mô tả",
                    district="Quận 1",
                    target_amount=5000000,
                    end_date=today + timedelta(days=95),
                    bank_account_name="NGUYEN VAN A",
                    bank_account_number="123456789",
                    bank_name="Vietcombank",
                )
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.create_campaign(session, req_far, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)
        self.run_async(_test())

    def test_tc04_validate_target_amount(self):
        """TC-04: Validate mục tiêu tiền phải lớn hơn 0"""
        with self.assertRaises(ValueError):
            FundraiserCampaignCreateRequest(
                title="Test Target Amount",
                description="Mô tả",
                district="Quận 1",
                target_amount=0,
                end_date=date.today() + timedelta(days=10),
                bank_account_name="A",
                bank_account_number="1",
                bank_name="V",
            )

    def test_tc05_admin_approve_campaign(self):
        """TC-05: Admin duyệt chiến dịch -> chuyển approved và hiển thị công khai"""
        async def _test():
            async with AsyncSessionLocal() as session:
                # Lấy 1 chiến dịch pending
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.status == FundraiserStatus.PENDING.value,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                req = FundraiserApprovalRequest(action="approve")
                item = await FundraiserService.review_campaign(session, camp.campaign_id, req, self.admin_user)
                self.assertEqual(item.status, FundraiserStatus.APPROVED.value)
                self.assertIsNone(item.rejection_reason)

                # Kiểm tra công khai trong list
                items, total = await FundraiserService.list_campaigns(session)
                camp_ids = [c.campaign_id for c in items]
                self.assertIn(camp.campaign_id, camp_ids)
        self.run_async(_test())

    def test_tc06_admin_reject_campaign(self):
        """TC-06: Admin từ chối chiến dịch kèm lý do"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.status == FundraiserStatus.PENDING.value,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                req = FundraiserApprovalRequest(action="reject", rejection_reason="Kế hoạch chưa rõ ràng")
                item = await FundraiserService.review_campaign(session, camp.campaign_id, req, self.admin_user)
                self.assertEqual(item.status, FundraiserStatus.REJECTED.value)
                self.assertEqual(item.rejection_reason, "Kế hoạch chưa rõ ràng")
        self.run_async(_test())

    def test_tc07_donate_minimum_and_progress_update(self):
        """TC-07: Quyên góp tối thiểu 10.000 VNĐ, cập nhật total_donated và donation_count"""
        async def _test():
            async with AsyncSessionLocal() as session:
                # Lấy 1 chiến dịch approved
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.status == FundraiserStatus.APPROVED.value,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()
                prev_donated = camp.total_donated
                prev_count = camp.donation_count

                # Quyên góp 50.000 đ
                req = FundraiserDonationCreateRequest(amount=50000, message="Ủng hộ chiến dịch!")
                donation = await FundraiserService.donate(session, camp.campaign_id, req, self.test_user)
                self.assertEqual(donation.amount, 50000)
                self.assertEqual(donation.message, "Ủng hộ chiến dịch!")

                # Kiểm tra chiến dịch đã cập nhật
                detail = await FundraiserService.get_campaign_detail(session, camp.campaign_id, self.test_user)
                self.assertEqual(detail.total_donated, prev_donated + 50000)
                self.assertEqual(detail.donation_count, prev_count + 1)
        self.run_async(_test())

    def test_tc08_anonymous_donation(self):
        """TC-08: Quyên góp ẩn danh -> tên hiển thị 'Mạnh thường quân ẩn danh'"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.status == FundraiserStatus.APPROVED.value,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                req = FundraiserDonationCreateRequest(amount=20000, is_anonymous=True)
                donation = await FundraiserService.donate(session, camp.campaign_id, req, self.test_user)
                self.assertEqual(donation.donor_name, "Mạnh thường quân ẩn danh")
                self.assertTrue(donation.is_anonymous)
        self.run_async(_test())

    def test_tc09_campaign_reaches_target_completed(self):
        """TC-09: Khi số tiền quyên góp đạt hoặc vượt mục tiêu -> đổi sang COMPLETED"""
        async def _test():
            async with AsyncSessionLocal() as session:
                # Tạo 1 chiến dịch mục tiêu 50.000 đ để dễ test
                today = date.today()
                camp = FundraiserCampaign(
                    creator_id=self.test_user.user_id,
                    title="Test Đạt Mục Tiêu Nhanh",
                    description="Mô tả",
                    district="Quận 1",
                    target_amount=50000,
                    end_date=today + timedelta(days=10),
                    bank_account_name="A",
                    bank_account_number="1",
                    bank_name="B",
                    status=FundraiserStatus.APPROVED.value,
                )
                session.add(camp)
                await session.commit()

                # Quyên góp đủ 50.000 đ
                req = FundraiserDonationCreateRequest(amount=50000)
                await FundraiserService.donate(session, camp.campaign_id, req, self.test_user)

                detail = await FundraiserService.get_campaign_detail(session, camp.campaign_id, self.test_user)
                self.assertEqual(detail.status, FundraiserStatus.COMPLETED.value)
                self.assertGreaterEqual(detail.percent_achieved, 100.0)
        self.run_async(_test())

    def test_tc10_lock_financial_fields_after_donation(self):
        """TC-10: Chiến dịch đã có tiền quyên góp thì KHÔNG được sửa target_amount, chỉ cho sửa mô tả"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.total_donated > 0,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                # Cố sửa target_amount
                req_invalid = FundraiserCampaignUpdateRequest(target_amount=999999999)
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.update_campaign(session, camp.campaign_id, req_invalid, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)
                self.assertIn("chỉ có thể bổ sung mô tả", str(cm.exception.detail))

                # Sửa mô tả hợp lệ
                req_valid = FundraiserCampaignUpdateRequest(description="Mô tả bổ sung sau khi nhận quyên góp")
                updated = await FundraiserService.update_campaign(session, camp.campaign_id, req_valid, self.test_user)
                self.assertEqual(updated.description, "Mô tả bổ sung sau khi nhận quyên góp")
        self.run_async(_test())

    def test_tc11_add_expense_report(self):
        """TC-11: Thêm khoản chi thành công và cập nhật total_spent"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.total_donated > 0,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()
                prev_spent = camp.total_spent

                req = FundraiserExpenseCreateRequest(
                    content="Mua dụng cụ dọn rác đợt 1",
                    amount=10000,
                    expense_date=date.today(),
                    proof_image_url="https://example.com/receipt.jpg",
                )
                expense = await FundraiserService.add_expense(session, camp.campaign_id, req, self.test_user)
                self.assertEqual(expense.amount, 10000)

                detail = await FundraiserService.get_campaign_detail(session, camp.campaign_id, self.test_user)
                self.assertEqual(detail.total_spent, prev_spent + 10000)
                self.assertEqual(detail.remaining_balance, detail.total_donated - detail.total_spent)
        self.run_async(_test())

    def test_tc12_expense_cannot_exceed_total_donated(self):
        """TC-12: Báo lỗi khi tổng chi vượt tổng số tiền đã quyên góp"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.total_donated > 0,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                # Cố chi số tiền vượt quá quỹ hiện có
                excessive_amount = camp.total_donated + 100000000
                req = FundraiserExpenseCreateRequest(
                    content="Chi vượt quỹ bất hợp lệ",
                    amount=excessive_amount,
                    expense_date=date.today(),
                    proof_image_url="https://example.com/receipt.jpg",
                )
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.add_expense(session, camp.campaign_id, req, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)
                self.assertIn("Tổng chi không được vượt số tiền đã quyên", str(cm.exception.detail))
        self.run_async(_test())

    def test_tc13_delete_campaign_without_donation(self):
        """TC-13: Xóa thành công khi chiến dịch chưa có quyên góp (total_donated == 0)"""
        async def _test():
            async with AsyncSessionLocal() as session:
                today = date.today()
                camp = FundraiserCampaign(
                    creator_id=self.test_user.user_id,
                    title="Test Chiến Dịch Chưa Có Tiền",
                    description="Mô tả",
                    district="Quận 1",
                    target_amount=1000000,
                    end_date=today + timedelta(days=10),
                    bank_account_name="A",
                    bank_account_number="1",
                    bank_name="B",
                    status=FundraiserStatus.APPROVED.value,
                )
                session.add(camp)
                await session.commit()

                res = await FundraiserService.delete_campaign(session, camp.campaign_id, self.test_user)
                self.assertTrue(res)

                # Sau khi xóa, truy cập chi tiết báo 404
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.get_campaign_detail(session, camp.campaign_id, self.test_user)
                self.assertEqual(cm.exception.status_code, 404)
        self.run_async(_test())

    def test_tc14_cannot_delete_campaign_with_donation_must_close(self):
        """TC-14: Chiến dịch đã có tiền quyên góp thì CẤM XOÁ, phải chọn Kết thúc sớm"""
        async def _test():
            async with AsyncSessionLocal() as session:
                res = await session.execute(
                    select(FundraiserCampaign).where(
                        FundraiserCampaign.creator_id == self.test_user.user_id,
                        FundraiserCampaign.total_donated > 0,
                        FundraiserCampaign.is_deleted.is_(False),
                    ).limit(1)
                )
                camp = res.scalar_one()

                # Cố xóa -> Phải raise lỗi 400
                with self.assertRaises(HTTPException) as cm:
                    await FundraiserService.delete_campaign(session, camp.campaign_id, self.test_user)
                self.assertEqual(cm.exception.status_code, 400)
                self.assertIn("Chiến dịch đã nhận quyên góp nên không thể xoá", str(cm.exception.detail))

                # Đổi sang kết thúc sớm -> Thành công
                closed_item = await FundraiserService.close_campaign(session, camp.campaign_id, self.test_user)
                self.assertEqual(closed_item.status, FundraiserStatus.CLOSED.value)
        self.run_async(_test())


if __name__ == "__main__":
    unittest.main()
