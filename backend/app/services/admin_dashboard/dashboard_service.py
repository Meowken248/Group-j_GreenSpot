"""
Service (Business Logic) cho Admin System Activity Dashboard (STT 48).

Phân tầng : TẦNG 5 - Core Business Logic Layer (Use Cases)
Vị trí    : BackEnd/app/services/admin_dashboard/dashboard_service.py

Quy tắc   :
  - KHÔNG được viết câu lệnh SQL trực tiếp.
  - KHÔNG được truy cập CSDL không thông qua Repository Interface.
  - Phụ thuộc vào IAdminDashboardRepository (không phụ thuộc Implementation).
  - Chứa toàn bộ Business Logic: tính % tăng trưởng, tạo file Export, phân trang.
"""

from __future__ import annotations

import io
import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.admin_dashboard import admin_dashboard_repository
from app.interface.admin_dashboard.dashboard_interface import IAdminDashboardRepository
from app.schemas.admin_dashboard.dashboard_schema import (
    ActivityDashboardResponse,
    DailyReportResponse,
    DailyStatPoint,
    DailyTableRow,
    DailyTableSummary,
    ExportRequest,
    ExportResponse,
    KpiCardResponse,
)

# Múi giờ Việt Nam UTC+7
VN_TZ = timezone(timedelta(hours=7))


