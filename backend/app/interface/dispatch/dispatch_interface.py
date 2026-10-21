"""
Interface định nghĩa Hợp đồng Repository cho STT 43: Trung tâm điều phối tác nghiệp
Tuân thủ Nguyên lý Đảo ngược Phụ thuộc (Dependency Inversion Principle - DIP).
"""

from abc import ABC, abstractmethod
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dispatch.dispatch_order import DispatchOrder
from app.schemas.dispatch.schemas import (
    DispatchListFilter,
    DispatchOrderItem,
    IncidentComboboxItem,
    TeamOptionItem,
    FieldTrackingResponse,
)


class IDispatchRepository(ABC):
    """Giao diện trừu tượng cho tầng truy xuất dữ liệu điều phối tác nghiệp"""

    @abstractmethod
    async def get_dispatch_orders(
        self, db: AsyncSession, filters: DispatchListFilter
    ) -> List[DispatchOrderItem]:
        """Truy vấn danh sách lệnh xử lý kèm bộ lọc trạng thái, đội, quận/huyện"""
        pass

    @abstractmethod
    async def get_available_incidents(
        self, db: AsyncSession
    ) -> List[IncidentComboboxItem]:
        """Lấy danh sách các sự cố chưa phân công hoặc cần giải quyết khẩn cấp (Màn 2/6)"""
        pass

    @abstractmethod
    async def get_response_teams(
        self, db: AsyncSession
    ) -> List[TeamOptionItem]:
        """Lấy danh sách các đội phản ứng cơ động hiện trường"""
        pass

    @abstractmethod
    async def get_order_by_id(
        self, db: AsyncSession, order_id: uuid.UUID
    ) -> Optional[DispatchOrder]:
        """Truy vấn chi tiết một lệnh điều phối theo ID"""
        pass

    @abstractmethod
    async def create_order(
        self, db: AsyncSession, order: DispatchOrder
    ) -> DispatchOrder:
        """Tạo mới và lưu trữ lệnh điều động hiện trường"""
        pass

    @abstractmethod
    async def update_order(
        self, db: AsyncSession, order: DispatchOrder
    ) -> DispatchOrder:
        """Cập nhật thông tin phân công / gia hạn lệnh (kèm kiểm tra OCC version)"""
        pass

    @abstractmethod
    async def cancel_order(
        self, db: AsyncSession, order_id: uuid.UUID, reason: str, expected_version: int
    ) -> DispatchOrder:
        """Thu hồi / huỷ bỏ lệnh điều phối kèm lý do bắt buộc"""
        pass

    @abstractmethod
    async def close_order(
        self, db: AsyncSession, order_id: uuid.UUID, expected_version: int
    ) -> DispatchOrder:
        """Nghiệm thu và hoàn tất đóng hồ sơ lệnh hiện trường"""
        pass

    @abstractmethod
    async def get_tracking_data(
        self, db: AsyncSession, order_id: uuid.UUID
    ) -> Optional[FieldTrackingResponse]:
        """Truy vấn dữ liệu định vị GPS và tiến trình hiện trường thời gian thực (Màn 6/6)"""
        pass

    @abstractmethod
    async def update_team_location(
        self, db: AsyncSession, order_id: uuid.UUID, lat: float, lng: float
    ) -> bool:
        """Cập nhật tọa độ định vị GPS của đội hiện trường"""
        pass

    @abstractmethod
    async def accept_order(
        self, db: AsyncSession, order_id: uuid.UUID
    ) -> DispatchOrder:
        """Đội phản ứng hiện trường xác nhận tiếp nhận lệnh (ASSIGNED -> EN_ROUTE)"""
        pass

    @abstractmethod
    async def arrive_order(
        self, db: AsyncSession, order_id: uuid.UUID
    ) -> DispatchOrder:
        """Đội phản ứng hiện trường xác nhận đã đến nơi (EN_ROUTE -> IN_PROGRESS)"""
        pass


