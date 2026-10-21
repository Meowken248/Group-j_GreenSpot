import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.incident import WasteCategory, Incident
from app.models.audit_log import AuditLog
from app.models.rbac import User
from app.schemas.waste_category import (
    WasteCategoryItem,
    WasteCategoryListResponse,
    WasteCategoryCreateRequest,
    WasteCategoryUpdateRequest,
    ValidationCheckResponse,
)


async def list_categories(
    db: AsyncSession,
    page: int = 1,
    limit: int = 10,
    status_filter: str = "ALL",
    search: Optional[str] = None,
) -> WasteCategoryListResponse:
    """
    Lấy danh sách danh mục rác thải phục vụ trang quản trị Admin (Màn 1)
    - Phân trang 10 danh mục / trang
    - Sắp xếp mới nhất lên đầu (created_at DESC)
    - Lọc theo trạng thái và tìm kiếm
    - Đếm số phản ánh đang mở (chưa xử lý) cho mỗi loại rác
    """
    page = max(1, page)
    limit = max(1, min(100, limit))

    # Base filter: Chưa bị xóa mềm
    base_conditions = [WasteCategory.is_deleted == False]

    # Bộ lọc trạng thái: ALL, ACTIVE, INACTIVE
    filter_upper = status_filter.strip().upper()
    if filter_upper == "ACTIVE":
        base_conditions.append(WasteCategory.is_active == True)
    elif filter_upper == "INACTIVE":
        base_conditions.append(WasteCategory.is_active == False)

    # Ô tìm kiếm theo mã hoặc tên
    if search and search.strip():
        kw = f"%{search.strip()}%"
        base_conditions.append(
            or_(
                WasteCategory.category_code.ilike(kw),
                WasteCategory.name.ilike(kw),
            )
        )

    # Đếm tổng số bản ghi thỏa điều kiện
    count_stmt = select(func.count(WasteCategory.category_id)).where(and_(*base_conditions))
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Đếm số lượng active và inactive tổng thể (không phân trang, không tính search)
    active_stmt = select(func.count(WasteCategory.category_id)).where(
        and_(WasteCategory.is_deleted == False, WasteCategory.is_active == True)
    )
    inactive_stmt = select(func.count(WasteCategory.category_id)).where(
        and_(WasteCategory.is_deleted == False, WasteCategory.is_active == False)
    )
    active_res = await db.execute(active_stmt)
    inactive_res = await db.execute(inactive_stmt)
    active_count = active_res.scalar() or 0
    inactive_count = inactive_res.scalar() or 0

    # Lấy danh sách phân trang
    offset = (page - 1) * limit
    list_stmt = (
        select(WasteCategory)
        .where(and_(*base_conditions))
        .order_by(desc(WasteCategory.created_at))
        .offset(offset)
        .limit(limit)
    )
    records_res = await db.execute(list_stmt)
    categories = records_res.scalars().all()

    # Tính toán số lượng phản ánh chưa xử lý cho từng danh mục
    category_ids = [c.category_id for c in categories]
    unresolved_map: Dict[int, int] = {}
    if category_ids:
        unresolved_stmt = (
            select(Incident.category_id, func.count(Incident.incident_id))
            .where(
                and_(
                    Incident.category_id.in_(category_ids),
                    Incident.status.in_(["PENDING", "IN_PROGRESS"]),
                )
            )
            .group_by(Incident.category_id)
        )
        unresolved_res = await db.execute(unresolved_stmt)
        for cat_id, cnt in unresolved_res.all():
            unresolved_map[cat_id] = cnt

    items = []
    for cat in categories:
        items.append(
            WasteCategoryItem(
                category_id=cat.category_id,
                category_code=cat.category_code,
                name=cat.name,
                description=cat.description,
                default_severity=cat.default_severity,
                sla_hours=cat.sla_hours,
                sla_warning_hours=cat.sla_warning_hours,
                color_hex=cat.color_hex or "#22C55E",
                icon_name=cat.icon_name or "trash-2",
                is_active=cat.is_active,
                unresolved_incidents_count=unresolved_map.get(cat.category_id, 0),
                created_at=cat.created_at,
                updated_at=cat.updated_at,
            )
        )

    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

    return WasteCategoryListResponse(
        items=items,
        total=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages,
        active_count=active_count,
        inactive_count=inactive_count,
    )


