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


class CitizenLoginRequest(BaseModel):
    """Payload gửi lên từ Màn hình Đăng nhập"""
    email: EmailStr = Field(..., description="Địa chỉ email đăng nhập")
    password: str = Field(..., min_length=1, description="Mật khẩu tài khoản")


class CitizenLoginResponse(BaseModel):
    """Phản hồi đăng nhập thành công"""
    success: bool = True
    message: str = "Đăng nhập thành công"
    user_id: str
    email: str
    full_name: str
    status: str


class AuthSuccessResponse(BaseModel):
    """Cấu trúc phản hồi thành công chuẩn RESTful"""
    success: bool = True
    message: str
    email: Optional[str] = None


class AuthErrorResponse(BaseModel):
    """Cấu trúc phản hồi lỗi chuẩn"""
    error_code: str
    message: str
