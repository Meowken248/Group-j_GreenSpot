import math
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, or_, desc, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.rbac import User, Role, UserSession
from app.schemas.user_management import (
    RoleOptionItem,
    UserItemResponse,
    UserListResponse,
    CreateUserRequest,
    ChangeUserRoleRequest,
    ChangeUserStatusRequest,
    AdminResetPasswordRequest,
)
from app.api.v1.rbac import get_current_active_user, require_admin_user, SYSTEM_ORDER
from app.utils.security import hash_password

router = APIRouter(prefix="/users", tags=["Quản lý người dùng & Tài khoản"])


@router.get("/roles-options", response_model=List[RoleOptionItem])
async def get_roles_options(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách các vai trò khả dụng để hiển thị trong dropdown chọn vai trò:
    - 4 vai trò hệ thống đầu tiên theo đúng thứ tự chuẩn
    - Các vai trò tùy chỉnh theo thời điểm tạo cũ lên trước
    """
    stmt = select(Role)
    result = await db.execute(stmt)
    all_roles = result.scalars().all()

    system_roles = [r for r in all_roles if r.is_system]
    custom_roles = [r for r in all_roles if not r.is_system]

    system_roles.sort(key=lambda r: SYSTEM_ORDER.get(r.role_code, 99))
    custom_roles.sort(key=lambda r: (r.created_at or datetime.min, r.role_id))

    sorted_roles = system_roles + custom_roles

    return [
        RoleOptionItem(
            role_id=r.role_id,
            role_code=r.role_code,
            role_name=r.role_name,
            is_system=r.is_system,
            scope=r.scope or "DISTRICT",
            scope_display="Toàn thành phố" if r.scope == "CITY" else "Quận",
        )
        for r in sorted_roles
    ]


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Số trang (bắt đầu từ 1)"),
    limit: int = Query(10, ge=1, le=100, description="Số bản ghi mỗi trang"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tên, email, sđt"),
    role_id: Optional[int] = Query(None, description="Lọc theo vai trò"),
    status_filter: Optional[str] = Query(None, alias="status", description="Lọc theo trạng thái (ACTIVE/BLOCKED)"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách người dùng kèm bộ lọc, tìm kiếm, phân trang và thống kê số liệu.
    """
    # 1. Base query
    query = select(User).options(selectinload(User.role))

    # 2. Bộ lọc tìm kiếm
    if search:
        search_clean = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.full_name).like(search_clean),
                func.lower(User.email).like(search_clean),
                func.lower(User.phone_number).like(search_clean),
            )
        )

    # 3. Lọc theo vai trò
    if role_id is not None:
        query = query.where(User.role_id == role_id)

    # 4. Lọc theo trạng thái
    if status_filter:
        query = query.where(User.status == status_filter.strip().upper())

    # Đếm tổng số bản ghi thỏa điều kiện
    count_query = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_query)
    total = count_res.scalar() or 0

    # 5. Phân trang và sắp xếp: người mới tạo lên trước
    offset = (page - 1) * limit
    paged_query = query.order_by(desc(User.created_at)).offset(offset).limit(limit)
    users_res = await db.execute(paged_query)
    users = users_res.scalars().all()

    # 6. Lấy last_active_at từ phiên đăng nhập mới nhất của từng user
    user_ids = [u.user_id for u in users]
    last_active_map = {}
    if user_ids:
        sess_stmt = (
            select(UserSession.user_id, func.max(UserSession.last_active_at))
            .where(UserSession.user_id.in_(user_ids))
            .group_by(UserSession.user_id)
        )
        sess_res = await db.execute(sess_stmt)
        for u_id, last_act in sess_res.fetchall():
            last_active_map[u_id] = last_act

    # 7. Format danh sách
    user_items: List[UserItemResponse] = []
    for u in users:
        role_obj = u.role
        user_items.append(
            UserItemResponse(
                user_id=str(u.user_id),
                email=u.email,
                phone_number=u.phone_number,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                role_id=u.role_id,
                role_code=role_obj.role_code if role_obj else "UNKNOWN",
                role_name=role_obj.role_name if role_obj else "Chưa gán vai trò",
                role_is_system=role_obj.is_system if role_obj else False,
                role_scope=role_obj.scope if role_obj else "DISTRICT",
                role_scope_display="Toàn thành phố" if (role_obj and role_obj.scope == "CITY") else "Quận",
                status=u.status or "ACTIVE",
                reputation_score=u.reputation_score or 100,
                created_at=u.created_at,
                last_active_at=last_active_map.get(u.user_id),
            )
        )

    # 8. Thống kê tổng quan
    stats_query = select(
        func.count(User.user_id).label("total_all"),
        func.count(User.user_id).filter(User.status == "ACTIVE").label("total_active"),
        func.count(User.user_id).filter(User.status == "BLOCKED").label("total_blocked"),
    )
    stats_res = await db.execute(stats_query)
    s_row = stats_res.fetchone()

    total_pages = math.ceil(total / limit) if limit > 0 else 1

    return UserListResponse(
        users=user_items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        stats={
            "total_users": s_row[0] if s_row else 0,
            "active_users": s_row[1] if s_row else 0,
            "blocked_users": s_row[2] if s_row else 0,
            "total_all": s_row[0] if s_row else 0,
            "total_active": s_row[1] if s_row else 0,
            "total_blocked": s_row[2] if s_row else 0,
        },
    )


