"""
Interface định nghĩa Hợp đồng Repository cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
Tuân thủ Nguyên lý Đảo ngược Phụ thuộc (Dependency Inversion Principle - DIP).
"""

from abc import ABC, abstractmethod
import uuid
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.emergency_alert.alert import (
    UserDeviceLocation,
    EmergencyBroadcastAlert,
    EmergencyAlertRecipient,
    EmergencySOSSignal,
)
from app.models.emergency_alert.safety_check import (
    UserSafetyCheck,
    SafetyCheckFriendDelivery,
)


class IEmergencyAlertRepository(ABC):
    """Giao diện trừu tượng cho tầng truy xuất dữ liệu cảnh báo khẩn cấp và Geofencing"""

    @abstractmethod
    async def count_users_in_radius(
        self, db: AsyncSession, center_lat: float, center_lng: float, radius_meters: float
    ) -> int:
        """Đếm số lượng người dùng có vị trí trong bán kính ghim phát sóng"""
        pass

    @abstractmethod
    async def get_user_device_locations_in_radius(
        self, db: AsyncSession, center_lat: float, center_lng: float, radius_meters: float
    ) -> List[Tuple[uuid.UUID, float, float, float]]:
        """Lấy danh sách người dùng trong bán kính: (user_id, lat, lng, distance_meters)"""
        pass

    @abstractmethod
    async def create_broadcast_alert(
        self, db: AsyncSession, alert: EmergencyBroadcastAlert
    ) -> EmergencyBroadcastAlert:
        """Lưu mới lệnh phát sóng cảnh báo khẩn cấp"""
        pass

    @abstractmethod
    async def bulk_create_recipients(
        self, db: AsyncSession, recipients: List[EmergencyAlertRecipient]
    ) -> int:
        """Lưu hàng loạt danh sách người nhận cảnh báo"""
        pass

    @abstractmethod
    async def get_alert_by_id(
        self, db: AsyncSession, alert_id: uuid.UUID
    ) -> Optional[EmergencyBroadcastAlert]:
        """Truy vấn lệnh cảnh báo theo ID"""
        pass

    @abstractmethod
    async def get_active_alert_covering_location(
        self, db: AsyncSession, lat: float, lng: float
    ) -> Optional[Tuple[EmergencyBroadcastAlert, float]]:
        """Truy vấn cảnh báo khẩn cấp đang kích hoạt bao phủ vị trí người dùng kèm khoảng cách tới tâm"""
        pass

    @abstractmethod
    async def update_recipient_action(
        self, db: AsyncSession, alert_id: uuid.UUID, user_id: uuid.UUID, action_taken: str
    ) -> None:
        """Cập nhật hành động của người dùng đối với cảnh báo (SAFE, SOS, VIEW_DETAILS)"""
        pass

    @abstractmethod
    async def create_sos_signal(
        self, db: AsyncSession, sos: EmergencySOSSignal
    ) -> EmergencySOSSignal:
        """Tạo tín hiệu cứu nạn khẩn cấp SOS"""
        pass

    @abstractmethod
    async def get_broadcast_history(
        self, db: AsyncSession, limit: int = 20, alert_type: Optional[str] = None
    ) -> List[EmergencyBroadcastAlert]:
        """Lấy danh sách lịch sử phát sóng cảnh báo"""
        pass

    @abstractmethod
    async def update_broadcast_alert(
        self, db: AsyncSession, alert: EmergencyBroadcastAlert
    ) -> EmergencyBroadcastAlert:
        """Cập nhật thông tin / trạng thái lệnh cảnh báo (OCC check)"""
        pass

    @abstractmethod
    async def upsert_user_device_location(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        lat: float,
        lng: float,
        address_text: Optional[str] = None,
        district: Optional[str] = None,
        ward: Optional[str] = None,
    ) -> UserDeviceLocation:
        """Cập nhật hoặc tạo mới vị trí định vị của thiết bị người dùng"""
        pass


class ISafetyCheckRepository(ABC):
    """Giao diện trừu tượng cho nghiệp vụ báo an toàn cộng đồng (Community Safety Check)"""

    @abstractmethod
    async def get_friends_for_safety_check(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[dict]:
        """Lấy danh sách bạn bè kết nối hai chiều kèm thông tin avatar, tên và trạng thái nhận thông báo"""
        pass

    @abstractmethod
    async def create_safety_check(
        self, db: AsyncSession, check: UserSafetyCheck
    ) -> UserSafetyCheck:
        """Lưu lượt báo an toàn của công dân"""
        pass

    @abstractmethod
    async def bulk_create_friend_deliveries(
        self, db: AsyncSession, deliveries: List[SafetyCheckFriendDelivery]
    ) -> int:
        """Lưu danh sách phân phối thông báo đến bạn bè (Push Notification / SMS)"""
        pass

    @abstractmethod
    async def get_latest_safety_check(
        self, db: AsyncSession, user_id: uuid.UUID, alert_id: Optional[uuid.UUID] = None
    ) -> Optional[UserSafetyCheck]:
        """Kiểm tra lượt báo an toàn gần nhất của người dùng"""
        pass
