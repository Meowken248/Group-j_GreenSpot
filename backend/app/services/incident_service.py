import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_

from app.models.incident import WasteCategory, Incident, IncidentMedia
from app.models.spatial import AdministrativeUnit
from app.models.rbac import User
from app.models.profile import UserActivity
from app.schemas.incident import (
    IncidentCreateRequest,
    IncidentCreateResponse,
    WasteCategoryResponse,
    DuplicateIncidentItem,
    DuplicateCheckResponse,
    IncidentDetailResponse,
    IncidentMediaItem,
    IncidentListItem,
    IncidentManagementSummaryStats,
    IncidentListResponse,
)

# Múi giờ Việt Nam (UTC+7)
VN_TZ = timezone(timedelta(hours=7))

# 22 Quận / Huyện chính thức của Thành phố Hồ Chí Minh
HCMC_22_DISTRICTS = [
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8",
    "Quận 10", "Quận 11", "Quận 12", "Quận Bình Thạnh", "Quận Bình Tân",
    "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú",
    "TP. Thủ Đức", "Thành phố Thủ Đức",
    "Huyện Bình Chánh", "Huyện Cần Giờ", "Huyện Củ Chi", "Huyện Hóc Môn", "Huyện Nhà Bè"
]

# Giới hạn bounding box địa lý của TP.HCM (kinh vĩ độ chuẩn)
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


async def get_active_waste_categories(db: AsyncSession) -> List[WasteCategoryResponse]:
    """Lấy danh sách các loại sự cố môi trường đang hoạt động kèm thời hạn SLA"""
    stmt = select(WasteCategory).where(WasteCategory.is_active == True).order_by(WasteCategory.category_id.asc())
    result = await db.execute(stmt)
    categories = result.scalars().all()
    return [WasteCategoryResponse.model_validate(c) for c in categories]


async def find_matching_administrative_unit(
    db: AsyncSession, lat: float, lng: float
) -> Tuple[Optional[int], Optional[str]]:
    """
    Sử dụng PostGIS ST_Contains để tìm quận/huyện tương ứng với toạ độ GPS.
    Nếu không có polygon trùng khớp, gán về đơn vị TP.HCM (unit_id=1).
    """
    query = """
        SELECT unit_id, name
        FROM administrative_units
        WHERE boundary IS NOT NULL 
          AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        LIMIT 1;
    """
    try:
        res = await db.execute(text(query), {"lat": lat, "lng": lng})
        row = res.fetchone()
        if row:
            return row[0], row[1]
    except Exception as e:
        print(f"[Warning] PostGIS ST_Contains query error: {e}")

    # Fallback về đơn vị thành phố (unit_id = 1 nếu tồn tại)
    res_city = await db.execute(
        select(AdministrativeUnit.unit_id, AdministrativeUnit.name).where(AdministrativeUnit.unit_code == "79")
    )
    city_row = res_city.fetchone()
    if city_row:
        return city_row[0], city_row[1]
    return None, "Thành phố Hồ Chí Minh"


async def check_duplicate_incidents(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_meters: float = 100.0,
    category_id: Optional[int] = None,
) -> DuplicateCheckResponse:
    """
    Kiểm tra xem có phản ánh nào tương tự gần vị trí này (bán kính radius_meters) đang được xử lý không.
    Dùng PostGIS ST_DWithin và ST_DistanceSphere.
    """
    query = """
        WITH current_pt AS (
            SELECT ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geom
        )
        SELECT 
            i.incident_id::text,
            i.tracking_code,
            i.title,
            c.name as category_name,
            i.address_text,
            i.latitude::float,
            i.longitude::float,
            ST_DistanceSphere(i.location, pt.geom)::float as distance_m,
            i.created_at,
            i.status
        FROM incidents i
        JOIN waste_categories c ON c.category_id = i.category_id
        CROSS JOIN current_pt pt
        WHERE ST_DWithin(i.location::geography, pt.geom::geography, :radius_m)
          AND i.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
          AND (:cat_id IS NULL OR i.category_id = :cat_id)
        ORDER BY distance_m ASC
        LIMIT 5;
    """
    duplicates: List[DuplicateIncidentItem] = []
    try:
        res = await db.execute(
            text(query),
            {"lat": lat, "lng": lng, "radius_m": radius_meters, "cat_id": category_id},
        )
        for r in res.fetchall():
            duplicates.append(
                DuplicateIncidentItem(
                    incident_id=r[0],
                    tracking_code=r[1],
                    title=r[2],
                    category_name=r[3],
                    address_text=r[4],
                    latitude=r[5],
                    longitude=r[6],
                    distance_meters=round(r[7], 1),
                    created_at=r[8],
                    status=r[9],
                )
            )
    except Exception as e:
        print(f"[Warning] PostGIS duplicate query error: {e}")

    return DuplicateCheckResponse(
        has_duplicate=len(duplicates) > 0,
        duplicate_count=len(duplicates),
        duplicates=duplicates,
    )


