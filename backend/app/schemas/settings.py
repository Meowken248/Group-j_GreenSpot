"""
Pydantic Schemas cho Cài đặt tài khoản (Feature STT 7)
Bao gồm:
- Tùy chọn giao diện & ngôn ngữ (Preferences)
- Biểu mẫu đổi mật khẩu an toàn (Change Password)
"""

import re
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class UserPreferencesResponse(BaseModel):
    """Phản hồi cấu hình cài đặt của người dùng"""
    theme: Literal["LIGHT", "DARK"] = Field(default="LIGHT", description="Chế độ giao diện (LIGHT / DARK)")
    language: Literal["VI", "EN"] = Field(default="VI", description="Ngôn ngữ hệ thống (VI / EN)")
    version: int = Field(default=1, description="Phiên bản cấu hình (Optimistic Locking)")
    updated_at: Optional[datetime] = Field(default=None, description="Thời điểm cập nhật")

    class Config:
        from_attributes = True


class UpdateUserPreferencesRequest(BaseModel):
    """Yêu cầu cập nhật cấu hình giao diện & ngôn ngữ"""
    theme: Literal["LIGHT", "DARK"] = Field(..., description="Chế độ giao diện (LIGHT / DARK)")
    language: Literal["VI", "EN"] = Field(..., description="Ngôn ngữ hệ thống (VI / EN)")
    version: int = Field(default=1, ge=1, description="Phiên bản hiện tại trên client để kiểm tra OCC")


class ChangePasswordRequest(BaseModel):
    """Biểu mẫu yêu cầu đổi mật khẩu tài khoản nội bộ"""
    current_password: str = Field(..., min_length=1, description="Mật khẩu hiện tại")
    new_password: str = Field(..., min_length=8, description="Mật khẩu mới mong muốn")
    confirm_password: str = Field(..., min_length=8, description="Nhập lại mật khẩu mới để xác thực")

    @field_validator("current_password", "new_password", "confirm_password")
    @classmethod
    def check_not_empty(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Vui lòng nhập đầy đủ thông tin")
        return value


class ChangePasswordResponse(BaseModel):
    """Phản hồi kết quả đổi mật khẩu"""
    success: bool = True
    message: str = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại"
