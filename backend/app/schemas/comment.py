import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator, ConfigDict


class AuthorSummary(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CreateCommentRequest(BaseModel):
    """Schema tạo bình luận cấp 1 (Tối đa 500 ký tự theo đặc tả)"""
    content: str = Field(..., max_length=500, description="Nội dung bình luận")

    @model_validator(mode="after")
    def validate_content(self) -> "CreateCommentRequest":
        text = self.content.strip()
        if not text:
            raise ValueError("Nội dung bình luận không được để trống")
        if len(text) > 500:
            raise ValueError("Bình luận tối đa 500 ký tự")
        self.content = text
        return self


class CreateReplyRequest(BaseModel):
    """Schema tạo phản hồi bình luận (Tối đa 500 ký tự)"""
    content: str = Field(..., max_length=500, description="Nội dung câu trả lời")
    reply_to_user_id: Optional[uuid.UUID] = Field(default=None, description="ID người dùng được trả lời/tag")

    @model_validator(mode="after")
    def validate_content(self) -> "CreateReplyRequest":
        text = self.content.strip()
        if not text:
            raise ValueError("Nội dung câu trả lời không được để trống")
        if len(text) > 500:
            raise ValueError("Bình luận tối đa 500 ký tự")
        self.content = text
        return self


class ReplyItemResponse(BaseModel):
    """Schema hiển thị câu trả lời thụt lề dưới bình luận gốc (Màn 2)"""
    comment_id: uuid.UUID
    parent_id: uuid.UUID
    author: AuthorSummary
    reply_to_user: Optional[AuthorSummary] = None
    content: str
    likes_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentItemResponse(BaseModel):
    """Schema hiển thị bình luận cấp 1 kèm 3 câu trả lời đầu (Màn 1)"""
    comment_id: uuid.UUID
    post_id: uuid.UUID
    author: AuthorSummary
    content: str
    replies_count: int = 0
    likes_count: int = 0
    created_at: datetime
    initial_replies: List[ReplyItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CommentListResponse(BaseModel):
    """Danh sách bình luận phân trang 10 items/lần"""
    items: List[CommentItemResponse]
    total: int
    page: int
    limit: int
    has_more: bool


class ReplyListResponse(BaseModel):
    """Danh sách toàn bộ câu trả lời của 1 bình luận gốc"""
    comment_id: uuid.UUID
    items: List[ReplyItemResponse]
    total: int


class SharePostRequest(BaseModel):
    """Schema yêu cầu chia sẻ bài viết (Màn 3)"""
    share_type: str = Field(..., description="'FEED' | 'FRIENDS' | 'GROUP' | 'LINK'")
    caption: Optional[str] = Field(default=None, max_length=500, description="Lời bình khi chia sẻ lên bảng tin")
    target_friend_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Danh sách ID bạn bè nhận bài viết")
    target_group_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Danh sách ID nhóm nhận bài viết")

    @model_validator(mode="after")
    def validate_share(self) -> "SharePostRequest":
        stype = self.share_type.upper().strip()
        valid_types = ("FEED", "FRIENDS", "GROUP", "LINK")
        if stype not in valid_types:
            raise ValueError(f"Loại chia sẻ không hợp lệ. Hỗ trợ: {', '.join(valid_types)}")
        self.share_type = stype

        if stype == "FRIENDS" and not self.target_friend_ids:
            raise ValueError("Vui lòng chọn ít nhất 1 người nhận")

        if stype == "GROUP" and not self.target_group_ids:
            raise ValueError("Vui lòng chọn ít nhất 1 nhóm để đăng")

        return self


class SharePostResponse(BaseModel):
    """Kết quả chia sẻ bài viết"""
    success: bool = True
    message: str
    shares_count: int
    share_id: uuid.UUID
    new_post_id: Optional[uuid.UUID] = None