class AdminDashboardService:
    """
    Lớp nghiệp vụ trung tâm cho tính năng Admin System Activity Dashboard.

    DIP: Phụ thuộc vào interface IAdminDashboardRepository thông qua constructor injection.
    SRP: Chỉ chịu trách nhiệm về nghiệp vụ thống kê hoạt động hệ thống Admin.
    """

    def __init__(
        self,
        repository: IAdminDashboardRepository = admin_dashboard_repository,
    ) -> None:
        """Dependency Injection – nhận interface, không phụ thuộc implementation."""
        self._repo = repository

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Dashboard tổng quan (Màn 1/3)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_activity_dashboard(
        self,
        db: AsyncSession,
        period_days: int = 30,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> ActivityDashboardResponse:
        """
        Lấy toàn bộ dữ liệu cho Màn 1/3:
          - KPI cards (tổng + % tăng trưởng).
          - Chuỗi dữ liệu theo ngày cho biểu đồ đường.

        Ưu tiên tham số tuỳ chọn start_date / end_date (nút Tuỳ chọn).
        Nếu không truyền, tự tính từ period_days tính đến hôm nay.
        """
        today = datetime.now(VN_TZ).date()

        if start_date and end_date:
            # Nút "Tuỳ chọn" — dùng phạm vi người dùng chọn
            _start = start_date
            _end = end_date
            _days = (_end - _start).days + 1
        else:
            # Nút "7 ngày" hoặc "30 ngày"
            _end = today
            _start = today - timedelta(days=period_days - 1)
            _days = period_days

        # Kỳ trước (cùng độ dài, liền trước _start)
        prev_end = _start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=_days - 1)

        # Truy vấn song song (giảm latency DB)
        daily_rows = await self._repo.get_daily_stats(db, _start, _end)
        current_totals = await self._repo.get_period_totals(db, _start, _end)
        prev_totals = await self._repo.get_previous_period_totals(db, prev_start, prev_end)

        # Tính % tăng trưởng (xử lý chia cho 0 an toàn)
        def growth_pct(current: int, previous: int) -> float:
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 2)

        kpi = KpiCardResponse(
            total_new_users=current_totals[0],
            total_new_posts=current_totals[1],
            total_new_groups=current_totals[2],
            users_growth_pct=growth_pct(current_totals[0], prev_totals[0]),
            posts_growth_pct=growth_pct(current_totals[1], prev_totals[1]),
            groups_growth_pct=growth_pct(current_totals[2], prev_totals[2]),
        )

        daily_series = [
            DailyStatPoint(
                stat_date=row[0],
                new_users=row[1],
                new_posts=row[2],
                new_groups=row[3],
            )
            for row in daily_rows
        ]

        generated_at = datetime.now(VN_TZ).strftime("%Y-%m-%dT%H:%M:%S+07:00")

        return ActivityDashboardResponse(
            kpi=kpi,
            daily_series=daily_series,
            period_days=_days,
            start_date=_start,
            end_date=_end,
            generated_at=generated_at,
            message=f"Dữ liệu hoạt động hệ thống được cập nhật lúc {generated_at}.",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Báo cáo bảng chi tiết (Màn 2/3)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_daily_report(
        self,
        db: AsyncSession,
        from_date: date,
        to_date: date,
        page: int = 1,
        page_size: int = 30,
    ) -> DailyReportResponse:
        """
        Lấy bảng dữ liệu chi tiết theo ngày với phân trang.
        Tính summary row (tổng lũy kế + trung bình ngày) từ toàn bộ kỳ.
        """
        # Dữ liệu trang hiện tại
        page_rows, total_count = await self._repo.get_daily_table(
            db, from_date, to_date, page, page_size
        )

        # Tổng hợp cho summary row — dùng toàn bộ kỳ (không qua phân trang)
        totals = await self._repo.get_period_totals(db, from_date, to_date)
        total_days = (to_date - from_date).days + 1

        def safe_avg(total: int, days: int) -> float:
            return round(total / days, 2) if days > 0 else 0.0

        summary = DailyTableSummary(
            total_users=totals[0],
            total_posts=totals[1],
            total_groups=totals[2],
            avg_users_per_day=safe_avg(totals[0], total_days),
            avg_posts_per_day=safe_avg(totals[1], total_days),
            avg_groups_per_day=safe_avg(totals[2], total_days),
        )

        rows = [
            DailyTableRow(
                stat_date=row[0],
                new_users=row[1],
                new_posts=row[2],
                new_groups=row[3],
            )
            for row in page_rows
        ]

        msg = (
            f"Hiển thị dữ liệu thống kê hoạt động từ ngày {from_date} đến ngày {to_date}."
            if rows
            else "Không có dữ liệu hoạt động trong khoảng thời gian đã chọn."
        )

        return DailyReportResponse(
            rows=rows,
            summary=summary,
            from_date=from_date,
            to_date=to_date,
            total_records=total_count,
            page=page,
            page_size=page_size,
            message=msg,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Xuất báo cáo (Màn 3/3 – Modal Popup)
    # ─────────────────────────────────────────────────────────────────────────

    async def export_report(
        self,
        db: AsyncSession,
        request: ExportRequest,
    ) -> tuple[bytes, str, str]:
        """
        Tạo tệp báo cáo Excel (.xlsx) hoặc PDF (.pdf) và trả về raw bytes.

        Returns:
            (file_bytes, filename, content_type)

        Raises:
            RuntimeError nếu không thể tạo tệp (bắt ở Router → HTTP 500).
        """
        # Lấy toàn bộ dữ liệu (không phân trang) để xuất
        all_rows, _ = await self._repo.get_daily_table(
            db, request.from_date, request.to_date, page=1, page_size=10000
        )

        timestamp = datetime.now(VN_TZ).strftime("%Y%m%d_%H%M")
        base_name = f"ThongKe_HeThong_{timestamp}"

        if request.format == "xlsx":
            file_bytes, filename, content_type = self._build_excel(
                all_rows, request.from_date, request.to_date, base_name
            )
        else:
            file_bytes, filename, content_type = self._build_pdf(
                all_rows, request.from_date, request.to_date, base_name
            )

        return file_bytes, filename, content_type

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers (private) — Excel & PDF builders
    # ─────────────────────────────────────────────────────────────────────────

    def _build_excel(
        self,
        rows: list,
        from_date: date,
        to_date: date,
        base_name: str,
    ) -> tuple[bytes, str, str]:
        """
        Xây dựng file Excel (.xlsx) sử dụng openpyxl.
        Bao gồm: header, dữ liệu, hàng tổng cộng, định dạng cột.
        """
        try:
            import openpyxl
            from openpyxl.styles import Font, PatternFill, Alignment
        except ImportError as exc:
            raise RuntimeError(
                "Thư viện openpyxl chưa được cài đặt. Chạy: pip install openpyxl"
            ) from exc

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Thống Kê Hoạt Động"

        # ── Header report ──────────────────────────────────────────────────
        ws.merge_cells("A1:D1")
        ws["A1"] = "BÁO CÁO THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG GREENSPOT"
        ws["A1"].font = Font(bold=True, size=14, color="1F4E79")
        ws["A1"].alignment = Alignment(horizontal="center")

        ws["A2"] = f"Kỳ báo cáo: {from_date.strftime('%d/%m/%Y')} – {to_date.strftime('%d/%m/%Y')}"
        ws["A2"].font = Font(italic=True, color="595959")
        ws.merge_cells("A2:D2")

        # ── Column headers ─────────────────────────────────────────────────
        header_row = 4
        headers = ["Ngày", "Người Dùng Mới", "Bài Đăng Mới", "Nhóm Mới"]
        header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")

        for col, h in enumerate(headers, start=1):
            cell = ws.cell(row=header_row, column=col, value=h)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")

        # ── Data rows ──────────────────────────────────────────────────────
        total_users = 0
        total_posts = 0
        total_groups = 0

        for i, row in enumerate(rows, start=header_row + 1):
            stat_date, new_users, new_posts, new_groups = row
            ws.cell(row=i, column=1, value=stat_date.strftime("%d/%m/%Y"))
            ws.cell(row=i, column=2, value=new_users)
            ws.cell(row=i, column=3, value=new_posts)
            ws.cell(row=i, column=4, value=new_groups)

            if i % 2 == 0:
                alt_fill = PatternFill(start_color="EBF5FB", end_color="EBF5FB", fill_type="solid")
                for col in range(1, 5):
                    ws.cell(row=i, column=col).fill = alt_fill

            total_users += new_users
            total_posts += new_posts
            total_groups += new_groups

        # ── Summary row ────────────────────────────────────────────────────
        summary_row = header_row + len(rows) + 1
        summary_fill = PatternFill(start_color="D5E8D4", end_color="D5E8D4", fill_type="solid")
        summary_data = ["TỔNG CỘNG", total_users, total_posts, total_groups]
        for col, val in enumerate(summary_data, start=1):
            cell = ws.cell(row=summary_row, column=col, value=val)
            cell.font = Font(bold=True)
            cell.fill = summary_fill

        # ── Auto column width ──────────────────────────────────────────────
        for col in ws.columns:
            max_len = max((len(str(c.value or "")) for c in col), default=10)
            ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 30)

        # ── Save to bytes ──────────────────────────────────────────────────
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        filename = f"{base_name}.xlsx"
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return buf.getvalue(), filename, content_type

    def _build_pdf(
        self,
        rows: list,
        from_date: date,
        to_date: date,
        base_name: str,
    ) -> tuple[bytes, str, str]:
        """
        Xây dựng file PDF sử dụng reportlab.
        Bao gồm header logo GreenSpot, bảng dữ liệu, tổng cộng và metadata.
        """
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.platypus import (
                Paragraph,
                SimpleDocTemplate,
                Spacer,
                Table,
                TableStyle,
            )
        except ImportError as exc:
            raise RuntimeError(
                "Thư viện reportlab chưa được cài đặt. Chạy: pip install reportlab"
            ) from exc

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            rightMargin=1.5 * cm,
            leftMargin=1.5 * cm,
            topMargin=1.5 * cm,
            bottomMargin=1.5 * cm,
        )
        styles = getSampleStyleSheet()
        story = []

        # ── Title ──────────────────────────────────────────────────────────
        title_style = ParagraphStyle(
            "TitleStyle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=colors.HexColor("#1F4E79"),
            spaceAfter=6,
        )
        story.append(Paragraph("BÁO CÁO THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG GREENSPOT", title_style))

        sub_style = ParagraphStyle(
            "SubStyle",
            parent=styles["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#595959"),
            spaceAfter=12,
        )
        story.append(Paragraph(
            f"Kỳ báo cáo: {from_date.strftime('%d/%m/%Y')} – {to_date.strftime('%d/%m/%Y')}  |  "
            f"Xuất lúc: {datetime.now(VN_TZ).strftime('%d/%m/%Y %H:%M')}",
            sub_style,
        ))
        story.append(Spacer(1, 0.5 * cm))

        # ── Table data ─────────────────────────────────────────────────────
        header = ["Ngày", "Người Dùng Mới", "Bài Đăng Mới", "Nhóm Mới"]
        table_data = [header]

        total_users = total_posts = total_groups = 0
        for row in rows:
            stat_date, new_users, new_posts, new_groups = row
            table_data.append([
                stat_date.strftime("%d/%m/%Y"),
                str(new_users),
                str(new_posts),
                str(new_groups),
            ])
            total_users += new_users
            total_posts += new_posts
            total_groups += new_groups

        table_data.append(["TỔNG CỘNG", str(total_users), str(total_posts), str(total_groups)])

        col_widths = [5 * cm, 6 * cm, 6 * cm, 5 * cm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F4E79")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE",   (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#EBF5FB")]),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#D5E8D4")),
            ("FONTNAME",   (0, -1), (-1, -1), "Helvetica-Bold"),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#BDC3C7")),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(table)

        doc.build(story)
        buf.seek(0)
        filename = f"{base_name}.pdf"
        content_type = "application/pdf"
        return buf.getvalue(), filename, content_type
