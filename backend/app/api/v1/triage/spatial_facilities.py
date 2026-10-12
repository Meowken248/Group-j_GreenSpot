"""
API Router: Phân tích không gian tìm kiếm các cơ sở thiết yếu (y tế, trường học) gần sự cố (STT 40)
Màn 1/3: Bản đồ sự cố + Bán kính vùng đệm + Checkbox nhóm cơ sở
Màn 2/3: Bảng tổng hợp danh sách cơ sở có bộ lọc nhanh
Màn 3/3: Hồ sơ chi tiết mức độ phơi nhiễm môi trường và liên hệ khẩn cấp (Gọi điện, Chỉ đường, Gửi cảnh báo)
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.incident import Incident
from app.models.spatial import EssentialFacility
from app.models.audit_log import IncidentAuditLog
from app.models.rbac import User
from app.schemas.spatial_facility import (
    FacilityBufferQueryRequest,
    FacilityItemResponse,
    FacilityListResponse,
    FacilityDetailProfileResponse,
    SendEmergencyAlertRequest,
    SendEmergencyAlertResponse,
)
from app.services.spatial_facility_service import (
    SpatialFacilityService,
    FacilityBufferQueryFilter,
    FacilityAlertRequest,
)

router = APIRouter(prefix="/spatial/facilities", tags=["Spatial Facility Analysis (STT 40)"])


@router.post("/buffer", response_model=FacilityListResponse)
async def analyze_facilities_in_buffer(
    payload: FacilityBufferQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 1/3 & Màn 2/3: Quét vùng đệm bán kính (500m, 1km, 2km) và trả về danh sách cơ sở sắp xếp theo khoảng cách
    """
    stmt = select(Incident).where(
        Incident.incident_id == payload.incident_id,
        Incident.deleted_at.is_(None)
    )
    res = await db.execute(stmt)
    inc = res.scalars().first()
    if not inc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố")

    if inc.latitude is None or inc.longitude is None:
        raise HTTPException(status_code=400, detail="Sự cố này chưa có dữ liệu tọa độ hợp lệ")

    # Gọi SpatialFacilityService
    filter_obj = FacilityBufferQueryFilter(
        incident_id=payload.incident_id,
        radius_meters=payload.radius_meters,
        facility_types=payload.facility_types,
    )
    facility_items = await SpatialFacilityService.get_facilities_in_buffer(db, filter_obj)

    # Đếm số lượng theo nhóm cho Quick Filters
    type_counts = await SpatialFacilityService.count_facilities_by_type_in_buffer(
        db, payload.incident_id, payload.radius_meters
    )

    # Cảnh báo nếu có cơ sở < 100m
    has_critical = any(item.is_immediate_risk for item in facility_items)

    formatted_items = [
        FacilityItemResponse(
            facility_id=item.facility_id,
            facility_name=item.facility_name,
            facility_type=item.facility_type,
            address=item.address,
            distance_meters=item.distance_meters,
            distance_display=item.distance_display,
            is_danger_proximity=item.is_danger_proximity,
            is_immediate_risk=item.is_immediate_risk,
            contact_phone=item.contact_phone,
            vulnerability_level=item.vulnerability_level,
            latitude=item.latitude,
            longitude=item.longitude,
        )
        for item in facility_items
    ]

    return FacilityListResponse(
        incident_id=inc.incident_id,
        incident_title=inc.title,
        incident_lat=float(inc.latitude),
        incident_lng=float(inc.longitude),
        radius_meters=payload.radius_meters,
        total_found=len(formatted_items),
        type_counts=type_counts,
        has_critical_nearby=has_critical,
        facilities=formatted_items,
    )


@router.get("/{facility_id}", response_model=FacilityDetailProfileResponse)
async def get_facility_profile_detail(
    facility_id: int,
    incident_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3/3: Xem hồ sơ chi tiết cơ sở, đầu mối khẩn cấp, mức độ dễ tổn thương và link chỉ đường
    """
    detail = await SpatialFacilityService.get_facility_detail(db, facility_id, incident_id)
    return FacilityDetailProfileResponse(
        facility_id=detail.facility_id,
        facility_name=detail.facility_name,
        facility_type=detail.facility_type,
        address=detail.address,
        contact_phone=detail.contact_phone,
        contact_person=detail.contact_person,
        contact_email=detail.contact_email,
        capacity_people=detail.capacity_people,
        vulnerability_level=detail.vulnerability_level,
        incident_distance_meters=detail.incident_distance_meters,
        incident_distance_display=detail.incident_distance_display,
        directions_url=detail.directions_url,
        can_call=detail.can_call,
        can_alert=detail.can_alert,
    )


@router.post("/alert", response_model=SendEmergencyAlertResponse)
async def send_emergency_alert(
    payload: SendEmergencyAlertRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3/3 Nút "Gửi cảnh báo": Gửi tin nhắn khẩn cấp đến ban giám hiệu/giám đốc cơ sở, ghi vào Audit Log
    """
    user_stmt = select(User).limit(1)
    user_res = await db.execute(user_stmt)
    operator = user_res.scalars().first()
    operator_id = operator.user_id if operator else None

    req = FacilityAlertRequest(
        incident_id=payload.incident_id,
        facility_id=payload.facility_id,
        message_text=payload.message_text,
        operator_id=operator_id,
    )
    result = await SpatialFacilityService.send_emergency_alert(db, req)
    return SendEmergencyAlertResponse(
        success=result.success,
        message=result.message,
        facility_id=result.facility_id,
        facility_name=result.facility_name,
        sent_at=result.sent_at,
    )


@router.post("/call-log")
async def log_call_initiated(
    incident_id: uuid.UUID = Query(...),
    facility_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Ghi nhận thao tác khi cán bộ bấm nút "Gọi điện" vào Nhật ký kiểm toán (Audit Log)
    """
    user_stmt = select(User).limit(1)
    user_res = await db.execute(user_stmt)
    operator = user_res.scalars().first()

    fac_stmt = select(EssentialFacility).where(EssentialFacility.facility_id == facility_id)
    fac_res = await db.execute(fac_stmt)
    fac = fac_res.scalars().first()

    audit = IncidentAuditLog(
        incident_id=incident_id,
        action="CALL_INITIATED",
        reason=f"Kích hoạt cuộc gọi thoại đến cơ sở {fac.facility_name if fac else facility_id}",
        performed_by=operator.user_id if operator else None,
        metadata_json={
            "facility_id": facility_id,
            "facility_name": fac.facility_name if fac else None,
            "phone": fac.contact_phone if fac else None,
        }
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "message": "Đã ghi nhận nhật ký cuộc gọi"}
