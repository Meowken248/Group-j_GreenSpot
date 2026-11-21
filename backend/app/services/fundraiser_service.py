"""
GreenSpot Business Service - Fundraiser Campaign Service (STT 20)
[MOCK/STUB MODE]
Giữ nguyên Schemas & signatures để Admin/User không bị gián đoạn.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import User
from app.schemas.fundraiser import (
    FundraiserApprovalRequest,
    FundraiserCampaignCreateRequest,
    FundraiserCampaignItem,
    FundraiserCampaignUpdateRequest,
    FundraiserDonationCreateRequest,
    FundraiserDonationItem,
    FundraiserExpenseCreateRequest,
    FundraiserExpenseItem,
)


def _mock_campaign_item(campaign_id: Optional[uuid.UUID] = None) -> FundraiserCampaignItem:
    cid = campaign_id or uuid.uuid4()
    return FundraiserCampaignItem(
        campaign_id=cid,
        creator_id=uuid.uuid4(),
        creator_name="Người tạo mẫu",
        creator_avatar=None,
        title="Chiến dịch gây quỹ mẫu (Mock)",
        description="Mô tả chiến dịch gây quỹ môi trường mẫu",
        cover_image_url=None,
        target_amount=10000000,
        total_donated=0,
        donation_count=0,
        total_spent=0,
        district="Quận 1",
        end_date=date.today() + timedelta(days=30),
        status="approved",
        rejection_reason=None,
        days_left=30,
        percent_achieved=0.0,
        remaining_balance=0,
        created_at=datetime.now(timezone.utc),
        bank_account_name="GREENSPOT FUND",
        bank_account_number="123456789",
        bank_name="Vietcombank",
    )


class FundraiserService:
    @classmethod
    async def list_campaigns(
        cls,
        db: AsyncSession,
        status_filter: Optional[str] = None,
        district_filter: Optional[str] = None,
        search: Optional[str] = None,
        my_campaigns_only: bool = False,
        current_user: Optional[User] = None,
        page: int = 1,
        page_size: int = 12,
    ) -> Tuple[List[FundraiserCampaignItem], int]:
        """Mock/Stub: Danh sách chiến dịch gây quỹ (STT 20)"""
        return [], 0

    @classmethod
    async def get_campaign_detail(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> FundraiserCampaignItem:
        """Mock/Stub: Chi tiết chiến dịch gây quỹ (STT 20)"""
        return _mock_campaign_item(campaign_id)

    @classmethod
    async def create_campaign(
        cls,
        db: AsyncSession,
        req: FundraiserCampaignCreateRequest,
        current_user: User,
    ) -> FundraiserCampaignItem:
        """Mock/Stub: Tạo chiến dịch gây quỹ mới (STT 20)"""
        item = _mock_campaign_item()
        item.title = req.title
        item.target_amount = req.target_amount
        item.district = req.district
        return item

    @classmethod
    async def update_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserCampaignUpdateRequest,
        current_user: User,
    ) -> FundraiserCampaignItem:
        """Mock/Stub: Cập nhật chiến dịch gây quỹ (STT 20)"""
        return _mock_campaign_item(campaign_id)

    @classmethod
    async def donate(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserDonationCreateRequest,
        current_user: Optional[User] = None,
    ) -> FundraiserDonationItem:
        """Mock/Stub: Quyên góp quỹ (STT 20)"""
        return FundraiserDonationItem(
            donation_id=uuid.uuid4(),
            donor_name="Mạnh thường quân (Mock)",
            amount=req.amount,
            message=req.message,
            is_anonymous=req.is_anonymous,
            created_at=datetime.now(timezone.utc),
        )

    @classmethod
    async def list_donations(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> List[FundraiserDonationItem]:
        """Mock/Stub: Danh sách quyên góp (STT 20)"""
        return []

    @classmethod
    async def add_expense(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserExpenseCreateRequest,
        current_user: User,
    ) -> FundraiserExpenseItem:
        """Mock/Stub: Thêm báo cáo chi tiêu (STT 20)"""
        return FundraiserExpenseItem(
            expense_id=uuid.uuid4(),
            content=req.content,
            amount=req.amount,
            expense_date=req.expense_date,
            proof_image_url=req.proof_image_url,
            created_at=datetime.now(timezone.utc),
        )

    @classmethod
    async def list_expenses(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
    ) -> List[FundraiserExpenseItem]:
        """Mock/Stub: Danh sách chi tiêu (STT 20)"""
        return []

    @classmethod
    async def close_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: User,
    ) -> FundraiserCampaignItem:
        """Mock/Stub: Đóng chiến dịch gây quỹ (STT 20)"""
        item = _mock_campaign_item(campaign_id)
        item.status = "closed"
        return item

    @classmethod
    async def delete_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: User,
    ) -> bool:
        """Mock/Stub: Xóa mềm chiến dịch gây quỹ (STT 20)"""
        return True

    @classmethod
    async def review_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserApprovalRequest,
        current_admin: User,
    ) -> FundraiserCampaignItem:
        """Mock/Stub: Phê duyệt/từ chối chiến dịch gây quỹ (STT 20)"""
        item = _mock_campaign_item(campaign_id)
        item.status = "approved" if req.action == "approve" else "rejected"
        return item
