import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import JSONResponse
from sqlalchemy import select, func, text, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.rbac import User, Role, Permission, RolePermission, UserSession
from app.schemas.rbac import (
    RoleItemResponse,
    RoleListResponse,
    CreateRoleRequest,
    UpdateRolePermissionsRequest,
    UpdateRolePermissionsResponse,
    ReassignAndDeleteRoleRequest,
    ModulePermissionInfo,
    PermissionMatrixResponse,
)
from app.utils.security import decode_access_token

router = APIRouter(prefix="/rbac", tags=["Role-Based Access Control (RBAC)"])

# 15 Modules chuẩn theo đặc tả hệ thống
MODULE_DEFINITIONS: List[dict] = [
    {"code": "GIS_MAP", "name": "Bản đồ số WebGIS", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "INCIDENTS", "name": "Báo cáo sự cố môi trường", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "GREEN_SPOTS", "name": "Điểm xanh & Công viên sinh thái", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "RECYCLING_FACILITIES", "name": "Trạm thu gom & Điểm tái chế", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "IOT_SENSORS", "name": "Trạm quan trắc IoT & Cảm biến", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "FLOOD_WARNINGS", "name": "Cảnh báo ngập lụt & Triều cường", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "AIR_QUALITY", "name": "Chỉ số chất lượng không khí AQI", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "WEATHER", "name": "Khí tượng & Dự báo thời tiết", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "DISPATCH_TASKS", "name": "Phân công & Điều phối hiện trường", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "CITIZEN_FEEDBACK", "name": "Phản ánh & Đóng góp ý kiến", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "CAMPAIGNS", "name": "Chiến dịch môi trường & Điểm xanh", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "USER_MANAGEMENT", "name": "Quản lý người dùng & Tài khoản", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "ROLE", "name": "Phân quyền vai trò", "actions": ["VIEW", "CREATE", "UPDATE", "DELETE"]},
    {"code": "STATISTICS", "name": "Thống kê & Báo cáo tổng hợp", "actions": ["VIEW"]},
    {"code": "AUDIT_LOG", "name": "Nhật ký kiểm toán hệ thống", "actions": ["VIEW"]},
]

SYSTEM_ORDER = {"ADMIN": 1, "DISTRICT_MANAGER": 2, "RESPONDER": 3, "CITIZEN": 4}


async def require_admin_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency xác thực:
    - Bắt buộc có Access Token hợp lệ
    - Phiên đăng nhập chưa bị thu hồi
    - Tài khoản phải là ACTIVE
    - Người dùng phải có quyền Admin (role_code == 'ADMIN')
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_MISSING", "message": "Vui lòng đăng nhập lại"},
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_EXPIRED", "message": "Vui lòng đăng nhập lại"},
        )

    user_id_str = payload.get("sub")
    session_id_str = payload.get("session_id")
    if not user_id_str or not session_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_INVALID", "message": "Vui lòng đăng nhập lại"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
        session_uuid = uuid.UUID(session_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "TOKEN_INVALID", "message": "Vui lòng đăng nhập lại"},
        )

    # Kiểm tra phiên
    s_res = await db.execute(select(UserSession).where(UserSession.session_id == session_uuid))
    user_session = s_res.scalar_one_or_none()
    if not user_session or user_session.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "SESSION_INVALID", "message": "Vui lòng đăng nhập lại"},
        )

    # Kiểm tra user và role
    u_res = await db.execute(
        select(User).options(selectinload(User.role)).where(User.user_id == user_uuid)
    )
    user = u_res.scalar_one_or_none()
    if not user or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "SESSION_INVALID", "message": "Vui lòng đăng nhập lại"},
        )

    if not user.role or user.role.role_code != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền truy cập trang này"},
        )

    return user


