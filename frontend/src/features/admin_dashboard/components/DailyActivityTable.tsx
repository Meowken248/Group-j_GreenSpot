/**
 *  Bảng Thống Kê Hoạt Động Theo Ngày (Detailed Daily Table)
 *
 * File   : FrontEnd/src/features/admin_dashboard/components/DailyActivityTable.tsx
 * Chức năng:
 *   - Khối "BỘ LỌC" (Cột trái): Chọn Từ ngày – Đến ngày, nút Áp dụng
 *   - Khối "BẢNG" (Cột giữa):
 *       + Hàng: Ngày | Người dùng mới | Bài đăng mới | Nhóm mới
 *       + Dòng tổng kết / trung bình
 *       + Phân trang phân trang Server-side (page, page_size)
 *       + Loading skeleton & Empty state
 *   - Khối "THAO TÁC" (Cột phải): Nút "Xuất báo cáo" mở Modal Popup (Màn 3)
 */

import React, { useCallback, useEffect, useState } from "react";
import { fetchDailyTable } from "../services/dashboardApi";
import type {
  DailyReportResponse,
  LoadingState,
} from "../types/dashboard.types";

export interface DailyActivityTableProps {
  initialFromDate?: string;
  initialToDate?: string;
  onOpenExport?: (fromDate: string, toDate: string) => void;
}

