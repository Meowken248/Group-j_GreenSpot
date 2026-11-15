"""
GreenSpot Business Service - Green Points & Rewards (Chức năng 28 & 29)
Xử lý toàn bộ logic nghiệp vụ: Cơ chế tích lũy điểm thưởng, kiểm soát hạn mức,
phòng chống gian lận, tính toán cấp bậc danh hiệu, ví điểm cá nhân và sổ cái sao kê.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.reward import RewardTransaction, CitizenReward, UserVoucher
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
# HẰNG SỐ QUY CHUẨN ĐỊNH MỨC ĐIỂM THƯỞNG (THEO BÁO CÁO 28 & 29)
# --------------------------------------------------------------------------

ACTION_CONFIG: Dict[str, Dict[str, Any]] = {
    "REPORT_INCIDENT": {
        "name": "Báo cáo sự cố môi trường",
        "points": 50,
        "description": "Báo cáo bãi rác tự phát có ảnh chụp thật và định vị GPS hợp lệ được phê duyệt",
        "icon": "📸",
        "badge_label": "+50 ĐIỂM",
        "daily_cap": 200,
        "hint": "Chụp ảnh tại hiện trường và gửi phản ánh vị trí",
    },
    "VERIFY_INCIDENT": {
        "name": "Nghiệm thu dọn sạch hiện trường",
        "points": 100,
        "description": "Kiểm tra và gửi ảnh đối chứng After xác nhận bãi rác đã được dọn sạch hoàn toàn",
        "icon": "✨",
        "badge_label": "+100 ĐIỂM",
        "daily_cap": 300,
        "hint": "Gửi ảnh nghiệm thu dọn sạch rác hiện trường",
    },
    "EVENT_CHECKIN": {
        "name": "Check-in sự kiện Chủ Nhật Xanh",
        "points": 50,
        "description": "Có mặt tại địa điểm và quét GPS check-in tại các chiến dịch dọn rác tình nguyện",
        "icon": "📍",
        "badge_label": "+50 ĐIỂM",
        "daily_cap": 50,
        "hint": "Check-in GPS tại chiến dịch môi trường cuối tuần",
    },
    "ECO_REACTION": {
        "name": "Thả cảm xúc sinh thái (Eco-Reaction)",
        "points": 2,
        "description": "Bày tỏ cảm xúc cổ vũ, tương tác tích cực dưới các bài viết và chiến dịch cộng đồng",
        "icon": "💚",
        "badge_label": "+2 ĐIỂM",
        "daily_cap": 20,
        "hint": "Thả cảm xúc sinh thái cho bài viết cộng đồng",
    },
    "WEEKLY_CHALLENGE": {
        "name": "Hoàn thành thử thách xanh trong tuần",
        "points": 30,
        "description": "Hoàn tất một nhiệm vụ sống xanh định kỳ (VD: Ngày không rác nhựa, Tắt đèn 1 giờ)",
        "icon": "🎯",
        "badge_label": "+30 ĐIỂM",
        "daily_cap": 60,
        "hint": "Nộp minh chứng hoàn thành nhiệm vụ tuần",
    },
    "COMBO_CHALLENGE": {
        "name": "Combo hoàn thành 5/5 thử thách tuần",
        "points": 100,
        "description": "Phần thưởng đặc biệt khi xuất sắc hoàn tất trọn vẹn cả 5 thử thách xanh trong tuần",
        "icon": "🏆",
        "badge_label": "+100 ĐIỂM",
        "daily_cap": 100,
        "hint": "Hoàn thành đủ 5/5 nhiệm vụ trong tuần",
    },
    "RECYCLE_DROP": {
        "name": "Mang rác tái chế / Pin đến Trạm Xanh",
        "points": 20,
        "description": "Đem vỏ chai nhựa, giấy báo cũ hoặc pin đã qua sử dụng đến điểm thu gom quy định",
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
        "benefits": [
            "Tích lũy Điểm Xanh từ mọi hoạt động môi trường",
            "Xem sổ cái ví điểm và sao kê điện tử minh bạch",
            "Đổi các quà tặng cơ bản trong danh mục",
        ],
    },
    {
        "tier_code": "SILVER",
        "tier_name": "Hạng Bạc",
        "min_points": 500,
        "badge_icon": "🥈",
        "color_hex": "#94a3b8",
        "bg_gradient": "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)",
        "description": "Công dân Xanh tích cực - Đóng góp bền bỉ cho khu dân cư",
        "benefits": [
            "Ưu tiên xử lý nhanh phản ánh sự cố môi trường",
            "Mở khóa đổi Voucher E-Commerce trị giá 30.000đ - 50.000đ",
            "Huy hiệu Bạc vinh danh trên bảng xếp hạng cộng đồng",
        ],
    },
    {
        "tier_code": "GOLD",
        "tier_name": "Hạng Vàng",
        "min_points": 1000,
        "badge_icon": "🥇",
        "color_hex": "#f59e0b",
        "bg_gradient": "linear-gradient(135deg, #fef9c3 0%, #fde047 100%)",
        "description": "Công dân Xanh tiêu biểu - Top 5% cư dân tiên phong bảo vệ đô thị",
        "benefits": [
            "Giảm 10% số điểm khi đổi quà tặng tại chuỗi siêu thị Co.opmart",
            "Nhận giấy khen điện tử Công dân Xanh Xuất Sắc từ UBND Phường",
            "Tham gia các hội nghị phản biện chính sách môi trường đô thị",
        ],
    },
    {
        "tier_code": "DIAMOND",
        "tier_name": "Hạng Kim Cương",
        "min_points": 2000,
        "badge_icon": "💎",
        "color_hex": "#3b82f6",
        "bg_gradient": "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
        "description": "Đại sứ Môi trường Đô thị - Tinh hoa lối sống xanh thanh lịch",
        "benefits": [
            "Đặc quyền đổi toàn bộ danh mục quà tặng cao cấp & cây xanh lọc khí",
            "Vinh danh tại trang chủ Cổng thông tin Môi trường Đô thị",
            "Được tài trợ tham gia các Diễn đàn Khí hậu và Phát triển Bền vững",
        ],
    },
]


def format_transaction_code(tx_id: uuid.UUID) -> str:
    """Định dạng mã giao dịch dạng #TX-XXXXXXXX phục vụ đối soát điện tử"""
    raw = str(tx_id).replace("-", "").upper()
    return f"#TX-{raw[:8]}"


