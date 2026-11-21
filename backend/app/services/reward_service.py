"""
GreenSpot Business Service - Green Points, Wallets & Eco Rewards (STT 28, 29, 30, 31)
[MOCK/STUB MODE]
Giữ nguyên TIERS_CONFIG, calculate_tier_details, ACTION_CONFIG và toàn bộ Interface/Schemas để Milestone, User, Feed và API routers không bị gián đoạn.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.schemas.reward import (
    PointPolicyItem,
    TierInfo,
    PointPolicyResponse,
    DailyLimitItem,
    FraudRuleItem,
    DailyLimitsPolicyResponse,
    ClaimPointRequest,
    ClaimPointResponse,
    WalletSummaryResponse,
    TransactionHistoryItem,
    TransactionHistoryFilter,
    TransactionHistoryResponse,
    TransactionDetailResponse,
    EcoRewardItem,
    CreateRewardRequest,
    UpdateRewardRequest,
    RewardCatalogResponse,
    RedemptionAnalyticsResponse,
    RedeemRewardRequest,
    RedeemRewardResponse,
    UserVoucherItem,
    UserVoucherListResponse,
    MarkVoucherUsedResponse,
)

# --------------------------------------------------------------------------
# HẰNG SỐ QUY CHUẨN ĐỊNH MỨC ĐIỂM THƯỞNG
# --------------------------------------------------------------------------

ACTION_CONFIG: Dict[str, Dict[str, Any]] = {
    "REPORT_INCIDENT": {
        "name": "Báo cáo sự cố môi trường",
        "points": 50,
        "description": "Báo cáo bãi rác tự phát có ảnh chụp thật và định vị GPS hợp lệ",
        "icon": "📸",
        "badge_label": "+50 ĐIỂM",
        "daily_cap": 200,
        "hint": "Chụp ảnh tại hiện trường và gửi phản ánh vị trí",
    },
    "VERIFY_INCIDENT": {
        "name": "Nghiệm thu dọn sạch hiện trường",
        "points": 100,
        "description": "Kiểm tra và gửi ảnh đối chứng After xác nhận bãi rác đã được dọn sạch",
        "icon": "✨",
        "badge_label": "+100 ĐIỂM",
        "daily_cap": 300,
        "hint": "Gửi ảnh nghiệm thu dọn sạch rác hiện trường",
    },
    "EVENT_CHECKIN": {
        "name": "Check-in sự kiện Chủ Nhật Xanh",
        "points": 50,
        "description": "Có mặt tại địa điểm và quét GPS check-in",
        "icon": "📍",
        "badge_label": "+50 ĐIỂM",
        "daily_cap": 50,
        "hint": "Check-in GPS tại chiến dịch môi trường cuối tuần",
    },
    "ECO_REACTION": {
        "name": "Thả cảm xúc sinh thái (Eco-Reaction)",
        "points": 2,
        "description": "Bày tỏ cảm xúc cổ vũ dưới các bài viết và chiến dịch cộng đồng",
        "icon": "💚",
        "badge_label": "+2 ĐIỂM",
        "daily_cap": 20,
        "hint": "Thả cảm xúc sinh thái cho bài viết cộng đồng",
    },
    "WEEKLY_CHALLENGE": {
        "name": "Hoàn thành thử thách xanh trong tuần",
        "points": 30,
        "description": "Hoàn tất một nhiệm vụ sống xanh định kỳ",
        "icon": "🎯",
        "badge_label": "+30 ĐIỂM",
        "daily_cap": 60,
        "hint": "Nộp minh chứng hoàn thành nhiệm vụ tuần",
    },
    "COMBO_CHALLENGE": {
        "name": "Combo hoàn thành 5/5 thử thách tuần",
        "points": 100,
        "description": "Phần thưởng đặc biệt khi hoàn tất trọn vẹn 5 thử thách",
        "icon": "🏆",
        "badge_label": "+100 ĐIỂM",
        "daily_cap": 100,
        "hint": "Hoàn thành đủ 5/5 nhiệm vụ trong tuần",
    },
    "RECYCLE_DROP": {
        "name": "Mang rác tái chế / Pin đến Trạm Xanh",
        "points": 20,
        "description": "Đem vỏ chai nhựa, giấy báo cũ hoặc pin đến điểm thu gom",
        "icon": "♻️",
        "badge_label": "+20 ĐIỂM",
        "daily_cap": 100,
        "hint": "Quét mã xác nhận tại trạm tiếp nhận tái chế",
    },
}

TIERS_CONFIG: List[Dict[str, Any]] = [
    {
        "tier_code": "BRONZE",
        "tier_name": "Hạng Đồng",
        "min_points": 0,
        "badge_icon": "🥉",
        "color_hex": "#cd7f32",
        "bg_gradient": "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        "description": "Công dân Xanh khởi đầu - Bước đi đầu tiên bảo vệ môi trường",
        "benefits": ["Tích lũy Điểm Xanh từ mọi hoạt động môi trường"],
    },
    {
        "tier_code": "SILVER",
        "tier_name": "Hạng Bạc",
        "min_points": 500,
        "badge_icon": "🥈",
        "color_hex": "#94a3b8",
        "bg_gradient": "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
        "description": "Công dân Xanh tích cực - Đóng góp bền bỉ cho khu dân cư",
        "benefits": ["Ưu tiên xử lý nhanh phản ánh sự cố môi trường"],
    },
    {
        "tier_code": "GOLD",
        "tier_name": "Hạng Vàng",
        "min_points": 1000,
        "badge_icon": "🥇",
        "color_hex": "#f59e0b",
        "bg_gradient": "linear-gradient(135deg, #fef9c3 0%, #fde047 100%)",
        "description": "Công dân Xanh tiêu biểu - Top 5% cư dân tiên phong bảo vệ đô thị",
        "benefits": ["Giảm 10% số điểm khi đổi quà tặng tại siêu thị"],
    },
    {
        "tier_code": "DIAMOND",
        "tier_name": "Hạng Kim Cương",
        "min_points": 2000,
        "badge_icon": "💎",
        "color_hex": "#3b82f6",
        "bg_gradient": "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
        "description": "Đại sứ Môi trường Đô thị - Tinh hoa lối sống xanh thanh lịch",
        "benefits": ["Đặc quyền đổi toàn bộ danh mục quà tặng cao cấp"],
    },
]


def format_transaction_code(tx_id: uuid.UUID) -> str:
    raw = str(tx_id).replace("-", "").upper()
    return f"#TX-{raw[:8]}"


def calculate_tier_details(points: int) -> Tuple[TierInfo, Optional[TierInfo], int, float]:
    sorted_tiers = sorted(TIERS_CONFIG, key=lambda x: x["min_points"])
    current_tier_dict = sorted_tiers[0]
    next_tier_dict: Optional[Dict[str, Any]] = None

    for i, t in enumerate(sorted_tiers):
        if points >= t["min_points"]:
            current_tier_dict = t
            if i + 1 < len(sorted_tiers):
                next_tier_dict = sorted_tiers[i + 1]
            else:
                next_tier_dict = None

    current_tier = TierInfo(**current_tier_dict)
    next_tier = TierInfo(**next_tier_dict) if next_tier_dict else None

    if next_tier:
        points_to_next = max(0, next_tier.min_points - points)
        span = next_tier.min_points - current_tier.min_points
        progress = min(100.0, max(0.0, ((points - current_tier.min_points) / span) * 100.0))
    else:
        points_to_next = 0
        progress = 100.0

    return current_tier, next_tier, points_to_next, round(progress, 1)


class RewardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 28: CHÍNH SÁCH VÀ CƠ CHẾ TÍCH LŨY ĐIỂM
    # --------------------------------------------------------------------------

    async def get_points_policy(self, user_id: Optional[uuid.UUID] = None) -> PointPolicyResponse:
        """Mock/Stub: Chính sách tích điểm (STT 28)"""
        action_items = [
            PointPolicyItem(
                action_type=k,
                name=v["name"],
                points=v["points"],
                description=v["description"],
                icon=v["icon"],
                badge_label=v["badge_label"],
                daily_cap=v["daily_cap"],
                target_action_hint=v["hint"],
            )
            for k, v in ACTION_CONFIG.items()
        ]
        tiers = [TierInfo(**t) for t in TIERS_CONFIG]
        return PointPolicyResponse(
            policy_title="Quy Chuẩn Tích Lũy Điểm Thưởng Công Dân Xanh (Mock)",
            policy_description="Chính sách điểm thưởng",
            actions=action_items,
            tiers=tiers,
            user_summary=None,
        )

    async def get_daily_limits_policy(self) -> DailyLimitsPolicyResponse:
        """Mock/Stub: Hạn mức và chế tài chống gian lận (STT 28)"""
        return DailyLimitsPolicyResponse(
            title="Điều Khoản Định Ngạch Tích Điểm (Mock)",
            description="Mô tả hạn mức",
            limits=[],
            conditions=[],
            fraud_rules=[],
            appeal_guide="Liên hệ hỗ trợ",
        )

    async def claim_points(
        self, user_id: uuid.UUID, req: ClaimPointRequest
    ) -> ClaimPointResponse:
        """Mock/Stub: Tích lũy điểm khi hoàn tất hành động xanh (STT 28)"""
        cur_tier = TierInfo(**TIERS_CONFIG[0])
        return ClaimPointResponse(
            success=True,
            points_awarded=10,
            new_balance=100,
            lifetime_points=100,
            current_tier=cur_tier,
            next_tier=None,
            points_to_next_tier=400,
            tier_upgraded=False,
            upgraded_tier_name=None,
            transaction_id=str(uuid.uuid4()),
            transaction_code="#TX-MOCK",
            action_title="Hành động xanh mẫu",
            message="Bạn vừa nhận được +10 điểm xanh (Mock)!",
        )

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 29: VÍ ĐIỂM VÀ LỊCH SỬ BIẾN ĐỘNG
    # --------------------------------------------------------------------------

    async def get_wallet_summary(self, user_id: uuid.UUID) -> WalletSummaryResponse:
        """Mock/Stub: Thông tin ví điểm (STT 29)"""
        cur_tier = TierInfo(**TIERS_CONFIG[0])
        return WalletSummaryResponse(
            user_id=str(user_id),
            full_name="Công dân Xanh",
            email="citizen@greenspot.vn",
            green_points=0,
            lifetime_points=0,
            current_tier=cur_tier,
            next_tier=None,
            points_to_next_tier=500,
            tier_progress_percent=0.0,
            week_earned_points=0,
            total_spent_points=0,
            total_transactions=0,
            is_active=True,
        )

    async def get_transaction_history(
        self,
        user_id: uuid.UUID,
        filter_params: Optional[TransactionHistoryFilter] = None,
        page: int = 1,
        limit: int = 15,
    ) -> TransactionHistoryResponse:
        """Mock/Stub: Lịch sử biến động điểm (STT 29)"""
        return TransactionHistoryResponse(
            items=[],
            total=0,
            page=page,
            limit=limit,
            total_pages=1,
            current_balance=0,
        )

    async def get_transaction_detail(
        self, transaction_id: uuid.UUID, user_id: uuid.UUID
    ) -> TransactionDetailResponse:
        """Mock/Stub: Chi tiết một giao dịch điểm (STT 29)"""
        cur_tier = TierInfo(**TIERS_CONFIG[0])
        return TransactionDetailResponse(
            transaction_id=str(transaction_id),
            transaction_code="#TX-MOCK",
            transaction_type="REPORT_INCIDENT",
            type_label="Báo cáo sự cố",
            icon="📸",
            badge_label="+50 ĐIỂM",
            points_amount=50,
            balance_after=50,
            description="Giao dịch mẫu (Mock)",
            created_at=datetime.now(timezone.utc),
            user_name="Công dân Xanh",
            user_tier=cur_tier,
            incident_id=None,
            incident_title=None,
            voucher_code=None,
        )

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 30: QUẢN TRỊ DANH MỤC QUÀ TẶNG & KHO VOUCHER
    # --------------------------------------------------------------------------

    async def get_reward_catalog(
        self,
        user_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        tier_level: Optional[str] = None,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> RewardCatalogResponse:
        """Mock/Stub: Danh mục quà tặng xanh (STT 30)"""
        return RewardCatalogResponse(items=[], total=0, user_green_points=0)

    async def get_reward_by_id(self, reward_id: uuid.UUID) -> EcoRewardItem:
        """Mock/Stub: Chi tiết 1 món quà (STT 30)"""
        return EcoRewardItem(
            reward_id=str(reward_id),
            title="Quà tặng sinh thái mẫu (Mock)",
            category="VOUCHER",
            points_cost=100,
            original_value="50.000đ",
            tier_required="BRONZE",
            stock_quantity=10,
            used_count=0,
            image_url=None,
            partner_name="GreenSpot Partner",
            partner_logo_url=None,
            description="Mô tả quà tặng",
            terms_and_conditions="Điều khoản sử dụng",
            validity_days=30,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

    async def create_reward(
        self, req: CreateRewardRequest, admin_user: User
    ) -> EcoRewardItem:
        """Mock/Stub: Thêm mới quà tặng (STT 30)"""
        return await self.get_reward_by_id(uuid.uuid4())

    async def update_reward(
        self, reward_id: uuid.UUID, req: UpdateRewardRequest, admin_user: User
    ) -> EcoRewardItem:
        """Mock/Stub: Sửa quà tặng (STT 30)"""
        return await self.get_reward_by_id(reward_id)

    async def delete_reward(
        self, reward_id: uuid.UUID, admin_user: User
    ) -> bool:
        """Mock/Stub: Xóa quà tặng (STT 30)"""
        return True

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 31: QUẢN LÝ QUÀ TẶNG CÁ NHÂN ĐÃ ĐỔI
    # --------------------------------------------------------------------------

    async def redeem_reward(
        self, user_id: uuid.UUID, req: RedeemRewardRequest
    ) -> RedeemRewardResponse:
        """Mock/Stub: Đổi quà tặng (STT 31)"""
        return RedeemRewardResponse(
            success=True,
            voucher_code="MOCK-VOUCHER-123",
            reward_title="Quà tặng mẫu",
            points_spent=100,
            remaining_points=0,
            expiry_date=datetime.now(timezone.utc) + timedelta(days=30),
            message="Đổi quà tặng thành công (Mock)!",
            voucher_id=str(uuid.uuid4()),
        )

    async def get_user_vouchers(
        self,
        user_id: uuid.UUID,
        status_filter: Optional[str] = None,
        page: int = 1,
        limit: int = 15,
    ) -> UserVoucherListResponse:
        """Mock/Stub: Danh sách quà cá nhân đã đổi (STT 31)"""
        return UserVoucherListResponse(
            items=[],
            total=0,
            unused_count=0,
            used_count=0,
            expired_count=0,
        )

    async def get_user_voucher_detail(
        self, voucher_id: uuid.UUID, user_id: uuid.UUID
    ) -> UserVoucherItem:
        """Mock/Stub: Chi tiết voucher cá nhân (STT 31)"""
        return UserVoucherItem(
            voucher_id=str(voucher_id),
            voucher_code="MOCK-VOUCHER-123",
            status="UNUSED",
            expiry_date=datetime.now(timezone.utc) + timedelta(days=30),
            used_at=None,
            qr_code_payload="MOCK-VOUCHER-123",
            reward_id=str(uuid.uuid4()),
            reward_title="Voucher mẫu",
            partner_name="Đối tác xanh",
            partner_logo_url=None,
            original_value="50.000đ",
            terms_and_conditions="Điều khoản",
            created_at=datetime.now(timezone.utc),
        )

    async def mark_voucher_used(
        self, voucher_id: uuid.UUID, user_id: uuid.UUID
    ) -> MarkVoucherUsedResponse:
        """Mock/Stub: Đánh dấu đã sử dụng voucher (STT 31)"""
        return MarkVoucherUsedResponse(
            success=True,
            voucher_code="MOCK-VOUCHER-123",
            used_at=datetime.now(timezone.utc),
            message="Đã sử dụng voucher thành công (Mock)",
        )

    async def get_redemption_analytics(self) -> RedemptionAnalyticsResponse:
        """Mock/Stub: Báo cáo phân tích đổi quà (STT 30)"""
        return RedemptionAnalyticsResponse(
            total_vouchers_issued=0,
            total_vouchers_used=0,
            total_points_redeemed=0,
            usage_rate_percent=0.0,
            top_rewards=[],
        )

    async def seed_initial_demo_transactions(self, user_id: uuid.UUID) -> None:
        pass

    async def ensure_seed_eco_rewards(self) -> None:
        pass

    async def ensure_seed_user_vouchers_if_empty(self, user_id: uuid.UUID) -> None:
        pass
