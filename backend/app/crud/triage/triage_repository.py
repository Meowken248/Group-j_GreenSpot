"""
Triage Repository Implementation (STT 39).
Triển khai truy xuất CSDL PostgreSQL / PostGIS theo chuẩn Repository Pattern.
"""

import math
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.interface.triage.triage_interface import ITriageRepository
from app.models.incident import Incident, WasteCategory
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


class TriageRepository(ITriageRepository):
    """
    Triển khai toàn bộ các truy vấn CSDL cho hệ thống thẩm định sự cố AI Triage.
    Tập trung câu truy vấn CSDL tại đây, loại bỏ raw query phân mảnh trong Service và Router.
    """

    async def get_triage_incidents_list(
        self, db: AsyncSession, limit: int = 20
    ) -> List[Incident]:
        """Truy vấn danh sách sự cố chờ thẩm định kèm eager-loading các bảng quan hệ."""
        stmt = (
            select(Incident)
            .options(
                selectinload(Incident.category),
                selectinload(Incident.media),
                selectinload(Incident.unit),
            )
            .where(Incident.deleted_at.is_(None))
            .order_by(desc(Incident.created_at))
            .limit(limit)
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy thông tin chi tiết một sự cố theo ID chưa bị xóa mềm."""
        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None),
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_incident_detail_with_relations(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Lấy chi tiết sự cố kèm eager-loading quan hệ category, media, reporter."""
        stmt = (
            select(Incident)
            .options(
                selectinload(Incident.category),
                selectinload(Incident.media),
                selectinload(Incident.reporter),
            )
            .where(
                Incident.incident_id == incident_id,
                Incident.deleted_at.is_(None),
            )
        )
        res = await db.execute(stmt)
        return res.scalars().first()

    async def get_waste_category_by_id(
        self, db: AsyncSession, category_id: int
    ) -> Optional[WasteCategory]:
        """Lấy thông tin danh mục rác thải để xác định BaseSeverity."""
        cat_stmt = select(WasteCategory).where(WasteCategory.category_id == category_id)
        cat_res = await db.execute(cat_stmt)
        return cat_res.scalars().first()

    async def get_nearest_sensitive_facility(
        self, db: AsyncSession, incident_lat: float, incident_lng: float
    ) -> Tuple[Optional[str], Optional[float]]:
        """
        Truy vấn cơ sở thiết yếu nhạy cảm gần nhất qua PostGIS ST_Distance.
        Áp dụng Bounding Box 3km để tận dụng tối đa chỉ mục GIST trước khi tính khoảng cách.
        """
        delta_lat = 3000.0 / 111000.0
        delta_lng = 3000.0 / (111000.0 * max(0.2, math.cos(math.radians(incident_lat))))

        fac_stmt = (
            select(
                EssentialFacility.facility_name,
                func.ST_Distance(
                    func.ST_Transform(EssentialFacility.location, 3857),
                    func.ST_Transform(
                        func.ST_SetSRID(func.ST_MakePoint(incident_lng, incident_lat), 4326),
                        3857,
                    ),
                ).label("dist_m"),
            )
            .where(
                EssentialFacility.deleted_at.is_(None),
                func.ST_Y(EssentialFacility.location) >= incident_lat - delta_lat,
                func.ST_Y(EssentialFacility.location) <= incident_lat + delta_lat,
                func.ST_X(EssentialFacility.location) >= incident_lng - delta_lng,
                func.ST_X(EssentialFacility.location) <= incident_lng + delta_lng,
            )
            .order_by("dist_m")
            .limit(1)
        )
        try:
            fac_res = await db.execute(fac_stmt)
            row = fac_res.first()
            if row:
                return row[0], float(row[1])
        except Exception:
            pass
        return None, None

    async def get_incident_audit_logs(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> List[IncidentAuditLog]:
        """Truy vấn danh sách nhật ký kiểm toán của sự cố kèm quan hệ operator."""
        stmt = (
            select(IncidentAuditLog)
            .options(selectinload(IncidentAuditLog.operator))
            .where(
                IncidentAuditLog.incident_id == incident_id,
                IncidentAuditLog.deleted_at.is_(None),
            )
            .order_by(desc(IncidentAuditLog.created_at))
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
