import uuid
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator


class OfflineMediaItem(BaseModel):
    client_file_id: str = Field(..., min_length=1, max_length=100, description="Mã tệp sinh từ thiết bị client")
    file_url: str = Field(..., min_length=1, max_length=1000, description="Đường dẫn tệp đã upload hoặc lưu trữ")
    thumbnail_url: Optional[str] = Field(None, description="Đường dẫn ảnh thu nhỏ")
    media_type: Literal["IMAGE", "VIDEO", "AUDIO"] = Field("IMAGE", description="Loại tệp: IMAGE, VIDEO, AUDIO")
    file_size_bytes: Optional[int] = Field(None, description="Kích thước tệp (bytes)")
    mime_type: Optional[str] = Field(None, description="MIME type")
    file_hash: Optional[str] = Field(None, description="Mã băm SHA256 kiểm tra trùng")
    captured_at: Optional[datetime] = Field(None, description="Thời điểm chụp/ghi âm thực tế ngoại tuyến")


    @field_validator("file_url", "thumbnail_url")
    @classmethod
    def uploaded_url(cls, value):
        if value is not None and (not value.strip() or value.strip().lower().startswith(("blob:", "data:", "javascript:"))):
            raise ValueError("Tệp chưa được tải lên. Vui lòng chọn lại tệp.")
        return value


class OfflineSubmissionRequest(BaseModel):
    client_submission_id: str = Field(..., min_length=10, max_length=64, description="UUID duy nhất của phản ánh sinh tại client")
    idempotency_key: str = Field(..., min_length=10, max_length=64, description="Khóa chống gửi lặp")
    category_id: int = Field(..., strict=True, ge=1, le=2147483647, description="ID danh mục sự cố rác thải")
    title: str = Field(..., min_length=1, max_length=100, description="Tiêu đề sự cố tối đa 100 ký tự")
    description: str = Field(..., min_length=1, max_length=500, description="Mô tả sự cố tối đa 500 ký tự")
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field("MEDIUM", description="Mức khẩn cấp: LOW, MEDIUM, HIGH, CRITICAL")
    latitude: float = Field(..., ge=-90, le=90, description="Vĩ độ GPS đã xác nhận")
    longitude: float = Field(..., ge=-180, le=180, description="Kinh độ GPS đã xác nhận")
    address_text: str = Field(..., min_length=1, max_length=500, description="Địa chỉ chữ mô tả vị trí")
    media: List[OfflineMediaItem] = Field(..., min_length=1, max_length=6, description="Danh sách media đính kèm")
    is_anonymous: bool = Field(False, description="Báo cáo ẩn danh")
    reporter_phone: Optional[str] = Field(None, description="Số điện thoại người báo cáo")
    client_timestamp: Optional[datetime] = Field(None, description="Thời điểm bấm gửi ngoại tuyến")


    @field_validator("title", "description", "address_text")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Tiêu đề, mô tả và địa chỉ không được chỉ chứa khoảng trắng.")
        return value.strip()


class OfflineSubmissionResponse(BaseModel):
    submission_id: str
    client_submission_id: str
    incident_id: str
    tracking_code: str
    status: str
    is_duplicate_replay: bool
    points_awarded: int
    created_at: datetime
    message: str


class OfflineSubmissionStatusResponse(BaseModel):
    submission_id: str
    client_submission_id: str
    incident_id: Optional[str] = None
    tracking_code: Optional[str] = None
    status: str
    server_received_at: datetime
    synced_at: Optional[datetime] = None
    error_message: Optional[str] = None
