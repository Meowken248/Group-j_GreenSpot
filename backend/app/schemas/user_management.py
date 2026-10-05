import re
from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, Field, field_validator


class RoleOptionItem(BaseModel):
    """Mục vai trò hiển thị trong dropdown chọn vai trò"""
    role_id: int
    role_code: str
    role_name: str
    is_system: bool
    scope: str
    scope_display: str


class UserItemResponse(BaseModel):
    """Thông tin chi tiết một người dùng trong bảng danh sách"""
    user_id: str
    email: str
    phone_number: Optional[str] = None
    full_name: str
    avatar_url: Optional[str] = None
    role_id: int
    role_code: str
    role_name: str
    role_is_system: bool
    role_scope: str
    role_scope_display: str
    status: str
    reputation_score: int
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None


class UserListResponse(BaseModel):
    """Phản hồi danh sách người dùng kèm phân trang và số liệu thống kê"""
    users: List[UserItemResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    stats: dict


class CreateUserRequest(BaseModel):
    """Yêu cầu tạo tài khoản người dùng mới (Chỉ dành cho Admin)"""
    full_name: str = Field(..., description="Họ và tên người dùng (2 - 100 ký tự)")
    email: str = Field(..., description="Địa chỉ Email duy nhất")
    phone_number: Optional[str] = Field(None, description="Số điện thoại di động Việt Nam (10 chữ số)")
    role_id: int = Field(..., description="ID của vai trò được phân bổ")
    password: str = Field(..., description="Mật khẩu khởi tạo tối thiểu 8 ký tự")
    status: str = Field(default="ACTIVE", description="Trạng thái tài khoản: ACTIVE hoặc BLOCKED")

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Họ và tên phải là chuỗi ký tự")
        cleaned = re.sub(r"\s+", " ", v.strip())
        if len(cleaned) < 2 or len(cleaned) > 100:
            raise ValueError("Họ và tên phải từ 2 đến 100 ký tự")
        return cleaned

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Email phải là chuỗi ký tự")
        cleaned = v.strip().lower()
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(pattern, cleaned):
            raise ValueError("Định dạng email không hợp lệ")
        return cleaned

    @field_validator("phone_number", mode="before")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if not isinstance(v, str):
            return None
        cleaned = re.sub(r"\D", "", v.strip())
        if not cleaned:
            return None
        if len(cleaned) not in [10, 11] or not cleaned.startswith("0"):
            raise ValueError("Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10-11 số)")
        return cleaned

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Mật khẩu phải là chuỗi ký tự")
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có tối thiểu 8 ký tự")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ hoa")
        if not re.search(r"[a-z]", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ thường")
        if not re.search(r"\d", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ số")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in ["ACTIVE", "BLOCKED"]:
            return "ACTIVE"
        return upper_v


class ChangeUserRoleRequest(BaseModel):
    """Yêu cầu thay đổi vai trò của người dùng"""
    role_id: int = Field(..., description="ID vai trò mới")


class ChangeUserStatusRequest(BaseModel):
    """Yêu cầu thay đổi trạng thái tài khoản (Khóa / Mở khóa)"""
    status: str = Field(..., description="Trạng thái mới: ACTIVE hoặc BLOCKED")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper_v = v.strip().upper()
        if upper_v not in ["ACTIVE", "BLOCKED"]:
            raise ValueError("Trạng thái chỉ có thể là ACTIVE hoặc BLOCKED")
        return upper_v


class AdminResetPasswordRequest(BaseModel):
    """Yêu cầu đặt lại mật khẩu mới cho người dùng"""
    new_password: str = Field(..., description="Mật khẩu mới từ 8 đến 32 ký tự theo đúng quy tắc đăng ký")

    @field_validator("new_password", mode="before")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Mật khẩu phải là chuỗi ký tự")
        if " " in v or len(v) < 8 or len(v) > 32:
            raise ValueError("Mật khẩu phải từ 8 đến 32 ký tự, không chứa khoảng trắng")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ hoa")
        if not re.search(r"[a-z]", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ thường")
        if not re.search(r"\d", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ số")
        if not re.search(r"[`!@#$%^&*()_+\-=[\]{}.:;,?\/~]", v):
            raise ValueError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
        return v
