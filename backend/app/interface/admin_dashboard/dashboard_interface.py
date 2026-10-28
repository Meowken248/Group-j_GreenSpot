"""
Interface (ABC) cho Admin System Activity Dashboard (STT 48).

Phân tầng : TẦNG 3 - Abstraction Layer (DIP - Dependency Inversion Principle)
Vị trí    : BackEnd/app/interface/admin_dashboard/dashboard_interface.py

Quy tắc   :
  - CHỈ được định nghĩa @abstractmethod, KHÔNG được viết implementation.
  - KHÔNG được import thư viện thực thi CSDL cụ thể ngoài AsyncSession type-hint.
  - Mỗi phương thức phải có docstring mô tả rõ hợp đồng (contract).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession


class IAdminDashboardRepository(ABC):
    """
    Hợp đồng trừu tượng cho lớp truy cập dữ liệu thống kê hoạt động hệ thống.

    Nguyên lý áp dụng:
      - ISP: Chỉ khai báo các phương thức thuộc domain Admin Dashboard.
      - DIP: AdminDashboardService phụ thuộc vào interface này,
             KHÔNG phụ thuộc trực tiếp vào AdminDashboardRepository.
    """

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Truy vấn số liệu theo ngày (Multi-line Trend Chart)
    # ─────────────────────────────────────────────────────────────────────────

    @abstractmethod
    async def get_daily_stats(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> List[Tuple[date, int, int, int]]:
        """
        Truy vấn số lượng người dùng mới, bài đăng mới và nhóm mới
        theo từng ngày trong khoảng [start_date, end_date].

        Returns:
            List[Tuple[stat_date, new_users, new_posts, new_groups]]
            Mỗi tuple đại diện cho 1 ngày, đã sắp xếp tăng dần theo ngày.

        Raises:
            SQLAlchemyError nếu CSDL lỗi (tầng trên bắt và ném HTTP 503).
        """
        ...

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Truy vấn tổng hợp theo kỳ (KPI Cards)
    # ─────────────────────────────────────────────────────────────────────────

    @abstractmethod
    async def get_period_totals(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> Tuple[int, int, int]:
        """
        Truy vấn tổng số người dùng, bài đăng và nhóm mới trong kỳ.

        Returns:
            Tuple[total_users, total_posts, total_groups]
        """
        ...

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Truy vấn kỳ so sánh trước (Growth Rate)
    # ─────────────────────────────────────────────────────────────────────────

    @abstractmethod
    async def get_previous_period_totals(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> Tuple[int, int, int]:
        """
        Truy vấn tổng số liệu của kỳ TRƯỚC để tính % tăng trưởng.
        Kỳ trước có cùng độ dài với kỳ hiện tại, nằm liền trước start_date.

        Returns:
            Tuple[prev_users, prev_posts, prev_groups]
        """
        ...

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Truy vấn bảng chi tiết phân trang (Màn 2/3)
    # ─────────────────────────────────────────────────────────────────────────

    @abstractmethod
    async def get_daily_table(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        page: int,
        page_size: int,
    ) -> Tuple[List[Tuple[date, int, int, int]], int]:
        """
        Truy vấn bảng dữ liệu chi tiết theo ngày có phân trang.

        Args:
            page     : Số trang (bắt đầu từ 1).
            page_size: Số hàng mỗi trang (tối đa 365).

        Returns:
            Tuple[
                List[Tuple[stat_date, new_users, new_posts, new_groups]],
                total_count  # tổng số ngày có dữ liệu (dùng cho pagination)
            ]
        """
        ...
