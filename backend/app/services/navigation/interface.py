"""
Abstract Base Class Contract for Flood-Aware Navigation Service.
Adheres to Dependency Inversion Principle (SOLID).
"""

from abc import ABC, abstractmethod
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.navigation.schemas import (
    CalculateRouteRequest,
    NavigationPlanResponse,
    EarlyWarningCheckRequest,
    EarlyWarningResponse,
    RerouteRequest,
    RouteOption,
)


class ISafeNavigationService(ABC):
    """
    Hợp đồng giao tiếp cho dịch vụ định tuyến an toàn thích ứng biến đổi khí hậu.
    Hỗ trợ tính toán 2 tuyến (Nhanh nhất vs An toàn nhất), cảnh báo sớm phía trước (<500m),
    và tái định tuyến bẻ nhánh khi gặp vũng ngập đột xuất.
    """

    @abstractmethod
    async def calculate_dual_routes(
        self,
        db: AsyncSession,
        request: CalculateRouteRequest,
    ) -> NavigationPlanResponse:
        """
        Tính toán song song 2 tuyến đường:
        - Tuyến nhanh nhất (Fastest route)
        - Tuyến an toàn nhất (Safest route - né các điểm ngập vượt ngưỡng chịu tải của phương tiện)
        """
        pass

    @abstractmethod
    async def check_early_warning_ahead(
        self,
        db: AsyncSession,
        request: EarlyWarningCheckRequest,
    ) -> EarlyWarningResponse:
        """
        Quét các điểm ngập mới phát sinh trong phạm vi < 500m trên hướng di chuyển của xe.
        Nếu phát hiện nguy cơ, trả về cảnh báo khẩn cấp kèm dữ liệu âm thanh/giọng đọc.
        """
        pass

    @abstractmethod
    async def reroute_avoiding_hazard(
        self,
        db: AsyncSession,
        request: RerouteRequest,
    ) -> RouteOption:
        """
        Tái định tuyến tức thời né điểm ngập vừa phát sinh ngay tại ngã rẽ kế tiếp.
        """
        pass
