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

# 6. Kinh tế Điểm thưởng Công dân Xanh & Ví điểm (Gamification & Rewards Domain - Chức năng 28, 29, 30 & 31)
from app.models.reward import (
    CitizenReward,
    RewardTransaction,
    UserVoucher,
)

# 7. Thử thách xanh trong tuần (Chức năng 25)
from app.models.challenge import (
    GreenChallenge,
    UserChallenge,
)

# 8. Nhật ký kiểm toán Audit Log (Chức năng 26)
from app.models.audit import (
    AuditLog,
)

# 9. Thư viện sống xanh: Cẩm nang phân loại rác (Chức năng 27)
from app.models.waste_handbook import (
    WasteHandbookItem,
)

# 10. Bảng xếp hạng & Bản đồ nhiệt môi trường (Chức năng 32 & 33)
from app.models.leaderboard import (
    CommunityGroup,
    DistrictEnvironmentalStat,
)

# 11. Quét mã QR & Vòng quay may mắn (Chức năng 34 & 35)
from app.models.qr_lucky import (
    EcoQRCode,
    UserQRScan,
    LuckyWheelSpin,
)

# 12. Hiệu ứng thăng cấp danh hiệu & Bài vinh danh (Chức năng 36)
from app.models.milestone import (
    MilestonePost,
)

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
    # Rewards & Eco Points (Chức năng 28, 29, 30 & 31)
    "CitizenReward",
    "RewardTransaction",
    "UserVoucher",
    # Features 25, 26, 27
    "GreenChallenge",
    "UserChallenge",
    "AuditLog",
    "WasteHandbookItem",
    # Features 32, 33
    "CommunityGroup",
    "DistrictEnvironmentalStat",
    # Features 34, 35
    "EcoQRCode",
    "UserQRScan",
    "LuckyWheelSpin",
    # Feature 36
    "MilestonePost",
    # Features 25, 26, 27
    "GreenChallenge",
    "UserChallenge",
    "AuditLog",
    "WasteHandbookItem",
    # Features 32, 33
    "CommunityGroup",
    "DistrictEnvironmentalStat",
    # Spatial & Green Facilities
    "AdministrativeUnit",
    "EssentialFacility",
    "RecyclingFacility",
    # Environmental Incidents
    "WasteCategory",
    "Incident",
    "IncidentMedia",
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
]
