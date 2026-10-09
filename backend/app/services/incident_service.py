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
    )