@router.post("", response_model=UserItemResponse)
async def create_user_by_admin(
    payload: CreateUserRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin khởi tạo tài khoản người dùng mới cho bất kỳ vai trò nào trong hệ thống:
    - Kiểm tra vai trò tồn tại (404 ROLE_NOT_FOUND)
    - Kiểm tra email chưa tồn tại (400 EMAIL_EXISTS)
    - Kiểm tra số điện thoại chưa tồn tại nếu có (400 PHONE_EXISTS)
    - Mật khẩu được mã hóa an toàn bằng PBKDF2-HMAC-SHA256
    - Tài khoản ở trạng thái ACTIVE ngay lập tức để người dùng có thể đăng nhập làm việc
    """
    # 1. Kiểm tra vai trò
    role_res = await db.execute(select(Role).where(Role.role_id == payload.role_id))
    role_obj = role_res.scalar_one_or_none()
    if not role_obj:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "ROLE_NOT_FOUND", "message": "Vai trò được chọn không tồn tại"},
        )

    # 2. Kiểm tra trùng Email
    clean_email = payload.email.strip().lower()
    email_check = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    if email_check.scalar_one_or_none():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "EMAIL_EXISTS", "message": "Địa chỉ Email này đã được sử dụng"},
        )

    # 3. Kiểm tra trùng Số điện thoại
    if payload.phone_number:
        clean_phone = payload.phone_number.strip()
        phone_check = await db.execute(select(User).where(User.phone_number == clean_phone))
        if phone_check.scalar_one_or_none():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error_code": "PHONE_EXISTS", "message": "Số điện thoại này đã được sử dụng"},
            )
    else:
        clean_phone = None

    # 4. Mã hóa mật khẩu và tạo người dùng
    new_user_id = uuid.uuid4()
    pwd_hash = hash_password(payload.password)

    new_user = User(
        user_id=new_user_id,
        email=clean_email,
        phone_number=clean_phone,
        password_hash=pwd_hash,
        full_name=payload.full_name,
        role_id=payload.role_id,
        status=payload.status,
        reputation_score=100,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserItemResponse(
        user_id=str(new_user.user_id),
        email=new_user.email,
        phone_number=new_user.phone_number,
        full_name=new_user.full_name,
        avatar_url=new_user.avatar_url,
        role_id=role_obj.role_id,
        role_code=role_obj.role_code,
        role_name=role_obj.role_name,
        role_is_system=role_obj.is_system,
        role_scope=role_obj.scope or "DISTRICT",
        role_scope_display="Toàn thành phố" if role_obj.scope == "CITY" else "Quận",
        status=new_user.status,
        reputation_score=new_user.reputation_score,
        created_at=new_user.created_at,
        last_active_at=None,
    )


@router.put("/{user_id}/role", response_model=UserItemResponse)
async def change_user_role(
    user_id: str,
    payload: ChangeUserRoleRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin thay đổi vai trò của người dùng:
    - Chặn Admin tự tước quyền của chính mình (400 CANNOT_DEMOTE_SELF)
    - Cập nhật vai trò mới và thu hồi phiên cũ để quyền hạn có hiệu lực ngay
    """
    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_UUID", "message": "ID người dùng không hợp lệ"},
        )

    # 1. Tìm người dùng
    u_res = await db.execute(select(User).options(selectinload(User.role)).where(User.user_id == target_uuid))
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"},
        )

    # 2. Tìm vai trò mới
    r_res = await db.execute(select(Role).where(Role.role_id == payload.role_id))
    new_role = r_res.scalar_one_or_none()
    if not new_role:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "ROLE_NOT_FOUND", "message": "Vai trò mới không tồn tại"},
        )

    # 3. Chặn Admin tự hạ quyền của chính mình
    if target_user.user_id == current_admin.user_id and new_role.role_code != "ADMIN":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "CANNOT_DEMOTE_SELF",
                "message": "Bạn không thể tự tước quyền Quản trị viên của chính mình",
            },
        )

    # 4. Cập nhật vai trò
    target_user.role_id = new_role.role_id

    # Thu hồi các phiên hiện tại để buộc làm mới quyền
    now = datetime.now(timezone.utc)
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == target_uuid, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.commit()
    await db.refresh(target_user)

    return UserItemResponse(
        user_id=str(target_user.user_id),
        email=target_user.email,
        phone_number=target_user.phone_number,
        full_name=target_user.full_name,
        avatar_url=target_user.avatar_url,
        role_id=new_role.role_id,
        role_code=new_role.role_code,
        role_name=new_role.role_name,
        role_is_system=new_role.is_system,
        role_scope=new_role.scope or "DISTRICT",
        role_scope_display="Toàn thành phố" if new_role.scope == "CITY" else "Quận",
        status=target_user.status,
        reputation_score=target_user.reputation_score,
        created_at=target_user.created_at,
        last_active_at=None,
    )


