import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class MessageSenderSummary(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = None


class MessageItemResponse(BaseModel):
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    sender: MessageSenderSummary
    content: Optional[str] = None
    media_url: Optional[str] = None
    is_system_message: bool = False
    status: str = "SENT"  # "SENT" | "SEEN"
    created_at: datetime


class MessageListResponse(BaseModel):
    conversation_id: uuid.UUID
    items: List[MessageItemResponse]
    total: int
    has_more: bool


class LastMessageSummary(BaseModel):
    message_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime


class ConversationItemResponse(BaseModel):
    conversation_id: uuid.UUID
    type: str  # "DIRECT" | "GROUP" | "DISTRICT"
    title: str
    avatar_url: Optional[str] = None
    district_name: Optional[str] = None
    other_user_id: Optional[uuid.UUID] = None  # Dành cho DIRECT
    is_online: bool = False
    unread_count: int = 0
    last_message: Optional[LastMessageSummary] = None
    members_count: int = 0
    is_admin: bool = False
    created_at: datetime


class ConversationListResponse(BaseModel):
    items: List[ConversationItemResponse]
    total: int
    page: int
    limit: int
    has_more: bool


class CreateDirectConversationRequest(BaseModel):
    target_user_id: uuid.UUID


class CreateGroupConversationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=50, description="Tên nhóm tối đa 50 ký tự")
    member_user_ids: List[uuid.UUID] = Field(..., description="Danh sách thành viên từ 2 đến 50 bạn bè")

    @field_validator("title")
    def validate_title(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Vui lòng nhập tên nhóm")
        if len(s) > 50:
            raise ValueError("Tên nhóm tối đa 50 ký tự")
        return s

    @field_validator("member_user_ids")
    def validate_members(cls, v: List[uuid.UUID]) -> List[uuid.UUID]:
        unique_ids = list(dict.fromkeys(v))
        if len(unique_ids) < 2:
            raise ValueError("Vui lòng chọn ít nhất 2 thành viên")
        if len(unique_ids) > 50:
            raise ValueError("Nhóm tối đa 50 thành viên")
        return unique_ids


class SendMessageRequest(BaseModel):
    content: Optional[str] = Field(None, max_length=1000, description="Tin nhắn tối đa 1000 ký tự")
    media_url: Optional[str] = None

    @field_validator("content")
    def validate_content_length(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 1000:
            raise ValueError("Tin nhắn tối đa 1000 ký tự")
        return v

    @field_validator("media_url")
    def validate_content_or_media(cls, v: Optional[str], info) -> Optional[str]:
        content_val = info.data.get("content")
        has_content = bool(content_val and content_val.strip())
        has_media = bool(v and v.strip())
        if not has_content and not has_media:
            raise ValueError("Vui lòng nhập nội dung tin nhắn hoặc đính kèm ảnh")
        return v


class TransferAdminRequest(BaseModel):
    new_admin_user_id: uuid.UUID


class OnlineMemberItemResponse(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: str = "MEMBER"
    is_online: bool = True

