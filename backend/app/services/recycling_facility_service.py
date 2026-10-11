import hashlib
import random
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_, desc
from fastapi import HTTPException, status

from app.models.spatial import RecyclingFacility, AdministrativeUnit
from app.models.rbac import User
from app.models.audit_log import AuditLog
from app.schemas.recycling_facility import (
    RecyclingFacilityItem,
    RecyclingFacilityCreateRequest,
    RecyclingFacilityUpdateRequest,
    RecyclingFacilityListResponse,
    FacilityValidationCheckResponse,
)

# 22 Quận / Huyện TP.HCM & Mã viết tắt chuẩn đô thị
DISTRICT_ABBR_MAP: Dict[str, str] = {
    "Quận 1": "Q1",
    "Quận 3": "Q3",
    "Quận 4": "Q4",
    "Quận 5": "Q5",
    "Quận 6": "Q6",
    "Quận 7": "Q7",
    "Quận 8": "Q8",
    "Quận 10": "Q10",
    "Quận 11": "Q11",
    "Quận 12": "Q12",
    "Quận Bình Thạnh": "BT",
    "Quận Bình Tân": "BTA",
    "Quận Gò Vấp": "GV",
    "Quận Phú Nhuận": "PN",
    "Quận Tân Bình": "TB",
    "Quận Tân Phú": "TP",
    "TP. Thủ Đức": "TD",
    "Thành phố Thủ Đức": "TD",
    "Huyện Bình Chánh": "BC",
    "Huyện Cần Giờ": "CG",
    "Huyện Củ Chi": "CC",
    "Huyện Hóc Môn": "HM",
    "Huyện Nhà Bè": "NB",
}

# Giới hạn bounding box địa lý TP.HCM
HCMC_BBOX = {
    "min_lat": 10.35,
    "max_lat": 11.18,
    "min_lng": 106.35,
    "max_lng": 107.05,
}


def is_within_hcmc_bounds(lat: float, lng: float) -> bool:
    """Kiểm tra toạ độ có nằm trong phạm vi địa giới TP.HCM hay không"""
    return (
        HCMC_BBOX["min_lat"] <= lat <= HCMC_BBOX["max_lat"]
        and HCMC_BBOX["min_lng"] <= lng <= HCMC_BBOX["max_lng"]
    )


def generate_qr_code(facility_code: str) -> str:
    """Tự động sinh mã QR duy nhất cho trạm tái chế phục vụ quét mã nhận điểm"""
    rand_suffix = "".join(random.choices("0123456789ABCDEF", k=6))
    return f"GREENSPOT-{facility_code}-{rand_suffix}"


async def generate_facility_code(db: AsyncSession, unit_id: int) -> str:
    """Tự động sinh mã trạm theo chuẩn REC-{QUẬN}-{STT:02d}"""
    prefix = "HCM"
    unit_stmt = select(AdministrativeUnit.name).where(AdministrativeUnit.unit_id == unit_id)
    unit_res = await db.execute(unit_stmt)
    unit_name = unit_res.scalar_one_or_none()

    if unit_name:
        for d_name, d_abbr in DISTRICT_ABBR_MAP.items():
            if d_name.lower() in unit_name.lower() or unit_name.lower() in d_name.lower():
                prefix = d_abbr
                break

    # Tìm số thứ tự lớn nhất hiện có với prefix này
    pattern = f"REC-{prefix}-%"
    stmt = select(RecyclingFacility.facility_code).where(
        RecyclingFacility.facility_code.like(pattern)
    )
    res = await db.execute(stmt)
    codes = res.scalars().all()

    max_idx = 0
    for c in codes:
        if c:
            parts = c.split("-")
            if len(parts) >= 3 and parts[-1].isdigit():
                max_idx = max(max_idx, int(parts[-1]))

    next_idx = max_idx + 1
    return f"REC-{prefix}-{next_idx:02d}"


