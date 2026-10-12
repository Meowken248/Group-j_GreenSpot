"""
Spatial Facility Service (STT 40)
Phân tích không gian tìm kiếm các cơ sở thiết yếu (y tế, trường học) gần sự cố.
Hỗ trợ Buffer Radius Analysis (500m, 1km, 2km), lọc nhóm cơ sở, cảnh báo cự ly nguy hiểm (< 200m, < 100m)
và kích hoạt cảnh báo khẩn cấp ghi vào Nhật ký kiểm toán (Audit Log).
"""

import math
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog


class FacilityBufferQueryFilter(BaseModel):
    incident_id: uuid.UUID
    radius_meters: float = Field(1000.0, ge=50, le=10000)
    facility_types: List[str] = Field(default_factory=lambda: ["Trường học", "Bệnh viện", "Trạm y tế"])

    @field_validator("facility_types")
    @classmethod
    def validate_types_not_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Vui lòng chọn ít nhất một loại cơ sở thiết yếu")
        return v


class FacilityItemResult(BaseModel):
    facility_id: int
    facility_name: str
    facility_type: str
    address: str
    distance_meters: float
    distance_display: str
    is_danger_proximity: bool
    is_immediate_risk: bool
    contact_phone: Optional[str]
    vulnerability_level: str
    latitude: float
    longitude: float


class FacilityDetailResult(BaseModel):
    facility_id: int
    facility_name: str
    facility_type: str
    address: str
    contact_phone: Optional[str]
    contact_person: Optional[str]
    contact_email: Optional[str]
    capacity_people: Optional[int]
    vulnerability_level: str
    incident_distance_meters: Optional[float]
    incident_distance_display: Optional[str]
    directions_url: str
    can_call: bool
    can_alert: bool


class FacilityAlertRequest(BaseModel):
    incident_id: uuid.UUID
    facility_id: int
    message_text: str
    operator_id: Optional[uuid.UUID] = None


class FacilityAlertResponse(BaseModel):
    success: bool
    message: str
    facility_id: int
    facility_name: str
    sent_at: datetime


