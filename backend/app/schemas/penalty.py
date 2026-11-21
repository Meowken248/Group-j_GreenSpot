"""
Pydantic Schemas for Penalty Regulations Domain (Chức năng 11: Tra cứu quy định xử phạt)
"""

import uuid
from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


TargetType = Literal["INDIVIDUAL", "ORGANIZATION"]


class PenaltySearchParams(BaseModel):
    """Tham số tra cứu quy định xử phạt"""
    query: Optional[str] = Field(default=None, description="Từ khóa tìm kiếm (hành vi vi phạm)")
    domain: Optional[str] = Field(default=None, description="Lĩnh vực chuyên đề môi trường")
    quick_category: Optional[str] = Field(default=None, description="Danh mục truy cập nhanh Màn 1")
    target: TargetType = Field(default="INDIVIDUAL", description="Đối tượng áp dụng: INDIVIDUAL hoặc ORGANIZATION")
    page: int = Field(default=1, ge=1, description="Số trang (bắt đầu từ 1)")
    limit: int = Field(default=10, ge=1, le=50, description="Số kết quả mỗi trang (mặc định 10)")


class PenaltySummaryItem(BaseModel):
    """Dòng tóm lược kết quả tra cứu trên Màn 2"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    domain: str
    quick_category: Optional[str] = None
    target: str = "INDIVIDUAL"
    displayed_min_fine: int
    displayed_max_fine: int
    displayed_avg_fine: int
    legal_basis: str
    amendment_warning: Optional[str] = None


class PenaltySearchResponse(BaseModel):
    """Danh sách kết quả tra cứu kèm phân trang"""
    items: List[PenaltySummaryItem]
    total: int
    page: int
    limit: int
    total_pages: int
    target: str


class PenaltyDetailResponse(BaseModel):
    """Thông tin chi tiết điều luật trên Màn 3 (3 khối thông tin)"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    domain: str
    quick_category: Optional[str] = None
    target: str = "INDIVIDUAL"

    # Mức phạt tiền theo đối tượng đã chọn (Cá nhân hoặc Tổ chức x2)
    min_fine: int
    max_fine: int
    avg_fine: int

    # Khối 1: Hành vi vi phạm
    description: str
    aggravating_circumstances: Optional[str] = None

    # Khối 2: Biện pháp xử lý bổ sung & khắc phục
    supplementary_measures: Optional[str] = None

    # Khối 3: Căn cứ pháp lý
    legal_basis: str
    effective_date: Optional[date] = None
    amendment_warning: Optional[str] = None

    version: int


class QuickCategoryStat(BaseModel):
    """Thống kê danh mục phổ biến Màn 1"""
    category_name: str
    count: int
    icon: str
    description: str


class CreatePenaltyReportRequest(BaseModel):
    """Yêu cầu gửi phản ánh vi phạm môi trường từ công dân"""
    penalty_id: Optional[uuid.UUID] = Field(default=None, description="ID điều luật liên quan")
    violation_title: str = Field(..., description="Tên hành vi vi phạm")
    legal_basis: str = Field(..., description="Căn cứ pháp lý theo Nghị định")
    fine_range: str = Field(..., description="Khung tiền phạt quy định")
    address_text: str = Field(..., min_length=3, description="Địa điểm xảy ra vi phạm")
    description: str = Field(..., min_length=5, description="Mô tả chi tiết vi phạm")
    is_anonymous: bool = Field(default=False, description="Gửi ẩn danh hay bằng tài khoản")


class UpdatePenaltyReportStatusRequest(BaseModel):
    """Yêu cầu cán bộ/admin cập nhật trạng thái phản ánh"""
    status: Literal["PENDING", "VERIFIED", "RESOLVED", "REJECTED"] = Field(..., description="Trạng thái mới")
    officer_note: Optional[str] = Field(default=None, description="Ghi chú / lý do của cán bộ")


class PenaltyReportItem(BaseModel):
    """Thông tin chi tiết một phản ánh vi phạm môi trường"""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tracking_code: str
    penalty_id: Optional[uuid.UUID] = None
    violation_title: str
    legal_basis: str
    fine_range: str
    address_text: str
    description: str
    is_anonymous: bool
    reporter_id: Optional[uuid.UUID] = None
    reporter_name: Optional[str] = None
    status: str
    officer_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class PenaltyReportListResponse(BaseModel):
    """Danh sách phản ánh vi phạm môi trường kèm phân trang"""
    items: List[PenaltyReportItem]
    total: int
    page: int
    limit: int
    total_pages: int


class PenaltyReportStatsResponse(BaseModel):
    """Thống kê số lượng phản ánh vi phạm theo từng trạng thái"""
    total: int
    pending: int
    verified: int
    resolved: int
    rejected: int