async def get_category_by_id(db: AsyncSession, category_id: int) -> WasteCategoryItem:
    """Lấy chi tiết 1 danh mục để hiển thị lên form chỉnh sửa (Màn 3)"""
    stmt = select(WasteCategory).where(
        and_(WasteCategory.category_id == category_id, WasteCategory.is_deleted == False)
    )
    res = await db.execute(stmt)
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không còn tồn tại",
        )

    # Đếm số phản ánh chưa xử lý
    unresolved_stmt = select(func.count(Incident.incident_id)).where(
        and_(
            Incident.category_id == category_id,
            Incident.status.in_(["PENDING", "IN_PROGRESS"]),
        )
    )
    unresolved_res = await db.execute(unresolved_stmt)
    unresolved_cnt = unresolved_res.scalar() or 0

    return WasteCategoryItem(
        category_id=cat.category_id,
        category_code=cat.category_code,
        name=cat.name,
        description=cat.description,
        default_severity=cat.default_severity,
        sla_hours=cat.sla_hours,
        sla_warning_hours=cat.sla_warning_hours,
        color_hex=cat.color_hex or "#22C55E",
        icon_name=cat.icon_name or "trash-2",
        is_active=cat.is_active,
        unresolved_incidents_count=unresolved_cnt,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


async def create_category(
    db: AsyncSession,
    user: User,
    req: WasteCategoryCreateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> WasteCategoryItem:
    """
    Tạo danh mục rác thải mới (Màn 2)
    - Kiểm tra tính duy nhất của mã và tên
    - Mặc định trạng thái Đang áp dụng
    - Tự động ghi nhận vào Nhật ký kiểm toán (Audit Log)
    """
    code_clean = req.category_code.strip().upper()
    name_clean = req.name.strip()

    # Kiểm tra mã đã tồn tại
    check_code = await db.execute(
        select(WasteCategory).where(
            and_(WasteCategory.category_code == code_clean, WasteCategory.is_deleted == False)
        )
    )
    if check_code.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã danh mục đã tồn tại",
        )

    # Kiểm tra tên loại rác đã tồn tại
    check_name = await db.execute(
        select(WasteCategory).where(
            and_(WasteCategory.name == name_clean, WasteCategory.is_deleted == False)
        )
    )
    if check_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên loại rác đã tồn tại",
        )

    new_cat = WasteCategory(
        category_code=code_clean,
        name=name_clean,
        description=req.description.strip() if req.description else None,
        default_severity=req.default_severity,
        sla_hours=req.sla_hours,
        sla_warning_hours=req.sla_warning_hours,
        color_hex=req.color_hex or "#22C55E",
        icon_name=req.icon_name or "trash-2",
        is_active=True,
        is_deleted=False,
    )
    db.add(new_cat)
    await db.flush()

    # Ghi nhận Audit Log
    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="CREATE_CATEGORY",
        table_name="waste_categories",
        record_id=str(new_cat.category_id),
        old_values=None,
        new_values={
            "category_code": new_cat.category_code,
            "name": new_cat.name,
            "default_severity": new_cat.default_severity,
            "sla_hours": new_cat.sla_hours,
            "sla_warning_hours": new_cat.sla_warning_hours,
            "is_active": new_cat.is_active,
        },
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_cat)

    return WasteCategoryItem(
        category_id=new_cat.category_id,
        category_code=new_cat.category_code,
        name=new_cat.name,
        description=new_cat.description,
        default_severity=new_cat.default_severity,
        sla_hours=new_cat.sla_hours,
        sla_warning_hours=new_cat.sla_warning_hours,
        color_hex=new_cat.color_hex,
        icon_name=new_cat.icon_name,
        is_active=new_cat.is_active,
        unresolved_incidents_count=0,
        created_at=new_cat.created_at,
        updated_at=new_cat.updated_at,
    )


