"""
Interface Abstractions cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Tuân thủ Clean Architecture và Dependency Inversion Principle (DIP).
Tách biệt hoàn toàn tầng Domain / Service khỏi tầng truy xuất dữ liệu CSDL.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flood_sos.sos_request import FloodSosRequest, VolunteerProfile, FloodSosChatMessage


class IFloodSosRepository(ABC):
    """Giao diện Repository trừu tượng cho Flood SOS"""

    @abstractmethod
    async def create_sos_request(
        self,
        db: AsyncSession,
        sos_code: str,
        victim_id: Optional[uuid.UUID],
        victim_name: str,
        victim_phone: str,
        total_victims: int,
        elderly_count: int,
        children_count: int,
        medical_urgent_count: int,
        description: str,
        image_url: Optional[str],
        latitude: float,
        longitude: float,
        address_text: str,
        district: Optional[str],
        ward: Optional[str],
        severity_level: str,
        flood_depth_meters: Optional[float],
    ) -> FloodSosRequest:
        """Tạo mới một yêu cầu cấp cứu khẩn cấp (Màn 1/5 và 2/5)"""
        pass

    @abstractmethod
    async def get_sos_by_id(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> Optional[FloodSosRequest]:
        """Truy vấn ca cứu hộ theo ID (loại bỏ soft delete)"""
        pass

    @abstractmethod
    async def get_sos_by_code(
        self,
        db: AsyncSession,
        sos_code: str,
    ) -> Optional[FloodSosRequest]:
        """Truy vấn ca cứu hộ theo mã SOS"""
        pass

    @abstractmethod
    async def get_nearby_sos_requests(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> List[Tuple[FloodSosRequest, float]]:
        """Truy vấn danh sách ca cứu hộ PENDING trong bán kính radius_km kèm khoảng cách (mét)"""
        pass

    @abstractmethod
    async def count_nearby_volunteers(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> int:
        """Đếm số lượng tình nguyện viên sẵn sàng trong bán kính radius_km"""
        pass

    @abstractmethod
    async def accept_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        volunteer_id: Optional[uuid.UUID],
        volunteer_name: str,
        volunteer_phone: str,
        team_name: Optional[str],
        vehicle_type: Optional[str],
        vol_lat: float,
        vol_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """
        Tình nguyện viên nhận ca cứu hộ (Màn 3/5).
        Áp dụng Optimistic Concurrency Control (OCC).
        Trả về (success, sos_request, error_reason)
        """
        pass

    @abstractmethod
    async def update_sos_progress(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        status: str,
        rescuer_lat: float,
        rescuer_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """Cập nhật tiến trình và vị trí người cứu hộ (Màn 4/5)"""
        pass

    @abstractmethod
    async def add_chat_message(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        sender_id: Optional[uuid.UUID],
        sender_type: str,
        sender_name: str,
        content: str,
    ) -> FloodSosChatMessage:
        """Thêm tin nhắn trao đổi khẩn cấp (Màn 4/5)"""
        pass

    @abstractmethod
    async def get_chat_messages(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> List[FloodSosChatMessage]:
        """Lấy danh sách tin nhắn của ca cứu hộ"""
        pass

    @abstractmethod
    async def cancel_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        cancel_reason: str,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        """Nạn nhân huỷ yêu cầu SOS (Màn 5/5)"""
        pass

    @abstractmethod
    async def complete_sos_rating(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        rating: int,
        feedback_notes: Optional[str],
    ) -> Optional[FloodSosRequest]:
        """Hoàn tất và gửi đánh giá hỗ trợ"""
        pass

    @abstractmethod
    async def soft_delete_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> bool:
        """Xoá mềm ca cứu hộ"""
        pass
