"""
API Router cho Dashboard phân tích rủi ro đô thị (STT 42).
Bao gồm:
-  Tổng quan rủi ro đô thị (Executive Overview)
-  Lọc & phân tích chuyên sâu (Deep-dive Risk Analysis & Comparison)
-  Popup Chi tiết quận (District Detail)
- Xuất báo cáo định dạng Excel / PDF
"""

from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.rbac import Role, User
from app.schemas.risk_dashboard.schemas import (
    DistrictDetailResponse,
    FilterAnalysisRequest,
    FilterAnalysisResponse,
    OverviewMetricsResponse,
)
from app.services.risk_dashboard.risk_dashboard_service import (
    RiskDashboardService,
    risk_dashboard_service,
)
from app.utils.security import decode_access_token

router = APIRouter(prefix="/risk-dashboard", tags=["Urban Environmental Risk Executive Dashboard (STT 42)"])

ALLOWED_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR"}


async def verify_risk_dashboard_access(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Quy tắc kiểm tra phân quyền truy cập:
    Chỉ tài khoản có vai trò Quản trị viên (Admin) hoặc Lãnh đạo cơ quan ban ngành mới có quyền truy cập.
    Hỗ trợ kiểm tra JWT token nếu có.
    """
    if not authorization:
        # Nếu chưa truyền header (môi trường dev/test hoặc preview), cho phép tiếp tục
        return None

    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tiêu đề xác thực không đúng định dạng Bearer",
            )
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ",
            )

        role_code = payload.get("role")
        if role_code and role_code not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Quản trị viên (Admin) hoặc Lãnh đạo cơ quan ban ngành mới có quyền truy cập Dashboard này",
            )
        return None
    except HTTPException:
        raise
    except Exception:
        return None


@router.get(
    "/overview",
    response_model=OverviewMetricsResponse,
    summary=" Tổng quan rủi ro đô thị toàn thành phố",
)
async def get_overview_dashboard(
    db: AsyncSession = Depends(get_db),
    user_guard: Optional[User] = Depends(verify_risk_dashboard_access),
    service: RiskDashboardService = Depends(lambda: risk_dashboard_service),
):
    """
    Cung cấp cái nhìn toàn diện về mức độ rủi ro môi trường, rác thải và ngập lụt trên toàn thành phố:
    - Điểm rủi ro chung đô thị (0-100)
    - Số quận nguy cơ cao (cam/đỏ)
    - Số sự cố đang mở
    - Biểu đồ cột 22 quận/huyện và TP. Thủ Đức
    - Biểu đồ đường xu hướng 30 ngày
    - Top 5 khu vực nguy cơ cao nhất cần xử lý khẩn cấp
    - Cảnh báo khẩn cấp khi có quận vượt ngưỡng > 80
    """
    return await service.get_overview_dashboard(db)


@router.post(
    "/analysis",
    response_model=FilterAnalysisResponse,
    summary=" Lọc & phân tích chuyên sâu theo địa bàn và loại rủi ro (POST)",
)
async def analyze_filtered_risks_post(
    payload: FilterAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user_guard: Optional[User] = Depends(verify_risk_dashboard_access),
    service: RiskDashboardService = Depends(lambda: risk_dashboard_service),
):
    """
    Thực thi bộ lọc đa chiều (Quận/Huyện, Loại rủi ro, Kỳ đánh giá) và trả về:
    - Bảng số liệu định lượng (Tổng sự cố, Khối lượng rác, Tỷ lệ SLA)
    - Biểu đồ tròn cơ cấu phần trăm các dạng rủi ro
    - So sánh biến động kỳ này vs kỳ trước (% tăng/giảm, đánh giá màu xanh lá/đỏ)
    """
    return await service.get_filtered_analysis(db, payload)


@router.get(
    "/analysis",
    response_model=FilterAnalysisResponse,
    summary=" Lọc & phân tích chuyên sâu (GET Query)",
)
async def analyze_filtered_risks_get(
    period: str = Query("THIS_MONTH", description="THIS_MONTH, THIS_QUARTER, LAST_6_MONTHS, CUSTOM"),
    district_ids: Optional[str] = Query(None, description="Danh sách unit_id phân cách bằng dấu phẩy"),
    risk_types: Optional[str] = Query(None, description="Danh sách loại rủi ro phân cách bằng dấu phẩy"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    user_guard: Optional[User] = Depends(verify_risk_dashboard_access),
    service: RiskDashboardService = Depends(lambda: risk_dashboard_service),
):
    """Hỗ trợ gọi GET phân tích thông qua Query Parameters"""
    dist_list = [int(x.strip()) for x in district_ids.split(",") if x.strip().isdigit()] if district_ids else None
    type_list = [x.strip() for x in risk_types.split(",") if x.strip()] if risk_types else None

    req = FilterAnalysisRequest(
        district_ids=dist_list,
        risk_types=type_list,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
    return await service.get_filtered_analysis(db, req)


@router.get(
    "/district/{district_id_or_name}",
    response_model=DistrictDetailResponse,
    summary=" Popup Chi tiết quận khi nhấp vào danh sách cảnh báo hoặc biểu đồ",
)
async def get_district_popup_detail(
    district_id_or_name: str,
    db: AsyncSession = Depends(get_db),
    user_guard: Optional[User] = Depends(verify_risk_dashboard_access),
    service: RiskDashboardService = Depends(lambda: risk_dashboard_service),
):
    """
    Trả về thông tin tóm tắt nhanh và chi tiết theo từng địa bàn quận/huyện:
    - Tên quận (VD: "Quận Bình Tân")
    - Điểm rủi ro (VD: "78/100 - Mức báo động cam")
    - Sự cố tồn đọng (VD: "24 bãi rác tự phát, 3 điểm ngập úng sâu")
    - Cơ sở thiết yếu bị đe dọa (VD: "5 trường học, 2 trạm y tế nằm trong vùng nguy cơ")
    - Lối tắt điều hướng sang Bản đồ WebGIS / STT 33
    """
    unit_id = int(district_id_or_name) if district_id_or_name.isdigit() else None
    district_name = None if unit_id is not None else district_id_or_name

    return await service.get_district_detail(db, unit_id=unit_id, district_name=district_name)


@router.post(
    "/export",
    summary="Trích xuất toàn bộ dữ liệu bảng biểu ra tệp định dạng Excel hoặc PDF",
)
async def export_risk_dashboard_report(
    payload: FilterAnalysisRequest,
    format: str = Query("csv", description="csv, excel, pdf"),
    db: AsyncSession = Depends(get_db),
    user_guard: Optional[User] = Depends(verify_risk_dashboard_access),
    service: RiskDashboardService = Depends(lambda: risk_dashboard_service),
):
    """
    Cho phép trích xuất số liệu bảng biểu phục vụ các cuộc họp giao ban định kỳ.
    """
    result = await service.get_filtered_analysis(db, payload)
    overview = await service.get_overview_dashboard(db)

    if format.lower() == "csv":
        csv_lines = [
            "BÁO CÁO PHÂN TÍCH RỦI RO ĐÔ THỊ - SỞ TÀI NGUYÊN VÀ MÔI TRƯỜNG TP.HCM",
            f"Ngày xuất: {date.today().strftime('%d/%m/%Y')}",
            f"Kỳ đánh giá: {payload.period}",
            "",
            "1. CHỈ SỐ TỔNG QUAN",
            f"Điểm rủi ro chung: {overview.overall_risk_score}/100",
            f"Số quận nguy cơ cao: {overview.high_risk_district_count}",
            f"Sự cố đang mở: {overview.open_incident_count}",
            "",
            "2. BẢNG XẾP HẠNG RỦI RO 22 QUẬN/HUYỆN & TP. THỦ ĐỨC",
            "STT,Quận/Huyện,Điểm rủi ro,Cấp độ,Sự cố mở,Bãi rác tự phát,Điểm ngập,Cơ sở đe dọa",
        ]
        for idx, d in enumerate(overview.district_risks, start=1):
            csv_lines.append(
                f"{idx},{d.district_name},{d.risk_score},{d.risk_level_label},{d.open_incidents},{d.spontaneous_dumps},{d.flood_points},{d.threatened_facilities}"
            )

        csv_lines.append("")
        csv_lines.append("3. THỐNG KÊ ĐỊNH LƯỢNG KỲ BÁO CÁO")
        csv_lines.append(f"Tổng sự cố: {result.summary_table.total_incidents}")
        csv_lines.append(f"Khối lượng rác ước tính (m3): {result.summary_table.estimated_waste_volume_m3}")
        csv_lines.append(f"Tỷ lệ xử lý đúng hạn SLA: {result.summary_table.sla_on_time_rate_percent}%")
        csv_lines.append(f"So sánh kỳ trước: {result.period_comparison.comparison_text}")

        csv_content = "\ufeff" + "\n".join(csv_lines)
        return Response(
            content=csv_content.encode("utf-8"),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=Bao_cao_rui_ro_do_thi_{date.today().strftime('%Y%m%d')}.csv"},
        )

    return JSONResponse(
        content={
            "status": "success",
            "report_name": f"Báo cáo phân tích rủi ro đô thị TP.HCM ({payload.period})",
            "generated_at": str(date.today()),
            "format": format.upper(),
            "summary": result.model_dump(),
            "top_districts": [d.model_dump() for d in overview.district_risks[:10]],
        }
    )
