import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DistrictOption(BaseModel):
    """Lựa chọn Quận/Huyện cho bộ lọc"""
    unit_id: Optional[int] = None
    name: str
    unit_code: Optional[str] = None


class DuplicateClusterListItem(BaseModel):
    """Một cụm báo cáo trùng trong danh sách Màn 1"""
    cluster_id: uuid.UUID
    cluster_code: str
    cluster_name: str  # VD: "Nhóm 1", "Nhóm 2"
    report_count: int  # VD: 3 báo cáo, 2 báo cáo
    similarity_rate: float  # VD: 92.0, 85.0
    similarity_display: str  # VD: "giống 92%"
    district_name: Optional[str] = None
    status: str
    gps_distance_m: float
    time_diff_hours: float
    visual_similarity: float
    version: int


class ClusterListResponse(BaseModel):
    """Phản hồi danh sách cụm báo cáo trùng lặp"""
    total: int
    items: List[DuplicateClusterListItem]


class IncidentComparisonDetail(BaseModel):
    """Chi tiết báo cáo dùng cho bảng đối chứng song song Màn 2"""
    incident_id: uuid.UUID
    tracking_code: str
    reporter_name: str
    reporter_phone: Optional[str] = None
    title: str
    description: str
    address_text: str
    latitude: float
    longitude: float
    created_at: datetime
    created_at_display: str  # VD: "08:15 15/09"
    media_url: str  # Ảnh hiện trường
    thumbnail_url: Optional[str] = None
    version: int


class AIAnalysisConclusion(BaseModel):
    """Chỉ số phân tích và kết luận AI Màn 2"""
    similarity_rate: float  # VD: 92.0
    similarity_display: str  # VD: "Giống nhau: 92%"
    gps_distance_m: float  # < 50m
    time_diff_hours: float  # < 48 giờ
    visual_similarity: float  # > 80%
    recommended_primary_id: uuid.UUID
    recommendation_reason: str
    explanation: str


class ComparisonResponse(BaseModel):
    """Dữ liệu chi tiết cho Màn 2/4 (So sánh báo cáo)"""
    cluster_id: uuid.UUID
    cluster_name: str
    report_a: IncidentComparisonDetail
    report_b: IncidentComparisonDetail
    ai_conclusion: AIAnalysisConclusion
    version: int


class MergeIncidentRequest(BaseModel):
    """Yêu cầu gộp hồ sơ Màn 3"""
    cluster_id: uuid.UUID
    primary_incident_id: uuid.UUID
    secondary_incident_id: uuid.UUID
    version: int = Field(..., description="Optimistic locking version")


class MergeIncidentResponse(BaseModel):
    """Phản hồi sau khi gộp thành công Màn 4"""
    success: bool
    message: str = "Người báo cáo nhận thông báo"
    cluster_id: uuid.UUID
    primary_incident_id: uuid.UUID
    secondary_incident_id: uuid.UUID
    new_version: int
    notification_sent_to: Optional[str] = None


class MarkDistinctRequest(BaseModel):
    """Yêu cầu đánh dấu không trùng lặp (False Positive)"""
    cluster_id: uuid.UUID
    version: int = Field(..., description="Optimistic locking version")


class MarkDistinctResponse(BaseModel):
    """Phản hồi sau khi đánh dấu không trùng"""
    success: bool
    message: str = "Đã đánh dấu 2 báo cáo không trùng lặp"
    cluster_id: uuid.UUID
