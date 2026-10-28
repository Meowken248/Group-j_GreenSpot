"""
GreenSpot API Router - Bảng xếp hạng vinh danh Top Công dân Xanh (Chức năng 32)
Endpoints:
- GET /api/v1/gamification/leaderboard
- GET /api/v1/gamification/leaderboard/individual
- GET /api/v1/gamification/leaderboard/groups
- GET /api/v1/gamification/leaderboard/districts
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.utils.security import decode_access_token
from app.services.leaderboard_service import LeaderboardService
from app.schemas.leaderboard import (
    IndividualLeaderboardResponse,
    GroupLeaderboardResponse,
    DistrictLeaderboardResponse,
    CreateCommunityGroupRequest,
    UpdateCommunityGroupRequest,
    CommunityGroupResponse,
    LeaderboardSnapshotResponse,
)

router = APIRouter(prefix="/gamification/leaderboard", tags=["Bảng xếp hạng Công dân Xanh (32)"])

async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Trích xuất người dùng nếu có token; cho phép xem công khai nếu chưa đăng nhập"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    try:
        user_uuid = uuid.UUID(sub)
        user = await db.get(User, user_uuid)
        if user and user.status == "ACTIVE":
            return user
    except Exception:
        pass
    return None

@router.get("", response_model=IndividualLeaderboardResponse, summary="Xem Bảng xếp hạng cá nhân mặc định")
@router.get("/individual", response_model=IndividualLeaderboardResponse, summary="Bảng xếp hạng cá nhân Top 10 & Thứ hạng của tôi")
async def get_individual_leaderboard(
    district: Optional[str] = Query(None, description="Mã quận huyện để lọc (ví dụ QUAN_1, BINH_THANH) hoặc 'ALL'"),
    cycle: str = Query("ALL", description="Chu kỳ xếp hạng: WEEK | MONTH | ALL"),
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_id = user.user_id if user else None
    return await LeaderboardService.get_individual_leaderboard(db, current_id, district_code=district, cycle=cycle)

@router.get("/groups", response_model=GroupLeaderboardResponse, summary="Bảng xếp hạng nhóm tình nguyện")
async def get_group_leaderboard(
    cycle: str = Query("WEEK", description="Chu kỳ xếp hạng: WEEK | MONTH | ALL"),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.get_group_leaderboard(db, cycle)

@router.get("/districts", response_model=DistrictLeaderboardResponse, summary="Bảng xếp hạng 22 quận/huyện theo Chỉ số Xanh")
async def get_district_leaderboard(
    cycle: str = Query("WEEK", description="Chu kỳ xếp hạng: WEEK | MONTH | ALL"),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.get_district_leaderboard(db, cycle)

# --- ADMIN ENDPOINTS (CHỨC NĂNG 32) ---

@router.post("/admin/snapshot", response_model=LeaderboardSnapshotResponse, summary="[Admin] Chốt kết quả thi đua & Trao thưởng vinh danh Top 3")
async def admin_take_leaderboard_snapshot(
    cycle: str = Query("WEEK", description="Kỳ xếp hạng chốt kết quả: WEEK | MONTH"),
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.admin_take_snapshot(db, cycle=cycle, admin_id=admin.user_id)

@router.post("/admin/groups", response_model=CommunityGroupResponse, summary="[Admin] Tạo mới biệt đội / nhóm tình nguyện xanh")
async def admin_create_community_group(
    payload: CreateCommunityGroupRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.admin_create_group(db, payload, admin_id=admin.user_id)

@router.put("/admin/groups/{group_id}", response_model=CommunityGroupResponse, summary="[Admin] Cập nhật thông tin nhóm tình nguyện")
async def admin_update_community_group(
    group_id: str,
    payload: UpdateCommunityGroupRequest,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.admin_update_group(db, group_id, payload, admin_id=admin.user_id)

@router.delete("/admin/groups/{group_id}", summary="[Admin] Vô hiệu hóa nhóm tình nguyện")
async def admin_delete_community_group(
    group_id: str,
    admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    return await LeaderboardService.admin_delete_group(db, group_id, admin_id=admin.user_id)