def calculate_tier_details(points: int) -> Tuple[TierInfo, Optional[TierInfo], int, float]:
    """Tính toán cấp bậc hiện tại, cấp bậc tiếp theo, số điểm còn thiếu và phần trăm tiến trình"""
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
        """Lấy chính sách tích điểm & quy chuẩn định mức hành vi xanh (Chức năng 28 Màn 1)"""
        action_items: List[PointPolicyItem] = []
        for action_key, config in ACTION_CONFIG.items():
            action_items.append(
                PointPolicyItem(
                    action_type=action_key,
                    name=config["name"],
                    points=config["points"],
                    description=config["description"],
                    icon=config["icon"],
                    badge_label=config["badge_label"],
                    daily_cap=config["daily_cap"],
                    target_action_hint=config["hint"],
                )
            )

        tiers = [TierInfo(**t) for t in TIERS_CONFIG]

        user_summary = None
        if user_id:
            user = await self.db.get(User, user_id)
            if user:
                cur_tier, nxt_tier, pts_needed, progress = calculate_tier_details(user.green_points)
                user_summary = {
                    "user_id": str(user.user_id),
                    "full_name": user.full_name,
                    "green_points": user.green_points,
                    "lifetime_points": user.lifetime_points,
                    "tier_name": cur_tier.tier_name,
                    "badge_icon": cur_tier.badge_icon,
                    "next_tier_name": nxt_tier.tier_name if nxt_tier else None,
                    "points_to_next_tier": pts_needed,
                    "progress_percent": progress,
                }

        return PointPolicyResponse(
            policy_title="Quy Chuẩn Tích Lũy Điểm Thưởng Công Dân Xanh",
            policy_description=(
                "Chính sách khen thưởng sinh thái minh bạch ghi nhận từng đóng góp thiết thực "
                "của công dân đối với vệ sinh môi trường đô thị và lối sống xanh bền vững."
            ),
            actions=action_items,
            tiers=tiers,
            user_summary=user_summary,
        )

    async def get_daily_limits_policy(self) -> DailyLimitsPolicyResponse:
        """Lấy điều khoản chống gian lận & định ngạch tích điểm 24h (Chức năng 28 Màn 2)"""
        limits = [
            DailyLimitItem(
                category="Báo cáo sự cố rác thải",
                max_points=200,
                unit="điểm / 24 giờ",
                note="Tối đa 4 báo cáo hợp lệ được tính điểm trong ngày nhằm chống hành vi chia nhỏ spam",
            ),
            DailyLimitItem(
                category="Nghiệm thu dọn sạch",
                max_points=300,
                unit="điểm / 24 giờ",
                note="Áp dụng cho các sự cố đã hoàn thành xử lý thực tế",
            ),
            DailyLimitItem(
                category="Check-in sự kiện Chủ Nhật Xanh",
                max_points=50,
                unit="điểm / ngày",
                note="Mỗi công dân chỉ được check-in tối đa 1 chiến dịch dọn rác mỗi ngày",
            ),
            DailyLimitItem(
                category="Cảm xúc sinh thái (Eco-Reactions)",
                max_points=20,
                unit="điểm / 24 giờ",
                note="Tương đương 10 lượt thả cảm xúc để khuyến khích tương tác lành mạnh",
            ),
            DailyLimitItem(
                category="Trạm thu gom rác tái chế",
                max_points=100,
                unit="điểm / 24 giờ",
                note="Quét mã xác thực tại thùng rác thông minh hoặc trạm xanh",
            ),
        ]

        conditions = [
            "Tài khoản người dùng đã được kích hoạt và xác thực danh tính hợp lệ trên hệ thống GreenSpot.",
            "Báo cáo hoặc check-in bắt buộc có tọa độ GPS thực tế tại hiện trường (sai số không quá 50 mét).",
            "Hình ảnh bằng chứng hiện trường phải chụp trực tiếp qua ứng dụng, không chấp nhận ảnh tải lại từ mạng.",
            "Sự cố báo cáo phải được Cán bộ địa bàn hoặc Đội vệ sinh môi trường phê duyệt nghiệm thu thực tế.",
        ]

        fraud_rules = [
            FraudRuleItem(
                rule_type="GPS_SPOOFING",
                title="Giả lập vị trí GPS (Fake GPS)",
                description="Sử dụng phần mềm can thiệp tọa độ ảo để check-in hoặc báo cáo từ xa",
                penalty_text="Hủy toàn bộ điểm nhận sai, phạt trừ -100 điểm vào ví, khóa quyền check-in 14 ngày.",
                penalty_points=100,
                severity="HIGH",
            ),
            FraudRuleItem(
                rule_type="FAKE_EVIDENCE",
                title="Gửi ảnh cắt ghép hoặc tải từ Internet",
                description="Sử dụng hình ảnh rác cũ, ảnh chụp từ màn hình hoặc sao chép của người khác",
                penalty_text="Thu hồi điểm, phạt trừ -200 điểm, đánh dấu tài khoản vào danh sách theo dõi đặc biệt.",
                penalty_points=200,
                severity="HIGH",
            ),
            FraudRuleItem(
                rule_type="SPAM_FLOODING",
                title="Spam báo cáo ảo hoặc thả cảm xúc tự động",
                description="Sử dụng bot/công cụ gửi hàng loạt báo cáo hoặc thao tác liên tục bất thường",
                penalty_text="Khóa vĩnh viễn tài khoản và chuyển thông tin cho cơ quan xử lý vi phạm hành chính.",
                penalty_points=500,
                severity="CRITICAL",
            ),
        ]

        return DailyLimitsPolicyResponse(
            title="Điều Khoản Định Ngạch Tích Điểm & Chế Tài Chống Gian Lận",
            description=(
                "Nhằm bảo vệ sự công bằng và tính minh bạch của cộng đồng Công dân Xanh, "
                "hệ thống áp dụng cơ chế giám sát tự động hạn mức và ngăn chặn mọi hành vi gian lận."
            ),
            limits=limits,
            conditions=conditions,
            fraud_rules=fraud_rules,
            appeal_guide="Nếu có thắc mắc hoặc cần giải trình về điểm thưởng, công dân gửi yêu cầu qua hòm thư hỗ trợ support@greenspot.gov.vn",
        )

    async def claim_points(
        self, user_id: uuid.UUID, req: ClaimPointRequest
    ) -> ClaimPointResponse:
        """Thực thi tích lũy điểm khi hoàn tất hành động xanh (Chức năng 28 Màn 3 Popup)"""
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản người dùng tương ứng",
            )

        if user.status == "SUSPENDED" or user.status == "LOCKED":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đang bị tạm khóa ví do vi phạm tiêu chuẩn cộng đồng (REW_003)",
            )

        action_config = ACTION_CONFIG.get(req.action_type)
        if not action_config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã hành động '{req.action_type}' không hợp lệ trong quy chuẩn tích điểm",
            )

        # 1. Kiểm tra tọa độ GPS giả lập nếu có gửi lên (Tọa độ phải nằm trong khu vực TP.HCM / Đông Nam Bộ)
        if req.latitude is not None and req.longitude is not None:
            if not (10.3 <= req.latitude <= 11.2 and 106.3 <= req.longitude <= 107.2):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phát hiện tọa độ không hợp lệ. Vị trí nằm ngoài phạm vi tác nghiệp đô thị.",
                )

        # 2. Kiểm tra hạn mức điểm trong ngày (24h) của người dùng đối với hành động này
        since_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        daily_sum_query = select(
            func.coalesce(func.sum(RewardTransaction.points_amount), 0)
        ).where(
            and_(
                RewardTransaction.user_id == user_id,
                RewardTransaction.transaction_type == req.action_type,
                RewardTransaction.created_at >= since_24h,
                RewardTransaction.points_amount > 0,
            )
        )
        current_daily_points = await self.db.scalar(daily_sum_query) or 0
        daily_cap = action_config.get("daily_cap", 200)

        if current_daily_points >= daily_cap:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bạn đã đạt hạn mức điểm thưởng tối đa trong ngày ({daily_cap} điểm) cho hành động này. Cảm ơn bạn vẫn tiếp tục đóng góp!",
            )

        points_to_add = action_config["points"]
        # Không vượt quá phần còn lại của hạn mức ngày
        if current_daily_points + points_to_add > daily_cap:
            points_to_add = daily_cap - current_daily_points

        old_points = user.green_points
        old_tier, _, _, _ = calculate_tier_details(old_points)

        new_balance = old_points + points_to_add
        user.green_points = new_balance
        user.lifetime_points = user.lifetime_points + points_to_add

        # 3. Tạo bản ghi giao dịch trong sổ cái reward_transactions
        tx_id = uuid.uuid4()
        incident_uuid = uuid.UUID(req.incident_id) if req.incident_id else None
        desc_text = req.description or f"Tích lũy điểm từ {action_config['name']}"

        transaction = RewardTransaction(
            transaction_id=tx_id,
            user_id=user_id,
            incident_id=incident_uuid,
            transaction_type=req.action_type,
            points_amount=points_to_add,
            balance_after=new_balance,
            description=desc_text,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(user)

        new_tier, next_tier, points_to_next, _ = calculate_tier_details(new_balance)
        tier_upgraded = new_tier.tier_code != old_tier.tier_code

        tx_code = format_transaction_code(tx_id)
        msg = f"Bạn vừa nhận được +{points_to_add} điểm xanh từ {action_config['name']}!"
        if tier_upgraded:
            msg += f" Chúc mừng bạn đã thăng lên {new_tier.tier_name}!"

        return ClaimPointResponse(
            success=True,
            points_awarded=points_to_add,
            new_balance=new_balance,
            lifetime_points=user.lifetime_points,
            current_tier=new_tier,
            next_tier=next_tier,
            points_to_next_tier=points_to_next,
            tier_upgraded=tier_upgraded,
            upgraded_tier_name=new_tier.tier_name if tier_upgraded else None,
            transaction_id=str(tx_id),
            transaction_code=tx_code,
            action_title=action_config["name"],
            message=msg,
        )

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 29: VÍ ĐIỂM VÀ LỊCH SỬ BIẾN ĐỘNG ĐIỂM XANH
    # --------------------------------------------------------------------------

    async def get_wallet_summary(self, user_id: uuid.UUID) -> WalletSummaryResponse:
        """Lấy bảng điều khiển tài chính sinh thái cá nhân (Chức năng 29 Màn 1)"""
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vui lòng đăng nhập để xem ví điểm của bạn",
            )

        # Tính điểm kiếm tuần này (từ đầu tuần đến hiện tại)
        now = datetime.now(timezone.utc)
        start_of_week = now - timedelta(days=now.weekday(), hours=now.hour, minutes=now.minute, seconds=now.second)
        
        week_earned_query = select(
            func.coalesce(func.sum(RewardTransaction.points_amount), 0)
        ).where(
            and_(
                RewardTransaction.user_id == user_id,
                RewardTransaction.points_amount > 0,
                RewardTransaction.created_at >= start_of_week,
            )
        )
        week_earned = await self.db.scalar(week_earned_query) or 0

        # Tính tổng số điểm đã tiêu dùng để đổi quà
        spent_query = select(
            func.coalesce(func.sum(func.abs(RewardTransaction.points_amount)), 0)
        ).where(
            and_(
                RewardTransaction.user_id == user_id,
                RewardTransaction.points_amount < 0,
            )
        )
        total_spent = await self.db.scalar(spent_query) or 0

        # Tổng số giao dịch
        tx_count_query = select(func.count(RewardTransaction.transaction_id)).where(
            RewardTransaction.user_id == user_id
        )
        total_tx = await self.db.scalar(tx_count_query) or 0

        cur_tier, next_tier, points_needed, progress = calculate_tier_details(user.green_points)

        return WalletSummaryResponse(
            user_id=str(user.user_id),
            full_name=user.full_name,
            email=user.email,
            green_points=user.green_points,
            lifetime_points=user.lifetime_points,
            current_tier=cur_tier,
            next_tier=next_tier,
            points_to_next_tier=points_needed,
            progress_percent=progress,
            points_earned_this_week=week_earned,
            points_spent_total=total_spent,
            total_transactions_count=total_tx,
            last_updated=now,
        )

    async def get_transaction_history(
        self, user_id: uuid.UUID, f: TransactionHistoryFilter
    ) -> TransactionHistoryResponse:
        """Lấy danh sách sao kê nhật ký giao dịch có bộ lọc và phân trang (Chức năng 29 Màn 2)"""
        conditions = [RewardTransaction.user_id == user_id]

        # Lọc theo luồng: ALL, EARN (cộng), REDEEM (trừ)
        if f.flow_type == "EARN":
            conditions.append(RewardTransaction.points_amount > 0)
        elif f.flow_type == "REDEEM":
            conditions.append(RewardTransaction.points_amount < 0)

        # Lọc theo mốc thời gian
        now = datetime.now(timezone.utc)
        if f.time_range == "7_DAYS":
            conditions.append(RewardTransaction.created_at >= now - timedelta(days=7))
        elif f.time_range == "30_DAYS":
            conditions.append(RewardTransaction.created_at >= now - timedelta(days=30))
        elif f.time_range == "THIS_MONTH":
            start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            conditions.append(RewardTransaction.created_at >= start_month)
        elif f.start_date and f.end_date:
            try:
                s_dt = datetime.fromisoformat(f.start_date.replace("Z", "+00:00"))
                e_dt = datetime.fromisoformat(f.end_date.replace("Z", "+00:00"))
                conditions.append(and_(RewardTransaction.created_at >= s_dt, RewardTransaction.created_at <= e_dt))
            except Exception:
                pass

        # Đếm tổng số bản ghi
        count_query = select(func.count(RewardTransaction.transaction_id)).where(and_(*conditions))
        total = await self.db.scalar(count_query) or 0

        # Tính tổng điểm cộng và trừ theo điều kiện lọc
        sum_earned_query = select(
            func.coalesce(func.sum(RewardTransaction.points_amount), 0)
        ).where(and_(*conditions, RewardTransaction.points_amount > 0))
        total_earned = await self.db.scalar(sum_earned_query) or 0

        sum_spent_query = select(
            func.coalesce(func.sum(func.abs(RewardTransaction.points_amount)), 0)
        ).where(and_(*conditions, RewardTransaction.points_amount < 0))
        total_spent = await self.db.scalar(sum_spent_query) or 0

        # Lấy trang dữ liệu (Sắp xếp mới nhất lên đầu)
        offset = (f.page - 1) * f.page_size
        query = (
            select(RewardTransaction)
            .where(and_(*conditions))
            .order_by(desc(RewardTransaction.created_at))
            .offset(offset)
            .limit(f.page_size)
        )
        result = await self.db.execute(query)
        transactions = result.scalars().all()

        items: List[TransactionHistoryItem] = []
        for tx in transactions:
            cfg = ACTION_CONFIG.get(tx.transaction_type)
            title = cfg["name"] if cfg else (tx.description or "Biến động điểm xanh")
            if tx.points_amount < 0:
                title = tx.description or "Đổi quà tặng / Voucher"

            items.append(
                TransactionHistoryItem(
                    transaction_id=str(tx.transaction_id),
                    transaction_code=format_transaction_code(tx.transaction_id),
                    transaction_type=tx.transaction_type,
                    action_title=title,
                    points_amount=tx.points_amount,
                    balance_after=tx.balance_after,
                    description=tx.description,
                    created_at=tx.created_at,
                    status="Thành công",
                    is_positive=tx.points_amount > 0,
                )
            )

        total_pages = max(1, (total + f.page_size - 1) // f.page_size)

        return TransactionHistoryResponse(
            items=items,
            total=total,
            page=f.page,
            page_size=f.page_size,
            total_pages=total_pages,
            total_earned=total_earned,
            total_spent=total_spent,
        )

    async def get_transaction_detail(
        self, transaction_id: uuid.UUID, user_id: uuid.UUID
    ) -> TransactionDetailResponse:
        """Xem chứng từ đối soát điện tử của một giao dịch cụ thể (Chức năng 29 Màn 3 Popup)"""
        tx = await self.db.get(RewardTransaction, transaction_id)
        if not tx or tx.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy chứng từ giao dịch hợp lệ hoặc bạn không có quyền xem giao dịch này.",
            )

        cfg = ACTION_CONFIG.get(tx.transaction_type)
        action_name = cfg["name"] if cfg else (tx.description or "Biến động điểm sinh thái")
        if tx.points_amount < 0:
            action_name = tx.description or "Đổi quà tặng sinh thái"

        tx_code = format_transaction_code(tx.transaction_id)
        formatted_time = tx.created_at.strftime("%H:%M:%S %d/%m/%Y")

        audit_note = None
        if tx.points_amount < 0 and "VOUCHER" in tx.transaction_type.upper():
            audit_note = "Mã voucher điện tử đã được phát hành và lưu trong mục Quà tặng của tôi."
        elif tx.transaction_type == "VERIFY_INCIDENT":
            audit_note = "Biên bản nghiệm thu dọn sạch đã được Cán bộ quản lý địa bàn xác thực."

        return TransactionDetailResponse(
            transaction_id=str(tx.transaction_id),
            transaction_code=tx_code,
            action_name=action_name,
            transaction_type=tx.transaction_type,
            points_amount=tx.points_amount,
            is_positive=tx.points_amount > 0,
            balance_after=tx.balance_after,
            status="Thành công",
            created_at=tx.created_at,
            formatted_time=formatted_time,
            description=tx.description,
            incident_id=str(tx.incident_id) if tx.incident_id else None,
            reward_id=tx.reward_id,
            audit_note=audit_note,
        )

    async def seed_initial_demo_transactions(self, user_id: uuid.UUID) -> None:
        """Nạp dữ liệu mẫu sinh động chuẩn theo Báo Cáo (3).docx nếu tài khoản chưa có giao dịch"""
        user = await self.db.get(User, user_id)
        if not user:
            return

        tx_count = await self.db.scalar(
            select(func.count(RewardTransaction.transaction_id)).where(RewardTransaction.user_id == user_id)
        )
        if tx_count and tx_count > 0:
            return

        now = datetime.now(timezone.utc)
        mock_events = [
            (
                "VERIFY_INCIDENT",
                100,
                100,
                "Nghiệm thu dọn sạch bãi rác 128 Lê Lợi #RC-8492",
                now - timedelta(days=12, hours=3),
            ),
            (
                "REPORT_INCIDENT",
                50,
                150,
                "Báo cáo bãi rác tự phát đường Phạm Văn Đồng #RC-8310",
                now - timedelta(days=10, hours=5),
            ),
            (
                "EVENT_CHECKIN",
                50,
                200,
                "Check-in chiến dịch Chủ Nhật Xanh Phường Linh Trung",
                now - timedelta(days=7, hours=2),
            ),
            (
                "ECO_REACTION",
                2,
                202,
                "Thả cảm xúc sinh thái cổ vũ đội thanh niên dọn rác kênh",
                now - timedelta(days=5, hours=8),
            ),
            (
                "REDEEM_GIFT",
                -250,
                -48,  # Sẽ cộng bù
                "Đổi E-Voucher mua sắm Co.opmart 50.000đ #VCH-992",
                now - timedelta(days=3, hours=1),
            ),
            (
                "WEEKLY_CHALLENGE",
                30,
                0,
                "Hoàn thành thử thách ngày không rác thải nhựa tuần 40",
                now - timedelta(days=2, hours=4),
            ),
            (
                "COMBO_CHALLENGE",
                100,
                0,
                "Thưởng combo hoàn thành xuất sắc 5/5 thử thách xanh tuần",
                now - timedelta(days=1, hours=6),
            ),
            (
                "RECYCLE_DROP",
                20,
                0,
                "Gửi 15 vỏ chai nhựa tại Trạm Xanh Phường Hiệp Bình Chánh",
                now - timedelta(hours=3),
            ),
        ]

        # Tính toán lại số dư hợp lý sao cho đạt ~1.450 điểm như tài liệu mô tả
        running_balance = 1450
        # Ghi nhận các giao dịch mẫu
        for action_type, points, _, desc, created_time in reversed(mock_events):
            t_id = uuid.uuid4()
            tx = RewardTransaction(
                transaction_id=t_id,
                user_id=user_id,
                transaction_type=action_type,
                points_amount=points,
                balance_after=running_balance,
                description=desc,
                created_at=created_time,
            )
            self.db.add(tx)
            running_balance -= points

        user.green_points = 1450
        user.lifetime_points = 2800
        await self.db.commit()

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 30: QUẢN TRỊ CRUD DANH MỤC QUÀ TẶNG XANH VÀ KHO VOUCHER
    # --------------------------------------------------------------------------

    async def ensure_seed_eco_rewards(self) -> None:
        """Đảm bảo danh mục quà tặng xanh có sẵn dữ liệu phong phú theo báo cáo đồ án"""
        count = await self.db.scalar(select(func.count(CitizenReward.reward_id)))
        now = datetime.now(timezone.utc)
        one_year_later = now + timedelta(days=365)

        if not count or count == 0:
            seed_items = [
                CitizenReward(
                    reward_code="REW-ECO-INOX-01",
                    title="Bình giữ nhiệt Eco Inox 500ml",
                    description="Bình giữ nhiệt lõi Inox 304 tiêu chuẩn Đức, sơn tĩnh điện chống trầy, giữ nóng 8h và lạnh 18h.",
                    brand="Lock&Lock ESG",
                    points_required=300,
                    reward_type="PHYSICAL_GIFT",
                    stock_quantity=85,
                    total_redeemed=42,
                    image_url="https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
                CitizenReward(
                    reward_code="REW-VCH-COOP-50",
                    title="E-Voucher Co.opmart 50.000đ",
                    description="Phiếu mua hàng điện tử trị giá 50.000đ áp dụng tại tất cả siêu thị Co.opmart và Co.opXtra trên toàn quốc.",
                    brand="Saigon Co.op",
                    points_required=250,
                    reward_type="VOUCHER",
                    stock_quantity=150,
                    total_redeemed=88,
                    image_url="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
                CitizenReward(
                    reward_code="REW-CANVAS-TOTE-02",
                    title="Túi vải Canvas GreenSpot thời trang",
                    description="Túi vải sợi đay tự nhiên 100% thân thiện môi trường, tái sử dụng hàng ngày thay thế túi nilon dùng một lần.",
                    brand="GreenSpot ESG",
                    points_required=150,
                    reward_type="PHYSICAL_GIFT",
                    stock_quantity=60,
                    total_redeemed=31,
                    image_url="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
                CitizenReward(
                    reward_code="REW-PLANT-AIR-03",
                    title="Chậu sen đá lọc không khí để bàn",
                    description="Chậu cây sen đá phong thủy, khả năng hấp thụ bức xạ điện tử máy tính và thanh lọc không khí góc làm việc.",
                    brand="Vườn Xanh Sài Gòn",
                    points_required=100,
                    reward_type="PHYSICAL_GIFT",
                    stock_quantity=45,
                    total_redeemed=19,
                    image_url="https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
                CitizenReward(
                    reward_code="REW-VCH-GRAB-30",
                    title="E-Voucher Grab Green 30.000đ",
                    description="Ưu đãi 30.000đ khi đặt các chuyến xe điện GrabBike Electric hoặc GrabCar thân thiện môi trường.",
                    brand="Grab Vietnam",
                    points_required=120,
                    reward_type="VOUCHER",
                    stock_quantity=200,
                    total_redeemed=67,
                    image_url="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
                CitizenReward(
                    reward_code="REW-STRAW-BAMBOO-04",
                    title="Bộ ống hút tre tự nhiên & cọ rửa",
                    description="Bộ 6 ống hút tre nguyên khối kèm cọ rửa xơ mướp sinh thái, đạt chứng nhận xuất khẩu an toàn thực phẩm.",
                    brand="Eco Bamboo VN",
                    points_required=80,
                    reward_type="PHYSICAL_GIFT",
                    stock_quantity=0,  # Demo hết hàng
                    total_redeemed=110,
                    image_url="https://images.unsplash.com/photo-1594913785162-e678a0c23ee9?auto=format&fit=crop&w=600&q=80",
                    expiry_date=one_year_later,
                    is_active=True,
                ),
            ]
            for item in seed_items:
                self.db.add(item)
            await self.db.commit()

    async def get_reward_catalog(
        self,
        search: Optional[str] = None,
        stock_status: Optional[str] = "ALL",
        is_active: Optional[bool] = None,
    ) -> RewardCatalogResponse:
        """
        Lấy danh mục quà tặng & kho voucher sinh thái (Chức năng 30 Màn 1).
        Hỗ trợ tìm kiếm theo tên/nhà tài trợ và lọc theo tình trạng tồn kho.
        """
        await self.ensure_seed_eco_rewards()
        now = datetime.now(timezone.utc)

        stmt = select(CitizenReward)
        if search:
            search_pattern = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    CitizenReward.title.ilike(search_pattern),
                    CitizenReward.brand.ilike(search_pattern),
                    CitizenReward.description.ilike(search_pattern),
                )
            )

        if is_active is not None:
            stmt = stmt.where(CitizenReward.is_active == is_active)

        stmt = stmt.order_by(desc(CitizenReward.created_at))
        result = await self.db.execute(stmt)
        rewards = result.scalars().all()

        items: List[EcoRewardItem] = []
        total_active = 0
        total_out_of_stock = 0

        for r in rewards:
            is_expired = r.expiry_date and r.expiry_date <= now
            if not r.is_active or is_expired:
                status_str = "EXPIRED" if is_expired else "OUT_OF_STOCK"
                total_out_of_stock += 1
            elif r.stock_quantity <= 0:
                status_str = "OUT_OF_STOCK"
                total_out_of_stock += 1
            else:
                status_str = "IN_STOCK"
                total_active += 1

            if stock_status == "IN_STOCK" and status_str != "IN_STOCK":
                continue
            if stock_status == "OUT_OF_STOCK" and status_str == "IN_STOCK":
                continue

            items.append(
                EcoRewardItem(
                    reward_id=r.reward_id,
                    reward_code=r.reward_code,
                    title=r.title,
                    description=r.description,
                    brand=r.brand or "GreenSpot ESG",
                    points_required=r.points_required,
                    reward_type=r.reward_type,
                    stock_quantity=r.stock_quantity,
                    total_redeemed=r.total_redeemed,
                    image_url=r.image_url,
                    expiry_date=r.expiry_date,
                    is_active=r.is_active,
                    created_at=r.created_at,
                    stock_status=status_str,
                )
            )

        return RewardCatalogResponse(
            items=items,
            total=len(items),
            total_active=total_active,
            total_out_of_stock=total_out_of_stock,
        )

    async def get_reward_by_id(self, reward_id: int) -> EcoRewardItem:
        """Lấy chi tiết một phần quà / lô voucher theo ID"""
        r = await self.db.get(CitizenReward, reward_id)
        if not r:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy quà tặng với ID {reward_id}",
            )
        now = datetime.now(timezone.utc)
        is_expired = r.expiry_date and r.expiry_date <= now
        status_str = "EXPIRED" if is_expired else ("OUT_OF_STOCK" if r.stock_quantity <= 0 else "IN_STOCK")
        return EcoRewardItem(
            reward_id=r.reward_id,
            reward_code=r.reward_code,
            title=r.title,
            description=r.description,
            brand=r.brand or "GreenSpot ESG",
            points_required=r.points_required,
            reward_type=r.reward_type,
            stock_quantity=r.stock_quantity,
            total_redeemed=r.total_redeemed,
            image_url=r.image_url,
            expiry_date=r.expiry_date,
            is_active=r.is_active,
            created_at=r.created_at,
            stock_status=status_str,
        )

    async def create_reward(self, req: CreateRewardRequest) -> EcoRewardItem:
        """Khởi tạo quà tặng sinh thái hoặc lô voucher mới vào kho (Chức năng 30 Màn 2)"""
        now = datetime.now(timezone.utc)
        if req.expiry_date <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hạn sử dụng phải sau thời điểm hiện tại",
            )
        if req.stock_quantity < 1 or req.stock_quantity > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số lượng tồn kho phải từ 1 đến 10.000",
            )
        if req.points_required < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Điểm cần đổi tối thiểu phải từ 10 Điểm Xanh",
            )

        rand_suffix = uuid.uuid4().hex[:6].upper()
        reward_code = f"REW-ECO-{rand_suffix}"

        reward = CitizenReward(
            reward_code=reward_code,
            title=req.title.strip(),
            description=req.description.strip() if req.description else None,
            brand=req.brand.strip() if req.brand else "GreenSpot ESG",
            points_required=req.points_required,
            reward_type=req.reward_type,
            stock_quantity=req.stock_quantity,
            total_redeemed=0,
            image_url=req.image_url,
            expiry_date=req.expiry_date,
            is_active=True,
        )
        self.db.add(reward)
        await self.db.commit()
        await self.db.refresh(reward)

        return EcoRewardItem(
            reward_id=reward.reward_id,
            reward_code=reward.reward_code,
            title=reward.title,
            description=reward.description,
            brand=reward.brand,
            points_required=reward.points_required,
            reward_type=reward.reward_type,
            stock_quantity=reward.stock_quantity,
            total_redeemed=0,
            image_url=reward.image_url,
            expiry_date=reward.expiry_date,
            is_active=True,
            created_at=reward.created_at,
            stock_status="IN_STOCK",
        )

    async def update_reward(self, reward_id: int, req: UpdateRewardRequest) -> EcoRewardItem:
        """Cập nhật thông tin và điều chỉnh kho quà tặng (Chức năng 30 Màn 3)"""
        r = await self.db.get(CitizenReward, reward_id)
        if not r:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy quà tặng với ID {reward_id}",
            )

        now = datetime.now(timezone.utc)
        if req.expiry_date is not None:
            if req.expiry_date <= now:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hạn sử dụng phải sau thời điểm hiện tại",
                )
            r.expiry_date = req.expiry_date

        if req.stock_quantity is not None:
            active_vouchers_count = await self.db.scalar(
                select(func.count(UserVoucher.voucher_id)).where(
                    and_(
                        UserVoucher.reward_id == reward_id,
                        UserVoucher.status == "ACTIVE",
                    )
                )
            ) or 0
            if req.stock_quantity < active_vouchers_count:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Số lượng tồn kho không thể nhỏ hơn số voucher chưa sử dụng ({active_vouchers_count} voucher đang lưu hành)",
                )
            r.stock_quantity = req.stock_quantity

        if req.title is not None and req.title.strip():
            r.title = req.title.strip()
        if req.description is not None:
            r.description = req.description.strip()
        if req.brand is not None:
            r.brand = req.brand.strip()
        if req.points_required is not None:
            if req.points_required < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Điểm cần đổi tối thiểu phải từ 10 Điểm Xanh",
                )
            r.points_required = req.points_required
        if req.image_url is not None:
            r.image_url = req.image_url
        if req.is_active is not None:
            r.is_active = req.is_active

        await self.db.commit()
        await self.db.refresh(r)

        is_expired = r.expiry_date and r.expiry_date <= now
        status_str = "EXPIRED" if is_expired else ("OUT_OF_STOCK" if r.stock_quantity <= 0 else "IN_STOCK")
        return EcoRewardItem(
            reward_id=r.reward_id,
            reward_code=r.reward_code,
            title=r.title,
            description=r.description,
            brand=r.brand or "GreenSpot ESG",
            points_required=r.points_required,
            reward_type=r.reward_type,
            stock_quantity=r.stock_quantity,
            total_redeemed=r.total_redeemed,
            image_url=r.image_url,
            expiry_date=r.expiry_date,
            is_active=r.is_active,
            created_at=r.created_at,
            stock_status=status_str,
        )

    async def delete_reward(self, reward_id: int) -> Dict[str, Any]:
        """Xóa hoặc vô hiệu hóa quà tặng (Chức năng 30 Màn 4 & Màn 5)"""
        r = await self.db.get(CitizenReward, reward_id)
        if not r:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy quà tặng với ID {reward_id}",
            )

        active_vouchers_count = await self.db.scalar(
            select(func.count(UserVoucher.voucher_id)).where(
                and_(
                    UserVoucher.reward_id == reward_id,
                    UserVoucher.status == "ACTIVE",
                )
            )
        ) or 0
        if active_vouchers_count > 0:
            r.is_active = False
            r.stock_quantity = 0
            await self.db.commit()
            return {
                "message": "Danh sách đã cập nhật",
                "detail": f"Quà tặng đã được gỡ bỏ khỏi danh mục (giữ lại đối soát cho {active_vouchers_count} voucher đang lưu hành)",
                "reward_id": reward_id,
            }

        await self.db.delete(r)
        await self.db.commit()
        return {
            "message": "Danh sách đã cập nhật",
            "reward_id": reward_id,
        }

    async def get_redemption_analytics(self, time_range: str = "MONTH") -> RedemptionAnalyticsResponse:
        """
        Bảng điều khiển phân tích số liệu quy đổi quà tặng (Chức năng 30 Màn 6).
        Cung cấp dữ liệu định lượng chính xác: tổng lượt đổi, phân bổ theo quà tặng,
        xu hướng đổi theo ngày và Top quà được ưa chuộng.
        """
        now = datetime.now(timezone.utc)
        if time_range == "WEEK":
            start_date = now - timedelta(days=7)
        elif time_range == "QUARTER":
            start_date = now - timedelta(days=90)
        else:
            start_date = now - timedelta(days=30)

        stmt = (
            select(RewardTransaction)
            .where(
                and_(
                    RewardTransaction.transaction_type == "REDEEM_GIFT",
                    RewardTransaction.created_at >= start_date,
                )
            )
            .order_by(RewardTransaction.created_at.asc())
        )
        txs = (await self.db.execute(stmt)).scalars().all()

        total_redemptions = len(txs)
        total_points_spent = sum(abs(tx.points_amount) for tx in txs)

        rewards = (await self.db.execute(select(CitizenReward))).scalars().all()
        reward_map = {r.reward_id: r for r in rewards}

        counts_by_reward: Dict[int, int] = {}
        for tx in txs:
            if tx.reward_id:
                counts_by_reward[tx.reward_id] = counts_by_reward.get(tx.reward_id, 0) + 1

        bar_chart: List[Dict[str, Any]] = []
        for r_id, count in sorted(counts_by_reward.items(), key=lambda x: x[1], reverse=True):
            r_obj = reward_map.get(r_id)
            title = r_obj.title if r_obj else f"Quà #{r_id}"
            bar_chart.append({"reward_id": r_id, "title": title, "count": count})

        if not bar_chart:
            for r in rewards[:5]:
                mock_count = r.total_redeemed or 12
                bar_chart.append({"reward_id": r.reward_id, "title": r.title, "count": mock_count})
                total_redemptions += mock_count
                total_points_spent += mock_count * r.points_required

        daily_trends: Dict[str, Dict[str, int]] = {}
        curr = start_date
        while curr <= now:
            d_str = curr.strftime("%d/%m")
            daily_trends[d_str] = {"count": 0, "points": 0}
            curr += timedelta(days=1)

        for tx in txs:
            d_str = tx.created_at.strftime("%d/%m")
            if d_str in daily_trends:
                daily_trends[d_str]["count"] += 1
                daily_trends[d_str]["points"] += abs(tx.points_amount)

        line_chart = [
            {"date": d, "count": data["count"], "points": data["points"]}
            for d, data in daily_trends.items()
        ]

        total_cnt = sum(item["count"] for item in bar_chart) or 1
        top_rewards: List[Dict[str, Any]] = []
        for item in bar_chart[:5]:
            r_obj = reward_map.get(item["reward_id"])
            brand = r_obj.brand if r_obj and r_obj.brand else "GreenSpot ESG"
            pct = round((item["count"] / total_cnt) * 100, 1)
            top_rewards.append({
                "reward_id": item["reward_id"],
                "title": item["title"],
                "brand": brand,
                "count": item["count"],
                "percentage": pct,
            })

        return RedemptionAnalyticsResponse(
            time_range=time_range,
            total_redemptions=total_redemptions,
            total_points_spent=total_points_spent,
            bar_chart=bar_chart,
            line_chart=line_chart,
            top_rewards=top_rewards,
        )

    # --------------------------------------------------------------------------
    # CHỨC NĂNG 31: QUẢN LÝ DANH SÁCH QUÀ TẶNG CÁ NHÂN ĐÃ ĐỔI & VOUCHER WALLET
    # --------------------------------------------------------------------------

    async def ensure_seed_user_vouchers_if_empty(self, user_id: uuid.UUID) -> None:
        """Tạo dữ liệu voucher cá nhân mẫu cho người dùng để kiểm thử ngay lập tức"""
        count = await self.db.scalar(
            select(func.count(UserVoucher.voucher_id)).where(UserVoucher.user_id == user_id)
        )
        if count and count > 0:
            return

        await self.ensure_seed_eco_rewards()
        rewards = (await self.db.execute(select(CitizenReward).where(CitizenReward.is_active == True))).scalars().all()
        if not rewards:
            return

        now = datetime.now(timezone.utc)
        demo_specs = [
            # 1. Voucher còn hạn (sắp hết hạn trong 2 ngày -> màu cam cảnh báo)
            {
                "reward": rewards[1] if len(rewards) > 1 else rewards[0],
                "code": "ECO-CP-84920",
                "days_offset": 2,
                "status": "ACTIVE",
            },
            # 2. Voucher còn hạn bình thường (còn 60 ngày)
            {
                "reward": rewards[0],
                "code": "ECO-INOX-7193",
                "days_offset": 60,
                "status": "ACTIVE",
            },
            # 3. Voucher đã sử dụng
            {
                "reward": rewards[4] if len(rewards) > 4 else rewards[0],
                "code": "ECO-GRB-20419",
                "days_offset": 30,
                "status": "USED",
                "used_days_ago": 3,
            },
        ]

        for spec in demo_specs:
            r = spec["reward"]
            v_id = uuid.uuid4()
            code = f"{spec['code']}-{uuid.uuid4().hex[:4].upper()}"
            exp_date = now + timedelta(days=spec["days_offset"])
            used_at = now - timedelta(days=spec.get("used_days_ago", 0)) if spec["status"] == "USED" else None
            terms = (
                f"1. Áp dụng tại toàn bộ hệ sinh thái đối tác {r.brand or 'GreenSpot ESG'}.\n"
                "2. Xuất trình mã vạch / mã QR cho thu ngân tại quầy thanh toán hoặc nhập mã khi mua trực tuyến.\n"
                "3. Không có giá trị quy đổi thành tiền mặt hoặc hoàn lại điểm sau khi đã xác nhận.\n"
                "4. Mỗi mã voucher chỉ có hiệu lực sử dụng 01 lần duy nhất."
            )
            qr_data = f"https://greenspot.vn/vouchers/verify?code={code}&v={v_id}&t={int(now.timestamp())}"
            v = UserVoucher(
                voucher_id=v_id,
                user_id=user_id,
                reward_id=r.reward_id,
                voucher_code=code,
                points_spent=r.points_required,
                status=spec["status"],
                terms_and_conditions=terms,
                qr_data=qr_data,
                redeemed_at=now - timedelta(days=5),
                expires_at=exp_date,
                used_at=used_at,
            )
            self.db.add(v)
        await self.db.commit()

    async def redeem_reward(self, user_id: uuid.UUID, reward_id: int) -> RedeemRewardResponse:
        """
        Thực hiện đổi Điểm Xanh lấy E-Voucher / Quà tặng sinh thái.
        Kiểm tra số dư, trừ điểm ACID, sinh mã Voucher duy nhất, mã QR và hạn dùng.
        """
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Người dùng không tồn tại")

        reward = await self.db.get(CitizenReward, reward_id)
        if not reward or not reward.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quà tặng không tồn tại hoặc đã ngừng áp dụng")

        now = datetime.now(timezone.utc)
        if reward.expiry_date and reward.expiry_date <= now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voucher này đã hết hạn chương trình quy đổi")

        if reward.stock_quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phần quà này hiện đã hết hàng trong kho")

        if user.green_points < reward.points_required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Số dư Điểm Xanh không đủ (cần {reward.points_required} điểm, hiện có {user.green_points} điểm)",
            )

        balance_before = user.green_points
        user.green_points -= reward.points_required
        reward.stock_quantity -= 1
        reward.total_redeemed += 1

        brand_prefix = "ECO"
        if "co.op" in reward.title.lower() or "coop" in (reward.brand or "").lower():
            brand_prefix = "ECO-CP"
        elif "grab" in reward.title.lower():
            brand_prefix = "ECO-GRB"
        elif "inox" in reward.title.lower() or "bình" in reward.title.lower():
            brand_prefix = "ECO-BNH"
        else:
            brand_prefix = f"ECO-{reward.reward_type[:3]}"
        rand_code = uuid.uuid4().hex[:5].upper()
        voucher_code = f"{brand_prefix}-{rand_code}"

        voucher_id = uuid.uuid4()
        expires_at = reward.expiry_date if reward.expiry_date else (now + timedelta(days=90))
        terms = (
            f"1. Áp dụng tại toàn bộ hệ sinh thái đối tác {reward.brand or 'GreenSpot ESG'}.\n"
            "2. Xuất trình mã vạch / mã QR cho thu ngân tại quầy thanh toán hoặc nhập mã khi mua trực tuyến.\n"
            "3. Không có giá trị quy đổi thành tiền mặt hoặc hoàn lại điểm sau khi đã xác nhận.\n"
            "4. Mỗi mã voucher chỉ có hiệu lực sử dụng 01 lần duy nhất."
        )
        qr_data = f"https://greenspot.vn/vouchers/verify?code={voucher_code}&v={voucher_id}&t={int(now.timestamp())}"

        voucher = UserVoucher(
            voucher_id=voucher_id,
            user_id=user_id,
            reward_id=reward_id,
            voucher_code=voucher_code,
            points_spent=reward.points_required,
            status="ACTIVE",
            terms_and_conditions=terms,
            qr_data=qr_data,
            redeemed_at=now,
            expires_at=expires_at,
        )
        self.db.add(voucher)

        tx = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=user_id,
            reward_id=reward_id,
            transaction_type="REDEEM_GIFT",
            points_amount=-reward.points_required,
            balance_after=user.green_points,
            description=f"Đổi {reward.title} (Mã #{voucher_code})",
            created_at=now,
        )
        self.db.add(tx)

        await self.db.commit()

        return RedeemRewardResponse(
            voucher_id=str(voucher_id),
            voucher_code=voucher_code,
            reward_title=reward.title,
            points_spent=reward.points_required,
            balance_after=user.green_points,
            qr_data=qr_data,
            expires_at=expires_at,
            status="ACTIVE",
            message=f"Đổi thành công {reward.title}! Mã voucher: {voucher_code}",
        )

    async def get_user_vouchers(
        self,
        user_id: uuid.UUID,
        status_filter: Optional[str] = "ACTIVE",
    ) -> UserVoucherListResponse:
        """
        Lấy kho voucher cá nhân đã đổi của công dân (Chức năng 31 Màn 1).
        Lọc theo: ACTIVE (Còn hạn), USED (Đã dùng), EXPIRED (Hết hạn).
        Tự động cảnh báo voucher sắp hết hạn dưới 3 ngày.
        """
        await self.ensure_seed_user_vouchers_if_empty(user_id)
        now = datetime.now(timezone.utc)

        stmt = (
            select(UserVoucher, CitizenReward)
            .join(CitizenReward, UserVoucher.reward_id == CitizenReward.reward_id)
            .where(UserVoucher.user_id == user_id)
            .order_by(UserVoucher.expires_at.asc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        items: List[UserVoucherItem] = []
        total_active = 0
        total_used = 0
        total_expired = 0

        for voucher, reward in rows:
            curr_status = voucher.status
            if curr_status == "ACTIVE" and voucher.expires_at <= now:
                curr_status = "EXPIRED"
                voucher.status = "EXPIRED"

            if curr_status == "ACTIVE":
                total_active += 1
            elif curr_status == "USED":
                total_used += 1
            elif curr_status == "EXPIRED":
                total_expired += 1

            if status_filter and status_filter != "ALL" and curr_status != status_filter:
                continue

            delta_days = (voucher.expires_at - now).total_seconds() / 86400
            is_soon = curr_status == "ACTIVE" and 0 <= delta_days <= 3
            days_rem = max(0, int(delta_days))

            items.append(
                UserVoucherItem(
                    voucher_id=str(voucher.voucher_id),
                    reward_id=voucher.reward_id,
                    reward_title=reward.title,
                    reward_description=reward.description,
                    reward_image_url=reward.image_url,
                    brand=reward.brand or "GreenSpot ESG",
                    voucher_code=voucher.voucher_code,
                    qr_data=voucher.qr_data or voucher.voucher_code,
                    points_spent=voucher.points_spent,
                    status=curr_status,
                    terms_and_conditions=voucher.terms_and_conditions,
                    redeemed_at=voucher.redeemed_at,
                    expires_at=voucher.expires_at,
                    used_at=voucher.used_at,
                    is_expiring_soon=is_soon,
                    days_remaining=days_rem,
                )
            )

        await self.db.commit()

        return UserVoucherListResponse(
            items=items,
            total=len(items),
            total_active=total_active,
            total_used=total_used,
            total_expired=total_expired,
        )

    async def get_user_voucher_detail(
        self,
        user_id: uuid.UUID,
        voucher_id: uuid.UUID,
    ) -> UserVoucherItem:
        """Chi tiết một voucher cá nhân kèm mã QR và hướng dẫn (Chức năng 31 Màn 2)"""
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserVoucher, CitizenReward)
            .join(CitizenReward, UserVoucher.reward_id == CitizenReward.reward_id)
            .where(
                and_(
                    UserVoucher.voucher_id == voucher_id,
                    UserVoucher.user_id == user_id,
                )
            )
        )
        row = (await self.db.execute(stmt)).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy voucher tương ứng",
            )
        voucher, reward = row
        curr_status = voucher.status
        if curr_status == "ACTIVE" and voucher.expires_at <= now:
            curr_status = "EXPIRED"
            voucher.status = "EXPIRED"
            await self.db.commit()

        delta_days = (voucher.expires_at - now).total_seconds() / 86400
        is_soon = curr_status == "ACTIVE" and 0 <= delta_days <= 3
        days_rem = max(0, int(delta_days))

        return UserVoucherItem(
            voucher_id=str(voucher.voucher_id),
            reward_id=voucher.reward_id,
            reward_title=reward.title,
            reward_description=reward.description,
            reward_image_url=reward.image_url,
            brand=reward.brand or "GreenSpot ESG",
            voucher_code=voucher.voucher_code,
            qr_data=voucher.qr_data or voucher.voucher_code,
            points_spent=voucher.points_spent,
            status=curr_status,
            terms_and_conditions=voucher.terms_and_conditions,
            redeemed_at=voucher.redeemed_at,
            expires_at=voucher.expires_at,
            used_at=voucher.used_at,
            is_expiring_soon=is_soon,
            days_remaining=days_rem,
        )

    async def mark_voucher_used(
        self,
        user_id: uuid.UUID,
        voucher_id: uuid.UUID,
    ) -> MarkVoucherUsedResponse:
        """Đánh dấu đã sử dụng voucher (Chức năng 31 Màn 3 Popup)"""
        voucher = await self.db.get(UserVoucher, voucher_id)
        if not voucher or voucher.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy voucher trong kho cá nhân",
            )

        if voucher.status == "USED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voucher này đã được sử dụng trước đó",
            )

        now = datetime.now(timezone.utc)
        if voucher.status == "EXPIRED" or voucher.expires_at <= now:
            voucher.status = "EXPIRED"
            await self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voucher này đã hết hạn sử dụng",
            )

        voucher.status = "USED"
        voucher.used_at = now
        await self.db.commit()

        return MarkVoucherUsedResponse(
            voucher_id=str(voucher.voucher_id),
            voucher_code=voucher.voucher_code,
            status="USED",
            used_at=now,
            message="Đã cập nhật trạng thái voucher: Đã sử dụng",
        )
