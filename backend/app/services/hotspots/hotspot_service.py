"""
Hotspot Spatial Analytics & 7-Day Forecasting Business Logic Service (STT 44)
[MOCK/STUB MODE]
Tuân thủ Clean Architecture Tầng 5 (Core Business Logic) & Dependency Inversion Principle (DIP).
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.interface.hotspots.hotspot_interface import IHotspotRepository
from app.crud.hotspots.hotspot_repository import hotspot_repository
from app.schemas.hotspots.schemas import (
    HotspotFilterRequest,
    HotspotMapResponse,
    HotspotClusterItem,
    AreaOptionItem,
    ForecastResponse,
    ExportReportRequest,
    ExportReportResponse,
    HotspotDetailResponse,
)


class HotspotService:
    """
    Business Logic Layer cho Phân tích điểm nóng KDE & Dự báo chuỗi thời gian 7 ngày (STT 44)
    [MOCK/STUB MODE]
    """

    def __init__(self, repository: IHotspotRepository = hotspot_repository):
        self.repo = repository

    async def get_hotspot_map(
        self,
        db: AsyncSession,
        filters: HotspotFilterRequest,
    ) -> HotspotMapResponse:
        """Mock/Stub: Bản đồ cụm điểm nóng (STT 44)"""
        return HotspotMapResponse(
            clusters=[],
            top_5_hotspots=[],
            total_clusters=0,
            has_data=False,
            status_message="Chế độ Mock: Chưa có dữ liệu cụm điểm nóng được phát hiện.",
            tile_server_status="ONLINE",
        )

    async def get_hotspot_detail(
        self,
        db: AsyncSession,
        hotspot_id: str,
    ) -> HotspotDetailResponse:
        """Mock/Stub: Chi tiết điểm nóng (STT 44)"""
        mock_cluster = HotspotClusterItem(
            hotspot_id=hotspot_id,
            hotspot_code=f"HS-{hotspot_id[:6].upper()}",
            name="Điểm nóng mẫu (Mock)",
            district="Quận 1",
            latitude=10.7769,
            longitude=106.7009,
            incident_type="DOMESTIC_WASTE",
            incident_type_label="Rác thải sinh hoạt",
            severity_level="POTENTIAL",
            incident_count=5,
            density_score=0.5,
            radius_meters=150.0,
            active_dispatch_order_code=None,
            active_dispatch_order_id=None,
        )
        return HotspotDetailResponse(
            hotspot=mock_cluster,
            has_active_dispatch=False,
            active_order_code=None,
            active_order_id=None,
            dispatch_prefill={
                "incident_id": f"inc-{mock_cluster.hotspot_code}",
                "incident_code": f"SC-{mock_cluster.hotspot_code}",
                "title": f"[{mock_cluster.incident_type_label}] {mock_cluster.name}",
                "category": mock_cluster.incident_type_label,
                "urgency": "TRUNG BÌNH",
                "location_address": f"{mock_cluster.name}, {mock_cluster.district}",
                "district": mock_cluster.district,
                "latitude": mock_cluster.latitude,
                "longitude": mock_cluster.longitude,
                "suggested_priority": "MEDIUM",
                "hotspot_id": mock_cluster.hotspot_id,
                "hotspot_code": mock_cluster.hotspot_code,
            },
        )

    async def get_available_areas(
        self,
        db: AsyncSession,
    ) -> List[AreaOptionItem]:
        """Mock/Stub: Danh sách Quận/Huyện phục vụ chọn vùng (STT 44)"""
        return []

    async def get_7day_forecast(
        self,
        db: AsyncSession,
        target_id: str,
        target_type: str = "DISTRICT",
    ) -> ForecastResponse:
        """Mock/Stub: Dự báo 7 ngày (STT 44)"""
        return ForecastResponse(
            target_id=target_id,
            target_name="Khu vực mẫu",
            target_type=target_type,
            forecast_points=[],
            trend="STABLE",
            confidence_level="95%",
            model_used="SARIMA_MOCK",
        )

    async def export_forecast_report(
        self,
        db: AsyncSession,
        request: ExportReportRequest,
    ) -> ExportReportResponse:
        """Mock/Stub: Xuất báo cáo dự báo (STT 44)"""
        ext = "pdf" if request.format.upper() == "PDF" else "xlsx"
        filename = f"BaoCao_DuBao_7Ngay.{ext}"
        return ExportReportResponse(
            success=True,
            file_name=filename,
            file_url=f"/static/reports/exports/{filename}",
            message=f"Xuất báo cáo dự báo 7 ngày thành công (Mock: {filename}).",
        )


hotspot_service = HotspotService()
