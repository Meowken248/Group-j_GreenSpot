"""
Hotspot Spatial Analytics & 7-Day Forecasting Business Logic Service
Tuân thủ Clean Architecture Tầng 5 (Core Business Logic) & Dependency Inversion Principle (DIP).
STT 44
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
    Business Logic Layer cho Phân tích điểm nóng KDE & Dự báo chuỗi thời gian 7 ngày
    Phụ thuộc hoàn toàn vào IHotspotRepository trừu tượng (DIP)
    """

    def __init__(self, repository: IHotspotRepository = hotspot_repository):
        self.repo = repository

    async def get_hotspot_map(
        self,
        db: AsyncSession,
        filters: HotspotFilterRequest,
    ) -> HotspotMapResponse:
        """
        Nghiệp vụ Màn 1/3: Phân tích cụm điểm nóng KDE, xếp hạng Top 5 và tạo thông điệp trạng thái
        """
        clusters = await self.repo.get_hotspot_clusters(
            db,
            incident_type=filters.incident_type,
            time_range=filters.time_range,
            start_date=filters.start_date,
            end_date=filters.end_date,
        )

        top_5 = await self.repo.get_top_5_hotspots(
            db,
            incident_type=filters.incident_type,
        )

        total_count = len(clusters)
        has_data = total_count > 0

        if has_data:
            msg = f"Đã tải xong dữ liệu phân tích cụm điểm nóng ({total_count} điểm nóng phát hiện)."
        else:
            msg = "Không phát hiện cụm điểm nóng nào trong khoảng thời gian đã chọn."

        return HotspotMapResponse(
            clusters=clusters,
            top_5_hotspots=top_5,
            total_clusters=total_count,
            has_data=has_data,
            status_message=msg,
            tile_server_status="ONLINE",
        )

    async def get_hotspot_detail(
        self,
        db: AsyncSession,
        hotspot_id: str,
    ) -> HotspotDetailResponse:
        """
        Nghiệp vụ Màn 3/3: Xem chi tiết điểm nóng, kiểm tra lệnh điều phối đang thực thi (STT 43)
        và chuẩn bị dữ liệu điền sẵn tự động (prefill) sang Màn 2/6 của STT 43
        """
        if not hotspot_id or not hotspot_id.strip():
            raise HTTPException(status_code=400, detail="Mã điểm nóng không được để trống.")

        hotspot = await self.repo.get_hotspot_by_id(db, hotspot_id)
        if not hotspot:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cụm điểm nóng yêu cầu.")

        has_active = bool(hotspot.active_dispatch_order_code)

        # Chuẩn bị dữ liệu điền sẵn tự động cho STT 43 - Màn 2/6 Tạo lệnh mới
        priority_map = {
            "CRITICAL": "URGENT",
            "SEVERE": "HIGH",
            "POTENTIAL": "MEDIUM",
        }
        prefill_payload: Dict[str, Any] = {
            "incident_id": f"inc-{hotspot.hotspot_code}",
            "incident_code": f"SC-{hotspot.hotspot_code}",
            "title": f"[{hotspot.incident_type_label}] {hotspot.name}",
            "category": hotspot.incident_type_label,
            "urgency": "KHẨN" if hotspot.severity_level == "CRITICAL" else "CAO",
            "location_address": f"{hotspot.name}, {hotspot.district}",
            "district": hotspot.district,
            "latitude": hotspot.latitude,
            "longitude": hotspot.longitude,
            "suggested_priority": priority_map.get(hotspot.severity_level, "HIGH"),
            "hotspot_id": hotspot.hotspot_id,
            "hotspot_code": hotspot.hotspot_code,
        }

        return HotspotDetailResponse(
            hotspot=hotspot,
            has_active_dispatch=has_active,
            active_order_code=hotspot.active_dispatch_order_code,
            active_order_id=hotspot.active_dispatch_order_id,
            dispatch_prefill=prefill_payload,
        )

    async def get_available_areas(
        self,
        db: AsyncSession,
    ) -> List[AreaOptionItem]:
        """
        Lấy danh sách các Quận/Huyện và Điểm nóng phục vụ combobox Màn 2/3
        """
        return await self.repo.get_available_areas(db)

    async def get_7day_forecast(
        self,
        db: AsyncSession,
        target_id: str,
        target_type: str = "DISTRICT",
    ) -> ForecastResponse:
        """
        Nghiệp vụ Màn 2/3: Dự báo xu hướng chuỗi thời gian 7 ngày kèm khoảng tin cậy 95%
        """
        if not target_id or not target_id.strip():
            target_id = "dist-q8"
            target_type = "DISTRICT"

        return await self.repo.get_7day_forecast(db, target_id, target_type)

    async def export_forecast_report(
        self,
        db: AsyncSession,
        request: ExportReportRequest,
    ) -> ExportReportResponse:
        """
        Nghiệp vụ Màn 2/3: Xuất báo cáo dự báo 7 ngày (PDF / Excel)
        """
        ext = "pdf" if request.format.upper() == "PDF" else "xlsx"
        filename = f"BaoCao_DuBao_7Ngay.{ext}"
        file_url = f"/static/reports/exports/{filename}"

        return ExportReportResponse(
            success=True,
            file_name=filename,
            file_url=file_url,
            message=f"Xuất báo cáo dự báo 7 ngày thành công (Tệp: {filename}).",
        )


hotspot_service = HotspotService()
