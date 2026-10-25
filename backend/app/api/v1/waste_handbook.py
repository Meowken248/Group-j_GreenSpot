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
from app.services.waste_handbook_service import WasteHandbookService
from app.schemas.waste_handbook import (
    WasteHandbookOverviewResponse,
    WasteItemSummaryResponse,
    WasteItemDetailResponse,
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
