"""
API Router (Transport Layer) cho Admin System Activity Dashboard (STT 48).

Phân tầng : TẦNG 6 - Transport / Presentation Layer (FastAPI Router)
Vị trí    : BackEnd/app/api/v1/admin_dashboard/router.py

Quy tắc   :
  - KHÔNG viết query DB trực tiếp.
  - KHÔNG thực hiện tính toán nghiệp vụ phức tạp trong endpoint.
  - Chỉ tiếp nhận request, xác thực RBAC, gọi Service và trả về Response.
  - Tất cả response lỗi tuân thủ mã HTTP RESTful chuẩn.

Endpoints:
  GET  /api/v1/admin-dashboard/overview      - Màn 1/3: Dashboard tổng quan
  GET  /api/v1/admin-dashboard/daily-table   - Màn 2/3: Bảng chi tiết theo ngày
  POST /api/v1/admin-dashboard/export        - Màn 3/3: Xuất báo cáo Excel/PDF
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.admin_dashboard.dashboard_schema import (
    ActivityDashboardResponse,
    DailyReportResponse,
    ExportRequest,
)
from app.services.admin_dashboard.dashboard_service import AdminDashboardService

router = APIRouter(
    prefix="/admin-dashboard",
    tags=["Admin Dashboard - Thống kê hoạt động hệ thống (STT 48)"],
)

# Singleton service (DIP wired qua constructor default)
_service = AdminDashboardService()


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 1: Dashboard tổng quan (Màn 1/3)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/overview",
    response_model=ActivityDashboardResponse,
    summary="Màn 1/3: Lấy KPI cards + dữ liệu biểu đồ đường theo ngày",
    description=(
        "Trả về 3 thẻ KPI (người dùng mới, bài đăng mới, nhóm mới) kèm % tăng trưởng "
        "so với kỳ trước và chuỗi dữ liệu theo ngày cho Multi-line Trend Chart.\n\n"
        "**Bộ lọc nhanh:** `period_days=7` hoặc `period_days=30`.\n"
        "**Tùy chọn:** Truyền `start_date` & `end_date` để lọc tuỳ ý."
    ),
    status_code=status.HTTP_200_OK,
)
async def get_overview_dashboard(
    period_days: int = Query(
        default=30,
        ge=1,
        le=365,
        description="Số ngày gần nhất (7 hoặc 30). Bị bỏ qua nếu start_date/end_date được cung cấp.",
    ),
    start_date: Optional[date] = Query(
        default=None,
        description="Ngày bắt đầu tùy chọn (YYYY-MM-DD)",
    ),
    end_date: Optional[date] = Query(
        default=None,
        description="Ngày kết thúc tùy chọn (YYYY-MM-DD)",
    ),
    db: AsyncSession = Depends(get_db),
) -> ActivityDashboardResponse:
    """
    **GET /api/v1/admin-dashboard/overview**

    Validate: Nếu chỉ truyền 1 trong 2 (start_date/end_date) → HTTP 422.
    Validate: start_date > end_date → HTTP 400.
    """
    # Kiểm tra tính hợp lệ bộ lọc tuỳ chọn
    if (start_date is None) != (end_date is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phải cung cấp cả 'start_date' lẫn 'end_date' hoặc không truyền cả hai.",
        )
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoảng ngày không hợp lệ. 'start_date' phải trước hoặc bằng 'end_date'.",
        )

    try:
        return await _service.get_activity_dashboard(
            db=db,
            period_days=period_days,
            start_date=start_date,
            end_date=end_date,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể đồng bộ dữ liệu thống kê hoạt động. Vui lòng kiểm tra lại dịch vụ Analytics.",
        ) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 2: Bảng báo cáo chi tiết (Màn 2/3)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/daily-table",
    response_model=DailyReportResponse,
    summary="Màn 2/3: Bảng báo cáo chi tiết theo ngày với phân trang",
    description=(
        "Trả về bảng dữ liệu chi tiết: Ngày | Người dùng | Bài | Nhóm.\n"
        "Hỗ trợ phân trang (`page`, `page_size`) và hàng tổng cộng / trung bình.\n\n"
        "Validate: `from_date` phải <= `to_date`."
    ),
    status_code=status.HTTP_200_OK,
)
async def get_daily_table(
    from_date: date = Query(..., description="Ngày bắt đầu (YYYY-MM-DD)"),
    to_date: date = Query(..., description="Ngày kết thúc (YYYY-MM-DD)"),
    page: int = Query(default=1, ge=1, description="Số trang (bắt đầu từ 1)"),
    page_size: int = Query(default=30, ge=1, le=365, description="Số hàng mỗi trang"),
    db: AsyncSession = Depends(get_db),
) -> DailyReportResponse:
    """
    **GET /api/v1/admin-dashboard/daily-table**

    Validate: from_date > to_date → HTTP 400 + viền đỏ ô chọn ngày ở Frontend.
    Empty result: Trả về 200 với rows=[], message='Không có dữ liệu...' (không 404).
    """
    if from_date > to_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khoảng ngày không hợp lệ. 'Từ ngày' phải trước hoặc bằng 'Đến ngày'.",
        )

    try:
        return await _service.get_daily_report(
            db=db,
            from_date=from_date,
            to_date=to_date,
            page=page,
            page_size=page_size,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể tải dữ liệu bảng thống kê. Vui lòng kiểm tra lại dịch vụ Analytics.",
        ) from exc


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 3: Xuất báo cáo (Màn 3/3 – Modal Popup)
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/export",
    summary="Màn 3/3: Xuất báo cáo thống kê dạng Excel (.xlsx) hoặc PDF (.pdf)",
    description=(
        "Sinh tệp báo cáo và trả về stream tải xuống.\n\n"
        "**Body JSON:**\n"
        "- `from_date`: Ngày bắt đầu\n"
        "- `to_date`  : Ngày kết thúc\n"
        "- `format`   : `'xlsx'` (mặc định) hoặc `'pdf'`"
    ),
    status_code=status.HTTP_200_OK,
    response_class=Response,
)
async def export_report(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    **POST /api/v1/admin-dashboard/export**

    Trả về raw bytes với Content-Disposition: attachment.
    Nếu tạo file thất bại → HTTP 500 + message lỗi tiếng Việt.
    """
    try:
        file_bytes, filename, content_type = await _service.export_report(
            db=db, request=request
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể tạo tệp xuất dữ liệu do lỗi bộ nhớ tạm. Vui lòng thử lại. ({exc})",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể tạo tệp xuất dữ liệu. Vui lòng thử lại.",
        ) from exc

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Filename": filename,
        },
    )
