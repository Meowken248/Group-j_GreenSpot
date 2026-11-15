"""
FastAPI REST API Router cho Phân hệ Tìm kiếm Toàn cục Elasticsearch (Search Engine).
Tuân thủ Clean Architecture Tầng 6: Presentation / Transport Layer.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.search.schemas import (
    GlobalSearchRequest,
    GlobalSearchResponse,
    AutocompleteResponse,
    SyncStatusResponse,
    ClusterHealthResponse,
)
from app.services.search.search_service import search_service

router = APIRouter(prefix="/search", tags=["Elasticsearch Global Search"])


@router.get(
    "/global",
    response_model=GlobalSearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Tìm kiếm toàn diện đa thực thể trên toàn hệ thống",
)
async def global_search_endpoint(
    q: str = Query(..., min_length=1, max_length=200, description="Từ khóa tìm kiếm (tiếng Việt có dấu/không dấu)"),
    entity_types: Optional[List[str]] = Query(None, description="Danh sách thực thể: incident, event, post, sos, hotspot, handbook"),
    district: Optional[str] = Query(None, description="Lọc theo quận/huyện tại TP.HCM"),
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái nghiệp vụ"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Vĩ độ người dùng (phục vụ tìm kiếm theo bán kính)"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Kinh độ người dùng"),
    radius_km: Optional[float] = Query(None, gt=0, le=100, description="Bán kính tìm kiếm (km)"),
    page: int = Query(1, ge=1, description="Số thứ tự trang"),
    page_size: int = Query(15, ge=1, le=100, description="Số lượng kết quả mỗi trang"),
):
    """
    Tìm kiếm nội dung trên toàn bộ hệ sinh thái GreenSpot:
    - Báo cáo sự cố môi trường (Incidents)
    - Chiến dịch Chủ Nhật Xanh (Events)
    - Bài viết Geo-Feed (Posts)
    - Yêu cầu cứu hộ khẩn cấp (Flood SOS)
    - Điểm nóng ô nhiễm (Hotspots)
    - Sổ tay phân loại rác tại nguồn (Waste Handbook)
    """
    req = GlobalSearchRequest(
        q=q,
        entity_types=entity_types,
        district=district,
        status=status_filter,
        lat=lat,
        lon=lon,
        radius_km=radius_km,
        page=page,
        page_size=page_size,
    )
    return await search_service.global_search(req)


@router.get(
    "/autocomplete",
    response_model=AutocompleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Gợi ý tìm kiếm tức thì theo cụm từ (Search-as-you-type)",
)
async def autocomplete_endpoint(
    q: str = Query(..., min_length=1, max_length=100, description="Cụm từ người dùng đang gõ"),
    entity_types: Optional[List[str]] = Query(None, description="Lọc theo thực thể"),
    limit: int = Query(8, ge=1, le=20, description="Số lượng gợi ý tối đa"),
):
    """
    Cung cấp tính năng gợi ý từ khóa tức thì cho mọi thanh Search Bar trong toàn bộ ứng dụng.
    Độ trễ phản hồi < 10ms nhờ cấu trúc Edge N-gram trong Elasticsearch.
    """
    return await search_service.get_autocomplete(
        query=q,
        entity_types=entity_types,
        limit=limit,
    )


@router.post(
    "/sync",
    response_model=SyncStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Kích hoạt đồng bộ dữ liệu từ PostgreSQL sang Elasticsearch",
)
async def sync_database_to_elasticsearch(
    db: AsyncSession = Depends(get_db),
):
    """
    Thực hiện quét và đồng bộ toàn bộ dữ liệu hợp lệ từ PostgreSQL sang Elasticsearch qua 100% Explicit SQL.
    """
    return await search_service.trigger_database_sync(db)


@router.get(
    "/health",
    response_model=ClusterHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Kiểm tra trạng thái sức khỏe cụm Elasticsearch",
)
async def cluster_health_check():
    """
    Báo cáo trạng thái Cluster: green / yellow / red, số lượng Node và số lượng tài liệu đã lập chỉ mục.
    """
    return await search_service.get_cluster_health()
