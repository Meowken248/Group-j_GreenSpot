"""
Schemas (DTOs) cho tính năng Admin System Activity Dashboard (STT 48).

Phân tầng: TẦNG 2 - Data Transfer Objects (Pydantic)
Vị trí   : BackEnd/app/schemas/admin_dashboard/dashboard_schema.py
"""

from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


# ────────────────────────────────────────────────────────────────
# 1. Dữ liệu điểm theo ngày (1 ngày = 1 điểm trên biểu đồ)
# ────────────────────────────────────────────────────────────────

class DailyStatPoint(BaseModel):
    """
    Một điểm dữ liệu trên biểu đồ đường theo ngày.
    Được dùng để vẽ Multi-line Trend Chart (Màn 1/3).
    """
    stat_date: date = Field(..., description="Ngày thống kê (YYYY-MM-DD)")
    new_users: int = Field(..., ge=0, description="Số tài khoản công dân/TNV đăng ký mới trong ngày")
    new_posts: int = Field(..., ge=0, description="Số bài đăng/phản ánh sự cố mới trong ngày")
    new_groups: int = Field(..., ge=0, description="Số hội nhóm/CLB môi trường thành lập mới trong ngày")

    model_config = {"from_attributes": True}


# ────────────────────────────────────────────────────────────────
# 2. Thẻ KPI tổng hợp (Khối CHỈ SỐ - Màn 1/3)
# ────────────────────────────────────────────────────────────────

class KpiCardResponse(BaseModel):
    """
    Thẻ chỉ số KPI tổng hợp trong kỳ lọc.
    Hiển thị số lượng tuyệt đối và tốc độ tăng trưởng so với kỳ trước.
    """
    total_new_users: int = Field(..., ge=0, description="Tổng tài khoản mới trong chu kỳ")
    total_new_posts: int = Field(..., ge=0, description="Tổng bài đăng mới trong chu kỳ")
    total_new_groups: int = Field(..., ge=0, description="Tổng nhóm cộng đồng mới trong chu kỳ")

    # Tỷ lệ tăng trưởng so với kỳ trước (dương = tăng, âm = giảm)
    users_growth_pct: float = Field(..., description="% tăng trưởng người dùng so với kỳ trước")
    posts_growth_pct: float = Field(..., description="% tăng trưởng bài đăng so với kỳ trước")
    groups_growth_pct: float = Field(..., description="% tăng trưởng nhóm so với kỳ trước")

    model_config = {"from_attributes": True}


# ────────────────────────────────────────────────────────────────
# 3. Response tổng thể cho Dashboard (Màn 1/3)
# ────────────────────────────────────────────────────────────────

class ActivityDashboardResponse(BaseModel):
    """
    Response tổng thể trả về cho Màn 1/3 - Admin System Activity Overview.
    Chứa KPI cards + chuỗi dữ liệu theo ngày cho biểu đồ đường.
    """
    kpi: KpiCardResponse
    daily_series: List[DailyStatPoint] = Field(..., description="Dữ liệu từng ngày cho biểu đồ")
    period_days: int = Field(..., description="Số ngày trong kỳ thống kê (7 hoặc 30 hoặc tuỳ chọn)")
    start_date: date = Field(..., description="Ngày bắt đầu kỳ thống kê")
    end_date: date = Field(..., description="Ngày kết thúc kỳ thống kê")
    generated_at: str = Field(..., description="Thời điểm tạo báo cáo ISO8601")
    message: str = Field(default="Dữ liệu hoạt động hệ thống đã được cập nhật.")

    model_config = {"from_attributes": True}


# ────────────────────────────────────────────────────────────────
# 4. Hàng bảng chi tiết theo ngày (Màn 2/3)
# ────────────────────────────────────────────────────────────────

class DailyTableRow(BaseModel):
    """
    Một hàng trong bảng báo cáo chi tiết theo ngày (Màn 2/3).
    """
    stat_date: date = Field(..., description="Ngày thống kê")
    new_users: int = Field(..., ge=0, description="Người dùng mới trong ngày")
    new_posts: int = Field(..., ge=0, description="Bài đăng mới trong ngày")
    new_groups: int = Field(..., ge=0, description="Nhóm mới trong ngày")

    model_config = {"from_attributes": True}


