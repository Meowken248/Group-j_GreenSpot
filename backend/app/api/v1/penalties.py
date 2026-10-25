"""
FastAPI Router for Penalty Regulations (Chức năng 11: Tra cứu quy định xử phạt)
Cung cấp các API công khai phục vụ tra cứu văn bản pháp luật môi trường (Nghị định 45/2022/NĐ-CP)
"""

import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import User
from app.utils.security import decode_access_token
from app.api.v1.rbac import get_current_active_user
from app.services.penalty_service import PenaltyRegulationService
from app.schemas.penalty import (
    PenaltySearchParams,
    PenaltySearchResponse,
    PenaltyDetailResponse,
    QuickCategoryStat,
    TargetType,
    CreatePenaltyReportRequest,
    UpdatePenaltyReportStatusRequest,
    PenaltyReportItem,
    PenaltyReportListResponse,
    PenaltyReportStatsResponse,
)

router = APIRouter(prefix="/penalties", tags=["Tra cứu quy định xử phạt"])
penalty_service = PenaltyRegulationService()


async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Lấy thông tin người dùng nếu có Bearer token hợp lệ, nếu không trả về None (cho phép gửi ẩn danh)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    try:
        user_uuid = uuid.UUID(user_id_str)
        res = await db.execute(select(User).where(User.user_id == user_uuid))
        return res.scalar_one_or_none()
    except Exception:
        return None


async def require_officer_or_admin(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Yêu cầu người dùng có vai trò quản lý / cán bộ tiếp nhận phản ánh vi phạm"""
    allowed_roles = {"ADMIN", "DISTRICT_MANAGER", "RESPONDER", "OFFICER", "COORDINATOR"}
    if current_user.role and current_user.role.role_code in allowed_roles:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"error_code": "PERMISSION_DENIED", "message": "Bạn không có quyền truy cập trang quản lý phản ánh vi phạm"},
    )



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


@router.post(
    "/reports",
    response_model=PenaltyReportItem,
    status_code=status.HTTP_201_CREATED,
    summary="Tiếp nhận phản ánh vi phạm môi trường từ công dân",
)
async def submit_penalty_report(
    data: CreatePenaltyReportRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Tiếp nhận phản ánh vi phạm gửi từ Màn 3:
    - Nếu gửi bằng tài khoản (có Bearer Token và is_anonymous=False): lưu liên kết user
    - Nếu gửi ẩn danh hoặc khách vãng lai: lưu ẩn danh
    - Trả về mã hồ sơ INC-YYYYMMDD-XXXXX
    """
    reporter_id = current_user.user_id if current_user and not data.is_anonymous else None
    reporter_name = current_user.full_name if current_user and not data.is_anonymous else None

    return await penalty_service.create_penalty_report(
        db,
        data,
        reporter_id=reporter_id,
        reporter_name=reporter_name,
    )


@router.get(
    "/reports",
    response_model=PenaltyReportListResponse,
    summary="Danh sách phản ánh vi phạm môi trường (Dành cho Admin/Cán bộ)",
)
async def get_penalty_reports(
    status_filter: Optional[str] = Query(default=None, description="Lọc trạng thái: ALL, PENDING, VERIFIED, RESOLVED, REJECTED"),
    query: Optional[str] = Query(default=None, description="Tìm kiếm theo mã hồ sơ, hành vi, địa chỉ"),
    is_anonymous: Optional[bool] = Query(default=None, description="Lọc theo hình thức ẩn danh"),
    page: int = Query(default=1, ge=1, description="Số trang"),
    limit: int = Query(default=10, ge=1, le=50, description="Số kết quả mỗi trang"),
    current_officer: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy danh sách các phản ánh vi phạm môi trường do công dân gửi:
    - Phân trang, tìm kiếm từ khóa, lọc theo trạng thái
    - Chỉ cho phép Admin hoặc Cán bộ được phân quyền truy cập
    """
    return await penalty_service.get_penalty_reports(
        db,
        status_filter=status_filter,
        query=query,
        is_anonymous=is_anonymous,
        page=page,
        limit=limit,
    )


@router.get(
    "/reports/stats",
    response_model=PenaltyReportStatsResponse,
    summary="Thống kê số lượng phản ánh vi phạm môi trường (Dành cho Admin/Cán bộ)",
)
async def get_penalty_reports_stats(
    current_officer: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Thống kê tổng số phản ánh, số chờ xác minh, đã xác minh, đã xử lý, từ chối.
    """
    return await penalty_service.get_penalty_report_stats(db)


@router.patch(
    "/reports/{report_id}/status",
    response_model=PenaltyReportItem,
    summary="Cập nhật trạng thái xử lý phản ánh vi phạm (Dành cho Admin/Cán bộ)",
)
async def update_penalty_report_status(
    report_id: uuid.UUID,
    data: UpdatePenaltyReportStatusRequest,
    current_officer: User = Depends(require_officer_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Cập nhật trạng thái phản ánh (VERIFIED, RESOLVED, REJECTED) kèm ghi chú của cán bộ.
    """
    updated = await penalty_service.update_penalty_report_status(db, report_id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ phản ánh vi phạm.",
        )
    return updated


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
