"""
GreenSpot Domain Models Registry
Tập trung và đồng bộ toàn bộ các Thực thể Dữ liệu (ORM Models) chuẩn hóa của hệ thống.
"""

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

# 1. Quản lý Người dùng & Phân quyền (RBAC)
from app.models.rbac import (
    Role,
    Permission,
    RolePermission,
    User,
    UserOTP,
    UserSession,
    LoginAttempt,
)

# 2. Không gian Hành chính & Cơ sở Xanh (Spatial WebGIS)
from app.models.spatial import (
    AdministrativeUnit,
    EssentialFacility,
    RecyclingFacility,
)

# 3. Sự cố Môi trường Đô thị (Incidents & Media)
from app.models.incident import (
    WasteCategory,
    Incident,
    IncidentMedia,
)
from app.models.deduplication import IncidentDuplicateCluster

# 4. Trạm Quan trắc Cảm biến IoT & Dữ liệu Khí tượng
from app.models.iot import (
    IoTSensorStation,
    AirQualityRecord,
)

# 5. Thủy triều, Điểm ngập lụt Đô thị & Lộ trình Né ngập (Flood & Tide Domain)
from app.models.flood import (
    TideStation,
    TideHarmonicConstituent,
    TideWaterLevelRecord,
    FloodHotspot,
    FloodRiskAssessment,
    FloodCommunityReport,
    SafeNavigationRoute,
    TideState,
    TideAlertLevel,
    FloodCauseType,
    FloodSeverityLevel,
    RouteSafetyStatus,
)

# 6. Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)
from app.models.voice_assistant import (
    VoiceSampleCommand,
    VoiceInteractionLog,
    VoiceActionType,
    VoiceCategory,
)

# 7. Trang cá nhân, Hộ chiếu Xanh, Huy hiệu & Lịch sử đóng góp (Profile Domain)
from app.models.profile import (
    CitizenLevel,
    Badge,
    UserBadge,
    UserActivity,
    Post,
)

# 7. Kết bạn và theo dõi (Friends & Follows Domain)
from app.models.friends import (
    FriendRequest,
    Friendship,
    UserFollow,
    FriendRequestStatus,
)

# 8. Cài đặt người dùng (User Settings Domain)
from app.models.settings import UserSettings

# 9. Tra cứu quy định xử phạt vi phạm hành chính (Penalty Regulations Domain)
from app.models.penalty import PenaltyRegulation

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    # RBAC & Users
    "Role",
    "Permission",
    "RolePermission",
    "User",
    "UserOTP",
    "UserSession",
    "LoginAttempt",
    # Spatial & Green Facilities
    "AdministrativeUnit",
    "EssentialFacility",
    "RecyclingFacility",
    # Environmental Incidents
    "WasteCategory",
    "Incident",
    "IncidentMedia",
    "IncidentDuplicateCluster",
    # IoT Sensors
    "IoTSensorStation",
    # Flood, Tide & Safe Navigation
    "TideStation",
    "TideHarmonicConstituent",
    "TideWaterLevelRecord",
    "FloodHotspot",
    "FloodRiskAssessment",
    "FloodCommunityReport",
    "SafeNavigationRoute",
    "TideState",
    "TideAlertLevel",
    "FloodCauseType",
    "FloodSeverityLevel",
    "RouteSafetyStatus",
    # Voice Assistant
    "VoiceSampleCommand",
    "VoiceInteractionLog",
    "VoiceActionType",
    "VoiceCategory",
    # Profile & Green Passport Domain
    "CitizenLevel",
    "Badge",
    "UserBadge",
    "UserActivity",
    "Post",
    # Friends & Follows Domain
    "FriendRequest",
    "Friendship",
    "UserFollow",
    "FriendRequestStatus",
    # User Settings Domain
    "UserSettings",
    # Penalty Regulations Domain
    "PenaltyRegulation",
]

