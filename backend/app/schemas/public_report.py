import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class OpenDataIncidentRecord(BaseModel):
    tracking_code: str
    category_name: str
    severity: str
    status: str
    district_name: str
    reported_date: str
    resolved_date: Optional[str] = None
    sla_hours: int
    sla_status: str  # ON_TIME, OVERDUE, IN_PROGRESS
    # BẢO VỆ TUYỆT ĐỐI QUYỀN RIÊNG TƯ (OPEN_001): KHÔNG CÓ HỌ TÊN, SĐT, EMAIL, CCCD, IP


class TopCategoryStat(BaseModel):
    category_name: str
    count: int
    percentage: float


class PublicReportSummary(BaseModel):
    period_type: str = "MONTH"  # MONTH, QUARTER, YEAR
    period_code: str  # e.g. 2026-10
    period_label: str  # e.g. "Bản tin Môi trường Đô thị Tháng 10/2026"
    district_filter: str = "ALL"  # ALL hoặc tên quận
    
    total_incidents: int
    resolved_incidents: int
    in_progress_incidents: int
    resolution_rate: float
    critical_alerts_count: int
    average_aqi: Optional[float] = 68.5
    air_quality_status: str = "TRUNG BÌNH - AN TOÀN"
    
    top_categories: List[TopCategoryStat]
    open_data_records_count: int
    generated_at: str
    data_classification: str = "DỮ LIỆU CÔNG KHAI - BẢO MẬT DANH TÍNH CÔNG DÂN CHUẨN MỰC"


# =====================================================================
# CHỨC NĂNG 33: BẢNG TỔNG QUAN CHỈ SỐ HIỆN TRẠNG MÔI TRƯỜNG ĐÔ THỊ CÔNG CỘNG
# =====================================================================
class PollutionDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float
    color: str


class DistrictComparisonItem(BaseModel):
    district: str
    active_alerts: int
    resolved_count: int
    clean_rate: float


class TopGreenWardItem(BaseModel):
    rank: int
    ward: str
    district: str
    green_score: float
    badge: str


class PublicDashboardResponse(BaseModel):
    active_alerts_count: int
    resolved_incidents_count: int
    safety_rate_pct: float
    avg_response_hours: float
    pollution_distribution: List[PollutionDistributionItem]
    district_comparison: List[DistrictComparisonItem]
    top_green_wards: List[TopGreenWardItem]
    last_updated_at: str
    cached: bool = True
