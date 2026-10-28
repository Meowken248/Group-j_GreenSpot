import io
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.public_report import (
    OpenDataIncidentRecord,
    PublicReportSummary,
)
from app.services.public_reports_service import PublicReportsService

router = APIRouter(prefix="/reports", tags=["Chức năng 36: Trung tâm Dữ liệu Mở & Báo cáo Môi trường Công khai"])


@router.get("/public-summary", response_model=PublicReportSummary, summary="Tổng hợp số liệu hiện trạng môi trường công khai định kỳ")
async def get_public_report_summary(
    period_type: str = Query("MONTH", description="Loại kỳ: MONTH, QUARTER, YEAR"),
    year: int = Query(2026, ge=2020, le=2030),
    month: int = Query(10, ge=1, le=12),
    district: Optional[str] = Query("ALL", description="Lọc theo Quận/Huyện"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cung cấp các thẻ chỉ số trực quan: Tổng số điểm phản ánh, tỷ lệ đã xử lý dọn sạch,
    số bản tin cảnh báo khẩn cấp, phân bố loại ô nhiễm phục vụ nhân dân giám sát minh bạch.
    """
    return await PublicReportsService.get_public_summary(
        db, period_type=period_type, year=year, month=month, district_name=district
    )


@router.get("/open-data", response_model=List[OpenDataIncidentRecord], summary="Truy xuất tập dữ liệu mở (Open Data) đã ẩn danh hóa")
async def get_open_data_records(
    year: int = Query(2026, ge=2020, le=2030),
    month: int = Query(10, ge=1, le=12),
    district: Optional[str] = Query("ALL"),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """
    Dữ liệu mở dành cho phóng viên báo chí, nhà nghiên cứu và người dân.
    Tuân thủ nguyên tắc OPEN_001: Loại bỏ 100% Họ tên, Số điện thoại, Email, IP người báo.
    """
    return await PublicReportsService.get_open_data_records(
        db, year=year, month=month, district_name=district, limit=limit
    )


@router.get("/export/excel", summary="Tải bảng tính dữ liệu mở định dạng Excel (.xlsx)")
async def export_open_data_excel(
    year: int = Query(2026, ge=2020, le=2030),
    month: int = Query(10, ge=1, le=12),
    district: Optional[str] = Query("ALL"),
    db: AsyncSession = Depends(get_db),
):
    """
    Xuất tệp bảng tính .xlsx chuẩn format có header trang trọng, tóm tắt chỉ số và danh sách sự cố môi trường.
    """
    summary = await PublicReportsService.get_public_summary(
        db, period_type="MONTH", year=year, month=month, district_name=district
    )
    records = await PublicReportsService.get_open_data_records(
        db, year=year, month=month, district_name=district, limit=500
    )

    excel_bytes = PublicReportsService.generate_excel_bytes(summary, records)
    filename = f"GreenSpot_OpenData_{year}_{month:02d}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# =====================================================================
# CHỨC NĂNG 33: BẢNG TỔNG QUAN CHỈ SỐ HIỆN TRẠNG MÔI TRƯỜNG ĐÔ THỊ CÔNG CỘNG
# =====================================================================
@router.get("/public-dashboard", summary="Bảng tổng quan chỉ số hiện trạng môi trường công cộng (Dashboard Dân Sinh)")
async def get_public_dashboard(
    db: AsyncSession = Depends(get_db),
):
    """
    Cung cấp bức tranh toàn cảnh về chất lượng môi trường đô thị cho nhân dân cùng giám sát:
    - 4 Thẻ KPI: Cảnh báo đang mở, Sự cố đã xử lý, Tỷ lệ an toàn, Thời gian phản hồi
    - Biểu đồ tròn: Cơ cấu loại ô nhiễm
    - Biểu đồ cột: So sánh cảnh báo giữa các Quận/Huyện
    - Bảng vinh danh: Top 5 Phường Xanh sạch nhất
    """
    return await PublicReportsService.get_public_dashboard(db)

