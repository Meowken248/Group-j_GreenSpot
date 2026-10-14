"""
Triage Repository Implementation (STT 39).
Triển khai truy xuất CSDL PostgreSQL / PostGIS theo chuẩn Repository Pattern với câu truy vấn SQL tường minh 100%.
"""

import math
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.interface.triage.triage_interface import ITriageRepository
from app.models.incident import Incident, WasteCategory
from app.models.audit_log import IncidentAuditLog


class TriageRepository(ITriageRepository):
    """
    Triển khai toàn bộ các truy vấn CSDL cho hệ thống thẩm định sự cố AI Triage.
    Tập trung câu truy vấn CSDL tại đây với câu lệnh SQL tường minh hoàn toàn.
    """

    async def get_triage_incidents_list(
        self, db: AsyncSession, limit: int = 20
    ) -> List[Incident]:
        """Truy vấn danh sách sự cố chờ thẩm định bằng SQL tường minh kèm eager-loading quan hệ."""
        sql = text("""
            SELECT 
                i.incident_id,
                i.tracking_code,
                i.reporter_id,
                i.category_id,
                i.unit_id,
                i.title,
                i.description,
                i.address_text,
                i.location,
                i.latitude,
                i.longitude,
                i.severity,
                i.status,
                i.risk_score,
                i.estimated_volume_m3,
                i.is_anonymous,
                i.reporter_phone_masked,
                i.upvotes_count,
                i.sla_deadline,
                i.resolved_at,
                i.closed_at,
                i.version,
                i.deleted_at,
                i.master_incident_id,
                i.is_duplicate_merged,
                i.ai_summary,
                i.ai_triage_score,
                i.ai_suggested_priority,
                i.ai_factors,
                i.ai_generated_at,
                i.priority_modified_by,
                i.priority_modified_reason,
                i.priority_modified_at,
                i.sla_response_deadline,
                i.created_at,
                i.updated_at
            FROM incidents i
            WHERE i.deleted_at IS NULL
            ORDER BY i.created_at DESC
            LIMIT :limit
        """)
        stmt = (
            select(Incident)
            .from_statement(sql)
            .params(limit=limit)
            .options(
                selectinload(Incident.category),
                selectinload(Incident.media),
                selectinload(Incident.unit),
            )
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy thông tin chi tiết một sự cố theo ID chưa bị xóa mềm bằng SQL tường minh."""
        sql = text("""
            SELECT 
                i.incident_id,
                i.tracking_code,
                i.reporter_id,
                i.category_id,
                i.unit_id,
                i.title,
                i.description,
                i.address_text,
                i.location,
                i.latitude,
                i.longitude,
                i.severity,
                i.status,
                i.risk_score,
                i.estimated_volume_m3,
                i.is_anonymous,
                i.reporter_phone_masked,
                i.upvotes_count,
                i.sla_deadline,
                i.resolved_at,
                i.closed_at,
                i.version,
                i.deleted_at,
                i.master_incident_id,
                i.is_duplicate_merged,
                i.ai_summary,
                i.ai_triage_score,
                i.ai_suggested_priority,
                i.ai_factors,
                i.ai_generated_at,
                i.priority_modified_by,
                i.priority_modified_reason,
                i.priority_modified_at,
                i.sla_response_deadline,
                i.created_at,
                i.updated_at
            FROM incidents i
            WHERE i.incident_id = :incident_id
              AND i.deleted_at IS NULL
        """)
        stmt = select(Incident).from_statement(sql).params(incident_id=incident_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_incident_detail_with_relations(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy chi tiết sự cố kèm eager-loading quan hệ category, media, reporter bằng SQL tường minh."""
        sql = text("""
            SELECT 
                i.incident_id,
                i.tracking_code,
                i.reporter_id,
                i.category_id,
                i.unit_id,
                i.title,
                i.description,
                i.address_text,
                i.location,
                i.latitude,
                i.longitude,
                i.severity,
                i.status,
                i.risk_score,
                i.estimated_volume_m3,
                i.is_anonymous,
                i.reporter_phone_masked,
                i.upvotes_count,
                i.sla_deadline,
                i.resolved_at,
                i.closed_at,
                i.version,
                i.deleted_at,
                i.master_incident_id,
                i.is_duplicate_merged,
                i.ai_summary,
                i.ai_triage_score,
                i.ai_suggested_priority,
                i.ai_factors,
                i.ai_generated_at,
                i.priority_modified_by,
                i.priority_modified_reason,
                i.priority_modified_at,
                i.sla_response_deadline,
                i.created_at,
                i.updated_at
            FROM incidents i
            WHERE i.incident_id = :incident_id
              AND i.deleted_at IS NULL
        """)
        stmt = (
            select(Incident)
            .from_statement(sql)
            .params(incident_id=incident_id)
            .options(
                selectinload(Incident.category),
                selectinload(Incident.media),
                selectinload(Incident.reporter),
            )
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_waste_category_by_id(
        self, db: AsyncSession, category_id: int
    ) -> Optional[WasteCategory]:
        """Lấy thông tin danh mục rác thải để xác định BaseSeverity bằng SQL tường minh."""
        sql = text("""
            SELECT 
                c.category_id,
                c.category_code,
                c.name,
                c.description,
                c.default_severity,
                c.sla_hours,
                c.color_hex,
                c.icon_name,
                c.is_active,
                c.created_at,
                c.updated_at
            FROM waste_categories c
            WHERE c.category_id = :category_id
        """)
        stmt = select(WasteCategory).from_statement(sql).params(category_id=category_id)
        cat_res = await db.execute(stmt)
        return cat_res.scalars().first()

    async def get_nearest_sensitive_facility(
        self, db: AsyncSession, incident_lat: float, incident_lng: float
    ) -> Tuple[Optional[str], Optional[float]]:
        """
        Truy vấn cơ sở thiết yếu nhạy cảm gần nhất qua PostGIS ST_Distance bằng SQL tường minh.
        Áp dụng Bounding Box 3km để tận dụng tối đa chỉ mục GIST trước khi tính khoảng cách.
        """
        delta_lat = 3000.0 / 111000.0
        delta_lng = 3000.0 / (111000.0 * max(0.2, math.cos(math.radians(incident_lat))))

        sql = text("""
            SELECT 
                f.facility_name,
                ST_Distance(
                    ST_Transform(f.location, 3857),
                    ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857)
                ) AS dist_m
            FROM essential_facilities f
            WHERE f.deleted_at IS NULL
              AND ST_Y(f.location) >= :min_lat
              AND ST_Y(f.location) <= :max_lat
              AND ST_X(f.location) >= :min_lng
              AND ST_X(f.location) <= :max_lng
            ORDER BY dist_m ASC
            LIMIT 1
        """)
        try:
            fac_res = await db.execute(
                sql,
                {
                    "lat": incident_lat,
                    "lng": incident_lng,
                    "min_lat": incident_lat - delta_lat,
                    "max_lat": incident_lat + delta_lat,
                    "min_lng": incident_lng - delta_lng,
                    "max_lng": incident_lng + delta_lng,
                },
            )
            row = fac_res.fetchone()
            if row and row.facility_name is not None and row.dist_m is not None:
                return row.facility_name, float(row.dist_m)
        except Exception:
            pass
        return None, None

    async def get_incident_audit_logs(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> List[IncidentAuditLog]:
        """Truy vấn danh sách nhật ký kiểm toán của sự cố kèm quan hệ operator bằng SQL tường minh."""
        sql = text("""
            SELECT 
                l.log_id,
                l.incident_id,
                l.action,
                l.old_priority,
                l.new_priority,
                l.risk_score,
                l.reason,
                l.performed_by,
                l.metadata,
                l.version,
                l.deleted_at,
                l.created_at,
                l.updated_at
            FROM incident_audit_logs l
            WHERE l.incident_id = :incident_id
              AND l.deleted_at IS NULL
            ORDER BY l.created_at DESC
        """)
        stmt = (
            select(IncidentAuditLog)
            .from_statement(sql)
            .params(incident_id=incident_id)
            .options(selectinload(IncidentAuditLog.operator))
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> IncidentAuditLog:
        """Ghi nhận nhật ký kiểm toán vào CSDL."""
        db.add(audit_log)
        await db.commit()
        return audit_log

    async def commit_changes(self, db: AsyncSession) -> None:
        """Commit các thay đổi trên session."""
        await db.commit()


# Singleton instance sẵn sàng sử dụng
triage_repository = TriageRepository()

