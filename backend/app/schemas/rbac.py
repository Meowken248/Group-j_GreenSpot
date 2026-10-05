import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class RoleItemResponse(BaseModel):
    """Thông tin 1 dòng vai trò trên Màn 1"""
    role_id: int
    role_code: str
    role_name: str
    description: Optional[str] = None
    is_system: bool
    scope: str  # "CITY" hoặc "DISTRICT"
    scope_display: str  # "Toàn thành phố" hoặc "Quận"
    version: int
    user_count: int = 0
    created_at: Optional[datetime] = None


class RoleListResponse(BaseModel):
    """Danh sách vai trò trả về cho Màn 1"""
    roles: List[RoleItemResponse]
    total: int
    can_create: bool  # False nếu total >= 20


class CreateRoleRequest(BaseModel):
    """Payload gửi lên từ Màn 2: Thêm vai trò mới"""
    role_name: str = Field(..., description="Tên vai trò 2-30 ký tự")
    description: Optional[str] = Field(None, description="Mô tả vai trò tối đa 200 ký tự")
    scope: str = Field(default="DISTRICT", description="Phạm vi: CITY (Toàn thành phố) hoặc DISTRICT (Quận)")

    @field_validator("role_name", mode="before")
    @classmethod
    def validate_role_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Tên vai trò phải là chuỗi ký tự")
        # Cắt khoảng trắng đầu/cuối và gộp nhiều khoảng trắng liền nhau thành một
        cleaned = re.sub(r"\s+", " ", v.strip())
        if len(cleaned) < 2 or len(cleaned) > 30:
            raise ValueError("Tên vai trò phải từ 2 đến 30 ký tự, chỉ gồm chữ cái, số, khoảng trắng, dấu gạch ngang và gạch dưới")
        
        # Chỉ gồm chữ cái (có dấu tiếng Việt), chữ số, khoảng trắng, dấu gạch ngang - và gạch dưới _
        pattern = r"^[a-zA-Z0-9\s\-_\u00C0-\u1EF9]+$"
        if not re.match(pattern, cleaned):
            raise ValueError("Tên vai trò phải từ 2 đến 30 ký tự, chỉ gồm chữ cái, số, khoảng trắng, dấu gạch ngang và gạch dưới")
        
        return cleaned

    @field_validator("description", mode="before")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if not isinstance(v, str):
            return None
        cleaned = v.strip()
        if len(cleaned) > 200:
            cleaned = cleaned[:200]
        return cleaned or None

    @field_validator("scope")
    @classmethod
    def validate_scope(cls, v: str) -> str:
        v_upper = v.strip().upper()
        if v_upper in ["CITY", "TOÀN THÀNH PHỐ", "TOAN THANH PHO"]:
            return "CITY"
        return "DISTRICT"


class UpdateRolePermissionsRequest(BaseModel):
    """Payload gửi lên từ Màn 3: Lưu ma trận quyền"""
    version: int = Field(..., description="Số phiên bản lúc tải ma trận (Optimistic Concurrency Control)")
    permissions: List[str] = Field(..., description="Danh sách các mã quyền (permission_code) được tích chọn")


class UpdateRolePermissionsResponse(BaseModel):
    """Phản hồi sau khi lưu ma trận quyền thành công"""
    success: bool = True
    message: str = "Đã lưu ma trận quyền"
    role_id: int
    new_version: int


class ReassignAndDeleteRoleRequest(BaseModel):
    """Payload Màn 5: Chuyển giao toàn bộ người dùng sang vai trò khác và xóa vai trò cũ"""
    target_role_id: int = Field(..., description="ID vai trò tiếp nhận người dùng")


class ModulePermissionInfo(BaseModel):
    """Thông tin 1 hàng chức năng trong Ma trận phân quyền"""
    code: str
    name: str
    actions: List[str]  # ["VIEW", "CREATE", "UPDATE", "DELETE"] hoặc ["VIEW"]


class PermissionMatrixResponse(BaseModel):
    """Dữ liệu ma trận quyền trả về cho Màn 3"""
    modules: List[ModulePermissionInfo]
    roles: List[RoleItemResponse]
    role_permissions: dict[str, List[str]]  # { str(role_id): ["GIS_MAP:VIEW", ...] }
