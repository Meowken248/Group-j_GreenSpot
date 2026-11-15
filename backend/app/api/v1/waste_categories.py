from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.schemas.waste_category import (
    WasteCategoryItem,
    WasteCategoryListResponse,
    WasteCategoryCreateRequest,
    WasteCategoryUpdateRequest,
    ValidationCheckResponse,
)
from app.services.waste_category_service import (
    list_categories,
    get_category_by_id,
    create_category,
    update_category,
    delete_category,
    check_code_unique,
    check_name_unique,
)

router = APIRouter(prefix="/waste-categories", tags=["Waste Categories & SLA Configuration"])


@router.get("", response_model=WasteCategoryListResponse)
async def get_waste_categories(
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    limit: int = Query(10, ge=1, le=100, description="Số lượng mục trên mỗi trang"),
    status: str = Query("ALL", description="Lọc trạng thái: ALL, ACTIVE, INACTIVE"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã hoặc tên loại rác"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 1: Lấy danh sách danh mục rác thải đô thị và cấu hình quy chuẩn SLA xử lý.
    Chỉ Quản trị viên (Admin) mới có quyền truy cập.
    """
    return await list_categories(
        db=db,
        page=page,
        limit=limit,
        status_filter=status,
        search=search,
    )


@router.get("/validate/check-code", response_model=ValidationCheckResponse)
async def validate_category_code(
    code: str = Query(..., description="Mã danh mục cần kiểm tra"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kiểm tra mã danh mục có hợp lệ và duy nhất không (Realtime check)"""
    return await check_code_unique(db=db, code=code)


@router.get("/validate/check-name", response_model=ValidationCheckResponse)
async def validate_category_name(
    name: str = Query(..., description="Tên loại rác cần kiểm tra"),
    exclude_id: Optional[int] = Query(None, description="ID danh mục hiện tại cần loại trừ khi sửa"),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Kiểm tra tên loại rác có hợp lệ và duy nhất không (Realtime check)"""
    return await check_name_unique(db=db, name=name, exclude_id=exclude_id)


@router.get("/{category_id}", response_model=WasteCategoryItem)
async def get_category_detail(
    category_id: int,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Lấy chi tiết danh mục rác thải để điền sẵn vào form Sửa.
    """
    return await get_category_by_id(db=db, category_id=category_id)


@router.post("", response_model=WasteCategoryItem, status_code=status.HTTP_201_CREATED)
async def create_new_category(
    req: WasteCategoryCreateRequest,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 2: Thêm mới một danh mục rác thải đô thị cùng cấu hình quy chuẩn SLA.
    Tự động ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await create_category(
        db=db,
        user=current_admin,
        req=req,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.put("/{category_id}", response_model=WasteCategoryItem)
async def update_existing_category(
    category_id: int,
    req: WasteCategoryUpdateRequest,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 3: Cập nhật thông tin và cấu hình SLA của danh mục rác thải.
    Mã danh mục là chỉ đọc, không được sửa.
    Tự động ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await update_category(
        db=db,
        user=current_admin,
        category_id=category_id,
        req=req,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.delete("/{category_id}")
async def delete_existing_category(
    category_id: int,
    request: Request,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Màn 4 & 5: Xóa mềm danh mục rác thải.
    Bảo toàn dữ liệu của các phản ánh cũ.
    Tự động ghi nhận vào Nhật ký kiểm toán (Audit Log).
    """
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return await delete_category(
        db=db,
        user=current_admin,
        category_id=category_id,
        client_ip=client_ip,
        user_agent=user_agent,
    )
