"""
Spatial Facility Repository Implementation (STT 40).
Đóng gói các truy vấn PostGIS không gian địa lý và CSDL cho nghiệp vụ phân tích vùng đệm cơ sở thiết yếu.
Toàn bộ truy vấn SQL đều được viết tường minh 100%.
"""

from typing import List, Optional, Tuple
import uuid
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.triage.spatial_facility_interface import ISpatialFacilityRepository
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


class SpatialFacilityRepository(ISpatialFacilityRepository):
    """
    Triển khai các truy vấn PostGIS ST_X, ST_Y, Bounding Box và bảng cơ sở thiết yếu
    sử dụng SQL tường minh hoàn toàn.
    """

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn thông tin sự cố theo ID chưa bị xóa mềm bằng câu lệnh SQL tường minh."""
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

    async def get_facilities_in_bounding_box(
        self,
        db: AsyncSession,
        facility_types: List[str],
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> List[Tuple[int, str, str, str, Optional[str], Optional[str], float, float]]:
        """
        Truy vấn danh sách cơ sở thiết yếu nằm trong Bounding Box sử dụng Spatial Index PostGIS bằng SQL tường minh.
        Trả về danh sách tuple: (facility_id, facility_name, facility_type, address, contact_phone, vulnerability_level, lat, lng).
        """
        sql = text("""
            SELECT 
                f.facility_id,
                f.facility_name,
                f.facility_type,
                f.address,
                f.contact_phone,
                f.vulnerability_level,
                ST_Y(f.location)::float AS lat,
                ST_X(f.location)::float AS lng
            FROM essential_facilities f
            WHERE f.deleted_at IS NULL
              AND f.facility_type = ANY(:facility_types)
              AND ST_Y(f.location) >= :min_lat
              AND ST_Y(f.location) <= :max_lat
              AND ST_X(f.location) >= :min_lng
              AND ST_X(f.location) <= :max_lng
        """)
        res = await db.execute(
            sql,
            {
                "facility_types": facility_types,
                "min_lat": min_lat,
                "max_lat": max_lat,
                "min_lng": min_lng,
                "max_lng": max_lng,
            },
        )
        rows = res.fetchall()

        output = []
        for r in rows:
            if r.lat is not None and r.lng is not None:
                output.append((
                    r.facility_id,
                    r.facility_name,
                    r.facility_type,
                    r.address,
                    r.contact_phone,
                    r.vulnerability_level,
                    float(r.lat),
                    float(r.lng),
                ))
        return output

    async def get_facility_with_coords(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[Tuple[EssentialFacility, float, float]]:
        """Lấy thông tin cơ sở thiết yếu kèm tọa độ (ST_Y, ST_X) giải nén từ POINT geometry bằng SQL tường minh."""
        sql_coords = text("""
            SELECT 
                ST_Y(f.location)::float AS lat,
                ST_X(f.location)::float AS lng
            FROM essential_facilities f
            WHERE f.facility_id = :facility_id
              AND f.deleted_at IS NULL
        """)
        res_coords = await db.execute(sql_coords, {"facility_id": facility_id})
        coord_row = res_coords.fetchone()
        if not coord_row:
            return None

        fac = await self.get_facility_by_id(db, facility_id)
        if not fac:
            return None
        return fac, float(coord_row.lat), float(coord_row.lng)

    async def get_facility_by_id(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[EssentialFacility]:
        """Lấy thông tin cơ sở thiết yếu theo ID bằng SQL tường minh."""
        sql = text("""
            SELECT 
                f.facility_id,
                f.facility_name,
                f.facility_type,
                f.address,
                f.unit_id,
                f.location,
                f.contact_phone,
                f.contact_person,
                f.contact_email,
                f.capacity_people,
                f.vulnerability_level,
                f.metadata,
                f.version,
                f.deleted_at,
                f.created_at,
                f.updated_at
            FROM essential_facilities f
            WHERE f.facility_id = :facility_id
              AND f.deleted_at IS NULL
        """)
        stmt = select(EssentialFacility).from_statement(sql).params(facility_id=facility_id)
        res = await db.execute(stmt)
        return res.scalars().first()

    async def save_audit_log(
        self, db: AsyncSession, audit_log: IncidentAuditLog
    ) -> IncidentAuditLog:
        """Ghi nhận nhật ký kiểm toán vào CSDL."""
        db.add(audit_log)
        await db.commit()
        return audit_log


# Singleton instance
spatial_facility_repository = SpatialFacilityRepository()

