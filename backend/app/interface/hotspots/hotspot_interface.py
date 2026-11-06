"""
Interface Specification cho Phân tích điểm nóng + Dự báo 7 ngày
Tuân thủ Clean Architecture Tầng 3 (DIP Abstraction Layer).
STT 44
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.hotspots.schemas import (
    HotspotClusterItem,
    AreaOptionItem,
    ForecastResponse,
)


class IHotspotRepository(ABC):
    """
    Interface định nghĩa các thao tác dữ liệu điểm nóng và mô hình dự báo
    100% không phụ thuộc vào chi tiết triển khai cụ thể
    """

    @abstractmethod
    async def get_hotspot_clusters(
        self,
        db: AsyncSession,
        incident_type: Optional[str] = None,
        time_range: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[HotspotClusterItem]:
        """Truy vấn danh sách cụm điểm nóng KDE phù hợp bộ lọc"""
        pass

    @abstractmethod
    async def get_top_5_hotspots(
        self,
        db: AsyncSession,
        incident_type: Optional[str] = None,
    ) -> List[HotspotClusterItem]:
        """Truy vấn Top 5 cụm điểm nóng có mật độ sự cố cao nhất"""
        pass

    @abstractmethod
    async def get_hotspot_by_id(
        self,
        db: AsyncSession,
        hotspot_id: str,
    ) -> Optional[HotspotClusterItem]:
        """Truy vấn chi tiết 1 điểm nóng theo ID"""
        pass

    @abstractmethod
    async def get_available_areas(
        self,
        db: AsyncSession,
    ) -> List[AreaOptionItem]:
        """Truy vấn danh sách Quận/Huyện và Điểm nóng cho combobox chọn khu vực"""
        pass

    @abstractmethod
    async def get_7day_forecast(
        self,
        db: AsyncSession,
        target_id: str,
        target_type: str = "DISTRICT",
    ) -> ForecastResponse:
        """Truy vấn dữ liệu dự báo chuỗi thời gian 7 ngày kèm khoảng tin cậy 95%"""
        pass

    @abstractmethod
    async def link_dispatch_order(
        self,
        db: AsyncSession,
        hotspot_id: str,
        order_id: str,
        order_code: str,
        version: int,
    ) -> bool:
        """Liên kết mã lệnh điều phối xử lý hiện trường (STT 43) vào điểm nóng (OCC)"""
        pass