@router.get("/roles", response_model=RoleListResponse)
async def get_all_roles(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 1: Danh sách vai trò:
    - 4 vai trò hệ thống theo thứ tự: Admin, District Manager, Responder, Citizen
    - Sau đó là các vai trò tuỳ chỉnh theo thời điểm tạo (cũ lên trước)
    - Đếm số lượng người dùng cho từng vai trò
    - Trả về cờ can_create (False nếu đã đủ 20 vai trò)
    """
    # Query tất cả roles kèm user count
    stmt = (
        select(Role, func.count(User.user_id).label("user_count"))
        .outerjoin(User, User.role_id == Role.role_id)
        .group_by(Role.role_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Phân loại và sắp xếp
    system_roles = []
    custom_roles = []

    for role_obj, user_count in rows:
        item = RoleItemResponse(
            role_id=role_obj.role_id,
            role_code=role_obj.role_code,
            role_name=role_obj.role_name,
            description=role_obj.description,
            is_system=role_obj.is_system,
            scope=role_obj.scope or "DISTRICT",
            scope_display="Toàn thành phố" if role_obj.scope == "CITY" else "Quận",
            version=role_obj.version or 1,
            user_count=user_count,
            created_at=role_obj.created_at,
        )
        if role_obj.is_system:
            system_roles.append(item)
        else:
            custom_roles.append(item)

    # Sắp xếp 4 vai trò hệ thống theo đúng thứ tự: Admin -> District Manager -> Responder -> Citizen
    system_roles.sort(key=lambda r: SYSTEM_ORDER.get(r.role_code, 99))

    # Sắp xếp các vai trò tùy chỉnh theo thời điểm tạo cũ lên trước (created_at ASC)
    custom_roles.sort(key=lambda r: (r.created_at or datetime.min, r.role_id))

    all_roles = system_roles + custom_roles
    total = len(all_roles)

    return RoleListResponse(
        roles=all_roles,
        total=total,
        can_create=(total < 20),
    )


@router.post("/roles", response_model=RoleItemResponse)
async def create_custom_role(
    payload: CreateRoleRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2: Thêm vai trò mới:
    - Chặn khi đã đủ 20 vai trò (400 MAX_ROLES_REACHED)
    - Chặn trùng tên vai trò không phân biệt hoa/thường, chuẩn hóa cách thừa (400 ROLE_EXISTS)
    - Tạo vai trò với ma trận quyền ban đầu hoàn toàn trống
    - Chuyển tiếp sang Màn 3 để gán quyền
    """
    # 1. Kiểm tra giới hạn 20 vai trò
    count_res = await db.execute(select(func.count(Role.role_id)))
    total_roles = count_res.scalar() or 0
    if total_roles >= 20:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "MAX_ROLES_REACHED",
                "message": "Đã đạt tối đa 20 vai trò. Vui lòng xoá bớt vai trò không dùng",
            },
        )

    # 2. Kiểm tra trùng tên (không phân biệt chữ hoa, chữ thường, dấu cách thừa)
    clean_name = payload.role_name
    dup_res = await db.execute(
        select(Role).where(func.lower(func.trim(Role.role_name)) == func.lower(clean_name))
    )
    if dup_res.scalar_one_or_none():
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ROLE_EXISTS",
                "message": "Tên vai trò đã tồn tại",
            },
        )

    # 3. Tạo mã role_code ngẫu nhiên duy nhất cho vai trò tùy chỉnh
    custom_code = f"ROLE_{uuid.uuid4().hex[:8].upper()}"

    new_role = Role(
        role_code=custom_code,
        role_name=clean_name,
        description=payload.description,
        is_system=False,
        scope=payload.scope,
        version=1,
    )
    db.add(new_role)
    await db.commit()
    await db.refresh(new_role)

    return RoleItemResponse(
        role_id=new_role.role_id,
        role_code=new_role.role_code,
        role_name=new_role.role_name,
        description=new_role.description,
        is_system=new_role.is_system,
        scope=new_role.scope,
        scope_display="Toàn thành phố" if new_role.scope == "CITY" else "Quận",
        version=new_role.version,
        user_count=0,
        created_at=new_role.created_at,
    )