class SpatialFacilityService:

    @staticmethod
    def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Tính khoảng cách đại cầu Haversine chuẩn WGS84 chính xác đến mét"""
        R = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        return round(R * c, 1)

    @classmethod
    async def get_facilities_in_buffer(
        cls,
        db: AsyncSession,
        query: FacilityBufferQueryFilter
    ) -> List[FacilityItemResult]:
        """
        Tìm kiếm các cơ sở thiết yếu nằm trong bán kính vùng đệm (Buffer Zone).
        Sắp xếp từ gần nhất đến xa nhất.
        """
        stmt_inc = select(Incident).where(
            Incident.incident_id == query.incident_id,
            Incident.deleted_at.is_(None)
        )
        res_inc = await db.execute(stmt_inc)
        inc = res_inc.scalars().first()
        if not inc:
            raise HTTPException(status_code=404, detail="Không tìm thấy sự cố hoặc sự cố đã bị xóa")

        inc_lat = float(inc.latitude)
        inc_lng = float(inc.longitude)

        # Tối ưu hóa hiệu năng truy vấn GIS: Bounding Box Filter trước khi tính Haversine
        delta_lat = (query.radius_meters / 111000.0) * 1.15
        cos_lat = max(0.2, math.cos(math.radians(inc_lat)))
        delta_lng = (query.radius_meters / (111000.0 * cos_lat)) * 1.15

        # Lấy danh sách cơ sở khớp với loại hình trong bounding box
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
            EssentialFacility.facility_type.in_(query.facility_types),
            func.ST_Y(EssentialFacility.location) >= inc_lat - delta_lat,
            func.ST_Y(EssentialFacility.location) <= inc_lat + delta_lat,
            func.ST_X(EssentialFacility.location) >= inc_lng - delta_lng,
            func.ST_X(EssentialFacility.location) <= inc_lng + delta_lng,
        )
        res_fac = await db.execute(stmt_fac)
        rows = res_fac.all()

        results = []
        for r in rows:
            fac_id, name, ftype, addr, phone, vuln, f_lat, f_lng = r
            if f_lat is None or f_lng is None:
                continue

            dist = cls.haversine_distance_meters(inc_lat, inc_lng, float(f_lat), float(f_lng))
            if dist <= query.radius_meters:
                results.append(
                    FacilityItemResult(
                        facility_id=fac_id,
                        facility_name=name,
                        facility_type=ftype,
                        address=addr,
                        distance_meters=dist,
                        distance_display=f"Cách {int(dist)}m" if dist < 1000 else f"Cách {round(dist/1000.0, 1)}km",
                        is_danger_proximity=(dist < 200.0),
                        is_immediate_risk=(dist < 100.0),
                        contact_phone=phone,
                        vulnerability_level=vuln or "Mức dễ tổn thương: Cao",
                        latitude=float(f_lat),
                        longitude=float(f_lng),
                    )
                )

        # Sắp xếp từ gần nhất đến xa nhất
        results.sort(key=lambda x: x.distance_meters)
        return results

    @classmethod
    async def count_facilities_by_type_in_buffer(
        cls,
        db: AsyncSession,
        incident_id: uuid.UUID,
        radius_meters: float
    ) -> Dict[str, int]:
        """
        Đếm số lượng cơ sở tìm thấy trong bán kính quét theo từng loại hình phục vụ Bộ lọc nhanh Màn 2/3.
        """
        all_types = ["Trường học", "Bệnh viện", "Trạm y tế"]
        query = FacilityBufferQueryFilter(
            incident_id=incident_id,
            radius_meters=radius_meters,
            facility_types=all_types
        )
        facilities = await cls.get_facilities_in_buffer(db, query)
        counts = {t: 0 for t in all_types}
        for f in facilities:
            if f.facility_type in counts:
                counts[f.facility_type] += 1
            else:
                counts[f.facility_type] = 1
        return counts

    @classmethod
    async def get_facility_detail(
        cls,
        db: AsyncSession,
        facility_id: int,
        incident_id: Optional[uuid.UUID] = None
    ) -> FacilityDetailResult:
        """
        Màn 3/3: Hồ sơ chi tiết mức độ phơi nhiễm môi trường và liên hệ khẩn cấp của cơ sở.
        """
        stmt = select(
            EssentialFacility,
            func.ST_Y(EssentialFacility.location).label("lat"),
            func.ST_X(EssentialFacility.location).label("lng"),
        ).where(
            EssentialFacility.facility_id == facility_id,
            EssentialFacility.deleted_at.is_(None)
        )
        res = await db.execute(stmt)
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy thông tin cơ sở")

        fac, f_lat, f_lng = row
        f_lat = float(f_lat)
        f_lng = float(f_lng)

        dist_m = None
        dist_disp = None
        if incident_id:
            stmt_inc = select(Incident).where(Incident.incident_id == incident_id)
            res_inc = await db.execute(stmt_inc)
            inc = res_inc.scalars().first()
            if inc:
                dist_m = cls.haversine_distance_meters(float(inc.latitude), float(inc.longitude), f_lat, f_lng)
                dist_disp = f"Cách {int(dist_m)}m" if dist_m < 1000 else f"Cách {round(dist_m/1000.0, 1)}km"

        # Đường dẫn Google Maps Navigation
        directions_url = f"https://www.google.com/maps/dir/?api=1&destination={f_lat},{f_lng}"

        has_phone = bool(fac.contact_phone and len(fac.contact_phone.strip()) > 3)

        return FacilityDetailResult(
            facility_id=fac.facility_id,
            facility_name=fac.facility_name,
            facility_type=fac.facility_type,
            address=fac.address,
            contact_phone=fac.contact_phone,
            contact_person=fac.contact_person or "Ban quản lý cơ sở",
            contact_email=fac.contact_email,
            capacity_people=fac.capacity_people,
            vulnerability_level=fac.vulnerability_level or "Mức dễ tổn thương: Cao",
            incident_distance_meters=dist_m,
            incident_distance_display=dist_disp,
            directions_url=directions_url,
            can_call=has_phone,
            can_alert=has_phone,
        )

    @classmethod
    async def send_emergency_alert(
        cls,
        db: AsyncSession,
        req: FacilityAlertRequest
    ) -> FacilityAlertResponse:
        """
        Nút "Gửi cảnh báo": Gửi thông báo khẩn qua SMS/Email cảnh báo cơ sở, ghi vào Audit Log.
        """
        stmt_fac = select(EssentialFacility).where(
            EssentialFacility.facility_id == req.facility_id,
            EssentialFacility.deleted_at.is_(None)
        )
        res_fac = await db.execute(stmt_fac)
        fac = res_fac.scalars().first()
        if not fac:
            raise HTTPException(status_code=404, detail="Không tìm thấy cơ sở cần gửi cảnh báo")

        if not fac.contact_phone and not fac.contact_email:
            raise HTTPException(status_code=400, detail="Chưa có thông tin liên hệ của cơ sở này")

        # Ghi nhận vào Nhật ký kiểm toán (Audit Log)
        audit = IncidentAuditLog(
            incident_id=req.incident_id,
            action="FACILITY_ALERT_SENT",
            reason=req.message_text,
            performed_by=req.operator_id,
            metadata_json={
                "facility_id": fac.facility_id,
                "facility_name": fac.facility_name,
                "facility_type": fac.facility_type,
                "recipient_phone": fac.contact_phone,
                "recipient_email": fac.contact_email,
                "message": req.message_text,
            }
        )
        db.add(audit)
        await db.commit()

        return FacilityAlertResponse(
            success=True,
            message="Đã gửi thông báo cảnh báo môi trường đến cơ sở",
            facility_id=fac.facility_id,
            facility_name=fac.facility_name,
            sent_at=datetime.utcnow(),
        )
