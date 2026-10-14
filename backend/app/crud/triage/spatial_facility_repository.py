"""
Spatial Facility Repository Implementation (STT 40).
Đóng gói các truy vấn PostGIS không gian địa lý và CSDL cho nghiệp vụ phân tích vùng đệm cơ sở thiết yếu.
"""

from typing import List, Optional, Tuple
import uuid
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.triage.spatial_facility_interface import ISpatialFacilityRepository
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


class SpatialFacilityRepository(ISpatialFacilityRepository):
    """
    Triển khai các truy vấn PostGIS ST_X, ST_Y, Bounding Box và bảng cơ sở thiết yếu.
    """

    async def get_incident_by_id(
        self, db: AsyncSession, incident_id: uuid.UUID
    ) -> Optional[Incident]:
        """Truy vấn thông tin sự cố theo ID chưa bị xóa mềm."""
        stmt = select(Incident).where(
            Incident.incident_id == incident_id,
            Incident.deleted_at.is_(None),
        )
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
        Truy vấn danh sách cơ sở thiết yếu nằm trong Bounding Box sử dụng Spatial Index PostGIS.
        Trả về danh sách tuple: (facility_id, facility_name, facility_type, address, contact_phone, vulnerability_level, lat, lng).
        """
        stmt_fac = select(
            EssentialFacility.facility_id,
            EssentialFacility.facility_name,
            EssentialFacility.facility_type,
            EssentialFacility.address,
            EssentialFacility.contact_phone,
            EssentialFacility.vulnerability_level,
            func.ST_Y(EssentialFacility.location).label("lat"),
            func.ST_X(EssentialFacility.location).label("lng"),
        ).where(
            EssentialFacility.deleted_at.is_(None),
            EssentialFacility.facility_type.in_(facility_types),
            func.ST_Y(EssentialFacility.location) >= min_lat,
            func.ST_Y(EssentialFacility.location) <= max_lat,
            func.ST_X(EssentialFacility.location) >= min_lng,
            func.ST_X(EssentialFacility.location) <= max_lng,
        )
        res_fac = await db.execute(stmt_fac)
        rows = res_fac.all()

        output = []
        for r in rows:
            fac_id, name, ftype, addr, phone, vuln, f_lat, f_lng = r
            if f_lat is not None and f_lng is not None:
                output.append((fac_id, name, ftype, addr, phone, vuln, float(f_lat), float(f_lng)))
        return output

    async def get_facility_with_coords(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[Tuple[EssentialFacility, float, float]]:
        """Lấy thông tin cơ sở thiết yếu kèm tọa độ (ST_Y, ST_X) giải nén từ POINT geometry."""
        stmt = select(
            EssentialFacility,
            func.ST_Y(EssentialFacility.location).label("lat"),
            func.ST_X(EssentialFacility.location).label("lng"),
        ).where(
            EssentialFacility.facility_id == facility_id,
            EssentialFacility.deleted_at.is_(None),
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            return None
        fac, f_lat, f_lng = row
        return fac, float(f_lat), float(f_lng)

    async def get_facility_by_id(
        self, db: AsyncSession, facility_id: int
    ) -> Optional[EssentialFacility]:
        """Lấy thông tin cơ sở thiết yếu theo ID."""
        stmt = select(EssentialFacility).where(
            EssentialFacility.facility_id == facility_id,
            EssentialFacility.deleted_at.is_(None),
        )
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