@router.get("/matrix", response_model=PermissionMatrixResponse)
async def get_permission_matrix(
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Ma trận phân quyền động:
    - 15 hàng chức năng theo đúng thứ tự
    - Cột vai trò theo thứ tự chuẩn
    - Quyền hạn đã lưu của từng vai trò
    """
    # 1. Danh sách roles đã sắp xếp
    stmt = (
        select(Role, func.count(User.user_id).label("user_count"))
        .outerjoin(User, User.role_id == Role.role_id)
        .group_by(Role.role_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    system_roles = []
    custom_roles = []
    for role_obj, user_count in rows:
        item = RoleItemResponse(
            role_id=role_obj.role_id,
            role_code=role_obj.role_code,
            role_name=role_obj.role_name,
            description=role_obj.description,
            is_system=role_obj.is_system,
            scope=role_obj.scope or "DISTRICT",
            scope_display="Toàn thành phố" if role_obj.scope == "CITY" else "Quận",
            version=role_obj.version or 1,
            user_count=user_count,
            created_at=role_obj.created_at,
        )
        if role_obj.is_system:
            system_roles.append(item)
        else:
            custom_roles.append(item)

    system_roles.sort(key=lambda r: SYSTEM_ORDER.get(r.role_code, 99))
    custom_roles.sort(key=lambda r: (r.created_at or datetime.min, r.role_id))
    all_roles = system_roles + custom_roles

    # 2. Lấy role_permissions mapping
    rp_res = await db.execute(
        select(RolePermission.role_id, Permission.permission_code).join(
            Permission, RolePermission.permission_id == Permission.permission_id
        )
    )
    role_perms_map: dict[str, List[str]] = {str(r.role_id): [] for r in all_roles}
    for r_id, p_code in rp_res.fetchall():
        key = str(r_id)
        if key in role_perms_map:
            role_perms_map[key].append(p_code)

    modules_info = [
        ModulePermissionInfo(code=m["code"], name=m["name"], actions=m["actions"])
        for m in MODULE_DEFINITIONS
    ]

    return PermissionMatrixResponse(
        modules=modules_info,
        roles=all_roles,
        role_permissions=role_perms_map,
    )


@router.put("/roles/{role_id}/permissions", response_model=UpdateRolePermissionsResponse)
async def update_role_permissions(
    role_id: int,
    payload: UpdateRolePermissionsRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Lưu thay đổi ma trận quyền:
    - Kiểm tra vai trò tồn tại (404 ROLE_NOT_FOUND)
    - Cấm sửa quyền Admin (403 ADMIN_IMMUTABLE)
    - Kiểm tra version OCC locking (409 VERSION_MISMATCH)
    - Ràng buộc: Thêm/Sửa/Xoá yêu cầu phải có quyền Xem
    - Bỏ qua các ô không áp dụng (STATISTICS/AUDIT_LOG chỉ nhận VIEW, ROLE chỉ áp dụng cho ADMIN)
    - Tăng version thêm 1 và có hiệu lực ngay
    """
    # 1. Tìm vai trò
    role_res = await db.execute(select(Role).where(Role.role_id == role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "ROLE_NOT_FOUND",
                "message": "Vai trò này không còn tồn tại",
            },
        )

    # 2. Admin là bất khả xâm phạm
    if role.role_code == "ADMIN":
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error_code": "ADMIN_IMMUTABLE",
                "message": "Admin luôn có đầy đủ quyền, không thể chỉnh sửa",
            },
        )

    # 3. Kiểm tra Optimistic Concurrency Control
    if payload.version != role.version:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error_code": "VERSION_MISMATCH",
                "message": "Ma trận quyền đã được người khác thay đổi. Vui lòng tải lại",
            },
        )

    # 4. Lấy tất cả permission_ids từ database
    perms_res = await db.execute(select(Permission))
    perm_dict = {p.permission_code: p.permission_id for p in perms_res.scalars()}

    # 5. Áp dụng quy tắc ràng buộc giữa các ô (Interlocking Rules)
    requested_perms = set(payload.permissions)

    # Tự động thêm VIEW nếu có CREATE, UPDATE, DELETE cho cùng module
    for p_code in list(requested_perms):
        if ":" in p_code:
            mod, act = p_code.split(":")
            if act in ["CREATE", "UPDATE", "DELETE"]:
                view_code = f"{mod}:VIEW"
                if view_code in perm_dict:
                    requested_perms.add(view_code)

    # Loại bỏ các ô không áp dụng:
    # - Hàng ROLE chỉ dành riêng cho Admin
    # - Module STATISTICS và AUDIT_LOG chỉ có VIEW
    valid_perm_ids = []
    for p_code in requested_perms:
        if ":" not in p_code:
            continue
        mod, act = p_code.split(":")
        if mod == "ROLE":
            # Không gán quyền quản trị role cho vai trò khác admin
            continue
        if mod in ["STATISTICS", "AUDIT_LOG"] and act != "VIEW":
            continue
        if p_code in perm_dict:
            valid_perm_ids.append(perm_dict[p_code])

    # 6. Cập nhật role_permissions
    await db.execute(delete(RolePermission).where(RolePermission.role_id == role_id))

    for p_id in valid_perm_ids:
        db.add(RolePermission(role_id=role_id, permission_id=p_id))

    # 7. Tăng version OCC
    role.version = (role.version or 1) + 1
    await db.commit()

    return UpdateRolePermissionsResponse(
        success=True,
        message="Đã lưu ma trận quyền",
        role_id=role_id,
        new_version=role.version,
    )


