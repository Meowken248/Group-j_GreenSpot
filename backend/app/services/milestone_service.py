"""
GreenSpot Business Service - Milestone Celebration & Tier Progression (Chức năng 36)
Xử lý nghiệp vụ:
- Lộ trình thăng cấp danh hiệu Công dân Xanh (Màn 3).
- Ngữ cảnh chúc mừng thăng cấp & hiệu ứng vinh danh (Màn 1).
- Tự tạo bài chúc mừng thành tích lên Bảng tin cộng đồng Geo-Feed (Màn 2).
"""

import uuid
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.milestone import MilestonePost
from app.services.reward_service import TIERS_CONFIG, calculate_tier_details
from app.schemas.milestone import (
    TierDetailItem,
    MilestoneProgressionResponse,
    CreateMilestonePostRequest,
    CreateMilestonePostResponse,
    MilestonePostItem,
    MilestonePostListResponse,
)


class MilestoneService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_tier_progression(self, user_id: uuid.UUID) -> MilestoneProgressionResponse:
        """
        Lấy dữ liệu lộ trình các cấp (Màn 3) và ngữ cảnh chúc mừng thăng cấp (Màn 1)
        Báo cáo Bảng 149 & Bảng 151.
        """
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin công dân trên hệ thống",
            )

        current_points = user.green_points or 0
        cur_tier, nxt_tier, pts_needed, progress = calculate_tier_details(current_points)

        # Build list of all tiers with status
        all_tier_items: List[TierDetailItem] = []
        for t in TIERS_CONFIG:
            tier_item = TierDetailItem(
                tier_code=t["tier_code"],
                tier_name=t["tier_name"],
                min_points=t["min_points"],
                badge_icon=t["badge_icon"],
                color_hex=t["color_hex"],
                bg_gradient=t["bg_gradient"],
                description=t["description"],
                benefits=t["benefits"],
                is_current=(t["tier_code"] == cur_tier.tier_code),
                is_unlocked=(current_points >= t["min_points"]),
            )
            all_tier_items.append(tier_item)

        current_tier_item = next((ti for ti in all_tier_items if ti.tier_code == cur_tier.tier_code), all_tier_items[0])
        next_tier_item = next((ti for ti in all_tier_items if nxt_tier and ti.tier_code == nxt_tier.tier_code), None)

        is_max = (cur_tier.tier_code == "DIAMOND" or next_tier_item is None)
        max_tier_msg = (
            "Bạn đã đạt danh hiệu cao nhất: Đại sứ Môi trường Kim Cương!" if is_max else None
        )

        # Lời chúc theo Bảng 149: "Chúc mừng bạn đã thăng lên cấp {tên danh hiệu}!"
        congratulation_msg = f"Chúc mừng bạn đã thăng lên cấp {cur_tier.tier_name}!"

        # Mẫu bài đăng theo Báo cáo P[1953] & Bảng 150
        default_content = (
            f"Tôi vừa chính thức thăng cấp lên {cur_tier.tier_name}! "
            "Cùng chung tay hành động vì một thành phố xanh - sạch - đẹp nhé! 🌱✨"
        )

        return MilestoneProgressionResponse(
            current_points=current_points,
            current_tier=current_tier_item,
            next_tier=next_tier_item,
            points_needed=pts_needed,
            progress_percent=100.0 if is_max else progress,
            is_max_tier=is_max,
            max_tier_message=max_tier_msg,
            all_tiers=all_tier_items,
            congratulation_message=congratulation_msg,
            default_post_content=default_content,
        )

    async def create_milestone_post(
        self, user_id: uuid.UUID, request: CreateMilestonePostRequest
    ) -> CreateMilestonePostResponse:
        """
        Đăng bài chúc mừng vinh danh tự tạo lên bảng tin (Màn 2, Bảng 150)
        """
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin công dân",
            )

        # Tìm thông tin cấp bậc
        tier_cfg = next((t for t in TIERS_CONFIG if t["tier_code"] == request.tier_code), None)
        if not tier_cfg:
            # Fallback to current tier
            cur_tier, _, _, _ = calculate_tier_details(user.green_points or 0)
            tier_cfg = next((t for t in TIERS_CONFIG if t["tier_code"] == cur_tier.tier_code), TIERS_CONFIG[0])

        new_post = MilestonePost(
            user_id=user_id,
            tier_code=tier_cfg["tier_code"],
            tier_name=tier_cfg["tier_name"],
            content=request.content.strip(),
            privacy=request.privacy if request.privacy in ["PUBLIC", "FRIENDS", "PRIVATE"] else "PUBLIC",
            category="Vinh danh lên cấp",
            likes_count=0,
        )
        self.db.add(new_post)
        await self.db.commit()
        await self.db.refresh(new_post)

        post_item = MilestonePostItem(
            post_id=str(new_post.post_id),
            user_id=str(user.user_id),
            user_name=user.full_name or "Công dân Xanh",
            avatar_url=user.avatar_url,
            tier_code=new_post.tier_code,
            tier_name=new_post.tier_name,
            badge_icon=tier_cfg["badge_icon"],
            color_hex=tier_cfg["color_hex"],
            content=new_post.content,
            privacy=new_post.privacy,
            category=new_post.category,
            likes_count=new_post.likes_count,
            created_at=new_post.created_at,
        )

        return CreateMilestonePostResponse(
            success=True,
            message="Đã đăng bài chia sẻ thành tích lên bảng tin",
            post=post_item,
        )

    async def get_milestone_posts(
        self, limit: int = 20, offset: int = 0
    ) -> MilestonePostListResponse:
        """Lấy danh sách các bài viết vinh danh thăng cấp trên Bảng tin cộng đồng"""
        query = (
            select(MilestonePost)
            .where(MilestonePost.privacy != "PRIVATE")
            .order_by(desc(MilestonePost.created_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(query)
        posts = result.scalars().all()

        items: List[MilestonePostItem] = []
        for p in posts:
            tier_cfg = next((t for t in TIERS_CONFIG if t["tier_code"] == p.tier_code), TIERS_CONFIG[0])
            items.append(
                MilestonePostItem(
                    post_id=str(p.post_id),
                    user_id=str(p.user_id),
                    user_name=p.user.full_name if p.user and p.user.full_name else "Công dân Xanh",
                    avatar_url=p.user.avatar_url if p.user else None,
                    tier_code=p.tier_code,
                    tier_name=p.tier_name,
                    badge_icon=tier_cfg["badge_icon"],
                    color_hex=tier_cfg["color_hex"],
                    content=p.content,
                    privacy=p.privacy,
                    category=p.category,
                    likes_count=p.likes_count,
                    created_at=p.created_at,
                )
            )

        # Total count
        count_q = select(func.count(MilestonePost.post_id)).where(MilestonePost.privacy != "PRIVATE")
        total_res = await self.db.execute(count_q)
        total = total_res.scalar() or 0

        return MilestonePostListResponse(total=total, items=items)

    async def like_milestone_post(self, post_id: uuid.UUID) -> int:
        """Thả cảm xúc sinh thái cho bài vinh danh (STT 10 & 36)"""
        post = await self.db.get(MilestonePost, post_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài viết vinh danh",
            )
        post.likes_count += 1
        await self.db.commit()
        await self.db.refresh(post)
        return post.likes_count