async def list_facilities(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    status_filter: str = "ALL",
    search: Optional[str] = None,
    unit_id: Optional[int] = None,
) -> RecyclingFacilityListResponse:
    """
    Màn 1: Lấy danh sách trạm tái chế phân trang (10 trạm/trang), tìm kiếm và lọc.
    Sắp xếp mới nhất lên trước (created_at DESC).
    """
    conditions = [RecyclingFacility.is_deleted == False]

    if status_filter == "ACTIVE":
        conditions.append(RecyclingFacility.is_active == True)
    elif status_filter == "INACTIVE":
        conditions.append(RecyclingFacility.is_active == False)

    if unit_id:
        conditions.append(RecyclingFacility.unit_id == unit_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        conditions.append(
            or_(
                RecyclingFacility.name.ilike(term),
                RecyclingFacility.facility_code.ilike(term),
                RecyclingFacility.address.ilike(term),
            )
        )

    # Đếm số lượng theo filter
    count_stmt = select(func.count(RecyclingFacility.facility_id)).where(and_(*conditions))
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # Đếm tổng đang hoạt động và tạm ngưng trong hệ thống
    stats_stmt = select(
        func.count(RecyclingFacility.facility_id).filter(
            and_(RecyclingFacility.is_deleted == False, RecyclingFacility.is_active == True)
        ),
        func.count(RecyclingFacility.facility_id).filter(
            and_(RecyclingFacility.is_deleted == False, RecyclingFacility.is_active == False)
        ),
    )
    stats_res = await db.execute(stats_stmt)
    active_cnt, inactive_cnt = stats_res.one()

    # Truy vấn dữ liệu phân trang kèm tên quận/huyện và toạ độ WGS84
    offset = (page - 1) * limit
    data_query = (
        select(
            RecyclingFacility.facility_id,
            RecyclingFacility.facility_code,
            RecyclingFacility.name,
            RecyclingFacility.address,
            RecyclingFacility.unit_id,
            AdministrativeUnit.name.label("district_name"),
            func.ST_Y(RecyclingFacility.location).label("lat"),
            func.ST_X(RecyclingFacility.location).label("lng"),
            RecyclingFacility.accepted_waste_types,
            RecyclingFacility.operating_hours,
            RecyclingFacility.open_time,
            RecyclingFacility.close_time,
            RecyclingFacility.qr_code,
            RecyclingFacility.contact_phone,
            RecyclingFacility.managing_org,
            RecyclingFacility.is_active,
            RecyclingFacility.created_at,
            RecyclingFacility.updated_at,
        )
        .outerjoin(AdministrativeUnit, RecyclingFacility.unit_id == AdministrativeUnit.unit_id)
        .where(and_(*conditions))
        .order_by(desc(RecyclingFacility.created_at))
        .offset(offset)
        .limit(limit)
    )

    rows = await db.execute(data_query)
    items: List[RecyclingFacilityItem] = []
    for r in rows:
        items.append(
            RecyclingFacilityItem(
                facility_id=r.facility_id,
                facility_code=r.facility_code or f"REC-HCM-{r.facility_id:02d}",
                name=r.name,
                address=r.address,
                unit_id=r.unit_id,
                district_name=r.district_name or "Chưa phân bổ",
                unit_name=r.district_name or "Chưa phân bổ",
                latitude=float(r.lat) if r.lat is not None else 10.7769,
                longitude=float(r.lng) if r.lng is not None else 106.7009,
                accepted_waste_types=r.accepted_waste_types or [],
                operating_hours=r.operating_hours,
                open_time=r.open_time or "07:30",
                close_time=r.close_time or "17:00",
                qr_code=r.qr_code,
                contact_phone=r.contact_phone,
                managing_org=r.managing_org,
                is_active=r.is_active,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )

    total_pages = max(1, (total + limit - 1) // limit)
    return RecyclingFacilityListResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        active_count=active_cnt or 0,
        inactive_count=inactive_cnt or 0,
    )


async def get_facility_by_id(db: AsyncSession, facility_id: int) -> RecyclingFacilityItem:
    """Màn 3: Lấy chi tiết một trạm tái chế để điền sẵn vào form sửa"""
    query = (
        select(
            RecyclingFacility.facility_id,
            RecyclingFacility.facility_code,
            RecyclingFacility.name,
            RecyclingFacility.address,
            RecyclingFacility.unit_id,
            AdministrativeUnit.name.label("district_name"),
            func.ST_Y(RecyclingFacility.location).label("lat"),
            func.ST_X(RecyclingFacility.location).label("lng"),
            RecyclingFacility.accepted_waste_types,
            RecyclingFacility.operating_hours,
            RecyclingFacility.open_time,
            RecyclingFacility.close_time,
            RecyclingFacility.qr_code,
            RecyclingFacility.contact_phone,
            RecyclingFacility.managing_org,
            RecyclingFacility.is_active,
            RecyclingFacility.created_at,
            RecyclingFacility.updated_at,
        )
        .outerjoin(AdministrativeUnit, RecyclingFacility.unit_id == AdministrativeUnit.unit_id)
        .where(and_(RecyclingFacility.facility_id == facility_id, RecyclingFacility.is_deleted == False))
    )
    res = await db.execute(query)
    r = res.first()
    if not r:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trạm không còn tồn tại")

    return RecyclingFacilityItem(
        facility_id=r.facility_id,
        facility_code=r.facility_code or f"REC-HCM-{r.facility_id:02d}",
        name=r.name,
        address=r.address,
        unit_id=r.unit_id,
        district_name=r.district_name or "Chưa phân bổ",
        unit_name=r.district_name or "Chưa phân bổ",
        latitude=float(r.lat) if r.lat is not None else 10.7769,
        longitude=float(r.lng) if r.lng is not None else 106.7009,
        accepted_waste_types=r.accepted_waste_types or [],
        operating_hours=r.operating_hours,
        open_time=r.open_time or "07:30",
        close_time=r.close_time or "17:00",
        qr_code=r.qr_code,
        contact_phone=r.contact_phone,
        managing_org=r.managing_org,
        is_active=r.is_active,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


async def check_name_unique(
    db: AsyncSession, name: str, unit_id: int, exclude_id: Optional[int] = None
) -> FacilityValidationCheckResponse:
    """Kiểm tra tên trạm có trùng trong cùng quận/huyện hay không"""
    clean = name.strip()
    if not clean:
        return FacilityValidationCheckResponse(is_valid=False, message="Vui lòng nhập tên trạm")

    conds = [
        RecyclingFacility.name == clean,
        RecyclingFacility.unit_id == unit_id,
        RecyclingFacility.is_deleted == False,
    ]
    if exclude_id:
        conds.append(RecyclingFacility.facility_id != exclude_id)

    stmt = select(RecyclingFacility.facility_id).where(and_(*conds))
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return FacilityValidationCheckResponse(
            is_valid=False, message="Tên trạm đã tồn tại trong quận/huyện này"
        )
    return FacilityValidationCheckResponse(is_valid=True)


async def check_proximity(
    db: AsyncSession, lat: float, lng: float, exclude_id: Optional[int] = None
) -> FacilityValidationCheckResponse:
    """Kiểm tra có trạm khác trong bán kính 20m hay không (PostGIS ST_DWithin)"""
    if not is_within_hcmc_bounds(lat, lng):
        return FacilityValidationCheckResponse(
            is_valid=False, message="Vị trí nằm ngoài phạm vi hỗ trợ của hệ thống"
        )

    params: dict = {"lat": lat, "lng": lng}
    exclude_clause = ""
    if exclude_id is not None:
        exclude_clause = "AND facility_id != :exclude_id"
        params["exclude_id"] = exclude_id

    query = f"""
        SELECT facility_id, name 
        FROM recycling_facilities
        WHERE is_deleted = false
          {exclude_clause}
          AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, 20.0)
        LIMIT 1;
    """
    res = await db.execute(text(query), params)
    row = res.fetchone()
    if row:
        return FacilityValidationCheckResponse(
            is_valid=False,
            message=f"Vị trí này đã có trạm {row[1]}",
            conflict_facility_name=row[1],
        )

    return FacilityValidationCheckResponse(is_valid=True)


async def create_facility(
    db: AsyncSession,
    user: User,
    req: RecyclingFacilityCreateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> RecyclingFacilityItem:
    """
    Màn 2: Thêm mới trạm tái chế & điểm tiếp nhận
    - Validate tên duy nhất theo quận/huyện
    - Validate toạ độ trong 22 quận/huyện TP.HCM
    - Validate không có trạm khác trong 20m
    - Tự động sinh mã trạm và mã QR
    - Tự động ghi nhận Nhật ký kiểm toán (Audit Log)
    """
    # 1. Kiểm tra toạ độ trong TP.HCM
    if not is_within_hcmc_bounds(req.latitude, req.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vị trí nằm ngoài phạm vi hỗ trợ của hệ thống",
        )

    # 2. Kiểm tra trùng tên trong cùng quận/huyện
    val_name = await check_name_unique(db, req.name, req.unit_id)
    if not val_name.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=val_name.message)

    # 3. Kiểm tra trạm khác trong bán kính 20m
    val_prox = await check_proximity(db, req.latitude, req.longitude)
    if not val_prox.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=val_prox.message)

    # 4. Tự sinh mã trạm & mã QR
    code = await generate_facility_code(db, req.unit_id)
    qr = generate_qr_code(code)
    operating_hours = f"{req.open_time} - {req.close_time}"

    # 5. Lưu vào database
    new_facility = RecyclingFacility(
        name=req.name.strip(),
        facility_code=code,
        address=req.address.strip(),
        unit_id=req.unit_id,
        location=f"SRID=4326;POINT({req.longitude} {req.latitude})",
        accepted_waste_types=req.accepted_waste_types,
        operating_hours=operating_hours,
        open_time=req.open_time,
        close_time=req.close_time,
        qr_code=qr,
        contact_phone=req.contact_phone.strip() if req.contact_phone else None,
        managing_org=req.managing_org.strip() if req.managing_org else None,
        is_active=True,
        is_deleted=False,
    )
    db.add(new_facility)
    await db.flush()

    # 6. Ghi Audit Log
    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="CREATE_RECYCLING_FACILITY",
        table_name="recycling_facilities",
        record_id=str(new_facility.facility_id),
        old_values=None,
        new_values={
            "facility_code": new_facility.facility_code,
            "name": new_facility.name,
            "address": new_facility.address,
            "unit_id": new_facility.unit_id,
            "latitude": req.latitude,
            "longitude": req.longitude,
            "accepted_waste_types": new_facility.accepted_waste_types,
            "open_time": new_facility.open_time,
            "close_time": new_facility.close_time,
            "qr_code": new_facility.qr_code,
            "is_active": new_facility.is_active,
        },
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_facility)

    return await get_facility_by_id(db, new_facility.facility_id)


async def update_facility(
    db: AsyncSession,
    user: User,
    facility_id: int,
    req: RecyclingFacilityUpdateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> RecyclingFacilityItem:
    """
    Màn 3: Sửa thông tin trạm tái chế
    - Validate toạ độ, tên duy nhất, khoảng cách 20m
    - Giữ nguyên mã trạm và mã QR
    - Tự động ghi nhận Nhật ký kiểm toán (Audit Log)
    """
    stmt = select(RecyclingFacility).where(
        and_(RecyclingFacility.facility_id == facility_id, RecyclingFacility.is_deleted == False)
    )
    res = await db.execute(stmt)
    fac = res.scalar_one_or_none()
    if not fac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trạm không còn tồn tại")

    # 1. Kiểm tra toạ độ trong TP.HCM
    if not is_within_hcmc_bounds(req.latitude, req.longitude):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vị trí nằm ngoài phạm vi hỗ trợ của hệ thống",
        )

    # 2. Kiểm tra trùng tên trong cùng quận/huyện
    val_name = await check_name_unique(db, req.name, req.unit_id, exclude_id=facility_id)
    if not val_name.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=val_name.message)

    # 3. Kiểm tra khoảng cách 20m (nếu đổi toạ độ)
    val_prox = await check_proximity(db, req.latitude, req.longitude, exclude_id=facility_id)
    if not val_prox.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=val_prox.message)

    # 4. Thu thập giá trị cũ cho Audit Log
    old_values = {
        "name": fac.name,
        "address": fac.address,
        "unit_id": fac.unit_id,
        "accepted_waste_types": fac.accepted_waste_types,
        "open_time": fac.open_time,
        "close_time": fac.close_time,
        "is_active": fac.is_active,
    }

    # 5. Cập nhật dữ liệu mới (MÃ TRẠM VÀ MÃ QR GIỮ NGUYÊN BẢO TOÀN HIỆU LỰC)
    fac.name = req.name.strip()
    fac.address = req.address.strip()
    fac.unit_id = req.unit_id
    fac.location = f"SRID=4326;POINT({req.longitude} {req.latitude})"
    fac.accepted_waste_types = req.accepted_waste_types
    fac.open_time = req.open_time
    fac.close_time = req.close_time
    fac.operating_hours = f"{req.open_time} - {req.close_time}"
    fac.is_active = req.is_active
    fac.contact_phone = req.contact_phone.strip() if req.contact_phone else None
    fac.managing_org = req.managing_org.strip() if req.managing_org else None

    new_values = {
        "name": fac.name,
        "address": fac.address,
        "unit_id": fac.unit_id,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "accepted_waste_types": fac.accepted_waste_types,
        "open_time": fac.open_time,
        "close_time": fac.close_time,
        "is_active": fac.is_active,
    }

    # 6. Ghi Audit Log
    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="UPDATE_RECYCLING_FACILITY",
        table_name="recycling_facilities",
        record_id=str(fac.facility_id),
        old_values=old_values,
        new_values=new_values,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(fac)

    return await get_facility_by_id(db, fac.facility_id)


