"""Router API cho Chức năng 20: Gây quỹ cộng đồng (Fundraiser)
Tài liệu căn cứ: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 160 - 168)
"""

import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Header, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import UPLOAD_DIR
from app.database import get_db
from app.api.v1.auth import decode_access_token
from app.api.v1.rbac import get_current_active_user as get_current_user, require_admin_user
from app.models.rbac import User
from app.schemas.fundraiser import (
    FundraiserApprovalRequest,
    FundraiserCampaignCreateRequest,
    FundraiserCampaignItem,
    FundraiserCampaignListResponse,
    FundraiserCampaignUpdateRequest,
    FundraiserDonationCreateRequest,
    FundraiserDonationItem,
    FundraiserExpenseCreateRequest,
    FundraiserExpenseItem,
)
from app.services.fundraiser_service import FundraiserService

router = APIRouter(prefix="/fundraisers", tags=["Fundraiser - Feature 20"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5MB theo đặc tả Màn 2 & Màn 5


async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    try:
        u_uuid = uuid.UUID(uid)
        res = await db.execute(select(User).where(User.user_id == u_uuid, User.deleted_at.is_(None)))
        return res.scalar_one_or_none()
    except Exception:
        return None


@router.post(
    "/upload-image",
    summary="Tải lên ảnh bìa hoặc ảnh chứng từ minh chứng (JPG/PNG, tối đa 5MB)",
)
async def upload_fundraiser_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    original_name = file.filename or "image"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ảnh không hợp lệ (chỉ nhận JPG, PNG, tối đa 5MB)",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp ảnh rỗng, vui lòng chọn ảnh khác",
        )

    folder = os.path.join(UPLOAD_DIR, "fundraisers")
    os.makedirs(folder, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(folder, unique_name)
    with open(file_path, "wb") as out_file:
        out_file.write(content)

    return {"url": f"/uploads/fundraisers/{unique_name}"}


@router.get(
    "",
    response_model=FundraiserCampaignListResponse,
    summary="Lấy danh sách chiến dịch gây quỹ kèm bộ lọc (Màn 1)",
)
async def list_campaigns(
    status: Optional[str] = Query(None, description="Lọc trạng thái: Đang gây quỹ, Đã hoàn thành, Đã kết thúc"),
    district: Optional[str] = Query(None, description="Lọc theo 22 quận/huyện TP.HCM"),
    search: Optional[str] = Query(None, description="Tìm theo tên chiến dịch"),
    my_campaigns: bool = Query(False, description="Chỉ lấy chiến dịch do tôi tạo"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(12, ge=1, le=100, description="Số mục mỗi trang (mặc định 12)"),
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    items, total = await FundraiserService.list_campaigns(
        db=db,
        status_filter=status,
        district_filter=district,
        search=search,
        my_campaigns_only=my_campaigns,
        current_user=optional_user,
        page=page,
        page_size=page_size,
    )
    return FundraiserCampaignListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=FundraiserCampaignItem,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo chiến dịch gây quỹ mới (Màn 2)",
)
async def create_campaign(
    req: FundraiserCampaignCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.create_campaign(
        db=db,
        req=req,
        current_user=current_user,
    )


@router.get(
    "/{campaign_id}",
    response_model=FundraiserCampaignItem,
    summary="Xem chi tiết chiến dịch gây quỹ (Màn 3)",
)
async def get_campaign(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user),
):
    return await FundraiserService.get_campaign_detail(
        db=db,
        campaign_id=campaign_id,
        current_user=optional_user,
    )


@router.put(
    "/{campaign_id}",
    response_model=FundraiserCampaignItem,
    summary="Chỉnh sửa chiến dịch gây quỹ",
)
async def update_campaign(
    campaign_id: uuid.UUID,
    req: FundraiserCampaignUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.update_campaign(
        db=db,
        campaign_id=campaign_id,
        req=req,
        current_user=current_user,
    )


@router.delete(
    "/{campaign_id}",
    summary="Xóa chiến dịch (Chỉ khi CHƯA có quyên góp - Màn 6)",
)
async def delete_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await FundraiserService.delete_campaign(
        db=db,
        campaign_id=campaign_id,
        current_user=current_user,
    )
    return {"message": "Đã xoá chiến dịch"}


@router.post(
    "/{campaign_id}/close",
    response_model=FundraiserCampaignItem,
    summary="Kết thúc sớm chiến dịch (Khi ĐÃ có quyên góp - Màn 6)",
)
async def close_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.close_campaign(
        db=db,
        campaign_id=campaign_id,
        current_user=current_user,
    )


@router.post(
    "/{campaign_id}/donate",
    response_model=FundraiserDonationItem,
    summary="Quyên góp tài chính cho chiến dịch (Màn 4)",
)
async def donate_to_campaign(
    campaign_id: uuid.UUID,
    req: FundraiserDonationCreateRequest,
    optional_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.donate(
        db=db,
        campaign_id=campaign_id,
        req=req,
        current_user=optional_user,
    )


@router.get(
    "/{campaign_id}/donations",
    response_model=List[FundraiserDonationItem],
    summary="Lấy danh sách người quyên góp cho chiến dịch (Màn 3 Tab 2)",
)
async def list_donations(
    campaign_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.list_donations(
        db=db,
        campaign_id=campaign_id,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/{campaign_id}/expenses",
    response_model=FundraiserExpenseItem,
    summary="Thêm khoản chi vào báo cáo sử dụng quỹ (Màn 5)",
)
async def add_expense(
    campaign_id: uuid.UUID,
    req: FundraiserExpenseCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.add_expense(
        db=db,
        campaign_id=campaign_id,
        req=req,
        current_user=current_user,
    )


@router.get(
    "/{campaign_id}/expenses",
    response_model=List[FundraiserExpenseItem],
    summary="Lấy danh sách khoản chi báo cáo sử dụng quỹ (Màn 5)",
)
async def list_expenses(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.list_expenses(
        db=db,
        campaign_id=campaign_id,
    )


@router.post(
    "/{campaign_id}/review",
    response_model=FundraiserCampaignItem,
    summary="Quản trị viên duyệt hoặc từ chối chiến dịch gây quỹ",
)
async def review_campaign(
    campaign_id: uuid.UUID,
    req: FundraiserApprovalRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await FundraiserService.review_campaign(
        db=db,
        campaign_id=campaign_id,
        req=req,
        current_admin=current_admin,
    )

