"""
Deduplication Repository Implementation (STT 38).
Triển khai truy xuất CSDL PostgreSQL cho hệ thống phát hiện và gộp báo cáo trùng lặp.
"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.interface.deduplication.deduplication_interface import IDeduplicationRepository
from app.models.spatial import AdministrativeUnit
from app.models.incident import Incident
from app.models.deduplication import IncidentDuplicateCluster


class DeduplicationRepository(IDeduplicationRepository):
    """
    Triển khai toàn bộ các truy vấn CSDL cho hệ thống Deduplication.
    """

    async def get_districts(self, db: AsyncSession) -> List[AdministrativeUnit]:
        """Truy vấn danh sách đơn vị hành chính cấp quận/huyện sắp xếp theo tên."""
        stmt = select(AdministrativeUnit).order_by(AdministrativeUnit.name)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def list_clusters(
        self,
        db: AsyncSession,
        district_name: Optional[str] = None,
        min_similarity: Optional[float] = None,
    ) -> List[IncidentDuplicateCluster]:
        """Truy vấn danh sách cụm trùng lặp đang chờ duyệt, hỗ trợ lọc theo quận và độ tương đồng."""
        query = (
            select(IncidentDuplicateCluster)
            .where(IncidentDuplicateCluster.deleted_at.is_(None))
            .where(IncidentDuplicateCluster.status == "PENDING_REVIEW")
        )

        if district_name and district_name != "Tất cả quận/huyện":
            query = query.where(IncidentDuplicateCluster.district_name == district_name)

        if min_similarity is not None:
            query = query.where(IncidentDuplicateCluster.similarity_rate >= min_similarity)

        query = query.order_by(IncidentDuplicateCluster.similarity_rate.desc())
        res = await db.execute(query)
        return list(res.scalars().all())

    async def get_cluster_by_id(
        self, db: AsyncSession, cluster_id: uuid.UUID
    ) -> Optional[IncidentDuplicateCluster]:
        """Truy vấn cụm báo cáo trùng lặp theo ID chưa bị xóa mềm."""
        stmt = (
            select(IncidentDuplicateCluster)
            .where(IncidentDuplicateCluster.cluster_id == cluster_id)
            .where(IncidentDuplicateCluster.deleted_at.is_(None))
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_incident_with_media_and_reporter(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn sự cố kèm eager-loading media và reporter phục vụ so sánh song song."""
        stmt = (
            select(Incident)
            .options(selectinload(Incident.media), selectinload(Incident.reporter))
            .where(Incident.incident_id == incident_id)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy thông tin sự cố theo ID."""
        return await db.get(Incident, incident_id)

    async def mark_cluster_distinct(
        self, db: AsyncSession, cluster: IncidentDuplicateCluster
    ) -> IncidentDuplicateCluster:
        """Đánh dấu cụm không trùng lặp (SEPARATED), tăng version và commit."""
        cluster.status = "SEPARATED"
        cluster.version = cluster.version + 1
        cluster.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return cluster

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
        secondary_inc.master_incident_id = primary_inc.incident_id
        secondary_inc.is_duplicate_merged = True
        secondary_inc.status = "MERGED"
        secondary_inc.version = secondary_inc.version + 1

        cluster.status = "MERGED"
        cluster.master_incident_id = primary_inc.incident_id
        cluster.version = cluster.version + 1
        cluster.deleted_at = datetime.now(timezone.utc)

        await db.commit()


# Singleton instance
deduplication_repository = DeduplicationRepository()
