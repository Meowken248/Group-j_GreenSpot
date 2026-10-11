"""
FastAPI Router for Penalty Regulations (Chức năng 11: Tra cứu quy định xử phạt)
Cung cấp các API công khai phục vụ tra cứu văn bản pháp luật môi trường (Nghị định 45/2022/NĐ-CP)
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.penalty_service import PenaltyRegulationService
from app.schemas.penalty import (
    PenaltySearchParams,
    PenaltySearchResponse,
    PenaltyDetailResponse,
    QuickCategoryStat,
    TargetType,
)

router = APIRouter(prefix="/penalties", tags=["Tra cứu quy định xử phạt"])
penalty_service = PenaltyRegulationService()


@router.get(
    "/search",
    response_model=PenaltySearchResponse,
    summary="Tra cứu và lọc quy định xử phạt (Màn 1 & Màn 2)",
)
async def search_penalties(
    query: Optional[str] = Query(default=None, description="Từ khóa hành vi vi phạm"),
    domain: Optional[str] = Query(default=None, description="Lĩnh vực chuyên đề môi trường"),
    quick_category: Optional[str] = Query(default=None, description="Danh mục truy cập nhanh"),
    target: TargetType = Query(default="INDIVIDUAL", description="Đối tượng: INDIVIDUAL hoặc ORGANIZATION"),
    page: int = Query(default=1, ge=1, description="Số trang (bắt đầu từ 1)"),
    limit: int = Query(default=10, ge=1, le=50, description="Số kết quả mỗi trang (mặc định 10)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Tra cứu danh sách quy định xử phạt:
    - Tìm kiếm theo từ khóa (tiêu đề, mô tả, từ khóa mở rộng)
    - Lọc theo chuyên đề môi trường
    - Lọc theo danh mục nhanh (Xả rác, Đốt rác, Nước thải, Tiếng ồn)
    - Tự động nhân đôi khung tiền phạt nếu target là ORGANIZATION
    - Hỗ trợ phân trang 10 items/page
    """
    params = PenaltySearchParams(
        query=query,
        domain=domain,
        quick_category=quick_category,
        target=target,
        page=page,
        limit=limit,
    )
    return await penalty_service.search_regulations(db, params)


@router.get(
    "/categories",
    response_model=List[QuickCategoryStat],
    summary="Lấy danh mục phổ biến Màn 1 kèm số lượng điều khoản",
)
async def get_quick_categories(
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về 4 danh mục phổ biến nhất (Xả rác, Đốt rác, Nước thải, Tiếng ồn)
    kèm biểu tượng icon, mô tả và số lượng quy định thực tế.
    """
    return await penalty_service.get_quick_category_stats(db)


@router.get(
    "/domains",
    response_model=List[str],
    summary="Lấy danh sách các lĩnh vực chuyên đề có trong hệ thống",
)
async def get_domains(
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về danh sách các lĩnh vực phục vụ dropdown lọc ở Màn 2.
    """
    return await penalty_service.get_available_domains(db)


@router.get(
    "/domain-counts",
    response_model=Dict[str, int],
    summary="Lấy thống kê số lượng quy định theo từng lĩnh vực chuyên đề",
)
async def get_domain_counts(
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về số lượng quy định theo từng lĩnh vực để hiển thị badge trên giao diện bộ lọc Màn 2.
    """
    return await penalty_service.get_domain_counts(db)


@router.get(
    "/{penalty_id}",
    response_model=PenaltyDetailResponse,
    summary="Xem chi tiết điều luật & mức phạt (Màn 3)",
)
async def get_penalty_detail(
    penalty_id: uuid.UUID,
    target: TargetType = Query(default="INDIVIDUAL", description="Đối tượng: INDIVIDUAL hoặc ORGANIZATION"),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy thông tin chi tiết đầy đủ 3 khối của một điều khoản:
    - Khối 1: Hành vi vi phạm & tình tiết tăng nặng
    - Khối 2: Mức phạt tiền (min/max/avg) & biện pháp bổ sung
    - Khối 3: Căn cứ pháp lý, điều khoản, ngày hiệu lực, cảnh báo sửa đổi
    """
    detail = await penalty_service.get_regulation_detail(db, penalty_id, target=target)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy quy định xử phạt phù hợp.",
        )
    return detail
