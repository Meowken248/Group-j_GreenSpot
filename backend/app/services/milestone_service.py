"""
GreenSpot Business Service - Milestone Celebration & Tier Progression (STT 36)
[MOCK/STUB MODE]
Giữ nguyên Interface & Schemas để các module khác không bị lỗi.
"""

import uuid
from typing import List, Optional, Tuple, Dict, Any
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
        """Mock/Stub: Lấy dữ liệu lộ trình các cấp (STT 36)"""
        default_tier = TierDetailItem(
            tier_code="BRONZE",
            tier_name="Hạng Đồng",
            min_points=0,
            badge_icon="🥉",
            color_hex="#cd7f32",
            bg_gradient="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            description="Công dân Xanh khởi đầu (Mock)",
            benefits=["Tích lũy Điểm Xanh"],
            is_current=True,
            is_unlocked=True,
        )
        return MilestoneProgressionResponse(
            current_points=0,
            current_tier=default_tier,
            next_tier=None,
            points_needed=500,
            progress_percent=0.0,
            is_max_tier=False,
            max_tier_message=None,
            all_tiers=[default_tier],
            congratulation_message="Chúc mừng bạn đã thăng cấp!",
            default_post_content="Tôi vừa thăng cấp lên Hạng Đồng! 🌱",
        )

    async def create_milestone_post(
        self, user_id: uuid.UUID, request: CreateMilestonePostRequest
    ) -> CreateMilestonePostResponse:
        """Mock/Stub: Đăng bài vinh danh lên bảng tin (STT 36)"""
        post_item = MilestonePostItem(
            post_id=str(uuid.uuid4()),
            user_id=str(user_id),
            user_name="Công dân Xanh",
            avatar_url=None,
            tier_code=request.tier_code or "BRONZE",
            tier_name="Hạng Đồng",
            badge_icon="🥉",
            color_hex="#cd7f32",
            content=request.content or "Chia sẻ thành tích",
            privacy=request.privacy or "PUBLIC",
            category="Vinh danh lên cấp",
            likes_count=0,
            created_at=None,
        )
        return CreateMilestonePostResponse(
            success=True,
            message="Đã đăng bài chia sẻ thành tích lên bảng tin (Mock)",
            post=post_item,
        )

    async def get_milestone_posts(
        self, limit: int = 20, offset: int = 0
    ) -> MilestonePostListResponse:
        """Mock/Stub: Lấy danh sách bài vinh danh (STT 36)"""
        return MilestonePostListResponse(total=0, items=[])

    async def like_milestone_post(self, post_id: uuid.UUID) -> int:
        """Mock/Stub: Thả cảm xúc sinh thái bài vinh danh (STT 36)"""
        return 1
