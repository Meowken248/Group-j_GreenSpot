"""
GreenSpot API Router - Hiệu ứng thăng cấp danh hiệu & Bài vinh danh (Chức năng 36)
Endpoints:
- GET  /api/v1/gamification/milestone/progression (Màn 3 Lộ trình các cấp & Màn 1 Chúc mừng)
- POST /api/v1/gamification/milestone/post (Màn 2 Tự tạo bài chúc mừng lên bảng tin)
- GET  /api/v1/gamification/milestone/posts (Danh sách bài vinh danh trên cộng đồng)
- POST /api/v1/gamification/milestone/like/{post_id} (Thả cảm xúc sinh thái bài vinh danh)
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import get_current_active_user
from app.utils.security import decode_access_token
from app.services.milestone_service import MilestoneService
from app.schemas.milestone import (
    MilestoneProgressionResponse,
    CreateMilestonePostRequest,
    CreateMilestonePostResponse,
    MilestonePostListResponse,
)

router = APIRouter(prefix="/gamification/milestone", tags=["Hiệu ứng thăng cấp danh hiệu (36)"])


async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Lấy người dùng hiện tại nếu có token hợp lệ, nếu không trả về None"""
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


@router.get("/progression", response_model=MilestoneProgressionResponse, summary="Xem lộ trình các cấp và tiến độ thăng hạng (Màn 1 & Màn 3)")
async def get_progression(
    user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về dữ liệu lộ trình 4 cấp bậc, cấp hiện tại, tiến độ % và câu chúc mừng thăng cấp.
    Nếu chưa đăng nhập, sử dụng tài khoản mẫu đại diện để hiển thị lộ trình trực quan.
    """
    service = MilestoneService(db)
    if user:
        return await service.get_tier_progression(user.user_id)

    # Demo fallback user
    result = await db.execute(select(User).limit(1))
    demo_user = result.scalar_one_or_none()
    if demo_user:
        return await service.get_tier_progression(demo_user.user_id)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Không thể tải lộ trình cấp bậc. Vui lòng thử lại",
    )


@router.post("/post", response_model=CreateMilestonePostResponse, summary="Tự tạo bài chúc mừng thăng cấp chia sẻ lên bảng tin (Màn 2)")
async def create_milestone_post(
    request: CreateMilestonePostRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Đăng bài vinh danh lên Bảng tin cộng đồng (Geo-Feed) kèm nhãn 'Vinh danh lên cấp'.
    """
    service = MilestoneService(db)
    return await service.create_milestone_post(current_user.user_id, request)


@router.get("/posts", response_model=MilestonePostListResponse, summary="Lấy danh sách các bài vinh danh thăng cấp trên bảng tin")
async def get_milestone_posts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách các bài viết vinh danh thăng cấp công khai gần đây.
    """
    service = MilestoneService(db)
    return await service.get_milestone_posts(limit=limit, offset=offset)


@router.post("/like/{post_id}", summary="Thả cảm xúc sinh thái cho bài vinh danh")
async def like_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Tăng số lượt thả cảm xúc sinh thái chúc mừng bài vinh danh.
    """
    service = MilestoneService(db)
    new_likes = await service.like_milestone_post(post_id)
    return {"success": True, "post_id": str(post_id), "likes_count": new_likes}
