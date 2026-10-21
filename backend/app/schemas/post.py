import json
import uuid
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator, ConfigDict
from datetime import datetime


class MediaTypeEnum(str, Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"


class MediaItemInput(BaseModel):
    url: str = Field(..., description="Đường dẫn URL của tệp đa phương tiện")
    media_type: MediaTypeEnum = Field(default=MediaTypeEnum.IMAGE, description="Loại tệp: IMAGE hoặc VIDEO")
    size_bytes: Optional[int] = Field(default=None, description="Dung lượng tệp (bytes)")
    duration_seconds: Optional[int] = Field(default=None, description="Thời lượng video (giây)")

    model_config = ConfigDict(from_attributes=True)


class CreatePostRequest(BaseModel):
    """Schema yêu cầu tạo bài đăng mới (Màn 1 -> Màn 3)"""
    content: Optional[str] = Field(default="", description="Nội dung bài viết (tối đa 3000 ký tự)")
    media_urls: Optional[List[MediaItemInput]] = Field(default_factory=list, description="Danh sách tệp đính kèm")
    latitude: Optional[float] = Field(default=None, description="Vĩ độ GPS gắn từ bản đồ")
    longitude: Optional[float] = Field(default=None, description="Kinh độ GPS gắn từ bản đồ")
    address: Optional[str] = Field(default=None, max_length=500, description="Tên địa chỉ rút gọn")
    tagged_friend_ids: Optional[List[uuid.UUID]] = Field(default_factory=list, description="Danh sách ID bạn bè được gắn thẻ")
    group_id: Optional[uuid.UUID] = Field(default=None, description="ID nhóm tình nguyện (tùy chọn)")
    visibility: Optional[str] = Field(default="PUBLIC", description="Chế độ hiển thị bài viết")

    @model_validator(mode="after")
    def validate_post_rules(self) -> "CreatePostRequest":
        # 1. Kiểm tra: Bắt buộc có nội dung chữ hoặc tối thiểu 01 ảnh/video
        text_content = (self.content or "").strip()
        has_text = len(text_content) > 0
        has_media = bool(self.media_urls and len(self.media_urls) > 0)

        if not has_text and not has_media:
            raise ValueError("Vui lòng nhập nội dung hoặc thêm ảnh/video")

        # 2. Giới hạn tối đa 3.000 ký tự
        if len(self.content or "") > 3000:
            raise ValueError("Nội dung bài viết tối đa 3000 ký tự")

        # 3. Giới hạn số lượng tệp: tối đa 5 ảnh hoặc 1 video
        if self.media_urls:
            images = [m for m in self.media_urls if m.media_type == MediaTypeEnum.IMAGE]
            videos = [m for m in self.media_urls if m.media_type == MediaTypeEnum.VIDEO]

            if len(images) > 0 and len(videos) > 0:
                raise ValueError("Chỉ được đăng tối đa 5 ảnh hoặc 1 video")

            if len(images) > 5:
                raise ValueError("Chỉ được đăng tối đa 5 ảnh hoặc 1 video")

            if len(videos) > 1:
                raise ValueError("Chỉ được đăng tối đa 5 ảnh hoặc 1 video")

        # 4. Kiểm tra toạ độ không gian trong phạm vi hỗ trợ (Lãnh thổ Việt Nam)
        if self.latitude is not None or self.longitude is not None:
            if self.latitude is None or self.longitude is None:
                raise ValueError("Tọa độ GPS không hợp lệ")

            # Bounding box Việt Nam: Vĩ độ 8.0 - 24.0, Kinh độ 102.0 - 110.0
            if not (8.0 <= self.latitude <= 24.0 and 102.0 <= self.longitude <= 110.0):
                raise ValueError("Vị trí nằm ngoài khu vực hỗ trợ của hệ thống")

        # 5. Gắn thẻ bạn bè: tối đa 10 bạn bè và tự động loại bỏ trùng lặp
        if self.tagged_friend_ids:
            unique_friend_ids = list(dict.fromkeys(self.tagged_friend_ids))
            if len(unique_friend_ids) > 10:
                raise ValueError("Chỉ được gắn thẻ tối đa 10 bạn bè")
            self.tagged_friend_ids = unique_friend_ids

        # 6. Kiểm tra quyền riêng tư
        if self.visibility is not None:
            norm_vis = self.visibility.upper().strip()
            if norm_vis == "PRIVATE":
                self.visibility = "ONLY_ME"
            elif norm_vis in ("PUBLIC", "FRIENDS", "ONLY_ME"):
                self.visibility = norm_vis
            else:
                raise ValueError("Chế độ hiển thị không hợp lệ (hỗ trợ: PUBLIC, FRIENDS, ONLY_ME)")

        return self


class UpdatePostRequest(BaseModel):
    """Schema cập nhật bài viết có Optimistic Locking (Rule 7, Feature STT 13 Màn 2/5)"""
    content: Optional[str] = Field(default=None, description="Nội dung bài viết cần sửa (tối đa 2.000 ký tự)")
    media_urls: Optional[List[MediaItemInput]] = Field(default=None, description="Danh sách media mới")
    latitude: Optional[float] = Field(default=None, description="Vĩ độ GPS mới")
    longitude: Optional[float] = Field(default=None, description="Kinh độ GPS mới")
    address: Optional[str] = Field(default=None, max_length=500, description="Địa chỉ mới")
    clear_location: Optional[bool] = Field(default=False, description="Xoá thông tin vị trí đã gắn")
    tagged_friend_ids: Optional[List[uuid.UUID]] = Field(default=None, description="Danh sách bạn bè gắn thẻ mới")
    group_id: Optional[uuid.UUID] = Field(default=None, description="ID nhóm tình nguyện")
    visibility: Optional[str] = Field(default=None, description="Chế độ hiển thị: PUBLIC, FRIENDS, ONLY_ME, PRIVATE")
    version: int = Field(..., description="Phiên bản OCC hiện tại của bài viết")

    @model_validator(mode="after")
    def validate_update(self) -> "UpdatePostRequest":
        if self.content is not None and len(self.content) > 2000:
            raise ValueError("Nội dung bài viết tối đa 2000 ký tự")
        if self.tagged_friend_ids is not None:
            unique_friend_ids = list(dict.fromkeys(self.tagged_friend_ids))
            if len(unique_friend_ids) > 10:
                raise ValueError("Chỉ được gắn thẻ tối đa 10 bạn bè")
            self.tagged_friend_ids = unique_friend_ids
        if self.visibility is not None:
            norm_vis = self.visibility.upper().strip()
            if norm_vis == "PRIVATE":
                self.visibility = "ONLY_ME"
            elif norm_vis in ("PUBLIC", "FRIENDS", "ONLY_ME"):
                self.visibility = norm_vis
            else:
                raise ValueError("Chế độ hiển thị không hợp lệ")
        return self


class ToggleHidePostRequest(BaseModel):
    """Schema yêu cầu ẩn/hiện bài viết (Feature STT 13 Màn 5/5)"""
    is_hidden: bool = Field(..., description="Trạng thái ẩn bài viết (True: Ẩn, False: Hiện lại)")


class ToggleHidePostResponse(BaseModel):
    """Schema phản hồi khi ẩn/hiện bài viết thành công"""
    success: bool = True
    post_id: uuid.UUID
    is_hidden: bool
    message: str


class AuthorSummary(BaseModel):
    user_id: uuid.UUID
    email: str
    full_name: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaggedFriendInfo(BaseModel):
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    email: str

    model_config = ConfigDict(from_attributes=True)


class PostDetailResponse(BaseModel):
    """Schema phản hồi chi tiết bài viết đã tạo hoặc truy vấn"""
    post_id: uuid.UUID
    user_id: uuid.UUID
    author: Optional[AuthorSummary] = None
    content: str
    media_urls: List[MediaItemInput] = Field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    group_id: Optional[uuid.UUID] = None
    visibility: str = "PUBLIC"
    is_hidden: bool = False
    is_edited: bool = False
    reactions_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    shared_post_id: Optional[uuid.UUID] = None
    version: int = 1
    created_at: datetime
    updated_at: datetime
    tagged_friends: List[TaggedFriendInfo] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class MediaUploadResponse(BaseModel):
    """Schema phản hồi khi tải lên thành công tệp ảnh hoặc video"""
    url: str
    media_type: MediaTypeEnum
    file_name: str
    size_bytes: int


class ReactPostRequest(BaseModel):
    """Yêu cầu thả hoặc hủy cảm xúc sinh thái (Feature STT 10)"""
    reaction_type: str = Field(..., description="'TREE' | 'EARTH' | 'RECYCLE' | 'CLAP' | 'CONCERN'")


class PostReactionUser(BaseModel):
    """Thông tin người dùng bày tỏ cảm xúc sinh thái (Màn 3 Facebook Style)"""
    user_id: uuid.UUID
    full_name: str
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    reaction_type: str
    created_at: datetime
    friendship_status: str = "NONE"  # 'SELF' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE'
    is_following: bool = False

    model_config = ConfigDict(from_attributes=True)


class PostReactionsSummaryResponse(BaseModel):
    """Tổng hợp danh sách cảm xúc bài viết kèm số đếm theo tab"""
    post_id: uuid.UUID
    total_count: int
    counts_by_type: Dict[str, int]
    items: List[PostReactionUser]

