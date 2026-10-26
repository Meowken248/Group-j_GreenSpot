"""
Pydantic Schemas for Hotspot Spatial Analytics & 7-Day Forecasting
STT 44: Phân tích điểm nóng + dự báo 7 ngày
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ==================== MÀN 1/3: BẢN ĐỒ ĐIỂM NÓNG ====================

class HotspotClusterItem(BaseModel):
    """Chi tiết cụm điểm nóng phục vụ hiển thị bản đồ GIS và Top 5"""
    hotspot_id: str
    hotspot_code: str
    name: str
    incident_type: str
    incident_type_label: str
    district: str
    ward: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: float
    kde_density_score: float = Field(..., description="Thang điểm mật độ KDE từ 0 - 100")
    incident_count: int
    severity_level: str = Field(..., description="CRITICAL, SEVERE, POTENTIAL")
    severity_label: str
    severity_color: str
    trend_description: str
    forecast_48h: str
    active_dispatch_order_id: Optional[str] = None
    active_dispatch_order_code: Optional[str] = None
    version: int = 1


class HotspotFilterRequest(BaseModel):
    """Bộ lọc cho Bản đồ điểm nóng"""
    incident_type: Optional[str] = "ALL"  # ALL, SPONTANEOUS_DUMP, FLOODING, WATER_POLLUTION, AIR_POLLUTION
    time_range: Optional[str] = "30_DAYS"  # 7_DAYS, 30_DAYS, THIS_QUARTER, CUSTOM
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class HotspotMapResponse(BaseModel):
    """Dữ liệu trả về cho Màn 1/3 Bản đồ điểm nóng"""
    clusters: List[HotspotClusterItem]
    top_5_hotspots: List[HotspotClusterItem]
    total_clusters: int
    has_data: bool
    status_message: str
    tile_server_status: str = "ONLINE"  # ONLINE, ERROR


# ==================== MÀN 2/3: DỰ BÁO 7 NGÀY ====================

class AreaOptionItem(BaseModel):
    """Lựa chọn Quận hoặc Điểm nóng cụ thể"""
    target_id: str
    target_name: str
    target_type: str  # DISTRICT hoặc HOTSPOT
    district: Optional[str] = None


class DailyForecastItem(BaseModel):
    """Điểm dữ liệu dự báo cho từng ngày trong 7 ngày tới"""
    day_offset: int  # 1 đến 7
    date_str: str    # YYYY-MM-DD
    day_label: str   # Thứ Hai, 15/10
    predicted_incidents: float
    ci_lower_95: float  # Khoảng tin cậy dưới
    ci_upper_95: float  # Khoảng tin cậy trên
    rainfall_mm: float
    tidal_peak_m: float
    risk_level: str  # LOW, NORMAL, HIGH, PEAK_CRITICAL
    risk_label: str
    risk_reason: Optional[str] = None


class ForecastResponse(BaseModel):
    """Dữ liệu trả về cho Màn 2/3 Dự báo 7 ngày"""
    target_id: str
    target_name: str
    target_type: str
    daily_points: List[DailyForecastItem]
    model_accuracy_pct: float = 87.5
    is_weather_synced: bool = True
    peak_risk_day: Optional[DailyForecastItem] = None
    peak_risk_summary: str
    weather_warning: Optional[str] = None
    status_message: str


class ExportReportRequest(BaseModel):
    """Yêu cầu xuất báo cáo dự báo 7 ngày"""
    target_id: str
    target_type: str = "DISTRICT"
    format: str = "PDF"  # PDF hoặc EXCEL


class ExportReportResponse(BaseModel):
    """Kết quả tải tệp báo cáo"""
    success: bool
    file_name: str
    file_url: str
    message: str


# ==================== MÀN 3/3: MODAL CHI TIẾT ĐIỂM NÓNG ====================

class HotspotDetailResponse(BaseModel):
    """Dữ liệu trả về cho Màn 3/3 Popup Chi tiết điểm nóng"""
    hotspot: HotspotClusterItem
    has_active_dispatch: bool
    active_order_code: Optional[str] = None
    active_order_id: Optional[str] = None
    dispatch_prefill: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dữ liệu điền sẵn tự động để chuyển sang STT 43 – Màn 2/6: Tạo lệnh mới"
    )
