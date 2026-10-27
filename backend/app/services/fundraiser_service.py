import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit_log import AuditLog
from app.models.fundraiser import (
    FundraiserCampaign,
    FundraiserDonation,
    FundraiserExpense,
    FundraiserStatus,
)
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


def _check_is_admin(user: Optional[User]) -> bool:
    if not user:
        return False
    if getattr(user, "role_id", None) == 1:
        return True
    role_obj = user.__dict__.get("role")
    if role_obj and getattr(role_obj, "role_name", "") == "admin":
        return True
    return False


class FundraiserService:
    @staticmethod
    def _to_campaign_item(camp: FundraiserCampaign, current_user: Optional[User] = None) -> FundraiserCampaignItem:
        today = date.today()
        days_left = max(0, (camp.end_date - today).days)
        percent = round((camp.total_donated / camp.target_amount) * 100, 1) if camp.target_amount > 0 else 0.0
        remaining = max(0, camp.total_donated - camp.total_spent)

        is_admin = _check_is_admin(current_user)
        is_creator = bool(current_user and current_user.user_id == camp.creator_id)

        creator_name = getattr(camp.creator, "full_name", None) if camp.creator else None
        creator_avatar = getattr(camp.creator, "avatar_url", None) if camp.creator else None

        return FundraiserCampaignItem(
            campaign_id=camp.campaign_id,
            creator_id=camp.creator_id,
            creator_name=creator_name,
            creator_avatar=creator_avatar,
            title=camp.title,
            description=camp.description,
            cover_image_url=camp.cover_image_url,
            target_amount=camp.target_amount,
            total_donated=camp.total_donated,
            donation_count=camp.donation_count,
            total_spent=camp.total_spent,
            district=camp.district,
            end_date=camp.end_date,
            status=camp.status,
            rejection_reason=camp.rejection_reason,
            days_left=days_left,
            percent_achieved=percent,
            remaining_balance=remaining,
            created_at=camp.created_at,
            bank_account_name=camp.bank_account_name if (is_admin or is_creator) else None,
            bank_account_number=camp.bank_account_number if (is_admin or is_creator) else None,
            bank_name=camp.bank_name if (is_admin or is_creator) else None,
        )

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
        query = (
            select(FundraiserCampaign)
            .options(selectinload(FundraiserCampaign.creator))
            .where(FundraiserCampaign.is_deleted.is_(False))
        )

        is_admin = _check_is_admin(current_user)

        if my_campaigns_only:
            if not current_user:
                return [], 0
            query = query.where(FundraiserCampaign.creator_id == current_user.user_id)
        elif not is_admin:
            if current_user:
                query = query.where(
                    or_(
                        FundraiserCampaign.status.in_([
                            FundraiserStatus.APPROVED.value,
                            FundraiserStatus.COMPLETED.value,
                            FundraiserStatus.CLOSED.value,
                        ]),
                        FundraiserCampaign.creator_id == current_user.user_id,
                    )
                )
            else:
                query = query.where(
                    FundraiserCampaign.status.in_([
                        FundraiserStatus.APPROVED.value,
                        FundraiserStatus.COMPLETED.value,
                        FundraiserStatus.CLOSED.value,
                    ])
                )

        if status_filter:
            norm_status = status_filter.lower().strip()
            if norm_status in ["đang gây quỹ", "approved"]:
                query = query.where(FundraiserCampaign.status == FundraiserStatus.APPROVED.value)
            elif norm_status in ["đã hoàn thành", "completed"]:
                query = query.where(FundraiserCampaign.status == FundraiserStatus.COMPLETED.value)
            elif norm_status in ["đã kết thúc", "closed"]:
                query = query.where(FundraiserCampaign.status == FundraiserStatus.CLOSED.value)
            elif norm_status in ["chờ duyệt", "pending"]:
                query = query.where(FundraiserCampaign.status == FundraiserStatus.PENDING.value)
            else:
                query = query.where(FundraiserCampaign.status == norm_status)

        if district_filter and district_filter.strip() and district_filter != "Tất cả":
            query = query.where(FundraiserCampaign.district.ilike(f"%{district_filter.strip()}%"))

        if search and search.strip():
            query = query.where(FundraiserCampaign.title.ilike(f"%{search.strip()}%"))

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        query = query.order_by(FundraiserCampaign.end_date.asc(), FundraiserCampaign.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        campaigns = result.scalars().all()

        items = [cls._to_campaign_item(c, current_user) for c in campaigns]
        return items, total

    @classmethod
    async def get_campaign_detail(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: Optional[User] = None,
    ) -> FundraiserCampaignItem:
        query = (
            select(FundraiserCampaign)
            .options(selectinload(FundraiserCampaign.creator))
            .where(
                FundraiserCampaign.campaign_id == campaign_id,
                FundraiserCampaign.is_deleted.is_(False),
            )
        )
        result = await db.execute(query)
        camp = result.scalar_one_or_none()

        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        is_admin = _check_is_admin(current_user)
        is_creator = bool(current_user and current_user.user_id == camp.creator_id)

        if camp.status in [FundraiserStatus.PENDING.value, FundraiserStatus.REJECTED.value]:
            if not (is_admin or is_creator):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Chiến dịch đang chờ duyệt hoặc bạn không có quyền xem",
                )

        return cls._to_campaign_item(camp, current_user)

    @classmethod
    async def create_campaign(
        cls,
        db: AsyncSession,
        req: FundraiserCampaignCreateRequest,
        current_user: User,
    ) -> FundraiserCampaignItem:
        today = date.today()
        min_date = today + timedelta(days=1)
        max_date = today + timedelta(days=90)
        if req.end_date < min_date or req.end_date > max_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hạn chót phải từ ngày mai và tối đa 90 ngày",
            )

        pending_count_query = select(func.count()).select_from(FundraiserCampaign).where(
            FundraiserCampaign.creator_id == current_user.user_id,
            FundraiserCampaign.status == FundraiserStatus.PENDING.value,
            FundraiserCampaign.is_deleted.is_(False),
        )
        pending_count = (await db.execute(pending_count_query)).scalar_one()
        if pending_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đang có 3 chiến dịch chờ duyệt. Vui lòng đợi duyệt xong",
            )

        new_camp = FundraiserCampaign(
            creator_id=current_user.user_id,
            title=req.title,
            description=req.description,
            cover_image_url=req.cover_image_url,
            target_amount=req.target_amount,
            district=req.district,
            end_date=req.end_date,
            bank_account_name=req.bank_account_name,
            bank_account_number=req.bank_account_number,
            bank_name=req.bank_name,
            status=FundraiserStatus.PENDING.value,
        )
        db.add(new_camp)
        await db.flush()

        audit = AuditLog(
            user_id=current_user.user_id,
            user_email=current_user.email,
            action="CREATE_FUNDRAISER_CAMPAIGN",
            table_name="fundraiser_campaigns",
            record_id=str(new_camp.campaign_id),
            new_values={
                "title": new_camp.title,
                "target_amount": new_camp.target_amount,
                "district": new_camp.district,
                "end_date": str(new_camp.end_date),
            },
        )
        db.add(audit)
        await db.commit()

        return await cls.get_campaign_detail(db, new_camp.campaign_id, current_user)

    @classmethod
    async def update_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserCampaignUpdateRequest,
        current_user: User,
    ) -> FundraiserCampaignItem:
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        if camp.creator_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa chiến dịch này",
            )

        if camp.total_donated > 0:
            if (
                req.title is not None and req.title != camp.title
            ) or (
                req.target_amount is not None and req.target_amount != camp.target_amount
            ) or (
                req.end_date is not None and req.end_date != camp.end_date
            ) or (
                req.district is not None and req.district != camp.district
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Chiến dịch đã nhận quyên góp, chỉ có thể bổ sung mô tả",
                )

        if req.title is not None:
            camp.title = req.title.strip()
        if req.description is not None:
            camp.description = req.description.strip()
        if req.district is not None:
            camp.district = req.district
        if req.target_amount is not None and req.target_amount > 0:
            camp.target_amount = req.target_amount
        if req.end_date is not None:
            camp.end_date = req.end_date
        if req.cover_image_url is not None:
            camp.cover_image_url = req.cover_image_url

        await db.commit()
        return await cls.get_campaign_detail(db, camp.campaign_id, current_user)

    @classmethod
    async def donate(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserDonationCreateRequest,
        current_user: Optional[User] = None,
    ) -> FundraiserDonationItem:
        today = date.today()
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        if camp.status == FundraiserStatus.CLOSED.value or camp.end_date < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chiến dịch đã kết thúc, không thể nhận thêm quyên góp",
            )

        if camp.status not in [FundraiserStatus.APPROVED.value, FundraiserStatus.COMPLETED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chiến dịch chưa được duyệt nên không thể quyên góp",
            )

        donor_name = "Mạnh thường quân ẩn danh" if req.is_anonymous else (
            current_user.full_name if current_user and current_user.full_name else "Mạnh thường quân"
        )

        txn_code = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        donation = FundraiserDonation(
            campaign_id=camp.campaign_id,
            donor_id=current_user.user_id if current_user else None,
            donor_name=donor_name,
            amount=req.amount,
            message=req.message,
            is_anonymous=req.is_anonymous,
            payment_status="completed",
            transaction_code=txn_code,
        )
        db.add(donation)

        camp.total_donated += req.amount
        camp.donation_count += 1

        if camp.total_donated >= camp.target_amount and camp.status == FundraiserStatus.APPROVED.value:
            camp.status = FundraiserStatus.COMPLETED.value

        audit = AuditLog(
            user_id=current_user.user_id if current_user else None,
            user_email=current_user.email if current_user else "anonymous@donation.org",
            action="DONATE_FUND",
            table_name="fundraiser_donations",
            record_id=str(donation.donation_id),
            new_values={
                "campaign_id": str(camp.campaign_id),
                "amount": req.amount,
                "is_anonymous": req.is_anonymous,
                "transaction_code": txn_code,
            },
        )
        db.add(audit)
        await db.commit()
        await db.refresh(donation)

        return FundraiserDonationItem(
            donation_id=donation.donation_id,
            donor_name=donation.donor_name,
            amount=donation.amount,
            message=donation.message,
            is_anonymous=donation.is_anonymous,
            created_at=donation.created_at,
        )

    @classmethod
    async def list_donations(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> List[FundraiserDonationItem]:
        query = (
            select(FundraiserDonation)
            .where(
                FundraiserDonation.campaign_id == campaign_id,
                FundraiserDonation.payment_status == "completed",
            )
            .order_by(FundraiserDonation.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        donations = result.scalars().all()

        return [
            FundraiserDonationItem(
                donation_id=d.donation_id,
                donor_name=d.donor_name,
                amount=d.amount,
                message=d.message,
                is_anonymous=d.is_anonymous,
                created_at=d.created_at,
            )
            for d in donations
        ]

    @classmethod
    async def add_expense(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserExpenseCreateRequest,
        current_user: User,
    ) -> FundraiserExpenseItem:
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        if camp.creator_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ người tạo chiến dịch mới có quyền cập nhật báo cáo chi tiêu",
            )

        if camp.total_spent + req.amount > camp.total_donated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tổng chi không được vượt số tiền đã quyên",
            )

        expense = FundraiserExpense(
            campaign_id=camp.campaign_id,
            content=req.content,
            amount=req.amount,
            expense_date=req.expense_date,
            proof_image_url=req.proof_image_url,
            created_by=current_user.user_id,
        )
        db.add(expense)

        camp.total_spent += req.amount

        audit = AuditLog(
            user_id=current_user.user_id,
            user_email=current_user.email,
            action="ADD_EXPENSE",
            table_name="fundraiser_expenses",
            record_id=str(expense.expense_id),
            new_values={
                "campaign_id": str(camp.campaign_id),
                "content": req.content,
                "amount": req.amount,
                "expense_date": str(req.expense_date),
            },
        )
        db.add(audit)
        await db.commit()
        await db.refresh(expense)

        return FundraiserExpenseItem(
            expense_id=expense.expense_id,
            content=expense.content,
            amount=expense.amount,
            expense_date=expense.expense_date,
            proof_image_url=expense.proof_image_url,
            created_at=expense.created_at,
        )

    @classmethod
    async def list_expenses(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
    ) -> List[FundraiserExpenseItem]:
        query = (
            select(FundraiserExpense)
            .where(FundraiserExpense.campaign_id == campaign_id)
            .order_by(FundraiserExpense.expense_date.desc(), FundraiserExpense.created_at.desc())
        )
        result = await db.execute(query)
        expenses = result.scalars().all()

        return [
            FundraiserExpenseItem(
                expense_id=e.expense_id,
                content=e.content,
                amount=e.amount,
                expense_date=e.expense_date,
                proof_image_url=e.proof_image_url,
                created_at=e.created_at,
            )
            for e in expenses
        ]

    @classmethod
    async def close_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: User,
    ) -> FundraiserCampaignItem:
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        is_admin = _check_is_admin(current_user)
        if not (is_admin or camp.creator_id == current_user.user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền kết thúc chiến dịch này",
            )

        camp.status = FundraiserStatus.CLOSED.value

        audit = AuditLog(
            user_id=current_user.user_id,
            user_email=current_user.email,
            action="CLOSE_CAMPAIGN",
            table_name="fundraiser_campaigns",
            record_id=str(camp.campaign_id),
            new_values={"status": "closed"},
        )
        db.add(audit)
        await db.commit()

        return await cls.get_campaign_detail(db, camp.campaign_id, current_user)

    @classmethod
    async def delete_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        current_user: User,
    ) -> bool:
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại hoặc bạn không có quyền",
            )

        is_admin = _check_is_admin(current_user)
        if not (is_admin or camp.creator_id == current_user.user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chiến dịch không còn tồn tại hoặc bạn không có quyền",
            )

        if camp.total_donated > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chiến dịch đã nhận quyên góp nên không thể xoá. Bạn có thể kết thúc sớm chiến dịch",
            )

        camp.is_deleted = True

        audit = AuditLog(
            user_id=current_user.user_id,
            user_email=current_user.email,
            action="DELETE_CAMPAIGN",
            table_name="fundraiser_campaigns",
            record_id=str(camp.campaign_id),
            new_values={"is_deleted": True},
        )
        db.add(audit)
        await db.commit()
        return True

    @classmethod
    async def review_campaign(
        cls,
        db: AsyncSession,
        campaign_id: uuid.UUID,
        req: FundraiserApprovalRequest,
        current_admin: User,
    ) -> FundraiserCampaignItem:
        query = select(FundraiserCampaign).where(
            FundraiserCampaign.campaign_id == campaign_id,
            FundraiserCampaign.is_deleted.is_(False),
        )
        camp = (await db.execute(query)).scalar_one_or_none()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chiến dịch không còn tồn tại",
            )

        if req.action == "approve":
            camp.status = FundraiserStatus.APPROVED.value
            camp.rejection_reason = None
        elif req.action == "reject":
            if not req.rejection_reason or not req.rejection_reason.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng cung cấp lý do từ chối chiến dịch",
                )
            camp.status = FundraiserStatus.REJECTED.value
            camp.rejection_reason = req.rejection_reason.strip()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hành động kiểm duyệt không hợp lệ",
            )

        audit = AuditLog(
            user_id=current_admin.user_id,
            user_email=current_admin.email,
            action="REVIEW_CAMPAIGN",
            table_name="fundraiser_campaigns",
            record_id=str(camp.campaign_id),
            new_values={"status": camp.status, "rejection_reason": camp.rejection_reason},
        )
        db.add(audit)
        await db.commit()
        return await cls.get_campaign_detail(db, camp.campaign_id, current_admin)
