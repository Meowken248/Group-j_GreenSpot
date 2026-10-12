import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.post import AuthorSummary, TaggedFriendInfo, MediaItemInput


class FeedPostItem(BaseModel):
    """Schema thẻ bài viết trên Bảng tin Geo-Feed (SRS pp. 97 - 102)"""
    post_id: uuid.UUID
    user_id: uuid.UUID
    author: Optional[AuthorSummary] = None
    content: str
    media_urls: List[MediaItemInput] = Field(default_factory=list)
    thumbnail_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    group_id: Optional[uuid.UUID] = None
    visibility: str = "PUBLIC"
    is_hidden: bool = False
    is_edited: bool = False
    reactions_count: int = 0
    comments_count: int = 0
    version: int = 1
    created_at: datetime
    updated_at: datetime
    tagged_friends: List[TaggedFriendInfo] = Field(default_factory=list)

    # Các trường đặc thù Geo-Feed (Màn 1)
    distance_meters: Optional[float] = None
    distance_text: Optional[str] = None
    user_reaction: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeedListResponse(BaseModel):
    """Schema danh sách bài viết phân trang trên Bảng tin Geo-Feed"""
    items: List[FeedPostItem]
    total: int
    has_more: bool
    page: int
    limit: int
    tab: str
    radius_km: Optional[float] = None
    user_lat: Optional[float] = None
    user_lon: Optional[float] = None
    district: Optional[str] = None
    category: Optional[str] = None
    sort_by: str = "newest"
