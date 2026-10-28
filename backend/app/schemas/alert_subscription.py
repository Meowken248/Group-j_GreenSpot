import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class AlertSubscriptionRequest(BaseModel):
    subscribed_districts: List[str] = Field(
        default_factory=list,
        description="Danh sách các Quận/Huyện đăng ký nhận tin (Tối đa 5 khu vực)",
    )
    min_severity_level: str = Field(
        default="ALL",
        description="Ngưỡng cảnh báo tối thiểu: ALL (Tất cả), ORANGE_RED (Chỉ Cam & Đỏ), RED_ONLY (Chỉ mức Đỏ)",
    )
    notify_in_app: bool = Field(default=True, description="Nhận thông báo chuông trên Cổng thông tin (In-App)")
    notify_email: bool = Field(default=True, description="Nhận thông báo qua Email")
    email_address: Optional[str] = Field(default=None, description="Địa chỉ email nhận tin")
    is_muted: bool = Field(default=False, description="Tạm ngưng nhận toàn bộ cảnh báo (Mute)")

    @field_validator("subscribed_districts")
    @classmethod
    def validate_max_districts(cls, v: List[str]) -> List[str]:
        # SUB_001: Giới hạn tối đa 5 khu vực địa bàn
        if len(v) > 5:
            raise ValueError("SUB_001: Bạn chỉ có thể đăng ký theo dõi tối đa 5 khu vực địa bàn.")
        return v

    @field_validator("min_severity_level")
    @classmethod
    def validate_severity_level(cls, v: str) -> str:
        valid_levels = {"ALL", "ORANGE_RED", "RED_ONLY", "YELLOW", "ORANGE", "RED"}
        if v.upper() not in valid_levels:
            raise ValueError(f"Ngưỡng cảnh báo không hợp lệ. Cho phép: {valid_levels}")
        return v.upper()


class AlertSubscriptionResponse(BaseModel):
    subscription_id: str
    user_id: str
    subscribed_districts: List[str]
    min_severity_level: str
    notify_in_app: bool
    notify_email: bool
    email_address: Optional[str]
    is_muted: bool
    updated_at: str