class DailyTableSummary(BaseModel):
    """
    Hàng tổng cộng cuối bảng (lũy kế + trung bình ngày).
    """
    total_users: int = Field(..., ge=0, description="Tổng người dùng mới trong kỳ")
    total_posts: int = Field(..., ge=0, description="Tổng bài đăng mới trong kỳ")
    total_groups: int = Field(..., ge=0, description="Tổng nhóm mới trong kỳ")
    avg_users_per_day: float = Field(..., description="Trung bình người dùng/ngày")
    avg_posts_per_day: float = Field(..., description="Trung bình bài đăng/ngày")
    avg_groups_per_day: float = Field(..., description="Trung bình nhóm/ngày")

    model_config = {"from_attributes": True}


class DailyReportResponse(BaseModel):
    """
    Response tổng thể cho Màn 2/3 - Daily Activity Tabular Report.
    """
    rows: List[DailyTableRow] = Field(..., description="Danh sách hàng dữ liệu theo ngày")
    summary: DailyTableSummary
    from_date: date
    to_date: date
    total_records: int = Field(..., ge=0, description="Tổng số ngày có dữ liệu")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=30, ge=1, le=365)
    message: str = Field(default="Hiển thị dữ liệu thống kê hoạt động.")

    model_config = {"from_attributes": True}


# ────────────────────────────────────────────────────────────────
# 5. Bộ lọc ngày (dùng chung cho Dashboard + Table)
# ────────────────────────────────────────────────────────────────

class DateRangeFilter(BaseModel):
    """
    Bộ lọc phạm vi ngày tùy chọn (Màn 1/3 - Khối LỌC, Màn 2/3 - Khối BỘ LỌC).
    Validate: from_date phải <= to_date.
    """
    from_date: date = Field(..., description="Ngày bắt đầu (YYYY-MM-DD)")
    to_date: date = Field(..., description="Ngày kết thúc (YYYY-MM-DD)")

    @model_validator(mode="after")
    def validate_date_range(self) -> "DateRangeFilter":
        if self.from_date > self.to_date:
            raise ValueError(
                "Khoảng ngày không hợp lệ. 'Từ ngày' phải trước hoặc bằng 'Đến ngày'."
            )
        return self


# ────────────────────────────────────────────────────────────────
# 6. Xuất báo cáo (Màn 3/3 - Modal Popup)
# ────────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    """
    Payload yêu cầu xuất báo cáo thống kê (Màn 3/3 - POPUP XUẤT THỐNG KÊ).
    Định dạng: xlsx hoặc pdf.
    """
    from_date: date = Field(..., description="Ngày bắt đầu xuất báo cáo")
    to_date: date = Field(..., description="Ngày kết thúc xuất báo cáo")
    format: str = Field(
        default="xlsx",
        pattern=r"^(xlsx|pdf)$",
        description="Định dạng file: 'xlsx' (Excel) hoặc 'pdf' (Adobe PDF)"
    )

    @model_validator(mode="after")
    def validate_range(self) -> "ExportRequest":
        if self.from_date > self.to_date:
            raise ValueError(
                "Khoảng ngày không hợp lệ. 'Từ ngày' phải trước hoặc bằng 'Đến ngày'."
            )
        return self


class ExportResponse(BaseModel):
    """
    Response sau khi xuất tệp thành công.
    """
    filename: str = Field(..., description="Tên tệp đã tạo (VD: ThongKe_HeThong_2026-10.xlsx)")
    download_url: str = Field(..., description="URL tải xuống tệp tạm thời")
    format: str = Field(..., description="Định dạng tệp: xlsx hoặc pdf")
    rows_exported: int = Field(..., ge=0, description="Số hàng dữ liệu được xuất")
    message: str = Field(default="Đang trích xuất dữ liệu...")

    model_config = {"from_attributes": True}