export const DailyActivityTable: React.FC<DailyActivityTableProps> = ({
  initialFromDate,
  initialToDate,
  onOpenExport,
}) => {
  // Mặc định 30 ngày gần nhất
  const [fromDate, setFromDate] = useState<string>(() => {
    if (initialFromDate) return initialFromDate;
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split("T")[0];
  });

  const [toDate, setToDate] = useState<string>(() => {
    if (initialToDate) return initialToDate;
    return new Date().toISOString().split("T")[0];
  });

  const [dateError, setDateError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const [data, setData] = useState<DailyReportResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadingState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadTableData = useCallback(
    async (from: string, to: string, page: number) => {
      // Validate ngày
      if (!from || !to) {
        setDateError("Vui lòng chọn đầy đủ từ ngày và đến ngày.");
        return;
      }
      if (new Date(from) > new Date(to)) {
        setDateError("Từ ngày không thể lớn hơn đến ngày.");
        return;
      }

      setDateError("");
      setLoadState("loading");
      setErrorMessage("");

      try {
        const response = await fetchDailyTable(from, to, page, pageSize);
        setData(response);
        setLoadState("success");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu bảng thống kê.";
        setErrorMessage(msg);
        setLoadState("error");
      }
    },
    [pageSize]
  );

  useEffect(() => {
    loadTableData(fromDate, toDate, currentPage);
  }, [loadTableData, fromDate, toDate, currentPage]);

  const handleApplyFilter = () => {
    setCurrentPage(1);
    loadTableData(fromDate, toDate, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (data && newPage > Math.ceil(data.total_records / pageSize)) return;
    setCurrentPage(newPage);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total_records / pageSize)) : 1;
  const isLoading = loadState === "loading";

  return (
    <div className="adm-dash__table-layout" data-testid="daily-activity-table-layout">
      {/* ── CỘT TRÁI: BỘ LỌC ──────────────────────────────────────────────── */}
      <div className="adm-dash__filter-panel">
        <div className="section-label">BỘ LỌC</div>

        <div>
          <label htmlFor="filter-from-date">Từ ngày</label>
          <input
            id="filter-from-date"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className={dateError ? "invalid" : ""}
          />
        </div>

        <div>
          <label htmlFor="filter-to-date">Đến ngày</label>
          <input
            id="filter-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className={dateError ? "invalid" : ""}
          />
        </div>

        {dateError && <div className="filter-error">{dateError}</div>}

        <button
          type="button"
          id="btn-apply-table-filter"
          className="apply-btn"
          onClick={handleApplyFilter}
          disabled={isLoading || !fromDate || !toDate}
        >
          {isLoading ? "Đang xử lý..." : "Áp dụng"}
        </button>
      </div>

      {/* ── CỘT GIỮA: BẢNG SỐ LIỆU ────────────────────────────────────────── */}
      <div className="adm-dash__table-panel">
        {data && (
          <div className="table-msg">
            Hiển thị <strong>{data.rows.length}</strong> /{" "}
            <strong>{data.total_records}</strong> ngày ({data.from_date} đến{" "}
            {data.to_date})
          </div>
        )}

        {loadState === "error" && (
          <div className="table-msg table-msg--error">
            ⚠️ {errorMessage}{" "}
            <button
              type="button"
              style={{
                marginLeft: "8px",
                background: "transparent",
                border: "none",
                color: "#10b981",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => loadTableData(fromDate, toDate, currentPage)}
            >
              Thử lại
            </button>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: "24px" }}>
            <div className="skeleton" style={{ height: "40px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "40px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "40px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "40px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "40px" }} />
          </div>
        ) : data && data.rows.length > 0 ? (
          <>
            <table className="data-table" aria-label="Bảng thống kê hoạt động hệ thống theo ngày">
              <thead>
                <tr>
                  <th scope="col">Ngày</th>
                  <th scope="col">Người dùng</th>
                  <th scope="col">Bài</th>
                  <th scope="col">Nhóm</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.stat_date} data-testid={`table-row-${row.stat_date}`}>
                    <td>
                      <strong>{row.stat_date}</strong>
                    </td>
                    <td>
                      <span style={{ color: "#60a5fa" }}>
                        +{row.new_users.toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#34d399" }}>
                        +{row.new_posts.toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#fb923c" }}>
                        +{row.new_groups.toLocaleString("vi-VN")}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Hàng tổng cộng */}
                {data.summary && (
                  <tr className="summary-row" data-testid="table-summary-row">
                    <td>
                      TỔNG CỘNG ({data.total_records} ngày)
                    </td>
                    <td>+{data.summary.total_users.toLocaleString("vi-VN")}</td>
                    <td>+{data.summary.total_posts.toLocaleString("vi-VN")}</td>
                    <td>+{data.summary.total_groups.toLocaleString("vi-VN")}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Phân trang */}
            <div className="pagination">
              <div>
                Trang {data.page} / {totalPages} (Tổng số {data.total_records} bản ghi)
              </div>
              <div className="page-controls">
                <button
                  type="button"
                  id="btn-prev-page"
                  disabled={data.page <= 1 || isLoading}
                  onClick={() => handlePageChange(data.page - 1)}
                  aria-label="Trang trước"
                >
                  ← Trước
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (data.page > 3 && data.page + 2 <= totalPages) {
                      pageNum = data.page - 2 + i;
                    } else if (data.page + 2 > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={data.page === pageNum ? "active" : ""}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  id="btn-next-page"
                  disabled={data.page >= totalPages || isLoading}
                  onClick={() => handlePageChange(data.page + 1)}
                  aria-label="Trang tiếp"
                >
                  Sau →
                </button>
              </div>
            </div>
          </>
        ) : (
          !isLoading &&
          loadState === "success" && (
            <div className="table-empty">
              <span className="empty-icon">📂</span>
              <div>Không có dữ liệu thống kê trong khoảng thời gian đã chọn</div>
              <div className="change-filter">
                Vui lòng chọn khoảng ngày khác và nhấn &quot;Áp dụng&quot;
              </div>
            </div>
          )
        )}
      </div>

      {/* ── CỘT PHẢI: THAO TÁC ────────────────────────────────────────────── */}
      <div className="adm-dash__action-panel">
        <div className="section-label">THAO TÁC</div>

        <button
          type="button"
          id="btn-open-export-modal"
          data-testid="btn-open-export-modal"
          className="export-btn"
          onClick={() => {
            if (onOpenExport) {
              onOpenExport(fromDate, toDate);
            }
          }}
          disabled={!data || data.rows.length === 0}
        >
          📄 Xuất báo cáo
        </button>

        <p className="action-hint">
          Trích xuất toàn bộ dữ liệu bảng theo kỳ lọc ra tệp Excel (.xlsx) hoặc PDF (.pdf) chuẩn mực.
        </p>
      </div>
    </div>
  );
};

export default DailyActivityTable;
