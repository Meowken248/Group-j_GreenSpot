"""
GreenSpot Pydantic Schemas - Green Points & Rewards (Chức năng 28 & 29)
Định nghĩa chuẩn hóa dữ liệu cho chính sách tích điểm, nhận điểm, ví điểm và sao kê lịch sử biến động.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --------------------------------------------------------------------------
# CHỨC NĂNG 28: CƠ CHẾ TÍCH LŨY ĐIỂM THƯỞNG CÔNG DÂN XANH
# --------------------------------------------------------------------------

class PointPolicyItem(BaseModel):
    """Quy chuẩn định mức điểm thưởng cho từng hành vi bảo vệ môi trường"""
    action_type: str
    name: str
    points: int
    description: str
    icon: str
    badge_label: str
    daily_cap: Optional[int] = None
    target_action_hint: Optional[str] = None


class TierInfo(BaseModel):
    """Cấp bậc danh hiệu Công dân Xanh"""
    tier_code: str  # BRONZE, SILVER, GOLD, DIAMOND
    tier_name: str
    min_points: int
    badge_icon: str
    color_hex: str
    bg_gradient: str
    description: str
    benefits: List[str]


class PointPolicyResponse(BaseModel):
    """Phản hồi toàn bộ chính sách tích điểm & bảng thăng hạng danh hiệu"""
    policy_title: str
    policy_description: str
    actions: List[PointPolicyItem]
    tiers: List[TierInfo]
    user_summary: Optional[Dict[str, Any]] = None


class FraudRuleItem(BaseModel):
    """Quy tắc chống gian lận & chế tài xử phạt"""
    rule_type: str
    title: str
    description: str
    penalty_text: str
    penalty_points: int
    severity: str


class DailyLimitItem(BaseModel):
    """Định ngạch trần điểm tối đa mỗi ngày"""
    category: str
    max_points: int
    unit: str
    note: str


class DailyLimitsPolicyResponse(BaseModel):
    """Điều khoản chống gian lận & định ngạch tích điểm 24h"""
    title: str
    description: str
    limits: List[DailyLimitItem]
    conditions: List[str]
    fraud_rules: List[FraudRuleItem]
    appeal_guide: str


class ClaimPointRequest(BaseModel):
    """Yêu cầu nhận điểm thưởng khi hoàn tất hành động xanh"""
    action_type: str = Field(..., description="Mã loại hành động (REPORT_INCIDENT, EVENT_CHECKIN, etc.)")
    incident_id: Optional[str] = Field(None, description="UUID sự cố liên quan nếu có")
    description: Optional[str] = Field(None, description="Mô tả cụ thể hành động")
    latitude: Optional[float] = Field(None, description="Vĩ độ GPS xác thực hiện trường")
    longitude: Optional[float] = Field(None, description="Kinh độ GPS xác thực hiện trường")


class ClaimPointResponse(BaseModel):
    """Phản hồi popup tức thì +{n} Điểm Xanh"""
    success: bool
    points_awarded: int
    new_balance: int
    lifetime_points: int
    current_tier: TierInfo
    next_tier: Optional[TierInfo]
    points_to_next_tier: int
    tier_upgraded: bool
    upgraded_tier_name: Optional[str] = None
    transaction_id: str
    transaction_code: str
    action_title: str
    message: str


# --------------------------------------------------------------------------
# CHỨC NĂNG 29: VÍ ĐIỂM VÀ LỊCH SỬ BIẾN ĐỘNG ĐIỂM XANH
# --------------------------------------------------------------------------

class WalletSummaryResponse(BaseModel):
    """Bảng điều khiển tài chính sinh thái cá nhân (Green Wallet Dashboard)"""
    user_id: str
    full_name: str
    email: str
    green_points: int
    lifetime_points: int
    current_tier: TierInfo
    next_tier: Optional[TierInfo]
    points_to_next_tier: int
    progress_percent: float
    points_earned_this_week: int
    points_spent_total: int
    total_transactions_count: int
    last_updated: datetime


class TransactionHistoryItem(BaseModel):
    """Một dòng sao kê biến động điểm"""
    transaction_id: str
    transaction_code: str  # VD: #TX-98420194
    transaction_type: str
    action_title: str
    points_amount: int
    balance_after: int
    description: Optional[str]
    created_at: datetime
    status: str = "Thành công"
    is_positive: bool


class TransactionHistoryFilter(BaseModel):
    """Bộ lọc lịch sử biến động điểm"""
    flow_type: Optional[str] = Field(None, description="ALL, EARN, REDEEM")
    time_range: Optional[str] = Field(None, description="7_DAYS, 30_DAYS, THIS_MONTH, ALL")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    page: int = Field(1, ge=1)
    page_size: int = Field(15, ge=1, le=100)


class TransactionHistoryResponse(BaseModel):
    """Danh sách sao kê nhật ký giao dịch điểm thưởng"""
    items: List[TransactionHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    total_earned: int
    total_spent: int


class TransactionDetailResponse(BaseModel):
    """Chứng từ điện tử chi tiết một giao dịch (Popup Màn 3)"""
    transaction_id: str
    transaction_code: str
    action_name: str
    transaction_type: str
    points_amount: int
    is_positive: bool
    balance_after: int
    status: str
    created_at: datetime
    formatted_time: str
    description: Optional[str]
    incident_id: Optional[str]
    reward_id: Optional[int]
    audit_note: Optional[str] = None


# --------------------------------------------------------------------------
# CHỨC NĂNG 30: QUẢN TRỊ CRUD DANH MỤC QUÀ TẶNG XANH VÀ KHO VOUCHER
# --------------------------------------------------------------------------

class EcoRewardItem(BaseModel):
    """Thông tin quà tặng sinh thái / lô voucher"""
    reward_id: int
    reward_code: str
    title: str
    description: Optional[str] = None
    brand: Optional[str] = "GreenSpot ESG"
    points_required: int
    reward_type: str
    stock_quantity: int
    total_redeemed: int = 0
    image_url: Optional[str] = None
    expiry_date: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime
    stock_status: str = "IN_STOCK"  # IN_STOCK, OUT_OF_STOCK, EXPIRED


class CreateRewardRequest(BaseModel):
    title: str = Field(..., max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    brand: Optional[str] = Field("GreenSpot ESG", max_length=100)
    points_required: int = Field(..., ge=10)
    reward_type: str = Field("VOUCHER")
    stock_quantity: int = Field(..., ge=1, le=10000)
    image_url: Optional[str] = None
    expiry_date: datetime


class UpdateRewardRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    brand: Optional[str] = Field(None, max_length=100)
    points_required: Optional[int] = Field(None, ge=10)
    stock_quantity: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    expiry_date: Optional[datetime] = None
    is_active: Optional[bool] = None


class RewardCatalogResponse(BaseModel):
    items: List[EcoRewardItem]
    total: int
    total_active: int
    total_out_of_stock: int


class RedemptionAnalyticsResponse(BaseModel):
    """Thống kê số liệu quy đổi quà tặng (Màn 6 của CN 30)"""
    time_range: str
    total_redemptions: int
    total_points_spent: int
    bar_chart: List[Dict[str, Any]]
    line_chart: List[Dict[str, Any]]
    top_rewards: List[Dict[str, Any]]


# --------------------------------------------------------------------------
# CHỨC NĂNG 31: QUẢN LÝ DANH SÁCH QUÀ TẶNG CÁ NHÂN ĐÃ ĐỔI
# --------------------------------------------------------------------------

class RedeemRewardRequest(BaseModel):
    reward_id: int


class RedeemRewardResponse(BaseModel):
    voucher_id: str
    voucher_code: str
    reward_title: str
    points_spent: int
    balance_after: int
    qr_data: str
    expires_at: datetime
    status: str
    message: str


class UserVoucherItem(BaseModel):
    voucher_id: str
    reward_id: int
    reward_title: str
    reward_description: Optional[str] = None
    reward_image_url: Optional[str] = None
    brand: Optional[str] = None
    voucher_code: str
    qr_data: str
    points_spent: int
    status: str  # ACTIVE, USED, EXPIRED
    terms_and_conditions: Optional[str] = None
    redeemed_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None
    is_expiring_soon: bool = False
    days_remaining: int = 0


class UserVoucherListResponse(BaseModel):
    items: List[UserVoucherItem]
    total: int
    total_active: int
    total_used: int
    total_expired: int


class MarkVoucherUsedResponse(BaseModel):
    voucher_id: str
    voucher_code: str
    status: str
    used_at: datetime
    message: str
