"""
Interface Contracts for Flood-Aware Navigation (STT 41).
Adheres to Dependency Inversion Principle (SOLID) and Clean Architecture.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flood import SafeNavigationRoute
from app.schemas.navigation.schemas import (
    CalculateRouteRequest,
    NavigationPlanResponse,
    EarlyWarningCheckRequest,
    EarlyWarningResponse,
    RerouteRequest,
    RouteOption,
)


class INavigationRepository(ABC):
    """
    Hợp đồng giao tiếp tầng truy xuất dữ liệu CSDL cho phân hệ định tuyến né ngập.
    Tách biệt hoàn toàn câu truy vấn PostGIS/SQL khỏi logic dịch vụ.
    """

    @abstractmethod
    async def get_active_flood_hotspots(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Lấy danh sách các điểm đen ngập lụt đang hoạt động kèm tọa độ PostGIS và thông số thủy văn."""
        pass

    @abstractmethod
    async def save_navigation_route(
        self, db: AsyncSession, route: SafeNavigationRoute
    ) -> SafeNavigationRoute:
        """Lưu hoặc cập nhật lộ trình định tuyến an toàn vào CSDL."""
        pass


class ISafeNavigationService(ABC):
    """
    Hợp đồng giao tiếp tầng logic nghiệp vụ định tuyến thích ứng biến đổi khí hậu.
    """

    @abstractmethod
    async def calculate_dual_routes(
        self,
        db: AsyncSession,
        request: CalculateRouteRequest,
    ) -> NavigationPlanResponse:
        """Tính toán song song Tuyến nhanh nhất vs Tuyến an toàn nhất né ngập."""
        pass

    @abstractmethod
    async def check_early_warning_ahead(
        self,
        db: AsyncSession,
        request: EarlyWarningCheckRequest,
    ) -> EarlyWarningResponse:
        """Quét điểm ngập mới phát sinh trong bán kính < 500m trên hướng di chuyển."""
        pass

    @abstractmethod
    async def reroute_avoiding_hazard(
        self,
        db: AsyncSession,
        request: RerouteRequest,
    ) -> RouteOption:
        """Tái định tuyến tức thời bẻ nhánh né vũng ngập."""
        pass
