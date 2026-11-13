"""
Giao diện trừu tượng tầng Interface (DIP) cho Hệ thống Tìm kiếm Elasticsearch.
Tuân thủ Clean Architecture Tầng 3: Abstractions & DIP Contracts.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.search.schemas import (
    GlobalSearchRequest,
    GlobalSearchResponse,
    AutocompleteResponse,
    ClusterHealthResponse,
)


class ISearchRepository(ABC):
    """
    Interface trừu tượng cho thao tác tìm kiếm, lập chỉ mục và quản lý Elasticsearch.
    Các tầng Business Logic Service chỉ phụ thuộc vào Interface này (DIP).
    """

    @abstractmethod
    async def ensure_index_and_mapping(self) -> bool:
        """Đảm bảo Index và Vietnamese Custom Analyzer đã được khởi tạo trong Elasticsearch."""
        pass

    @abstractmethod
    async def search_global(self, req: GlobalSearchRequest) -> GlobalSearchResponse:
        """Thực thi tìm kiếm toàn cục đa thực thể kèm xếp hạng độ liên quan và highlight."""
        pass

    @abstractmethod
    async def autocomplete(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        limit: int = 8,
    ) -> AutocompleteResponse:
        """Gợi ý tìm kiếm tức thời theo cụm từ bắt đầu (Edge N-gram)."""
        pass

    @abstractmethod
    async def index_document(
        self,
        doc_id: str,
        document: Dict[str, Any],
        index_name: Optional[str] = None,
    ) -> bool:
        """Lập chỉ mục hoặc cập nhật một tài liệu đơn lẻ vào Elasticsearch."""
        pass

    @abstractmethod
    async def delete_document(
        self,
        doc_id: str,
        index_name: Optional[str] = None,
    ) -> bool:
        """Xóa hoặc đánh dấu xóa tài liệu khỏi Elasticsearch."""
        pass

    @abstractmethod
    async def sync_all_from_database(
        self,
        db: AsyncSession,
    ) -> Dict[str, int]:
        """Đồng bộ toàn bộ dữ liệu nghiệp vụ hợp lệ từ PostgreSQL sang Elasticsearch qua 100% Explicit SQL."""
        pass

    @abstractmethod
    async def check_health(self) -> ClusterHealthResponse:
        """Kiểm tra trạng thái sẵn sàng và số lượng tài liệu của cụm Elasticsearch."""
        pass
