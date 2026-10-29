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

# 3. Sự cố Môi trường Đô thị (Incidents, Media, Audit Logs & Deduplication)
from app.models.incident import (
    WasteCategory,
    Incident,
    IncidentMedia,
)
from app.models.audit_log import AuditLog as IncidentAuditLogModel, IncidentAuditLog
from app.models.deduplication import IncidentDuplicateCluster
from app.models.incident_export import ExportedIncidentFile

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

# 13. Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)
from app.models.voice_assistant import (
    VoiceSampleCommand,
    VoiceInteractionLog,
    VoiceActionType,
    VoiceCategory,
)

# 14. Trang cá nhân, Hộ chiếu Xanh, Huy hiệu & Lịch sử đóng góp (Profile Domain)
from app.models.profile import (
    CitizenLevel,
    Badge,
    UserBadge,
    UserActivity,
    Post,
)
from app.models.post import PostTaggedFriend, PostReaction
from app.models.comment import Comment, PostShare

# 15. Kết bạn và theo dõi (Friends & Follows Domain)
from app.models.friends import (
    FriendRequest,
    Friendship,
    UserFollow,
    FriendRequestStatus,
)

# 16. Cài đặt người dùng (User Settings Domain)
from app.models.settings import UserSettings

# 17. Tra cứu quy định xử phạt vi phạm hành chính (Penalty Regulations Domain)
from app.models.penalty import PenaltyRegulation, PenaltyReport

# 18. Thông báo hệ thống (Notification Domain)
from app.models.notification import Notification

# 19. Nhắn tin 1-1, Chat nhóm & Chat quận (Chat Domain - Feature 15)
from app.models.chat import (
    Conversation,
    ConversationMember,
    Message,
    UserBlock,
    ConversationType,
    MemberRole,
)

# 20. Nhóm cộng đồng theo quận, phường hoặc chủ đề (Community Groups - Feature 16)
from app.models.group import (
    Group,
    GroupMember,
    GroupInvitation,
    GroupType,
    GroupPrivacy,
    GroupMemberRole,
    GroupStatus,
)

# 21. Sinh nhật bạn bè & thiệp xanh sinh thái (Birthday Domain - Feature 17)
from app.models.birthday import BirthdayWish, BirthdayWishType

# 22. Gây quỹ cộng đồng (Feature 20)
from app.models.fundraiser import (
    FundraiserCampaign,
    FundraiserDonation,
    FundraiserExpense,
    FundraiserStatus,
)

# 23. Sự kiện và Chiến dịch Chủ Nhật Xanh (Feature 21)
from app.models.event import (
    Event,
    EventParticipant,
    EventInterest,
    EventCheckin,
    EventStatus,
)

# 24. Chatbot AI (Feature 24)
from app.models.chatbot import ChatbotConversation, ChatbotMessage, ChatbotSenderType

# 25. Cảnh báo khẩn cấp theo vị trí & Safety Check (STT 45)
from app.models.emergency_alert import (
    UserDeviceLocation,
    EmergencyBroadcastAlert,
    EmergencyAlertRecipient,
    EmergencySOSSignal,
    UserSafetyCheck,
    SafetyCheckFriendDelivery,
)

# 26. Cứu hộ ngập cộng đồng (Flood SOS - STT 46)
from app.models.flood_sos import (
    FloodSosRequest,
    VolunteerProfile,
    FloodSosChatMessage,
)

# 27. Điều phối tác nghiệp & hiện trường (STT 43)
from app.models.dispatch import DispatchOrder

# 28. Phân tích điểm nóng & dự báo (STT 44)
from app.models.hotspots import HotspotCluster, HotspotDailyForecast

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
    # Spatial & Green Facilities
    "AdministrativeUnit",
    "EssentialFacility",
    "RecyclingFacility",
    # Environmental Incidents
    "WasteCategory",
    "Incident",
    "IncidentMedia",
    "IncidentAuditLog",
    "IncidentDuplicateCluster",
    # IoT Sensors
    "IoTSensorStation",
    "AirQualityRecord",
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
    "PostTaggedFriend",
    "PostReaction",
    "Comment",
    "PostShare",
    # Friends & Follows Domain
    "FriendRequest",
    "Friendship",
    "UserFollow",
    "FriendRequestStatus",
    # User Settings Domain
    "UserSettings",
    # Penalty Regulations Domain
    "PenaltyRegulation",
    "PenaltyReport",
    # Notification Domain
    "Notification",
    # Chat Domain (Feature 15)
    "Conversation",
    "ConversationMember",
    "Message",
    "UserBlock",
    "ConversationType",
    "MemberRole",
    # Community Groups (Feature 16)
    "Group",
    "GroupMember",
    "GroupInvitation",
    "GroupType",
    "GroupPrivacy",
    "GroupMemberRole",
    "GroupStatus",
    # Birthday Domain (Feature 17)
    "BirthdayWish",
    "BirthdayWishType",
    # Fundraiser (Feature 20)
    "FundraiserCampaign",
    "FundraiserDonation",
    "FundraiserExpense",
    "FundraiserStatus",
    # Green Sunday Events & Campaigns (Feature 21)
    "Event",
    "EventParticipant",
    "EventInterest",
    "EventCheckin",
    "EventStatus",
    # Chatbot (Feature 24)
    "ChatbotConversation",
    "ChatbotMessage",
    "ChatbotSenderType",
    # Emergency Alert & Safety Check (STT 45)
    "UserDeviceLocation",
    "EmergencyBroadcastAlert",
    "EmergencyAlertRecipient",
    "EmergencySOSSignal",
    "UserSafetyCheck",
    "SafetyCheckFriendDelivery",
    # Flood SOS Community Rescue (STT 46)
    "FloodSosRequest",
    "VolunteerProfile",
    "FloodSosChatMessage",
    # Incident Data Export (STT 47)
    "ExportedIncidentFile",
    # Dispatch (STT 43)
    "DispatchOrder",
    # Hotspots & Forecasting (STT 44)
    "HotspotCluster",
    "HotspotDailyForecast",
]
