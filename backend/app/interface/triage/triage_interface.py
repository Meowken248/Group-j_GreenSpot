"""
Interface Contracts for AI Incident Triage & Priority (STT 39).
Adheres to Dependency Inversion Principle (SOLID) and Clean Architecture.
"""

from abc import ABC, abstractmethod
import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import Incident, WasteCategory
from app.models.audit_log import IncidentAuditLog


class ITriageRepository(ABC):
    """
    Hợp đồng giao tiếp tầng truy xuất CSDL cho nghiệp vụ thẩm định sự cố AI Triage.
    Tách biệt hoàn toàn câu truy vấn CSDL khỏi logic dịch vụ.
    """

    @abstractmethod
    async def get_triage_incidents_list(
        self, db: AsyncSession, limit: int = 20
    ) -> List[Incident]:
        """Truy vấn danh sách sự cố chờ thẩm định kèm nạp quan hệ category, media, unit."""
        pass

    @abstractmethod
    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy chi tiết một sự cố theo ID chưa bị xóa mềm."""
        pass

    @abstractmethod
    async def get_incident_detail_with_relations(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy chi tiết sự cố kèm eager-loading quan hệ category, media, reporter."""
        pass

    @abstractmethod
    async def get_waste_category_by_id(
        self, db: AsyncSession, category_id: int
    ) -> Optional[WasteCategory]:
        """Lấy thông tin danh mục rác thải để xác định BaseSeverity."""
        pass

    @abstractmethod
    async def get_nearest_sensitive_facility(
        self, db: AsyncSession, incident_lat: float, incident_lng: float
    ) -> Tuple[Optional[str], Optional[float]]:
        """Truy vấn cơ sở thiết yếu nhạy cảm gần nhất qua PostGIS ST_Distance."""
        pass

    @abstractmethod
    async def get_incident_audit_logs(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> List[IncidentAuditLog]:
        """Truy vấn danh sách nhật ký kiểm toán của sự cố kèm quan hệ operator."""
        pass

    @abstractmethod
    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> IncidentAuditLog:
        """Ghi nhận nhật ký kiểm toán AI Triage vào bảng incident_audit_logs."""
        pass

    @abstractmethod
    async def commit_changes(self, db: AsyncSession) -> None:
        """Commit giao dịch CSDL."""
        pass


class IAITriageService(ABC):
    """
    Hợp đồng giao tiếp tầng logic nghiệp vụ AI Triage & Chấm điểm ưu tiên TPS.
    """

    @abstractmethod
    async def evaluate_incident(self, db: AsyncSession, incident_id: uuid.UUID) -> Any:
        """Đánh giá toàn diện AI Triage và Explainable AI (XAI) cho sự cố."""
        pass

    @abstractmethod
    async def regenerate_summary(self, db: AsyncSession, incident_id: uuid.UUID) -> str:
        """Tạo lại bản tóm tắt AI mới qua Kira AI LLM."""
        pass

    @abstractmethod
    async def accept_ai_priority(
        self,
        db: AsyncSession,
        incident_id: uuid.UUID,
        operator_id: Optional[uuid.UUID],
        expected_version: int,
    ) -> Incident:
        """Chấp nhận mức gợi ý AI, kích hoạt SLA và kiểm tra Optimistic Locking."""
        pass

    @abstractmethod
    async def override_priority(
        self,
        db: AsyncSession,
        incident_id: uuid.UUID,
        new_priority: str,
        reason: str,
        operator_id: Optional[uuid.UUID],
        expected_version: int,
    ) -> Incident:
        """Can thiệp điều chỉnh mức ưu tiên có giải trình (Human-in-the-loop)."""
        pass