@router.delete("/roles/{role_id}")
async def delete_custom_role(
    role_id: int,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 4: Xóa vai trò tùy chỉnh:
    - Cấm xóa vai trò hệ thống (403 SYSTEM_ROLE_CANNOT_DELETE)
    - Nếu vai trò đang có người dùng (user_count > 0) -> yêu cầu chuyển giao trước (400 ROLE_HAS_USERS)
    """
    role_res = await db.execute(select(Role).where(Role.role_id == role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "ROLE_NOT_FOUND", "message": "Vai trò này không còn tồn tại"},
        )

    if role.is_system:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error_code": "SYSTEM_ROLE_CANNOT_DELETE", "message": "Không thể xoá vai trò hệ thống"},
        )

    # Đếm số người dùng đang gán
    count_res = await db.execute(select(func.count(User.user_id)).where(User.role_id == role_id))
    user_count = count_res.scalar() or 0

    if user_count > 0:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "ROLE_HAS_USERS",
                "message": f"Vai trò đang có {user_count} người dùng, vui lòng chuyển giao người dùng trước khi xoá",
                "user_count": user_count,
            },
        )

    # Xóa vai trò
    await db.delete(role)
    await db.commit()

    return {"success": True, "message": "Đã xoá vai trò thành công"}


@router.post("/roles/{role_id}/reassign-and-delete")
async def reassign_and_delete_role(
    role_id: int,
    payload: ReassignAndDeleteRoleRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 5: Chuyển giao toàn bộ người dùng sang vai trò mới rồi xóa vai trò cũ
    """
    # 1. Vai trò cũ
    role_res = await db.execute(select(Role).where(Role.role_id == role_id))
    role = role_res.scalar_one_or_none()
    if not role:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "ROLE_NOT_FOUND", "message": "Vai trò này không còn tồn tại"},
        )

    if role.is_system:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error_code": "SYSTEM_ROLE_CANNOT_DELETE", "message": "Không thể xoá vai trò hệ thống"},
        )

    # 2. Vai trò mới
    target_res = await db.execute(select(Role).where(Role.role_id == payload.target_role_id))
    target_role = target_res.scalar_one_or_none()
    if not target_role:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "TARGET_ROLE_NOT_FOUND", "message": "Vai trò tiếp nhận không tồn tại"},
        )

    if target_role.role_id == role_id:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_TARGET_ROLE", "message": "Vai trò tiếp nhận không thể trùng với vai trò cần xoá"},
        )

    # 3. Chuyển giao người dùng
    await db.execute(
        text("UPDATE users SET role_id = :target_id WHERE role_id = :old_id"),
        {"target_id": payload.target_role_id, "old_id": role_id},
    )

    # 4. Xóa vai trò cũ
    await db.delete(role)
    await db.commit()

    return {
        "success": True,
        "message": f"Đã chuyển toàn bộ người dùng sang vai trò '{target_role.role_name}' và xoá vai trò thành công",
    }
