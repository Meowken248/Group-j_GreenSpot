import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.group import GroupType, GroupPrivacy, GroupMemberRole


BANNED_WORDS = [
    "lừa đảo", "chửi bậy", "phản động", "tục tĩu", "ma túy", "vũ khí", "cờ bạc"
]


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, description="Tên nhóm tối đa 50 ký tự")
    description: Optional[str] = Field(None, max_length=300, description="Mô tả nhóm tối đa 300 ký tự")
    group_type: GroupType = Field(GroupType.DISTRICT, description="Loại nhóm: DISTRICT, WARD, THEME")
    province: Optional[str] = Field(None, max_length=100, description="Tên tỉnh/thành phố")
    district: Optional[str] = Field(None, max_length=100, description="Tên quận/huyện nếu là nhóm quận/phường")
    ward: Optional[str] = Field(None, max_length=100, description="Tên phường/xã nếu là nhóm phường")
    theme_topic: Optional[str] = Field(None, max_length=100, description="Chủ đề nếu là nhóm theo chủ đề")
    privacy: GroupPrivacy = Field(GroupPrivacy.PUBLIC, description="Công khai hoặc Riêng tư")
    cover_image_url: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Vui lòng nhập tên nhóm")
        if len(trimmed) > 50:
            raise ValueError("Tên nhóm tối đa 50 ký tự")
        lower_v = trimmed.lower()
        for bad in BANNED_WORDS:
            if bad in lower_v:
                raise ValueError("Tên nhóm chứa nội dung không phù hợp")
        return trimmed

    @field_validator("description")
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v.strip()) > 300:
            raise ValueError("Mô tả tối đa 300 ký tự")
        return v.strip() if v else None


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=300)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    province: Optional[str] = Field(None, max_length=100)
    privacy: Optional[GroupPrivacy] = None
    version: int = Field(..., description="Optimistic locking version")


class GroupMemberResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    group_id: uuid.UUID
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    avatar_url: Optional[str] = None
    group_type: str
    province: Optional[str] = None
    district: Optional[str] = None
    ward: Optional[str] = None
    theme_topic: Optional[str] = None
    privacy: str
    creator_id: uuid.UUID
    creator_name: Optional[str] = None
    members_count: int
    posts_count: int
    status: str
    version: int
    created_at: datetime
    is_member: bool = False
    my_role: Optional[str] = None

    class Config:
        from_attributes = True


class GroupListResponse(BaseModel):
    items: List[GroupResponse]
    total: int
    admin_groups_count: int = 0
    max_admin_groups: int = 5


class GroupDisbandRequest(BaseModel):
    confirmation_name: str = Field(..., description="Phải nhập khớp hoàn toàn tên nhóm để xác nhận")


class InviteFriendsRequest(BaseModel):
    friend_ids: List[uuid.UUID] = Field(..., min_length=1, description="Danh sách ID bạn bè cần mời")


class AdministrativeMetadataResponse(BaseModel):
    provinces: List[str]
    districts_by_province: dict[str, List[str]]
    districts: List[str]
    wards_by_district: dict[str, List[str]]
    theme_topics: List[str]
