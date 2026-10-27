"""
Repository (Persistence Layer) cho Admin System Activity Dashboard (STT 48).

Phân tầng : TẦNG 4 - Data Access / Persistence Layer
Vị trí    : BackEnd/app/crud/admin_dashboard/dashboard_repository.py

Quy tắc SQL TƯỜNG MINH bắt buộc:
  - 100% Explicit SQL qua sqlalchemy.text().
  - Liệt kê tên cột tường minh, KHÔNG dùng SELECT *.
  - Mọi SELECT có điều kiện deleted_at IS NULL cho bảng users và posts.
  - Bảng groups (friend_groups / community_groups) dùng created_at để đếm.
  - KHÔNG chứa Business Logic (tính %, định dạng số...).
"""

from __future__ import annotations

from datetime import date
from typing import List, Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.admin_dashboard.dashboard_interface import IAdminDashboardRepository


class AdminDashboardRepository(IAdminDashboardRepository):
    """
    Triển khai cụ thể của IAdminDashboardRepository.
    Mọi truy vấn đều là Explicit SQL thông qua sqlalchemy.text().
    """

    # ─────────────────────────────────────────────────────────────────────────
    # 1. get_daily_stats — dữ liệu từng ngày cho biểu đồ đường
    # ─────────────────────────────────────────────────────────────────────────

    async def get_daily_stats(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> List[Tuple[date, int, int, int]]:
        """
        Truy vấn số liệu hoạt động theo từng ngày trong [start_date, end_date].

        Chiến lược:
          - Dùng generate_series để đảm bảo mọi ngày trong khoảng đều có hàng
            (kể cả ngày không có hoạt động → trả về 0).
          - LEFT JOIN với CTE đếm users, posts, groups để tránh NULL.
          - Sắp xếp tăng dần theo ngày để Frontend vẽ biểu đồ đúng chiều thời gian.

        SQL tường minh hoàn toàn (không dùng ORM auto-generate).
        """
        sql = text("""
            WITH date_series AS (
                SELECT generate_series(
                    CAST(:start_date AS DATE),
                    CAST(:end_date AS DATE),
                    INTERVAL '1 day'
                )::date AS stat_date
            ),
            user_counts AS (
                SELECT
                    u.created_at::date AS cnt_date,
                    COUNT(u.user_id)   AS new_users
                FROM users u
                WHERE u.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                  AND u.deleted_at IS NULL
                GROUP BY u.created_at::date
            ),
            post_counts AS (
                SELECT
                    p.created_at::date AS cnt_date,
                    COUNT(p.post_id)   AS new_posts
                FROM posts p
                WHERE p.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                  AND p.deleted_at IS NULL
                GROUP BY p.created_at::date
            ),
            group_counts AS (
                SELECT
                    fg.created_at::date AS cnt_date,
                    COUNT(fg.group_id)  AS new_groups
                FROM community_groups fg
                WHERE fg.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                GROUP BY fg.created_at::date
            )
            SELECT
                ds.stat_date,
                COALESCE(uc.new_users,  0)::int AS new_users,
                COALESCE(pc.new_posts,  0)::int AS new_posts,
                COALESCE(gc.new_groups, 0)::int AS new_groups
            FROM date_series ds
            LEFT JOIN user_counts  uc ON uc.cnt_date  = ds.stat_date
            LEFT JOIN post_counts  pc ON pc.cnt_date  = ds.stat_date
            LEFT JOIN group_counts gc ON gc.cnt_date  = ds.stat_date
            ORDER BY ds.stat_date ASC
        """)

        result = await db.execute(
            sql,
            {"start_date": start_date, "end_date": end_date},
        )
        rows = result.fetchall()
        return [
            (row.stat_date, row.new_users, row.new_posts, row.new_groups)
            for row in rows
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # 2. get_period_totals — tổng hợp kỳ hiện tại (KPI Cards)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_period_totals(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> Tuple[int, int, int]:
        """
        Đếm tổng số người dùng, bài đăng và nhóm mới trong kỳ bằng 3 sub-query.
        Tất cả trong một câu SELECT duy nhất để tối thiểu số lần round-trip DB.
        """
        sql = text("""
            SELECT
                (
                    SELECT COUNT(u.user_id)
                    FROM users u
                    WHERE u.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                      AND u.deleted_at IS NULL
                )::int AS total_users,
                (
                    SELECT COUNT(p.post_id)
                    FROM posts p
                    WHERE p.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                      AND p.deleted_at IS NULL
                )::int AS total_posts,
                (
                    SELECT COUNT(fg.group_id)
                    FROM community_groups fg
                    WHERE fg.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                )::int AS total_groups
        """)

        result = await db.execute(
            sql,
            {"start_date": start_date, "end_date": end_date},
        )
        row = result.fetchone()
        if row is None:
            return (0, 0, 0)
        return (row.total_users, row.total_posts, row.total_groups)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. get_previous_period_totals — tổng hợp kỳ trước (Growth Rate %)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_previous_period_totals(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
    ) -> Tuple[int, int, int]:
        """
        Đếm tổng số liệu của kỳ TRƯỚC (cùng độ dài, liền trước start_date).
        Service tầng trên sẽ truyền vào start/end của kỳ trước đã tính sẵn.
        Tái sử dụng cùng SQL với get_period_totals — tách riêng để tuân ISP.
        """
        sql = text("""
            SELECT
                (
                    SELECT COUNT(u.user_id)
                    FROM users u
                    WHERE u.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                      AND u.deleted_at IS NULL
                )::int AS total_users,
                (
                    SELECT COUNT(p.post_id)
                    FROM posts p
                    WHERE p.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                      AND p.deleted_at IS NULL
                )::int AS total_posts,
                (
                    SELECT COUNT(fg.group_id)
                    FROM community_groups fg
                    WHERE fg.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                )::int AS total_groups
        """)

        result = await db.execute(
            sql,
            {"start_date": start_date, "end_date": end_date},
        )
        row = result.fetchone()
        if row is None:
            return (0, 0, 0)
        return (row.total_users, row.total_posts, row.total_groups)

    # ─────────────────────────────────────────────────────────────────────────
    # 4. get_daily_table — bảng chi tiết phân trang (Màn 2/3)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_daily_table(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        page: int,
        page_size: int,
    ) -> Tuple[List[Tuple[date, int, int, int]], int]:
        """
        Truy vấn bảng dữ liệu theo ngày có phân trang (OFFSET/LIMIT).

        Trả về:
          - Danh sách hàng theo trang hiện tại.
          - Tổng số ngày trong kỳ (dùng cho Frontend tính số trang).

        Dùng generate_series đảm bảo mọi ngày đều xuất hiện (kể cả ngày 0).
        """
        offset = (page - 1) * page_size

        # Đếm tổng số ngày trong khoảng
        count_sql = text("""
            SELECT COUNT(*)::int AS total_days
            FROM generate_series(
                CAST(:start_date AS DATE),
                CAST(:end_date AS DATE),
                INTERVAL '1 day'
            ) AS gs(d)
        """)
        count_result = await db.execute(
            count_sql,
            {"start_date": start_date, "end_date": end_date},
        )
        total_count = count_result.scalar() or 0

        # Truy vấn dữ liệu với phân trang
        data_sql = text("""
            WITH date_series AS (
                SELECT generate_series(
                    CAST(:start_date AS DATE),
                    CAST(:end_date AS DATE),
                    INTERVAL '1 day'
                )::date AS stat_date
            ),
            user_counts AS (
                SELECT
                    u.created_at::date AS cnt_date,
                    COUNT(u.user_id)   AS new_users
                FROM users u
                WHERE u.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                  AND u.deleted_at IS NULL
                GROUP BY u.created_at::date
            ),
            post_counts AS (
                SELECT
                    p.created_at::date AS cnt_date,
                    COUNT(p.post_id)   AS new_posts
                FROM posts p
                WHERE p.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                  AND p.deleted_at IS NULL
                GROUP BY p.created_at::date
            ),
            group_counts AS (
                SELECT
                    fg.created_at::date AS cnt_date,
                    COUNT(fg.group_id)  AS new_groups
                FROM community_groups fg
                WHERE fg.created_at::date BETWEEN CAST(:start_date AS DATE) AND CAST(:end_date AS DATE)
                GROUP BY fg.created_at::date
            )
            SELECT
                ds.stat_date,
                COALESCE(uc.new_users,  0)::int AS new_users,
                COALESCE(pc.new_posts,  0)::int AS new_posts,
                COALESCE(gc.new_groups, 0)::int AS new_groups
            FROM date_series ds
            LEFT JOIN user_counts  uc ON uc.cnt_date  = ds.stat_date
            LEFT JOIN post_counts  pc ON pc.cnt_date  = ds.stat_date
            LEFT JOIN group_counts gc ON gc.cnt_date  = ds.stat_date
            ORDER BY ds.stat_date DESC
            LIMIT  :limit
            OFFSET :offset
        """)

        data_result = await db.execute(
            data_sql,
            {
                "start_date": start_date,
                "end_date": end_date,
                "limit": page_size,
                "offset": offset,
            },
        )
        rows = data_result.fetchall()
        data = [
            (row.stat_date, row.new_users, row.new_posts, row.new_groups)
            for row in rows
        ]
        return (data, total_count)