async def update_category(
    db: AsyncSession,
    user: User,
    category_id: int,
    req: WasteCategoryUpdateRequest,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> WasteCategoryItem:
    """
    Cập nhật danh mục rác thải (Màn 3)
    - Mã danh mục là chỉ đọc, không thay đổi
    - Kiểm tra tên loại rác không trùng với các danh mục khác
    - Tự động ghi nhận Audit Log
    """
    stmt = select(WasteCategory).where(
        and_(WasteCategory.category_id == category_id, WasteCategory.is_deleted == False)
    )
    res = await db.execute(stmt)
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không còn tồn tại",
        )

    name_clean = req.name.strip()
    # Kiểm tra tên có trùng với danh mục khác không
    check_name = await db.execute(
        select(WasteCategory).where(
            and_(
                WasteCategory.name == name_clean,
                WasteCategory.category_id != category_id,
                WasteCategory.is_deleted == False,
            )
        )
    )
    if check_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên loại rác đã tồn tại",
        )

    # Lưu lại giá trị cũ cho Audit Log
    old_values = {
        "name": cat.name,
        "description": cat.description,
        "default_severity": cat.default_severity,
        "sla_hours": cat.sla_hours,
        "sla_warning_hours": cat.sla_warning_hours,
        "is_active": cat.is_active,
    }

    # Cập nhật giá trị mới
    cat.name = name_clean
    cat.description = req.description.strip() if req.description else None
    cat.default_severity = req.default_severity
    cat.sla_hours = req.sla_hours
    cat.sla_warning_hours = req.sla_warning_hours
    cat.is_active = req.is_active
    if req.color_hex:
        cat.color_hex = req.color_hex
    if req.icon_name:
        cat.icon_name = req.icon_name

    new_values = {
        "name": cat.name,
        "description": cat.description,
        "default_severity": cat.default_severity,
        "sla_hours": cat.sla_hours,
        "sla_warning_hours": cat.sla_warning_hours,
        "is_active": cat.is_active,
    }

    # Ghi nhận Audit Log
    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="UPDATE_CATEGORY",
        table_name="waste_categories",
        record_id=str(cat.category_id),
        old_values=old_values,
        new_values=new_values,
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(cat)

    # Đếm số phản ánh chưa xử lý
    unresolved_stmt = select(func.count(Incident.incident_id)).where(
        and_(
            Incident.category_id == category_id,
            Incident.status.in_(["PENDING", "IN_PROGRESS"]),
        )
    )
    unresolved_res = await db.execute(unresolved_stmt)
    unresolved_cnt = unresolved_res.scalar() or 0

    return WasteCategoryItem(
        category_id=cat.category_id,
        category_code=cat.category_code,
        name=cat.name,
        description=cat.description,
        default_severity=cat.default_severity,
        sla_hours=cat.sla_hours,
        sla_warning_hours=cat.sla_warning_hours,
        color_hex=cat.color_hex,
        icon_name=cat.icon_name,
        is_active=cat.is_active,
        unresolved_incidents_count=unresolved_cnt,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


async def delete_category(
    db: AsyncSession,
    user: User,
    category_id: int,
    client_ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Xóa mềm danh mục rác thải (Màn 4 & 5)
    - Gắn is_deleted = True, is_active = False, deleted_at = NOW()
    - Không xóa cứng trong DB để bảo toàn dữ liệu phản ánh cũ
    - Ghi nhận Audit Log kèm người thực hiện và thời điểm
    """
    stmt = select(WasteCategory).where(
        and_(WasteCategory.category_id == category_id, WasteCategory.is_deleted == False)
    )
    res = await db.execute(stmt)
    cat = res.scalar_one_or_none()
    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không còn tồn tại",
        )

    # Kiểm tra số phản ánh chưa xử lý
    unresolved_stmt = select(func.count(Incident.incident_id)).where(
        and_(
            Incident.category_id == category_id,
            Incident.status.in_(["PENDING", "IN_PROGRESS"]),
        )
    )
    unresolved_res = await db.execute(unresolved_stmt)
    unresolved_cnt = unresolved_res.scalar() or 0

    old_values = {
        "category_code": cat.category_code,
        "name": cat.name,
        "unresolved_incidents_at_delete": unresolved_cnt,
    }

    # Xóa mềm
    cat.is_deleted = True
    cat.is_active = False
    cat.deleted_at = datetime.now(timezone.utc)

    audit = AuditLog(
        user_id=user.user_id,
        user_email=user.email,
        action="DELETE_CATEGORY",
        table_name="waste_categories",
        record_id=str(cat.category_id),
        old_values=old_values,
        new_values={"is_deleted": True, "deleted_at": cat.deleted_at.isoformat()},
        ip_address=client_ip,
        user_agent=user_agent,
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": "Đã xoá thành công. Danh sách đã được cập nhật",
        "category_id": category_id,
        "category_code": cat.category_code,
        "unresolved_incidents_count": unresolved_cnt,
    }


async def check_code_unique(db: AsyncSession, code: str) -> ValidationCheckResponse:
    """Kiểm tra mã danh mục có bị trùng không"""
    code_raw = (code or "").strip()
    if not code_raw:
        return ValidationCheckResponse(is_valid=False, message="Vui lòng nhập mã danh mục")
    import re
    if len(code_raw) > 20 or not re.match(r"^[A-Z0-9_]+$", code_raw):
        return ValidationCheckResponse(is_valid=False, message="Mã chỉ gồm chữ hoa, số, dấu gạch dưới (tối đa 20 ký tự)")

    code_clean = code_raw.upper()
    stmt = select(WasteCategory.category_id).where(
        and_(WasteCategory.category_code == code_clean, WasteCategory.is_deleted == False)
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return ValidationCheckResponse(is_valid=False, message="Mã danh mục đã tồn tại")
    return ValidationCheckResponse(is_valid=True)


async def check_name_unique(
    db: AsyncSession, name: str, exclude_id: Optional[int] = None
) -> ValidationCheckResponse:
    """Kiểm tra tên loại rác có bị trùng không"""
    name_clean = name.strip()
    if not name_clean:
        return ValidationCheckResponse(is_valid=False, message="Vui lòng nhập tên loại rác")
    if len(name_clean) > 100:
        return ValidationCheckResponse(is_valid=False, message="Tên tối đa 100 ký tự")

    conditions = [WasteCategory.name == name_clean, WasteCategory.is_deleted == False]
    if exclude_id:
        conditions.append(WasteCategory.category_id != exclude_id)

    stmt = select(WasteCategory.category_id).where(and_(*conditions))
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return ValidationCheckResponse(is_valid=False, message="Tên loại rác đã tồn tại")
    return ValidationCheckResponse(is_valid=True)
