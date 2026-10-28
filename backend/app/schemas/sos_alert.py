import re
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, validator


def validate_vietnam_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s\.\-\(\)]", "", phone.strip())
    if cleaned.startswith("+84"):
        cleaned = "0" + cleaned[3:]
    if not re.match(r"^0[3|5|7|8|9][0-9]{8}$", cleaned):
        raise ValueError("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 chữ số (VD: 0912345678).")
    return cleaned


class SOSSubmitRequest(BaseModel):
    phone_number: str = Field(..., description="Số điện thoại liên hệ khẩn của người báo")
    incident_type: str = Field(..., description="Loại sự cố khẩn cấp: CHAY_DOC, TRAN_HOA_CHAT, NUOC_DOC, KHAC")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Tọa độ vĩ độ hiện trường")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Tọa độ kinh độ hiện trường")
    address_text: Optional[str] = Field(default="Tọa độ GPS hiện trường khẩn cấp", description="Mô tả địa chỉ hiện trường")
    note: Optional[str] = Field(default="", description="Ghi chú thêm về mức độ nguy hiểm hoặc người mắc kẹt")

    @validator("phone_number")
    def check_phone(cls, v):
        return validate_vietnam_phone(v)


class SOSSubmitResponse(BaseModel):
    success: bool = True
    incident_id: uuid.UUID
    tracking_code: str
    message: str
    severity: str = "CRITICAL"
    submitted_at: str
    hotline: str = "1800-1090"


class SOSBroadcastBannerStatus(BaseModel):
    is_active: bool = False
    title: Optional[str] = None
    message: Optional[str] = None
    affected_areas: Optional[List[str]] = None
    severity_level: Optional[str] = "RED"
    activated_at: Optional[str] = None
    hotline: str = "1800-1090"


class ToggleSOSBannerRequest(BaseModel):
    is_active: bool
    title: Optional[str] = "CẢNH BÁO MÔI TRƯỜNG ĐÔ THỊ KHẨN CẤP"
    message: Optional[str] = "Phát hiện sự cố phát tán khói độc / tràn hóa chất diện rộng. Đề nghị người dân đóng kín cửa và theo dõi hướng dẫn phòng hộ!"
    affected_areas: Optional[List[str]] = ["Toàn Thành phố"]
    severity_level: Optional[str] = "RED"
