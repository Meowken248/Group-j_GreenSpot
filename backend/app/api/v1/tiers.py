"""
GreenSpot API Router - Quản trị Cột Mốc Cấp Bậc Công Dân Xanh (Chức năng 28, 32 & 36)
Endpoints:
- GET    /api/v1/gamification/tiers                 (Danh sách cấp bậc công khai)
- GET    /api/v1/gamification/tiers/admin/all       (Quản trị danh sách & thống kê công dân đạt hạng)
- POST   /api/v1/gamification/tiers/admin           (Thêm cấp bậc / hạng mới)
- PUT    /api/v1/gamification/tiers/admin/{tier_id} (Cập nhật hạng & điều chỉnh cột mốc điểm số)
- DELETE /api/v1/gamification/tiers/admin/{tier_id} (Xóa cấp bậc)
- POST   /api/v1/gamification/tiers/admin/reset-defaults (Khôi phục 5 cấp bậc chuẩn)
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.services.tier_service import TierService
from app.schemas.tier import (
    TierInfo,
    TierCreateRequest,
    TierUpdateRequest,
    TierListResponse,
    TierAdminResponse,
)

router = APIRouter(prefix="/gamification/tiers", tags=["Quản lý Cột mốc Cấp bậc & Điểm số (28, 32, 36)"])


@router.get("", response_model=TierListResponse, summary="Lấy danh sách các cột mốc cấp bậc công dân xanh")
async def get_active_tiers(
    db: AsyncSession = Depends(get_db),
):
    tiers = await TierService.get_all_tiers(db, active_only=True)
    return TierListResponse(total=len(tiers), tiers=tiers)


@router.get("/admin/all", response_model=TierListResponse, summary="[Admin] Quản trị danh sách các cấp bậc kèm thống kê số lượng công dân")
async def get_all_tiers_admin(
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tiers = await TierService.get_all_tiers(db, active_only=False, with_user_count=True)
    return TierListResponse(total=len(tiers), tiers=tiers)


@router.post("/admin", response_model=TierAdminResponse, status_code=status.HTTP_201_CREATED, summary="[Admin] Thêm cấp bậc danh hiệu mới")
async def create_tier(
    payload: TierCreateRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    new_tier = await TierService.create_tier(db, payload, admin_id=admin.user_id)
    return TierAdminResponse(
        tier=new_tier,
        message=f"Đã thêm thành công cấp bậc '{new_tier.tier_name}' với cột mốc {new_tier.min_points} điểm.",
    )


@router.put("/admin/{tier_id}", response_model=TierAdminResponse, summary="[Admin] Cập nhật cấp bậc & điều chỉnh cột mốc điểm số")
async def update_tier(
    tier_id: int,
    payload: TierUpdateRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await TierService.update_tier(db, tier_id, payload, admin_id=admin.user_id)
    return TierAdminResponse(
        tier=updated,
        message=f"Đã cập nhật thành công cấp bậc '{updated.tier_name}' (Cột mốc: {updated.min_points} điểm).",
    )


@router.delete("/admin/{tier_id}", summary="[Admin] Xóa cấp bậc danh hiệu")
async def delete_tier(
    tier_id: int,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await TierService.delete_tier(db, tier_id, admin_id=admin.user_id)


@router.post("/admin/reset-defaults", response_model=TierListResponse, summary="[Admin] Khôi phục bộ 5 cột mốc cấp bậc chuẩn mặc định")
async def reset_default_tiers(
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    tiers = await TierService.reset_default_tiers(db, admin_id=admin.user_id)
    return TierListResponse(total=len(tiers), tiers=tiers)
