# Export toàn bộ 54 SQLAlchemy Models của Hệ thống EcoReport
# Phục vụ FastAPI ORM, Alembic Auto-migration và Data Access Layer

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

# 1. RBAC, Users & Sessions (7 models)
from app.models.rbac import (
    Role,
    Permission,
    RolePermission,
    User,
    UserSession,
    RefreshToken,
    UserPrivacySetting,
)

# 2. Administrative & Facilities (3 models)
from app.models.spatial import (
    AdministrativeUnit,
    EssentialFacility,
    RecyclingFacility,
)

# 3. Incidents & Media (6 models)
from app.models.incident import (
    WasteCategory,
    Incident,
    IncidentMedia,
    IncidentStatusHistory,
    IncidentComment,
    IncidentTransfer,
)

# 4. Dispatch & Verification (5 models)
from app.models.dispatch import (
    WorkTeam,
    TeamMember,
    WorkerLocation,
    Assignment,
    Verification,
)

# 5. SLA, Audit & KPI (3 models)
from app.models.sla_audit import (
    SLAPolicy,
    AuditLog,
    KPIEvaluation,
)

# 6. WebGIS Advanced (5 models)
from app.models.webgis import (
    UserWatchArea,
    IncidentClusterHotspot,
    UserMapFavorite,
    FloodZoneMonitoring,
    SafeRouteCache,
)

# 7. AI & Smart Analytics (3 models)
from app.models.ai import (
    AIAnalysisResult,
    AIDuplicateGroup,
    AIIncidentSummary,
)

# 8. Community & Chatbot (6 models)
from app.models.community import (
    EnvironmentalCampaign,
    CampaignParticipant,
    CitizenReward,
    RewardTransaction,
    ChatbotConversation,
    ChatbotMessage,
)

# 9. System, Reports & Notifications (4 models)
from app.models.system import (
    Notification,
    Report,
    SystemConfig,
    DBBackup,
)

# 10. IoT Sensors & Telemetry (3 models)
from app.models.iot import (
    IoTSensorStation,
    IoTSensorTelemetry,
    IoTSensorAlert,
)

# 11. Logistics & Fleet Management (3 models)
from app.models.fleet import (
    WasteCollectionRoute,
    RouteCheckpoint,
    VehicleFuelLog,
)

# 12. Legal Regulations, Violation Records & Assets (6 models)
from app.models.legal_assets import (
    PenaltyRegulation,
    ViolationRecord,
    SystemTranslation,
    FileStorageAsset,
    EnvironmentalSubscription,
    AIKnowledgeEmbedding,
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
    "UserSession",
    "RefreshToken",
    "UserPrivacySetting",
    # Spatial
    "AdministrativeUnit",
    "EssentialFacility",
    "RecyclingFacility",
    # Incident
    "WasteCategory",
    "Incident",
    "IncidentMedia",
    "IncidentStatusHistory",
    "IncidentComment",
    "IncidentTransfer",
    # Dispatch
    "WorkTeam",
    "TeamMember",
    "WorkerLocation",
    "Assignment",
    "Verification",
    # SLA & Audit
    "SLAPolicy",
    "AuditLog",
    "KPIEvaluation",
    # WebGIS
    "UserWatchArea",
    "IncidentClusterHotspot",
    "UserMapFavorite",
    "FloodZoneMonitoring",
    "SafeRouteCache",
    # AI
    "AIAnalysisResult",
    "AIDuplicateGroup",
    "AIIncidentSummary",
    # Community & Chatbot
    "EnvironmentalCampaign",
    "CampaignParticipant",
    "CitizenReward",
    "RewardTransaction",
    "ChatbotConversation",
    "ChatbotMessage",
    # System
    "Notification",
    "Report",
    "SystemConfig",
    "DBBackup",
    # IoT Sensors
    "IoTSensorStation",
    "IoTSensorTelemetry",
    "IoTSensorAlert",
    # Fleet & Routes
    "WasteCollectionRoute",
    "RouteCheckpoint",
    "VehicleFuelLog",
    # Legal & Assets
    "PenaltyRegulation",
    "ViolationRecord",
    "SystemTranslation",
    "FileStorageAsset",
    "EnvironmentalSubscription",
    "AIKnowledgeEmbedding",
]