async def check_user_anti_spam(
    db: AsyncSession, user_id: uuid.UUID, max_per_hour: int = 5
) -> bool:
    """
    Chống spam: Kiểm tra xem người dùng có gửi quá số lượng báo cáo cho phép trong 1 giờ không.
    Trả về True nếu hợp lệ, False nếu gửi quá nhiều.
    """
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    stmt = select(func.count(Incident.incident_id)).where(
        Incident.reporter_id == user_id,
        Incident.created_at >= one_hour_ago,
    )
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return count < max_per_hour


async def generate_next_tracking_code(db: AsyncSession) -> str:
    """
    Sinh mã sự cố dạng #INC-0001 (hoặc theo ngày: #INC-20261007-0001) duy nhất trong DB.
    """
    today_str = datetime.now(VN_TZ).strftime("%Y%m%d")
    # Đếm số lượng sự cố hiện tại trong hệ thống
    res = await db.execute(select(func.count(Incident.incident_id)))
    total_count = (res.scalar() or 0) + 1
    return f"#INC-{total_count:04d}"


async def create_new_incident(
    db: AsyncSession,
    data: IncidentCreateRequest,
    current_user_id: Optional[uuid.UUID] = None,
) -> IncidentCreateResponse:
    """
    Tạo sự cố mới với 100% dữ liệu thực:
    - Bắt điểm GPS & đối chiếu 22 quận/huyện
    - Tính thời hạn SLA theo WasteCategory
    - Sinh mã #INC duy nhất
    - Gán cơ quan quản lý (AdministrativeUnit)
    - Lưu bằng chứng ảnh/video (IncidentMedia)
    - Tích điểm Công dân Xanh (+20 GreenPoints) & ghi log UserActivity
    """
    # 1. Kiểm tra toạ độ nằm trong phạm vi 22 quận/huyện TP.HCM
    if not is_within_hcmc_bounds(data.latitude, data.longitude):
        raise ValueError("Vị trí nằm ngoài phạm vi tiếp nhận của hệ thống (22 quận/huyện TP.HCM).")

    # 2. Chống spam nếu có người dùng đăng nhập
    if current_user_id:
        is_allowed = await check_user_anti_spam(db, current_user_id, max_per_hour=5)
        if not is_allowed:
            raise PermissionError("Bạn gửi phản ánh quá nhiều. Vui lòng thử lại sau.")

    # 3. Lấy thông tin danh mục sự cố để tính SLA
    cat_stmt = select(WasteCategory).where(WasteCategory.category_id == data.category_id)
    cat_res = await db.execute(cat_stmt)
    category = cat_res.scalar_one_or_none()
    if not category:
        raise ValueError("Loại sự cố không hợp lệ.")

    # 4. Tính toán thời hạn xử lý SLA (giờ máy chủ UTC+7)
    sla_hours = category.sla_hours or 24
    now_utc = datetime.now(timezone.utc)
    sla_deadline = now_utc + timedelta(hours=sla_hours)

    # 5. Sinh mã theo dõi duy nhất
    tracking_code = await generate_next_tracking_code(db)

    # 6. Định tuyến đơn vị hành chính qua PostGIS
    unit_id, unit_name = await find_matching_administrative_unit(db, data.latitude, data.longitude)

    # 7. Tạo bản ghi Incident
    new_incident = Incident(
        incident_id=uuid.uuid4(),
        tracking_code=tracking_code,
        reporter_id=current_user_id if not data.is_anonymous else None,
        category_id=category.category_id,
        unit_id=unit_id,
        title=data.title.strip(),
        description=data.description.strip(),
        address_text=data.address_text.strip(),
        latitude=data.latitude,
        longitude=data.longitude,
        location=f"SRID=4326;POINT({data.longitude} {data.latitude})",
        severity=data.severity,
        status="PENDING",
        is_anonymous=data.is_anonymous,
        reporter_phone_masked=(
            f"***{data.reporter_phone[-4:]}" if data.reporter_phone and len(data.reporter_phone) >= 4 else None
        ),
        sla_deadline=sla_deadline,
    )
    db.add(new_incident)
    await db.flush()

    # 8. Gắn danh sách tệp đính kèm (Media)
    for m in data.media:
        media_item = IncidentMedia(
            media_id=uuid.uuid4(),
            incident_id=new_incident.incident_id,
            media_type=m.media_type,
            file_url=m.file_url,
            thumbnail_url=m.thumbnail_url or m.file_url,
            file_size_bytes=m.file_size_bytes,
            mime_type=m.mime_type,
            uploader_id=current_user_id,
            phase="BEFORE",
        )
        db.add(media_item)

    # 9. Cộng điểm thưởng Green Points (+20 điểm) và ghi nhật ký hoạt động
    points_awarded = 20
    if current_user_id:
        user_stmt = select(User).where(User.user_id == current_user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        if user:
            user.total_green_points = (user.total_green_points or 0) + points_awarded
            # Tạo hoạt động
            activity = UserActivity(
                activity_id=uuid.uuid4(),
                user_id=user.user_id,
                activity_type="REPORT_INCIDENT",
                title=f"Phản ánh sự cố: {new_incident.title}",
                description=f"Gửi phản ánh thành công mã {tracking_code} tại {new_incident.address_text}",
                points=points_awarded,
            )
            db.add(activity)

    await db.commit()
    await db.refresh(new_incident)

    return IncidentCreateResponse(
        incident_id=str(new_incident.incident_id),
        tracking_code=new_incident.tracking_code,
        title=new_incident.title,
        category_name=category.name,
        category_code=category.category_code,
        sla_hours=sla_hours,
        sla_deadline=new_incident.sla_deadline,
        status=new_incident.status,
        address_text=new_incident.address_text,
        latitude=float(new_incident.latitude),
        longitude=float(new_incident.longitude),
        unit_name=unit_name,
        green_points_awarded=points_awarded,
        created_at=new_incident.created_at,
        message=f"Gửi phản ánh thành công. Mã sự cố của bạn là {tracking_code}",
    )


async def get_incident_detail(
    db: AsyncSession, incident_id: uuid.UUID
) -> Optional[IncidentDetailResponse]:
    """Lấy chi tiết sự cố theo ID"""
    stmt = (
        select(Incident)
        .where(Incident.incident_id == incident_id)
    )
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        return None

    # Load category
    cat_stmt = select(WasteCategory).where(WasteCategory.category_id == inc.category_id)
    cat_res = await db.execute(cat_stmt)
    cat = cat_res.scalar_one_or_none()

    # Load media
    media_stmt = select(IncidentMedia).where(IncidentMedia.incident_id == inc.incident_id)
    media_res = await db.execute(media_stmt)
    media_list = media_res.scalars().all()

    # Unit name
    unit_name = None
    if inc.unit_id:
        unit_stmt = select(AdministrativeUnit.name).where(AdministrativeUnit.unit_id == inc.unit_id)
        unit_res = await db.execute(unit_stmt)
        unit_name = unit_res.scalar()

    return IncidentDetailResponse(
        incident_id=str(inc.incident_id),
        tracking_code=inc.tracking_code,
        title=inc.title,
        description=inc.description,
        severity=inc.severity,
        status=inc.status,
        address_text=inc.address_text,
        latitude=float(inc.latitude),
        longitude=float(inc.longitude),
        category=WasteCategoryResponse.model_validate(cat) if cat else WasteCategoryResponse(
            category_id=0, category_code="UNKNOWN", name="Không xác định", sla_hours=24, color_hex="#64748B", icon_name="help-circle", is_active=True
        ),
        unit_id=inc.unit_id,
        unit_name=unit_name,
        sla_deadline=inc.sla_deadline,
        sla_hours=cat.sla_hours if cat else 24,
        created_at=inc.created_at,
        media=[
            IncidentMediaItem(
                file_url=m.file_url,
                thumbnail_url=m.thumbnail_url,
                media_type=m.media_type,
                file_size_bytes=m.file_size_bytes,
                mime_type=m.mime_type,
            )
            for m in media_list
        ],
        upvotes_count=inc.upvotes_count,
        is_anonymous=inc.is_anonymous,
        reporter_phone_masked=inc.reporter_phone_masked,
    )


async def list_incidents_for_management(
    db: AsyncSession,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    unit_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> IncidentListResponse:
    """
    Dành cho Quản trị viên (ADMIN) & Cán bộ (DISTRICT_MANAGER):
    Tra cứu danh sách sự cố với bộ lọc đa năng (Độ khẩn cấp, Trạng thái kiểm chứng/xử lý, Quận huyện)
    và tổng hợp số liệu KPI thời gian thực.
    """
    now_utc = datetime.now(timezone.utc)

    # 1. Thống kê KPI tổng thể
    # Đếm theo các tiêu chí quản trị
    all_res = await db.execute(select(Incident.status, Incident.severity, Incident.sla_deadline))
    all_rows = all_res.fetchall()

    stats = IncidentManagementSummaryStats(
        total=len(all_rows),
        unverified=sum(1 for r in all_rows if r[0] == "PENDING"),
        in_progress=sum(1 for r in all_rows if r[0] == "IN_PROGRESS"),
        resolved=sum(1 for r in all_rows if r[0] == "RESOLVED"),
        rejected=sum(1 for r in all_rows if r[0] == "REJECTED"),
        critical=sum(1 for r in all_rows if r[1] in ["CRITICAL", "EMERGENCY", "HIGH"]),
        sla_warning=sum(
            1 for r in all_rows
            if r[0] in ["PENDING", "IN_PROGRESS"] and r[2] and (r[2] <= now_utc or r[2] <= now_utc + timedelta(hours=6))
        ),
    )

    # 2. Xây dựng câu truy vấn có điều kiện lọc
    query = (
        select(Incident, WasteCategory.name, AdministrativeUnit.name, User.full_name)
        .join(WasteCategory, WasteCategory.category_id == Incident.category_id, isouter=True)
        .join(AdministrativeUnit, AdministrativeUnit.unit_id == Incident.unit_id, isouter=True)
        .join(User, User.user_id == Incident.reporter_id, isouter=True)
    )

    conditions = []
    if severity and severity != "ALL":
        if severity == "CRITICAL":
            conditions.append(Incident.severity.in_(["CRITICAL", "EMERGENCY"]))
        else:
            conditions.append(Incident.severity == severity)

    if status and status != "ALL":
        conditions.append(Incident.status == status)

    if unit_id and unit_id > 0:
        conditions.append(Incident.unit_id == unit_id)

    if search and search.strip():
        kw = f"%{search.strip().lower()}%"
        conditions.append(
            (Incident.tracking_code.ilike(kw)) |
            (Incident.title.ilike(kw)) |
            (Incident.address_text.ilike(kw))
        )

    if conditions:
        query = query.where(and_(*conditions))

    # Đếm tổng kết quả thỏa điều kiện
    count_stmt = select(func.count(Incident.incident_id))
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    total_count_res = await db.execute(count_stmt)
    total_count = total_count_res.scalar() or 0

    # Phân trang & sắp xếp: Ưu tiên mới nhất & Khẩn cấp lên đầu
    offset = max(0, (page - 1) * limit)
    query = query.order_by(Incident.created_at.desc()).offset(offset).limit(limit)

    results = await db.execute(query)
    rows = results.fetchall()

    # Thu thập media cho các incidents này
    incident_ids = [r[0].incident_id for r in rows]
    media_map: Dict[uuid.UUID, List[IncidentMediaItem]] = {}
    if incident_ids:
        m_stmt = select(IncidentMedia).where(IncidentMedia.incident_id.in_(incident_ids))
        m_res = await db.execute(m_stmt)
        for m in m_res.scalars().all():
            media_map.setdefault(m.incident_id, []).append(
                IncidentMediaItem(
                    file_url=m.file_url,
                    thumbnail_url=m.thumbnail_url or m.file_url,
                    media_type=m.media_type,
                    file_size_bytes=m.file_size_bytes,
                    mime_type=m.mime_type,
                )
            )

    items: List[IncidentListItem] = []
    for inc, cat_name, unit_name, reporter_name in rows:
        m_items = media_map.get(inc.incident_id, [])
        first_thumb = m_items[0].thumbnail_url if m_items else None
        is_overdue = bool(inc.sla_deadline and now_utc > inc.sla_deadline and inc.status in ["PENDING", "IN_PROGRESS"])

        items.append(
            IncidentListItem(
                incident_id=str(inc.incident_id),
                tracking_code=inc.tracking_code,
                title=inc.title,
                description=inc.description,
                severity=inc.severity,
                status=inc.status,
                address_text=inc.address_text,
                latitude=float(inc.latitude),
                longitude=float(inc.longitude),
                category_id=inc.category_id,
                category_name=cat_name or "Chưa phân loại",
                unit_id=inc.unit_id,
                unit_name=unit_name or "Thành phố Hồ Chí Minh",
                is_anonymous=inc.is_anonymous,
                reporter_name=reporter_name if not inc.is_anonymous else "Công dân ẩn danh",
                reporter_phone_masked=inc.reporter_phone_masked,
                sla_deadline=inc.sla_deadline,
                is_sla_overdue=is_overdue,
                created_at=inc.created_at,
                thumbnail_url=first_thumb,
                media=m_items,
            )
        )

    return IncidentListResponse(
        items=items,
        total=total_count,
        page=page,
        limit=limit,
        stats=stats,
    )


async def verify_incident_by_admin(
    db: AsyncSession,
    incident_id: uuid.UUID,
    action: str,
    note: Optional[str] = None,
    admin_id: Optional[uuid.UUID] = None,
) -> IncidentDetailResponse:
    """
    Admin xác thực phản ánh:
    - action == 'VERIFY': Xác nhận thông tin chính xác, chuyển sang IN_PROGRESS (Đã kiểm chứng / Đang xử lý)
    - action == 'REJECT': Báo cáo sai lệch, không có rác, chuyển sang REJECTED (Từ chối)
    """
    stmt = select(Incident).where(Incident.incident_id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        raise ValueError("Không tìm thấy sự cố phản ánh.")

    if action == "VERIFY":
        inc.status = "IN_PROGRESS"
    elif action == "REJECT":
        inc.status = "REJECTED"
    else:
        raise ValueError("Hành động kiểm chứng không hợp lệ.")

    # Ghi nhận hoạt động nếu có ghi chú
    if note and admin_id:
        activity = UserActivity(
            activity_id=uuid.uuid4(),
            user_id=admin_id,
            activity_type="VERIFY_INCIDENT",
            title=f"Kiểm chứng sự cố: {inc.tracking_code}",
            description=f"Hành động: {action}. Ghi chú: {note}",
            points=0,
        )
        db.add(activity)

    await db.commit()
    await db.refresh(inc)

    return await get_incident_detail(db, incident_id)


async def update_incident_status_by_admin(
    db: AsyncSession,
    incident_id: uuid.UUID,
    new_status: str,
    note: Optional[str] = None,
    admin_id: Optional[uuid.UUID] = None,
) -> IncidentDetailResponse:
    """Cập nhật trạng thái xử lý của sự cố: PENDING, IN_PROGRESS, RESOLVED, CLOSED, REJECTED"""
    stmt = select(Incident).where(Incident.incident_id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        raise ValueError("Không tìm thấy sự cố phản ánh.")

    inc.status = new_status
    now_utc = datetime.now(timezone.utc)
    if new_status == "RESOLVED":
        inc.resolved_at = now_utc
    elif new_status == "CLOSED":
        inc.closed_at = now_utc

    if note and admin_id:
        activity = UserActivity(
            activity_id=uuid.uuid4(),
            user_id=admin_id,
            activity_type="UPDATE_INCIDENT_STATUS",
            title=f"Cập nhật trạng thái sự cố {inc.tracking_code}: {new_status}",
            description=note,
            points=0,
        )
        db.add(activity)

    await db.commit()
    await db.refresh(inc)

    return await get_incident_detail(db, incident_id)

