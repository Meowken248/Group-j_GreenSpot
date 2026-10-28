"""
GreenSpot API Router - Waste Sorting Handbook (Chức năng 27)
Thư viện sống xanh: Cẩm nang phân loại rác:
- Màn 1: Trang cẩm nang phân loại rác (tìm kiếm đồ vật, 4 nhóm rác chính).
- Màn 2: Cẩm nang chi tiết một loại rác (hình ảnh, cách phân loại, màu thùng, lưu ý, tìm điểm thu gom).
- Màn 3: Danh sách các loại rác khớp từ khóa tìm kiếm.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.api.v1.rbac import require_admin_user
from app.services.waste_handbook_service import WasteHandbookService
from app.schemas.waste_handbook import (
    WasteHandbookOverviewResponse,
    WasteItemSummaryResponse,
    WasteItemDetailResponse,
    WasteItemCreateRequest,
    WasteItemUpdateRequest,
    WasteHandbookAdminListResponse,
)

router = APIRouter(prefix="/waste-handbook", tags=["Thư viện sống xanh: Cẩm nang phân loại rác (Chức năng 27)"])

@router.get("/overview", response_model=WasteHandbookOverviewResponse)
async def get_handbook_overview(
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 1] Tổng quan Thư viện sống xanh:
    - 4 nhóm rác tiêu chuẩn quốc gia: Hữu cơ, Tái chế, Nguy hại, Rác khác.
    - Danh sách các loại rác phổ biến trong đời sống hàng ngày.
    - Công khai, không yêu cầu đăng nhập.
    """
    return await WasteHandbookService.get_overview(db=db)


@router.get("/search", response_model=List[WasteItemSummaryResponse])
async def search_waste_items(
    q: Optional[str] = Query(None, description="Từ khóa tên loại rác hoặc đồ vật"),
    category: Optional[str] = Query(None, description="ORGANIC | RECYCLABLE | HAZARDOUS | OTHER"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 3] Tra cứu nhanh các loại rác khớp từ khóa:
    - Tìm kiếm theo tên chính xác hoặc tên gọi thay thế (vd: vỏ hộp sữa, chai coca, bóng tuýp).
    - Tải tối đa 20 kết quả/lần.
    """
    return await WasteHandbookService.search_items(
        db=db,
        query=q,
        category=category,
        limit=limit
    )


@router.get("/items/{item_id}", response_model=WasteItemDetailResponse)
async def get_waste_item_detail(
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    [Chức năng 27 - Màn 2] Cẩm nang chi tiết một loại rác:
    - Hình ảnh trực quan, cách sơ chế đúng quy chuẩn.
    - Màu thùng rác chuẩn và các lưu ý an toàn môi trường.
    - Lối tắt điều hướng sang Bản đồ mạng lưới thu gom & tái chế WebGIS.
    """
    return await WasteHandbookService.get_item_detail(db=db, item_id=item_id)


# ==========================================
# ADMIN ENDPOINTS: QUẢN LÝ TỪ ĐIỂN DANH MỤC RÁC
# ==========================================
@router.get("/admin/items", response_model=WasteHandbookAdminListResponse)
async def admin_get_waste_items(
    q: Optional[str] = Query(None, description="Tìm kiếm theo tên rác hoặc từ đồng nghĩa"),
    category: Optional[str] = Query(None, description="ORGANIC | RECYCLABLE | HAZARDOUS | OTHER"),
    is_active: Optional[bool] = Query(None, description="Trạng thái kích hoạt"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Lấy danh sách toàn bộ các loại rác trong từ điển cẩm nang (kể cả ẩn).
    """
    return await WasteHandbookService.admin_get_items(
        db=db,
        query=q,
        category=category,
        is_active=is_active,
        limit=limit,
        offset=offset
    )


@router.post("/admin/items", status_code=status.HTTP_201_CREATED)
async def admin_create_waste_item(
    payload: WasteItemCreateRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Thêm mới một loại rác vào cẩm nang phân loại.
    """
    item = await WasteHandbookService.admin_create_item(db=db, payload=payload, admin_id=current_admin.user_id)
    return {"message": "Đã thêm loại rác mới thành công", "item_id": item.item_id}


@router.put("/admin/items/{item_id}")
async def admin_update_waste_item(
    item_id: str,
    payload: WasteItemUpdateRequest,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Cập nhật thông tin, cách sơ chế hoặc hướng dẫn phân loại của đồ vật.
    """
    item = await WasteHandbookService.admin_update_item(db=db, item_id=item_id, payload=payload, admin_id=current_admin.user_id)
    return {"message": "Đã cập nhật loại rác thành công", "item_id": item.item_id}


@router.delete("/admin/items/{item_id}")
async def admin_delete_waste_item(
    item_id: str,
    current_admin: User = Depends(require_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    [Admin] Xóa một loại rác khỏi cẩm nang sống xanh.
    """
    await WasteHandbookService.admin_delete_item(db=db, item_id=item_id, admin_id=current_admin.user_id)
    return {"message": "Đã xóa loại rác thành công"}

