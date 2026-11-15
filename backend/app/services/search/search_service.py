"""
Tầng Business Logic Service cho Hệ thống Tìm kiếm Elasticsearch.
Tuân thủ Clean Architecture Tầng 5: Services & Dependency Inversion Principle (DIP).
"""

import time
import logging
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.search.search_interface import ISearchRepository
from app.crud.search.search_repository import elasticsearch_search_repository
from app.schemas.search.schemas import (
    GlobalSearchRequest,
    GlobalSearchResponse,
    AutocompleteResponse,
    SyncStatusResponse,
    ClusterHealthResponse,
)

logger = logging.getLogger(__name__)


class SearchService:
    """
    Service điều phối tìm kiếm toàn cục, autocomplete và đồng bộ dữ liệu.
    Tuân thủ nguyên tắc DIP: Phụ thuộc vào trừu tượng ISearchRepository.
    """

    def __init__(self, repository: ISearchRepository = elasticsearch_search_repository):
        self.repo = repository

    async def global_search(self, req: GlobalSearchRequest) -> GlobalSearchResponse:
        """
        Xử lý nghiệp vụ tìm kiếm toàn cục:
        - Chuẩn hóa từ khóa tìm kiếm (loại bỏ ký tự đặc biệt nguy hiểm).
        - Gọi repository thực thi truy vấn Elasticsearch.
        """
        cleaned_query = " ".join(req.q.strip().split())
        if not cleaned_query:
            return GlobalSearchResponse(
                items=[],
                total=0,
                page=req.page,
                page_size=req.page_size,
                total_pages=0,
                took_ms=0,
            )

        sanitized_req = req.model_copy(update={"q": cleaned_query})
        return await self.repo.search_global(sanitized_req)

    async def get_autocomplete(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        limit: int = 8,
    ) -> AutocompleteResponse:
        """Lấy danh sách gợi ý tìm kiếm tức thời cho thanh Search Bar."""
        cleaned_query = query.strip()
        if len(cleaned_query) < 1:
            return AutocompleteResponse(query=query, suggestions=[], took_ms=0)

        clamped_limit = max(1, min(limit, 20))
        return await self.repo.autocomplete(cleaned_query, entity_types, clamped_limit)

    async def trigger_database_sync(self, db: AsyncSession) -> SyncStatusResponse:
        """Kích hoạt đồng bộ toàn bộ dữ liệu từ PostgreSQL sang Elasticsearch."""
        start_time = time.perf_counter()
        try:
            counts = await self.repo.sync_all_from_database(db)
            total_synced = sum(counts.values())
            elapsed = round(time.perf_counter() - start_time, 2)
            return SyncStatusResponse(
                success=True,
                indexed_counts=counts,
                total_indexed=total_synced,
                message=f"Đã đồng bộ thành công {total_synced} tài liệu vào Elasticsearch sau {elapsed}s.",
                elapsed_seconds=elapsed,
            )
        except Exception as e:
            logger.error(f"Lỗi đồng bộ dữ liệu vào Elasticsearch: {e}")
            elapsed = round(time.perf_counter() - start_time, 2)
            return SyncStatusResponse(
                success=False,
                indexed_counts={},
                total_indexed=0,
                message=f"Đồng bộ thất bại: {str(e)}",
                elapsed_seconds=elapsed,
            )

    async def get_cluster_health(self) -> ClusterHealthResponse:
        """Lấy thông tin tình trạng sức khỏe cụm Elasticsearch."""
        return await self.repo.check_health()


# Khởi tạo thể hiện Singleton mặc định
search_service = SearchService()
