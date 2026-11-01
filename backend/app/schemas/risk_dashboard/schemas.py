from datetime import date, datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DistrictRiskItem(BaseModel):
    """Điểm số và phân cấp rủi ro của từng Quận/Huyện"""
    unit_id: Optional[int] = None
    district_name: str
    risk_score: float
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    risk_level_label: str  # "Mức an toàn", "Mức rủi ro trung bình", "Mức báo động cam", "Mức báo động đỏ"
    open_incidents: int
    spontaneous_dumps: int
    flood_points: int
    threatened_facilities: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DailyTrendPoint(BaseModel):
    """Điểm xu hướng rủi ro theo ngày trong 30 ngày gần nhất"""
    date: str
    average_risk_score: float
    open_incidents: int


class TopDistrictAlertItem(BaseModel):
    """Top 5 khu vực nguy cơ cao nhất cần xử lý khẩn cấp"""
    rank: int
    unit_id: Optional[int] = None
    district_name: str
    risk_score: float
    risk_level: str
    risk_level_label: str
    open_incidents: int
    spontaneous_dumps: int
    flood_points: int
    threatened_facilities: int
    urgent_action_required: bool


class OverviewMetricsResponse(BaseModel):
    """Dữ liệu phản hồi cho Màn 1/3: Tổng quan rủi ro đô thị"""
    overall_risk_score: float
    overall_risk_label: str  # VD: "58/100 - Mức rủi ro trung bình"
    high_risk_district_count: int
    high_risk_district_label: str  # VD: "4 quận nguy cơ cao"
    open_incident_count: int
    open_incident_label: str  # VD: "128 sự cố đang mở"
    district_risks: List[DistrictRiskItem]  # 22 quận/huyện + TP. Thủ Đức
    trend_30_days: List[DailyTrendPoint]   # 30 ngày gần nhất
    top_alert_districts: List[TopDistrictAlertItem]  # Top 5 điểm nóng
    has_critical_alert: bool  # True nếu có quận > 80
    critical_alert_message: Optional[str] = None  # "Cảnh báo khẩn cấp: {tên quận} có điểm rủi ro vượt mức an toàn"
    updated_at: datetime


class FilterAnalysisRequest(BaseModel):
    """Tham số lọc chuyên sâu cho Màn 2/3"""
    district_ids: Optional[List[int]] = None
    risk_types: Optional[List[str]] = None  # DOMESTIC_WASTE, HAZARDOUS_WASTE, FLOOD, AIR_POLLUTION
    period: str = "THIS_MONTH"  # THIS_MONTH, THIS_QUARTER, LAST_6_MONTHS, CUSTOM
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class QuantitativeStats(BaseModel):
    """Bảng số liệu định lượng chi tiết"""
    total_incidents: int
    estimated_waste_volume_m3: float
    sla_on_time_rate_percent: float
    open_incidents: int
    resolved_incidents: int


class RiskTypeDistributionItem(BaseModel):
    """Phần trăm cơ cấu từng dạng rủi ro môi trường"""
    type_code: str
    type_name: str
    count: int
    percentage: float
    color_hex: str


class PeriodComparisonStats(BaseModel):
    """So sánh chỉ số rủi ro kỳ này vs kỳ trước"""
    current_period_score: float
    previous_period_score: float
    change_percent: float
    trend_direction: str  # DECREASE, INCREASE, STABLE
    is_positive: bool     # True nếu rủi ro giảm (tốt), False nếu rủi ro tăng (cảnh báo)
    comparison_text: str  # VD: "Giảm 14.5% so với tháng trước" hoặc "Tăng 8.2% so với tháng trước"
    message: str          # VD: "Tích cực: Chỉ số rủi ro môi trường đã giảm 14.5%"


class FilterAnalysisResponse(BaseModel):
    """Dữ liệu phản hồi cho Màn 2/3: Lọc & phân tích chuyên sâu"""
    has_data: bool
    empty_message: Optional[str] = None
    summary_table: QuantitativeStats
    risk_type_distribution: List[RiskTypeDistributionItem]
    period_comparison: PeriodComparisonStats
    applied_filters: Dict[str, Any] = Field(default_factory=dict)


class DistrictDetailResponse(BaseModel):
    """Dữ liệu phản hồi cho Màn 3/3: Popup Chi tiết quận"""
    unit_id: Optional[int] = None
    district_name: str
    risk_score: float
    risk_level: str
    risk_score_text: str  # VD: "Điểm rủi ro: 78/100 - Mức báo động cam"
    pending_incidents_text: str  # VD: "24 bãi rác tự phát, 3 điểm ngập úng sâu"
    spontaneous_dumps_count: int
    deep_flood_points_count: int
    threatened_facilities_text: str  # VD: "5 trường học, 2 trạm y tế nằm trong vùng nguy cơ"
    schools_count: int
    hospitals_count: int
    total_facilities_count: int
    latitude: float
    longitude: float
    gis_map_link: str
