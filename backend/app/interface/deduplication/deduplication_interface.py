"""
Interface Contracts for Incident Deduplication & Clustering Engine (STT 38).
Tuân thủ nguyên lý Dependency Inversion (SOLID) và Clean Architecture.
"""

from abc import ABC, abstractmethod
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spatial import AdministrativeUnit
from app.models.incident import Incident
from app.models.deduplication import IncidentDuplicateCluster


class IDeduplicationRepository(ABC):
    """
    Hợp đồng giao tiếp tầng truy xuất CSDL cho nghiệp vụ đối soát và gộp báo cáo trùng lặp.
    Tách biệt hoàn toàn câu truy vấn CSDL khỏi API Router và Service.
    """

    @abstractmethod
    async def get_districts(self, db: AsyncSession) -> List[AdministrativeUnit]:
        """Truy vấn danh sách đơn vị hành chính cấp quận/huyện sắp xếp theo tên."""
        pass

    @abstractmethod
    async def list_clusters(
        self,
        db: AsyncSession,
        district_name: Optional[str] = None,
        min_similarity: Optional[float] = None,
    ) -> List[IncidentDuplicateCluster]:
        """Truy vấn danh sách cụm trùng lặp đang chờ duyệt, hỗ trợ lọc theo quận và độ tương đồng."""
        pass

    @abstractmethod
    async def get_cluster_by_id(
        self, db: AsyncSession, cluster_id: uuid.UUID
    ) -> Optional[IncidentDuplicateCluster]:
        """Truy vấn cụm báo cáo trùng lặp theo ID chưa bị xóa mềm."""
        pass

    @abstractmethod
    async def get_incident_with_media_and_reporter(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn sự cố kèm eager-loading media và reporter phục vụ so sánh song song."""
        pass

    @abstractmethod
    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy thông tin sự cố theo ID."""
        pass

    @abstractmethod
    async def mark_cluster_distinct(
        self, db: AsyncSession, cluster: IncidentDuplicateCluster
    ) -> IncidentDuplicateCluster:
        """Đánh dấu cụm không trùng lặp (SEPARATED), tăng version và commit."""
        pass

    @abstractmethod
    async def merge_cluster_incidents(
        self,
        db: AsyncSession,
        cluster: IncidentDuplicateCluster,
        primary_inc: Incident,
        secondary_inc: Incident,
    ) -> None:
        """
        Thực hiện liên kết gộp báo cáo phụ vào báo cáo chính,
        cập nhật trạng thái cụm sang MERGED, soft-delete cụm và commit giao dịch.
        """
        pass
