"""
GreenSpot Business Service - Citizen Tier & Milestone CRUD (Chức năng 28, 32 & 36)
Quản trị toàn diện cột mốc cấp bậc, điểm số xếp hạng và quyền lợi công dân xanh.
"""

import json
import logging
import uuid
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select, func, desc, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.tier import CitizenTier
from app.models.rbac import User
from app.models.audit import AuditLog
from app.schemas.tier import (
    TierInfo,
    TierCreateRequest,
    TierUpdateRequest,
    TierListResponse,
)

logger = logging.getLogger(__name__)

# Bộ 5 cấp bậc chuẩn mặc định
DEFAULT_TIERS_DATA: List[Dict[str, Any]] = [
    {
        "tier_code": "BRONZE",
        "tier_name": "Hạng Đồng",
        "min_points": 0,
        "badge_icon": "🥉",
        "color_hex": "#cd7f32",
        "bg_gradient": "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        "discount_percent": 0,
        "description": "Công dân Xanh khởi đầu - Bước đi đầu tiên bảo vệ môi trường TP.HCM",
        "benefits": [
            "Tích lũy Điểm Xanh từ mọi hoạt động môi trường",
            "Xem sổ cái ví điểm và sao kê điện tử minh bạch",
            "Đổi các quà tặng cơ bản trong danh mục",
        ],
        "order_index": 1,
    },
    {
        "tier_code": "SILVER",
        "tier_name": "Hạng Bạc",
        "min_points": 100,
        "badge_icon": "🥈",
        "color_hex": "#94a3b8",
        "bg_gradient": "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
        "discount_percent": 5,
        "description": "Công dân Xanh tích cực - Đóng góp bền bỉ cho khu dân cư",
        "benefits": [
            "Ưu tiên xử lý nhanh phản ánh sự cố môi trường",
            "Mở khóa đổi Voucher E-Commerce 30.000đ - 50.000đ",
            "Huy hiệu Bạc vinh danh trên bảng xếp hạng cộng đồng",
            "Giảm 5% điểm khi đổi quà tặng",
        ],
        "order_index": 2,
    },
    {
        "tier_code": "GOLD",
        "tier_name": "Hạng Vàng",
        "min_points": 250,
        "badge_icon": "🥇",
        "color_hex": "#f59e0b",
        "bg_gradient": "linear-gradient(135deg, #fef9c3 0%, #fde047 100%)",
        "discount_percent": 10,
        "description": "Công dân Xanh tiêu biểu - Nòng cốt tiên phong bảo vệ đô thị",
        "benefits": [
            "Giảm 10% số điểm khi đổi quà tặng Co.opmart & Grab",
            "Nhận giấy khen điện tử Công dân Xanh Xuất Sắc",
            "Tham gia các hội nghị đối thoại chính sách môi trường",
            "Ưu tiên cấp phát vật dụng tái chế gia đình",
        ],
        "order_index": 3,
    },
    {
        "tier_code": "PLATINUM",
        "tier_name": "Hạng Bạch Kim",
        "min_points": 400,
        "badge_icon": "👑",
        "color_hex": "#8b5cf6",
        "bg_gradient": "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)",
        "discount_percent": 15,
        "description": "Thủ lĩnh Môi trường Xanh - Lan tỏa lối sống sinh thái truyền cảm hứng",
        "benefits": [
            "Giảm 15% điểm khi đổi tất cả phần thưởng sinh thái",
            "Huy hiệu Vương Miện Bạch Kim trên bản đồ và bảng vàng",
            "Được mời làm đại sứ nòng cốt cho Chiến dịch Môi trường Thành phố",
            "Quyền khởi xướng Thử Thách Xanh cho khu dân cư",
        ],
        "order_index": 4,
    },
    {
        "tier_code": "DIAMOND",
        "tier_name": "Hạng Kim Cương",
        "min_points": 600,
        "badge_icon": "💎",
        "color_hex": "#0284c7",
        "bg_gradient": "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
        "discount_percent": 20,
        "description": "Đại sứ Môi trường Đô thị - Tinh hoa lối sống xanh thanh lịch đỉnh cao",
        "benefits": [
            "Giảm tối đa 20% điểm đổi quà tặng cao cấp & cây xanh lọc khí",
            "Vinh danh trang trọng tại trang chủ Cổng thông tin TP.HCM",
            "Được tài trợ tham gia các Diễn đàn Khí hậu Quốc gia & Quốc tế",
            "Đặc quyền tham vấn chính sách bảo vệ tài nguyên môi trường",
        ],
        "order_index": 5,
    },
]

