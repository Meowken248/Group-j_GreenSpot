"""
Interface Contracts for Spatial Facility Analysis (STT 40).
Tuân thủ nguyên lý Dependency Inversion (SOLID) và Clean Architecture.
"""

from abc import ABC, abstractmethod
import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


class ISpatialFacilityRepository(ABC):
    """
    Hợp đồng giao tiếp tầng truy xuất CSDL cho nghiệp vụ phân tích không gian cơ sở thiết yếu.
    Tập trung toàn bộ truy vấn PostGIS ST_X, ST_Y, Bounding Box và Audit Log.
    """

    @abstractmethod
    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn thông tin sự cố theo ID chưa bị xóa mềm."""
        pass

    @abstractmethod
    async def get_facilities_in_bounding_box(
        self,
        db: AsyncSession,
        facility_types: List[str],
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> List[Tuple[int, str, str, str, Optional[str], Optional[str], float, float]]:
        """
        Truy vấn danh sách cơ sở thiết yếu nằm trong Bounding Box sử dụng Spatial Index PostGIS.
        Trả về danh sách tuple: (facility_id, facility_name, facility_type, address, contact_phone, vulnerability_level, lat, lng).
        """
        pass

    @abstractmethod
    async def get_facility_with_coords(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[Tuple[EssentialFacility, float, float]]:
        """Lấy thông tin cơ sở thiết yếu kèm tọa độ (ST_Y, ST_X) giải nén từ POINT geometry."""
        pass

    @abstractmethod
    async def get_facility_by_id(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[EssentialFacility]:
        """Lấy thông tin cơ sở thiết yếu theo ID."""
        pass

    @abstractmethod
    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> IncidentAuditLog:
        """Ghi nhận nhật ký kiểm toán vào CSDL."""
        pass


class ISpatialFacilityService(ABC):
    """
    Hợp đồng giao tiếp tầng logic nghiệp vụ phân tích không gian Buffer Zone.
    """

    @abstractmethod
    async def get_facilities_in_buffer(
        self, db: AsyncSession, query: Any
    ) -> List[Any]:
        """Tìm kiếm cơ sở thiết yếu nằm trong bán kính vùng đệm Buffer Zone."""
        pass

    @abstractmethod
    async def count_facilities_by_type_in_buffer(
        self, db: AsyncSession, incident_id: uuid.UUID, radius_meters: float
    ) -> Dict[str, int]:
        """Đếm số lượng cơ sở tìm thấy trong bán kính quét theo từng loại hình."""
        pass

    @abstractmethod
    async def get_facility_detail(
        self, db: AsyncSession, facility_id: int, incident_id: Optional[uuid.UUID] = None
    ) -> Any:
        """Lấy hồ sơ chi tiết cơ sở thiết yếu, mức độ phơi nhiễm và khoảng cách tới sự cố."""
        pass

    @abstractmethod
    async def send_emergency_alert(
        self, db: AsyncSession, req: Any
    ) -> Any:
        """Gửi thông báo cảnh báo môi trường khẩn cấp và lưu Audit Log."""
        pass
