import uuid
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, validator


class SendFriendRequest(BaseModel):
    """Payload gửi lời mời kết bạn"""
    receiver_id: uuid.UUID = Field(..., description="UUID của người nhận lời mời")


class RespondFriendRequest(BaseModel):
    """Payload chấp nhận hoặc từ chối lời mời"""
    action: Literal["ACCEPT", "REJECT"] = Field(..., description="Hành động: ACCEPT hoặc REJECT")


class FriendRequestResponse(BaseModel):
    """Thông tin một lời mời kết bạn (Màn 1 - Cột trái)"""
    request_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    sender_avatar: Optional[str] = None
    district: Optional[str] = None
    mutual_friends_count: int = 0
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class FriendItemResponse(BaseModel):
    """Thông tin một người bạn trong danh sách bạn bè (Màn 2)"""
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    status: str
    is_suspended: bool = False
    total_green_points: int = 0
    is_online: bool = False
    friends_count: int = 0
    friendship_created_at: datetime

    class Config:
        from_attributes = True


class UnfriendRequest(BaseModel):
    """Payload xác nhận hủy kết bạn (Màn 3 Popup)"""
    friend_user_id: uuid.UUID = Field(..., description="UUID của người bạn muốn hủy kết bạn")


class FollowRequest(BaseModel):
    """Payload theo dõi một công dân xanh"""
    target_user_id: uuid.UUID = Field(..., description="UUID của người muốn theo dõi")


class FollowItemResponse(BaseModel):
    """Thông tin một người trong danh sách đang theo dõi (Màn 2 - Cột phải)"""
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    total_green_points: int = 0
    status: str
    followed_at: datetime

    class Config:
        from_attributes = True


class GreenCitizenSuggestionResponse(BaseModel):
    """Thông tin gợi ý công dân xanh (Màn 1 - Cột phải)"""
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    total_green_points: int = 0
    mutual_friends_count: int = 0
    is_following: bool = False
    has_pending_request: bool = False

    class Config:
        from_attributes = True


class GenericFriendsActionResponse(BaseModel):
    """Phản hồi chung cho các tác vụ thay đổi trạng thái"""
    success: bool = True
    message: str
    data: Optional[dict] = None