async def delete_facility(
    db: AsyncSession,
    user: User,
    facility_id: int,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Màn 4 & Màn 5: Xóa mềm trạm tái chế
    - is_deleted = True, deleted_at = now()
    - Trạm ẩn khỏi bản đồ và kết quả tra cứu của công dân
    - Mã QR vô hiệu hóa nhưng lịch sử quét mã và điểm thưởng được giữ nguyên
    - Tự động ghi nhận Nhật ký kiểm toán (Audit Log)
    """
    stmt = select(RecyclingFacility).where(
        and_(RecyclingFacility.facility_id == facility_id, RecyclingFacility.is_deleted == False)
    )
    res = await db.execute(stmt)
    fac = res.scalar_one_or_none()
    if not fac:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trạm không còn tồn tại")

    old_values = {
        "facility_code": fac.facility_code,
        "name": fac.name,
        "address": fac.address,
        "is_active": fac.is_active,
    }

    fac.is_deleted = True
    fac.is_active = False
    fac.deleted_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="DELETE_RECYCLING_FACILITY",
        table_name="recycling_facilities",
        record_id=str(fac.facility_id),
        old_values=old_values,
        new_values={"is_deleted": True, "deleted_at": fac.deleted_at.isoformat()},
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": "Đã xoá thành công. Danh sách đã được cập nhật",
        "facility_id": facility_id,
        "facility_code": fac.facility_code,
    }
