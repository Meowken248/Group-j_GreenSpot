from datetime import datetime
from typing import List, Optional, Any, Dict
import uuid
from pydantic import BaseModel, Field, ConfigDict


class TriageEvaluationResponse(BaseModel):
    """Kết quả phân tích AI Triage & XAI Explainability (Màn 1/3 & Màn 2/3)"""
    model_config = ConfigDict(from_attributes=True)

    incident_id: uuid.UUID
    tracking_code: str
    title: str
    description: str
    address_text: str
    latitude: float
    longitude: float
    media_urls: List[str] = Field(default_factory=list)
    reporter_name: Optional[str] = None
    created_at: datetime

    # Khối TÓM TẮT AI
    ai_summary: Optional[str] = None
    is_too_short: bool = False
    summary_message: Optional[str] = None

    # Khối ƯU TIÊN & XAI
    ai_triage_score: float = Field(..., ge=0, le=100, description="Điểm TPS từ 0-100")
    ai_suggested_priority: str = Field(..., description="Khẩn cấp, Cao, Trung bình, Thấp")
    priority_color: str = Field(..., description="red, orange, yellow, green")
    sla_response_hours: float
    sla_resolve_hours: float

    # Bảng phân rã điểm số và yếu tố tác động (Risk Factors - XAI)
    base_severity_score: float
    proximity_risk_score: float
    scale_factor_score: float
    urgency_nlp_score: float
    risk_factors: List[str] = Field(default_factory=list)
    nearby_sensitive_facility: Optional[str] = None

    # Trạng thái phê duyệt & Optimistic Locking version
    current_priority: str
    status: str
    version: int


class RegenerateSummaryResponse(BaseModel):
    """Kết quả tạo lại tóm tắt AI"""
    incident_id: uuid.UUID
    ai_summary: str
    generated_at: datetime


class AcceptPriorityRequest(BaseModel):
    """Đồng thuận với gợi ý AI"""
    version: int = Field(..., description="Optimistic locking version của sự cố")


class OverridePriorityRequest(BaseModel):
    """Can thiệp đổi mức ưu tiên của con người (Human-in-the-loop - Màn 3/3)"""
    new_priority: str = Field(..., description="Khẩn cấp, Cao, Trung bình, Thấp")
    reason: str = Field(..., min_length=1, max_length=200, description="Lý do bắt buộc, tối đa 200 ký tự")
    version: int = Field(..., description="Optimistic locking version của sự cố")


class TriageActionResponse(BaseModel):
    """Phản hồi sau khi chấp nhận hoặc đổi mức ưu tiên"""
    success: bool
    message: str
    incident_id: uuid.UUID
    updated_priority: str
    sla_deadline: Optional[datetime]
    new_version: int