# Bộ nhớ đệm tầng ứng dụng (Cache)
_CACHED_TIERS: Optional[List[TierInfo]] = None


class TierService:
    @staticmethod
    def invalidate_cache():
        global _CACHED_TIERS
        _CACHED_TIERS = None

    @classmethod
    async def get_all_tiers(
        cls, db: AsyncSession, active_only: bool = True, with_user_count: bool = False
    ) -> List[TierInfo]:
        global _CACHED_TIERS
        if not with_user_count and _CACHED_TIERS is not None:
            if active_only:
                return [t for t in _CACHED_TIERS if t.is_active]
            return _CACHED_TIERS

        q = select(CitizenTier)
        if active_only:
            q = q.where(CitizenTier.is_active == True)
        q = q.order_by(CitizenTier.min_points.asc(), CitizenTier.order_index.asc())

        res = await db.execute(q)
        tiers_orm = res.scalars().all()

        # Nếu database chưa có bản ghi nào, khởi tạo tự động
        if not tiers_orm:
            await cls.seed_default_tiers(db)
            res = await db.execute(q)
            tiers_orm = res.scalars().all()

        # Đếm số lượng công dân ở từng hạng nếu yêu cầu
        user_counts: Dict[str, int] = {}
        if with_user_count:
            # Lấy toàn bộ điểm của active users
            user_pts_q = select(func.greatest(User.lifetime_points, User.green_points)).where(
                User.status == "ACTIVE"
            )
            pts_res = await db.execute(user_pts_q)
            user_points_list = [p or 0 for p in pts_res.scalars().all()]

            sorted_thresholds = sorted(tiers_orm, key=lambda x: x.min_points)
            for p in user_points_list:
                matched_tier_code = sorted_thresholds[0].tier_code
                for t in sorted_thresholds:
                    if p >= t.min_points:
                        matched_tier_code = t.tier_code
                user_counts[matched_tier_code] = user_counts.get(matched_tier_code, 0) + 1

        items: List[TierInfo] = []
        for t in tiers_orm:
            items.append(
                TierInfo(
                    tier_id=t.tier_id,
                    tier_code=t.tier_code,
                    tier_name=t.tier_name,
                    min_points=t.min_points,
                    badge_icon=t.badge_icon,
                    color_hex=t.color_hex,
                    bg_gradient=t.bg_gradient,
                    discount_percent=t.discount_percent,
                    description=t.description,
                    benefits=t.get_benefits_list(),
                    order_index=t.order_index,
                    is_active=t.is_active,
                    users_count=user_counts.get(t.tier_code, 0),
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                )
            )

        if not with_user_count:
            _CACHED_TIERS = items

        return items

    @classmethod
    async def seed_default_tiers(cls, db: AsyncSession):
        for t in DEFAULT_TIERS_DATA:
            row = CitizenTier(
                tier_code=t["tier_code"],
                tier_name=t["tier_name"],
                min_points=t["min_points"],
                badge_icon=t["badge_icon"],
                color_hex=t["color_hex"],
                bg_gradient=t["bg_gradient"],
                discount_percent=t["discount_percent"],
                description=t["description"],
                benefits=json.dumps(t["benefits"], ensure_ascii=False),
                order_index=t["order_index"],
                is_active=True,
            )
            db.add(row)
        await db.commit()
        cls.invalidate_cache()

    @classmethod
    async def create_tier(
        cls, db: AsyncSession, payload: TierCreateRequest, admin_id: Optional[uuid.UUID] = None
    ) -> TierInfo:
        code_norm = payload.tier_code.strip().upper().replace(" ", "_")
        existing = await db.execute(select(CitizenTier).where(CitizenTier.tier_code == code_norm))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã cấp bậc '{code_norm}' đã tồn tại trong hệ thống.",
            )

        new_tier = CitizenTier(
            tier_code=code_norm,
            tier_name=payload.tier_name.strip(),
            min_points=payload.min_points,
            badge_icon=payload.badge_icon.strip(),
            color_hex=payload.color_hex.strip(),
            bg_gradient=payload.bg_gradient.strip() if payload.bg_gradient else "linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)",
            discount_percent=payload.discount_percent,
            description=payload.description.strip() if payload.description else None,
            benefits=json.dumps(payload.benefits, ensure_ascii=False),
            order_index=payload.order_index or (payload.min_points // 100),
            is_active=payload.is_active,
        )
        db.add(new_tier)
        await db.commit()
        await db.refresh(new_tier)

        cls.invalidate_cache()

        # Ghi nhật ký kiểm toán RBAC
        try:
            audit = AuditLog(
                user_id=admin_id or uuid.uuid4(),
                action="CREATE_CITIZEN_TIER",
                table_name="citizen_tiers",
                record_id=str(new_tier.tier_id),
                old_data=None,
                new_data={
                    "tier_code": new_tier.tier_code,
                    "tier_name": new_tier.tier_name,
                    "min_points": new_tier.min_points,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
            await db.commit()
        except Exception as e:
            logger.warning(f"Audit log failed for create_tier: {e}")

        return TierInfo(
            tier_id=new_tier.tier_id,
            tier_code=new_tier.tier_code,
            tier_name=new_tier.tier_name,
            min_points=new_tier.min_points,
            badge_icon=new_tier.badge_icon,
            color_hex=new_tier.color_hex,
            bg_gradient=new_tier.bg_gradient,
            discount_percent=new_tier.discount_percent,
            description=new_tier.description,
            benefits=new_tier.get_benefits_list(),
            order_index=new_tier.order_index,
            is_active=new_tier.is_active,
            users_count=0,
            created_at=new_tier.created_at,
            updated_at=new_tier.updated_at,
        )

    @classmethod
    async def update_tier(
        cls,
        db: AsyncSession,
        tier_id: int,
        payload: TierUpdateRequest,
        admin_id: Optional[uuid.UUID] = None,
    ) -> TierInfo:
        tier = await db.get(CitizenTier, tier_id)
        if not tier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy cấp bậc với ID {tier_id}.",
            )

        old_data = {
            "tier_name": tier.tier_name,
            "min_points": tier.min_points,
            "discount_percent": tier.discount_percent,
        }

        if payload.tier_name is not None:
            tier.tier_name = payload.tier_name.strip()
        if payload.min_points is not None:
            tier.min_points = payload.min_points
        if payload.badge_icon is not None:
            tier.badge_icon = payload.badge_icon.strip()
        if payload.color_hex is not None:
            tier.color_hex = payload.color_hex.strip()
        if payload.bg_gradient is not None:
            tier.bg_gradient = payload.bg_gradient.strip()
        if payload.discount_percent is not None:
            tier.discount_percent = payload.discount_percent
        if payload.description is not None:
            tier.description = payload.description.strip()
        if payload.benefits is not None:
            tier.set_benefits_list(payload.benefits)
        if payload.order_index is not None:
            tier.order_index = payload.order_index
        if payload.is_active is not None:
            tier.is_active = payload.is_active

        await db.commit()
        await db.refresh(tier)

        cls.invalidate_cache()

        # Ghi nhật ký kiểm toán RBAC
        try:
            audit = AuditLog(
                user_id=admin_id or uuid.uuid4(),
                action="UPDATE_CITIZEN_TIER",
                table_name="citizen_tiers",
                record_id=str(tier.tier_id),
                old_data=old_data,
                new_data={
                    "tier_name": tier.tier_name,
                    "min_points": tier.min_points,
                    "discount_percent": tier.discount_percent,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
            await db.commit()
        except Exception as e:
            logger.warning(f"Audit log failed for update_tier: {e}")

        return TierInfo(
            tier_id=tier.tier_id,
            tier_code=tier.tier_code,
            tier_name=tier.tier_name,
            min_points=tier.min_points,
            badge_icon=tier.badge_icon,
            color_hex=tier.color_hex,
            bg_gradient=tier.bg_gradient,
            discount_percent=tier.discount_percent,
            description=tier.description,
            benefits=tier.get_benefits_list(),
            order_index=tier.order_index,
            is_active=tier.is_active,
            created_at=tier.created_at,
            updated_at=tier.updated_at,
        )

    @classmethod
    async def delete_tier(
        cls, db: AsyncSession, tier_id: int, admin_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        tier = await db.get(CitizenTier, tier_id)
        if not tier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy cấp bậc với ID {tier_id}.",
            )

        # Cấm xóa cấp bậc mốc 0 điểm cơ sở (Hạng Đồng)
        if tier.min_points == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa cấp bậc khởi đầu (mốc 0 điểm). Bạn chỉ có thể sửa thông tin của hạng này.",
            )

        # Kiểm tra số lượng cấp bậc còn lại
        count_res = await db.execute(select(func.count(CitizenTier.tier_id)))
        total_remaining = count_res.scalar() or 0
        if total_remaining <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hệ thống cần tối thiểu 1 cấp bậc danh hiệu để hoạt động.",
            )

        deleted_name = tier.tier_name
        deleted_code = tier.tier_code

        await db.delete(tier)
        await db.commit()

        cls.invalidate_cache()

        # Ghi nhật ký kiểm toán RBAC
        try:
            audit = AuditLog(
                user_id=admin_id or uuid.uuid4(),
                action="DELETE_CITIZEN_TIER",
                table_name="citizen_tiers",
                record_id=str(tier_id),
                old_data={"tier_code": deleted_code, "tier_name": deleted_name},
                new_data=None,
                ip_address="127.0.0.1",
            )
            db.add(audit)
            await db.commit()
        except Exception as e:
            logger.warning(f"Audit log failed for delete_tier: {e}")

        return {"message": f"Đã xóa cấp bậc '{deleted_name}' ({deleted_code}) thành công."}

    @classmethod
    async def reset_default_tiers(
        cls, db: AsyncSession, admin_id: Optional[uuid.UUID] = None
    ) -> List[TierInfo]:
        await db.execute(delete(CitizenTier))
        await db.commit()
        await cls.seed_default_tiers(db)

        # Ghi nhật ký kiểm toán RBAC
        try:
            audit = AuditLog(
                user_id=admin_id or uuid.uuid4(),
                action="RESET_CITIZEN_TIERS_DEFAULT",
                table_name="citizen_tiers",
                record_id="ALL",
                old_data=None,
                new_data={"action": "RESET_DEFAULT_5_TIERS"},
                ip_address="127.0.0.1",
            )
            db.add(audit)
            await db.commit()
        except Exception as e:
            logger.warning(f"Audit log failed for reset_default_tiers: {e}")

        return await cls.get_all_tiers(db, active_only=False, with_user_count=True)

    @classmethod
    def calculate_tier_details_sync(
        cls, points: int, tiers_list: Optional[List[TierInfo]] = None
    ) -> Tuple[TierInfo, Optional[TierInfo], int, float]:
        """
        Tính toán cấp bậc hiện tại, cấp bậc kế tiếp, điểm còn thiếu và % tiến độ
        dựa trên danh sách các cột mốc động.
        """
        tiers = tiers_list or _CACHED_TIERS
        if not tiers:
            # Fallback nếu chưa tải cache
            tiers = [
                TierInfo(
                    tier_code=t["tier_code"],
                    tier_name=t["tier_name"],
                    min_points=t["min_points"],
                    badge_icon=t["badge_icon"],
                    color_hex=t["color_hex"],
                    bg_gradient=t["bg_gradient"],
                    discount_percent=t["discount_percent"],
                    description=t["description"],
                    benefits=t["benefits"],
                    order_index=t["order_index"],
                )
                for t in DEFAULT_TIERS_DATA
            ]

        sorted_tiers = sorted(tiers, key=lambda x: x.min_points)
        current_tier = sorted_tiers[0]
        next_tier: Optional[TierInfo] = None

        for i, t in enumerate(sorted_tiers):
            if points >= t.min_points:
                current_tier = t
                if i + 1 < len(sorted_tiers):
                    next_tier = sorted_tiers[i + 1]
                else:
                    next_tier = None

        if next_tier:
            points_to_next = max(0, next_tier.min_points - points)
            span = max(1, next_tier.min_points - current_tier.min_points)
            progress = min(100.0, max(0.0, ((points - current_tier.min_points) / span) * 100.0))
        else:
            points_to_next = 0
            progress = 100.0

        return current_tier, next_tier, points_to_next, round(progress, 1)

    @classmethod
    async def calculate_tier_details(
        cls, db: AsyncSession, points: int
    ) -> Tuple[TierInfo, Optional[TierInfo], int, float]:
        tiers = await cls.get_all_tiers(db, active_only=True)
        return cls.calculate_tier_details_sync(points, tiers)
