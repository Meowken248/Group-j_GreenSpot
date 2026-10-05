from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class CitizenRegisterRequest(BaseModel):
    """Payload gửi lên từ Màn 1: Đăng ký tài khoản công dân"""
    full_name: str = Field(..., min_length=2, max_length=150, description="Họ tên công dân")
    email: EmailStr = Field(..., max_length=254, description="Địa chỉ email tiếp nhận OTP")
    password: str = Field(..., min_length=8, max_length=128, description="Mật khẩu tài khoản")


class CitizenVerifyOtpRequest(BaseModel):
    """Payload gửi lên từ Màn 2: Xác thực mã OTP 6 số"""
    email: EmailStr = Field(..., description="Địa chỉ email cần kích hoạt")
    otp_code: str = Field(..., min_length=6, max_length=6, description="Mã OTP 6 chữ số")


class CitizenResendOtpRequest(BaseModel):
    """Payload gửi lại mã OTP"""
    email: EmailStr = Field(..., description="Địa chỉ email cần gửi lại mã")


class UserSummary(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    status: str


class CitizenLoginRequest(BaseModel):
    """Payload gửi lên từ Màn hình Đăng nhập"""
    email: EmailStr = Field(..., description="Địa chỉ email đăng nhập")
    password: str = Field(..., min_length=1, max_length=128, description="Mật khẩu tài khoản")


class CitizenLoginResponse(BaseModel):
    """Phản hồi đăng nhập thành công với 2 Token"""
    success: bool = True
    message: str = "Đăng nhập thành công"
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    session_id: str
    user: UserSummary


class RefreshTokenRequest(BaseModel):
    """Payload làm mới Token"""
    refresh_token: str = Field(..., description="Refresh Token 64 bytes đã cấp khi đăng nhập")


class RefreshTokenResponse(BaseModel):
    """Phản hồi sau khi làm mới Access Token thành công"""
    success: bool = True
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 900


class SessionItemResponse(BaseModel):
    """Thông tin 1 phiên đăng nhập trong danh sách thiết bị"""
    session_id: str
    device_name: str
    ip_address: Optional[str] = None
    is_current: bool = False
    last_active_at: str
    created_at: str


class SessionListResponse(BaseModel):
    """Danh sách các thiết bị đang có phiên còn hiệu lực"""
    success: bool = True
    sessions: list[SessionItemResponse]
    total: int


class RevokeSessionResponse(BaseModel):
    """Phản hồi khi thu hồi thiết bị"""
    success: bool = True
    message: str
    is_current: bool = False


class AuthSuccessResponse(BaseModel):
    """Cấu trúc phản hồi thành công chuẩn RESTful"""
    success: bool = True
    message: str
    email: Optional[str] = None


class AuthErrorResponse(BaseModel):
    """Cấu trúc phản hồi lỗi chuẩn"""
    error_code: str
    message: str

