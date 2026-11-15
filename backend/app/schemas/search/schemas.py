"""
Pydantic v2 Schemas cho Hệ thống Tìm kiếm Toàn diện Elasticsearch (Search Engine).
Tuân thủ Clean Architecture Tầng 2: Data Transfer Objects (DTO).
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class GlobalSearchRequest(BaseModel):
    """Tham số tìm kiếm toàn cục đa thực thể."""
    q: str = Field(..., min_length=1, max_length=200, description="Từ khóa tìm kiếm (có dấu hoặc không dấu)")
    entity_types: Optional[List[str]] = Field(
        None,
        description="Lọc theo loại thực thể: incident, event, post, sos, hotspot, handbook",
    )
    district: Optional[str] = Field(None, description="Lọc theo quận/huyện tại TP.HCM")
    status: Optional[str] = Field(None, description="Lọc theo trạng thái nghiệp vụ")
    lat: Optional[float] = Field(None, ge=-90, le=90, description="Vĩ độ người dùng (phục vụ tìm kiếm không gian)")
    lon: Optional[float] = Field(None, ge=-180, le=180, description="Kinh độ người dùng")
    radius_km: Optional[float] = Field(None, gt=0, le=100, description="Bán kính tìm kiếm quanh vị trí (km)")
    page: int = Field(1, ge=1, description="Số thứ tự trang")
    page_size: int = Field(15, ge=1, le=100, description="Số lượng kết quả mỗi trang")


class GlobalSearchResultItem(BaseModel):
    """Một mục kết quả tìm kiếm đa thực thể trả về cho giao diện."""
    entity_id: str = Field(..., description="ID định danh duy nhất của thực thể")
    entity_type: str = Field(..., description="Loại thực thể: incident, event, post, sos, hotspot, handbook")
    code: Optional[str] = Field(None, description="Mã nghiệp vụ: SC-2026-001, SOS-001...")
    title: str = Field(..., description="Tiêu đề hoặc tên hiển thị")
    description: Optional[str] = Field(None, description="Mô tả tóm tắt")
    highlight_title: Optional[str] = Field(None, description="Tiêu đề có gắn thẻ <mark> khớp từ khóa")
    highlight_description: Optional[str] = Field(None, description="Mô tả có gắn thẻ <mark> khớp từ khóa")
    category: Optional[str] = Field(None, description="Danh mục/loại sự cố/loại rác")
    status: Optional[str] = Field(None, description="Trạng thái hiện tại")
    priority: Optional[str] = Field(None, description="Mức độ ưu tiên")
    address: Optional[str] = Field(None, description="Địa chỉ vị trí")
    district: Optional[str] = Field(None, description="Quận/huyện")
    latitude: Optional[float] = Field(None, description="Tọa độ vĩ độ")
    longitude: Optional[float] = Field(None, description="Tọa độ kinh độ")
    distance_km: Optional[float] = Field(None, description="Cự ly so với vị trí người dùng (nếu có GPS)")
    created_at: Optional[datetime] = Field(None, description="Thời điểm tạo")
    url_path: str = Field(..., description="Đường dẫn điều hướng trên ứng dụng Web/App")
    score: float = Field(..., description="Điểm số độ liên quan (Relevance Score)")


class GlobalSearchResponse(BaseModel):
    """Kết quả trả về cho yêu cầu tìm kiếm toàn cục."""
    items: List[GlobalSearchResultItem] = Field(default_factory=list)
    total: int = Field(0, description="Tổng số kết quả tìm thấy")
    page: int = Field(1, description="Trang hiện tại")
    page_size: int = Field(15, description="Số kết quả trên trang")
    total_pages: int = Field(0, description="Tổng số trang")
    took_ms: int = Field(0, description="Thời gian thực thi tìm kiếm (mili-giây)")


class AutocompleteItem(BaseModel):
    """Một gợi ý tìm kiếm tức thì (Search-as-you-type)."""
    text: str = Field(..., description="Cụm từ hoặc tiêu đề gợi ý")
    entity_type: str = Field(..., description="Loại thực thể")
    entity_id: str = Field(..., description="ID định danh")
    code: Optional[str] = Field(None, description="Mã nghiệp vụ")
    category: Optional[str] = Field(None, description="Danh mục tóm tắt")
    url_path: str = Field(..., description="Đường dẫn điều hướng nhanh")


class AutocompleteResponse(BaseModel):
    """Danh sách gợi ý tìm kiếm nhanh."""
    query: str
    suggestions: List[AutocompleteItem] = Field(default_factory=list)
    took_ms: int = Field(0)


class SyncStatusResponse(BaseModel):
    """Kết quả đồng bộ dữ liệu từ PostgreSQL sang Elasticsearch."""
    success: bool
    indexed_counts: Dict[str, int] = Field(default_factory=dict)
    total_indexed: int = 0
    message: str
    elapsed_seconds: float = 0.0


class ClusterHealthResponse(BaseModel):
    """Báo cáo sức khỏe của cụm Elasticsearch."""
    status: str = Field(..., description="Trạng thái: green, yellow, red")
    cluster_name: str
    number_of_nodes: int
    number_of_data_nodes: int
    active_primary_shards: int
    active_shards: int
    unassigned_shards: int
    index_name: str
    index_doc_count: int
