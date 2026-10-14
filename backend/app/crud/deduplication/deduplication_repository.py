"""
Deduplication Repository Implementation (STT 38).
Triển khai truy xuất CSDL PostgreSQL với toàn bộ câu lệnh truy vấn SQL tường minh (Explicit SQL Queries).
"""

from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.interface.deduplication.deduplication_interface import IDeduplicationRepository
from app.models.spatial import AdministrativeUnit
from app.models.incident import Incident
from app.models.deduplication import IncidentDuplicateCluster


class DeduplicationRepository(IDeduplicationRepository):
    """
    Triển khai toàn bộ các truy vấn CSDL cho hệ thống Deduplication.
    100% các câu lệnh truy vấn là SQL tường minh với danh sách trường cụ thể.
    """

    async def get_districts(self, db: AsyncSession) -> List[AdministrativeUnit]:
        """Truy vấn danh sách đơn vị hành chính cấp quận/huyện bằng SQL tường minh."""
        query = text("""
            SELECT
                u.unit_id,
                u.unit_code,
                u.name,
                u.level,
                u.parent_id,
                u.area_km2,
                u.population,
                u.created_at,
                u.updated_at
            FROM administrative_units u
            ORDER BY u.name ASC
        """)
        stmt = select(AdministrativeUnit).from_statement(query)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def list_clusters(
        self,
        db: AsyncSession,
        district_name: Optional[str] = None,
        min_similarity: Optional[float] = None,
    ) -> List[IncidentDuplicateCluster]:
        """Truy vấn danh sách cụm trùng lặp bằng SQL tường minh, hỗ trợ lọc theo quận và độ tương đồng."""
        where_clauses = ["c.deleted_at IS NULL", "c.status = 'PENDING_REVIEW'"]
        params = {}
        if district_name and district_name != "Tất cả quận/huyện":
            where_clauses.append("c.district_name = :district_name")
            params["district_name"] = district_name
        if min_similarity is not None:
            where_clauses.append("c.similarity_rate >= :min_similarity")
            params["min_similarity"] = min_similarity

        where_sql = " AND ".join(where_clauses)
        query = text(f"""
            SELECT
                c.cluster_id,
                c.cluster_code,
                c.cluster_name,
                c.unit_id,
                c.district_name,
                c.incident_a_id,
                c.incident_b_id,
                c.report_count,
                c.similarity_rate,
                c.gps_distance_m,
                c.time_diff_hours,
                c.visual_similarity,
                c.ai_conclusion,
                c.status,
                c.master_incident_id,
                c.version,
                c.created_at,
                c.updated_at,
                c.deleted_at
            FROM incident_duplicate_clusters c
            WHERE {where_sql}
            ORDER BY c.similarity_rate DESC
        """)
        stmt = select(IncidentDuplicateCluster).from_statement(query).params(**params)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_cluster_by_id(
        self, db: AsyncSession, cluster_id: uuid.UUID
    ) -> Optional[IncidentDuplicateCluster]:
        """Truy vấn cụm báo cáo trùng lặp theo ID bằng SQL tường minh."""
        query = text("""
            SELECT
                c.cluster_id,
                c.cluster_code,
                c.cluster_name,
                c.unit_id,
                c.district_name,
                c.incident_a_id,
                c.incident_b_id,
                c.report_count,
                c.similarity_rate,
                c.gps_distance_m,
                c.time_diff_hours,
                c.visual_similarity,
                c.ai_conclusion,
                c.status,
                c.master_incident_id,
                c.version,
                c.created_at,
                c.updated_at,
                c.deleted_at
            FROM incident_duplicate_clusters c
            WHERE c.cluster_id = :cluster_id
              AND c.deleted_at IS NULL
            LIMIT 1
        """)
        stmt = select(IncidentDuplicateCluster).from_statement(query).params(cluster_id=cluster_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_incident_with_media_and_reporter(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn sự cố kèm eager-loading media và reporter bằng SQL tường minh."""
        query = text("""
            SELECT
                i.incident_id,
                i.tracking_code,
                i.title,
                i.description,
                i.address_text,
                i.latitude,
                i.longitude,
                i.location,
                i.severity,
                i.status,
                i.category_id,
                i.reporter_id,
                i.unit_id,
                i.estimated_volume_m3,
                i.ai_summary,
                i.ai_triage_score,
                i.ai_suggested_priority,
                i.ai_factors,
                i.ai_generated_at,
                i.priority_modified_by,
                i.priority_modified_reason,
                i.priority_modified_at,
                i.sla_deadline,
                i.is_duplicate_merged,
                i.master_incident_id,
                i.version,
                i.created_at,
                i.updated_at,
                i.deleted_at
            FROM incidents i
            WHERE i.incident_id = :incident_id
            LIMIT 1
        """)
        stmt = (
            select(Incident)
            .options(selectinload(Incident.media), selectinload(Incident.reporter))
            .from_statement(query)
            .params(incident_id=incident_id)
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy thông tin sự cố theo ID bằng SQL tường minh."""
        query = text("""
            SELECT
                i.incident_id,
                i.tracking_code,
                i.title,
                i.description,
                i.address_text,
                i.latitude,
                i.longitude,
                i.location,
                i.severity,
                i.status,
                i.category_id,
                i.reporter_id,
                i.unit_id,
                i.estimated_volume_m3,
                i.ai_summary,
                i.ai_triage_score,
                i.ai_suggested_priority,
                i.ai_factors,
                i.ai_generated_at,
                i.priority_modified_by,
                i.priority_modified_reason,
                i.priority_modified_at,
                i.sla_deadline,
                i.is_duplicate_merged,
                i.master_incident_id,
                i.version,
                i.created_at,
                i.updated_at,
                i.deleted_at
            FROM incidents i
            WHERE i.incident_id = :incident_id
            LIMIT 1
        """)
        stmt = select(Incident).from_statement(query).params(incident_id=incident_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def mark_cluster_distinct(
        self, db: AsyncSession, cluster: IncidentDuplicateCluster
    ) -> IncidentDuplicateCluster:
        """Đánh dấu cụm không trùng lặp (SEPARATED), tăng version bằng SQL UPDATE tường minh."""
        now = datetime.now(timezone.utc)
        update_query = text("""
            UPDATE incident_duplicate_clusters
            SET status = 'SEPARATED',
                version = version + 1,
                updated_at = :now
            WHERE cluster_id = :cluster_id
        """)
        await db.execute(update_query, {"cluster_id": cluster.cluster_id, "now": now})
        await db.commit()
        cluster.status = "SEPARATED"
        cluster.version = cluster.version + 1
        cluster.updated_at = now
        return cluster

    async def merge_cluster_incidents(
        self,
        db: AsyncSession,
        cluster: IncidentDuplicateCluster,
        primary_inc: Incident,
        secondary_inc: Incident,
    ) -> None:
        """
        Thực hiện liên kết gộp báo cáo phụ vào báo cáo chính và soft-delete cụm
        bằng các câu lệnh SQL UPDATE tường minh.
        """
        now = datetime.now(timezone.utc)
        secondary_inc.master_incident_id = primary_inc.incident_id
        secondary_inc.is_duplicate_merged = True
        secondary_inc.status = "MERGED"
        secondary_inc.version = secondary_inc.version + 1
        secondary_inc.updated_at = now

        cluster.status = "MERGED"
        cluster.master_incident_id = primary_inc.incident_id
        cluster.version = cluster.version + 1
        cluster.deleted_at = now
        cluster.updated_at = now

        update_secondary = text("""
            UPDATE incidents
            SET master_incident_id = :primary_id,
                is_duplicate_merged = TRUE,
                status = 'MERGED',
                version = version + 1,
                updated_at = :now
            WHERE incident_id = :secondary_id
        """)
        await db.execute(
            update_secondary,
            {"primary_id": primary_inc.incident_id, "secondary_id": secondary_inc.incident_id, "now": now}
        )

        update_cluster = text("""
            UPDATE incident_duplicate_clusters
            SET status = 'MERGED',
                master_incident_id = :primary_id,
                version = version + 1,
                deleted_at = :now,
                updated_at = :now
            WHERE cluster_id = :cluster_id
        """)
        await db.execute(
            update_cluster,
            {"primary_id": primary_inc.incident_id, "cluster_id": cluster.cluster_id, "now": now}
        )

        await db.commit()


# Singleton instance
deduplication_repository = DeduplicationRepository()
