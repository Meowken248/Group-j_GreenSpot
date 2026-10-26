import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class IncidentExportFilterParams(BaseModel):
    """Tham số bộ lọc xem trước & kết xuất dữ liệu sự cố"""
    district: Optional[str] = Field(None, description="Tên quận/huyện hoặc 'Tất cả'")
    category: Optional[str] = Field(None, description="Danh mục sự cố hoặc 'Tất cả'")
    status: Optional[str] = Field(None, description="Trạng thái sự cố hoặc 'Tất cả'")
    from_date: Optional[str] = Field(None, description="Từ ngày (YYYY-MM-DD)")
    to_date: Optional[str] = Field(None, description="Đến ngày (YYYY-MM-DD)")
    quick_range: Optional[str] = Field(None, description="Chọn nhanh: TODAY, THIS_WEEK, THIS_MONTH, THIS_QUARTER")
    page: int = Field(1, ge=1, description="Số trang hiển thị")
    page_size: int = Field(10, ge=1, le=50000, description="Số bản ghi mỗi trang")


class IncidentPreviewItem(BaseModel):
    """Dữ liệu của 1 dòng sự cố trong bảng xem trước (Màn 1/4)"""
    incident_id: str
    tracking_code: str  # Ví dụ: SC-2026-081
    category_name: str  # Ví dụ: Rác tự phát, Ngập cục bộ
    district_name: str  # Ví dụ: Quận Bình Tân, Quận 6
    status: str         # Nhãn hiển thị: Chờ tiếp nhận, Đang xử lý, Đã hoàn tất, Đã đóng
    status_code: str    # Mã trạng thái kỹ thuật: PENDING, IN_PROGRESS, RESOLVED, CLOSED
    title: str
    address_text: str
    created_at: str


class IncidentPreviewResponse(BaseModel):
    """Kết quả trả về cho bảng dữ liệu xem trước cột giữa"""
    success: bool = True
    message: str
    total_records: int
    page: int
    page_size: int
    total_pages: int
    items: List[IncidentPreviewItem] = []
    is_empty: bool = False
    date_range_invalid: bool = False
    error_detail: Optional[str] = None


class TriggerExportRequest(BaseModel):
    """Yêu cầu khởi tạo kết xuất tệp Excel hoặc PDF (Màn 2/4)"""
    export_format: str = Field("EXCEL", description="Định dạng tệp: 'EXCEL' hoặc 'PDF'")
    district: Optional[str] = Field(None, description="Quận/huyện đã lọc")
    category: Optional[str] = Field(None, description="Danh mục đã lọc")
    status: Optional[str] = Field(None, description="Trạng thái đã lọc")
    from_date: Optional[str] = Field(None, description="Từ ngày")
    to_date: Optional[str] = Field(None, description="Đến ngày")
    quick_range: Optional[str] = Field(None, description="Phạm vi nhanh")


class ExportCreatedResponse(BaseModel):
    """Thông tin tệp đã được tạo thành công trên máy chủ (Màn 3/4)"""
    success: bool = True
    export_id: str
    file_name: str
    file_type: str  # 'EXCEL' hoặc 'PDF'
    file_size_formatted: str  # Ví dụ: "1.4 MB" hoặc "340 KB"
    file_size_bytes: int
    expires_at: datetime
    is_expired: bool = False
    download_url: str
    message: str


class ExportStatusResponse(BaseModel):
    """Trạng thái kiểm tra tệp và safeguard hết hạn 15 phút"""
    export_id: str
    file_name: str
    file_type: str
    file_size_formatted: str
    is_expired: bool
    expires_at: datetime
    message: str


class ExportMetadataOptionsResponse(BaseModel):
    """Danh sách các tùy chọn phục vụ Dropdown Bộ lọc Màn 1/4"""
    districts: List[str]
    categories: List[str]
    statuses: List[dict]
    quick_ranges: List[dict]