@router.put("/{user_id}/status", response_model=UserItemResponse)
async def change_user_status(
    user_id: str,
    payload: ChangeUserStatusRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin Khóa (BLOCKED) hoặc Mở khóa (ACTIVE) tài khoản người dùng:
    - Chặn Admin tự khóa tài khoản của chính mình (400 CANNOT_BLOCK_SELF)
    - Nếu khóa tài khoản: Thu hồi toàn bộ phiên đăng nhập ngay lập tức
    """
    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_UUID", "message": "ID người dùng không hợp lệ"},
        )

    u_res = await db.execute(select(User).options(selectinload(User.role)).where(User.user_id == target_uuid))
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"},
        )

    # Chặn Admin tự khóa mình
    if target_user.user_id == current_admin.user_id and payload.status == "BLOCKED":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "CANNOT_BLOCK_SELF",
                "message": "Bạn không thể tự khóa tài khoản của chính mình",
            },
        )

    target_user.status = payload.status

    # Nếu khóa -> thu hồi tất cả phiên ngay lập tức
    if payload.status == "BLOCKED":
        now = datetime.now(timezone.utc)
        await db.execute(
            update(UserSession)
            .where(UserSession.user_id == target_uuid, UserSession.revoked_at.is_(None))
            .values(revoked_at=now)
        )

    await db.commit()
    await db.refresh(target_user)

    role_obj = target_user.role
    return UserItemResponse(
        user_id=str(target_user.user_id),
        email=target_user.email,
        phone_number=target_user.phone_number,
        full_name=target_user.full_name,
        avatar_url=target_user.avatar_url,
        role_id=target_user.role_id,
        role_code=role_obj.role_code if role_obj else "UNKNOWN",
        role_name=role_obj.role_name if role_obj else "Chưa gán",
        role_is_system=role_obj.is_system if role_obj else False,
        role_scope=role_obj.scope if role_obj else "DISTRICT",
        role_scope_display="Toàn thành phố" if (role_obj and role_obj.scope == "CITY") else "Quận",
        status=target_user.status,
        reputation_score=target_user.reputation_score,
        created_at=target_user.created_at,
        last_active_at=None,
    )


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    payload: AdminResetPasswordRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin đặt lại mật khẩu mới cho người dùng:
    - Mã hóa mật khẩu mới và thu hồi tất cả phiên đăng nhập cũ
    """
    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_UUID", "message": "ID người dùng không hợp lệ"},
        )

    u_res = await db.execute(select(User).where(User.user_id == target_uuid))
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"},
        )

    target_user.password_hash = hash_password(payload.new_password)

    # Thu hồi phiên cũ
    now = datetime.now(timezone.utc)
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == target_uuid, UserSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    await db.commit()

    return {"success": True, "message": f"Đã đặt lại mật khẩu thành công cho người dùng {target_user.full_name}"}


@router.delete("/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin xóa người dùng khỏi hệ thống:
    - Chặn Admin tự xóa chính mình (400 CANNOT_DELETE_SELF)
    """
    try:
        target_uuid = uuid.UUID(user_id)
    except ValueError:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_UUID", "message": "ID người dùng không hợp lệ"},
        )

    u_res = await db.execute(select(User).where(User.user_id == target_uuid))
    target_user = u_res.scalar_one_or_none()
    if not target_user:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "USER_NOT_FOUND", "message": "Người dùng không tồn tại"},
        )

    if target_user.user_id == current_admin.user_id:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "CANNOT_DELETE_SELF",
                "message": "Bạn không thể tự xóa tài khoản của chính mình",
            },
        )

    await db.delete(target_user)
    await db.commit()

    return {"success": True, "message": f"Đã xoá tài khoản {target_user.email} thành công"}
