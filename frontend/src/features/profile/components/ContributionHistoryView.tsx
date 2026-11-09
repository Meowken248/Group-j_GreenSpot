import React, { useState } from "react";
import type {
  ActivityListResponse,
  UserProfile,
} from "../types/profile.types";

interface ContributionHistoryViewProps {
  userProfile: UserProfile | null;
  historyData: ActivityListResponse | null;
  historyLoading: boolean;
  historyError: string | null;
  onRetryHistory: () => void;
  onFilterChange: (filters: { activity_type?: string; from_date?: string; to_date?: string }) => void;
  onLoadMoreHistory: () => void;
  loadingMore: boolean;
  onBackToTimeline: () => void;
}

export const ContributionHistoryView: React.FC<ContributionHistoryViewProps> = ({
  userProfile,
  historyData,
  historyLoading,
  historyError,
  onRetryHistory,
  onFilterChange,
  onLoadMoreHistory,
  loadingMore,
  onBackToTimeline,
}) => {
  const [activityType, setActivityType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [dateError, setDateError] = useState<string | null>(null);
  const [hasFilterActive, setHasFilterActive] = useState(false);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoStr;
    }
  };

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case "REPORT_INCIDENT":
        return "Báo cáo sự cố môi trường";
      case "RECYCLING":
        return "Thu gom & Tái chế rác";
      case "PLANT_TREE":
        return "Trồng cây xanh đô thị";
      case "CHALLENGE":
        return "Thử thách sống xanh";
      case "CLEANUP":
        return "Dọn dẹp vệ sinh môi trường";
      case "COMMUNITY":
        return "Hoạt động cộng đồng";
      case "SURVEY":
        return "Khảo sát chất lượng môi trường";
      default:
        return type;
    }
  };

  // Kiểm tra tính hợp lệ của ngày trước khi gọi lọc
  const validateAndApplyFilters = (newType: string, newFrom: string, newTo: string) => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Kiểm tra ngày trong tương lai
    if ((newFrom && newFrom > todayStr) || (newTo && newTo > todayStr)) {
      setDateError("Không được chọn ngày trong tương lai");
      return; // Không gọi máy chủ
    }

    // Kiểm tra Từ ngày sau Đến ngày
    if (newFrom && newTo && newFrom > newTo) {
      setDateError("Từ ngày không được sau Đến ngày");
      return; // Không gọi máy chủ
    }

    // Hợp lệ -> Xóa lỗi và gọi lọc máy chủ
    setDateError(null);
    const hasFilter = Boolean(newType || newFrom || newTo);
    setHasFilterActive(hasFilter);
    onFilterChange({
      activity_type: newType || undefined,
      from_date: newFrom || undefined,
      to_date: newTo || undefined,
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActivityType(val);
    validateAndApplyFilters(val, fromDate, toDate);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFromDate(val);
    validateAndApplyFilters(activityType, val, toDate);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setToDate(val);
    validateAndApplyFilters(activityType, fromDate, val);
  };

  const handleClearFilters = () => {
    setActivityType("");
    setFromDate("");
    setToDate("");
    setDateError(null);
    setHasFilterActive(false);
    onFilterChange({});
  };

  return (
    <div>
      {/* Thanh liên kết quay về Màn 1 */}
      <div className="profile-subnav-bar" style={{ padding: "0 0 16px" }}>
        <span className="back-profile-link" onClick={onBackToTimeline}>
          ← Trang cá nhân của {userProfile?.full_name || "bạn"}
        </span>
      </div>

      <div className="contribution-history-layout">
        {/* ================================================================= */}
        {/* KHUNG BỘ LỌC */}
        {/* ================================================================= */}
        <section className="history-filter-box">
          <h3 className="filter-title">Bộ lọc hoạt động</h3>

          <div className="filter-inputs-row">
            {/* 1. Loại hoạt động */}
            <div className="input-group">
              <label htmlFor="filter-activity-type">Loại hoạt động</label>
              <select
                id="filter-activity-type"
                value={activityType}
                onChange={handleTypeChange}
              >
                <option value="">Tất cả loại hoạt động</option>
                <option value="REPORT_INCIDENT">Báo cáo sự cố</option>
                <option value="RECYCLING">Tái chế rác</option>
                <option value="PLANT_TREE">Trồng cây xanh</option>
                <option value="CHALLENGE">Thử thách xanh</option>
                <option value="CLEANUP">Dọn vệ sinh môi trường</option>
                <option value="COMMUNITY">Cộng đồng</option>
                <option value="SURVEY">Khảo sát</option>
              </select>
            </div>

            {/* 2. Từ ngày */}
            <div className="input-group">
              <label htmlFor="filter-from-date">Từ ngày</label>
              <input
                id="filter-from-date"
                type="date"
                value={fromDate}
                onChange={handleFromDateChange}
                className={dateError ? "error-border" : ""}
              />
            </div>

            {/* 3. Đến ngày */}
            <div className="input-group">
              <label htmlFor="filter-to-date">Đến ngày</label>
              <input
                id="filter-to-date"
                type="date"
                value={toDate}
                onChange={handleToDateChange}
                className={dateError ? "error-border" : ""}
              />
            </div>

            {/* Nút Xóa bộ lọc */}
            {hasFilterActive && (
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleClearFilters}
              >
                Xoá bộ lọc
              </button>
            )}
          </div>

          {/* Dòng chữ đỏ hiển thị lỗi ngày nếu có */}
          {dateError && <div className="filter-error-text">{dateError}</div>}
        </section>

        {/* ================================================================= */}
        {/* KHUNG DANH SÁCH */}
        {/* ================================================================= */}
        <section className="history-list-box">
          {historyLoading ? (
            <div>
              <div
                className="skeleton-box"
                style={{ width: "240px", height: "20px", marginBottom: "20px" }}
              />
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="skeleton-box"
                  style={{ width: "100%", height: "48px", marginBottom: "12px" }}
                />
              ))}
            </div>
          ) : historyError ? (
            <div className="column-error-box">
              <p className="error-msg-text">Không thể tải lịch sử đóng góp. Vui lòng thử lại</p>
              <button type="button" className="btn-retry-col" onClick={onRetryHistory}>
                Tải lại
              </button>
            </div>
          ) : historyData ? (
            <>
              {/* Dòng tổng kết (chỉ hiện khi có kết quả hoặc khi đang lọc) */}
              {(historyData.items.length > 0 || hasFilterActive) && (
                <div className="list-summary-bar">
                  Tìm thấy {historyData.total_activities} hoạt động · Tổng +{historyData.total_points} điểm
                </div>
              )}

              {historyData.items.length === 0 ? (
                <div className="empty-history-box">
                  {hasFilterActive ? (
                    <div>
                      <p>Không có hoạt động nào phù hợp với bộ lọc</p>
                      <span className="btn-reset-filter" onClick={handleClearFilters}>
                        Xoá bộ lọc
                      </span>
                    </div>
                  ) : userProfile?.is_own_profile ? (
                    <p>Bạn chưa có hoạt động đóng góp nào</p>
                  ) : (
                    <p>{userProfile?.full_name} chưa có hoạt động đóng góp nào</p>
                  )}
                </div>
              ) : (
                <>
                  <table className="activities-table">
                    <thead>
                      <tr>
                        <th style={{ width: "25%" }}>Hoạt động</th>
                        <th style={{ width: "45%" }}>Chi tiết</th>
                        <th style={{ width: "18%" }}>Thời gian</th>
                        <th style={{ width: "12%", textAlign: "right" }}>Điểm xanh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.items.map((act) => (
                        <tr key={act.activity_id}>
                          <td>
                            <strong>{getActivityTypeLabel(act.activity_type)}</strong>
                          </td>
                          <td>
                            <div>{act.title}</div>
                            {act.description && (
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                {act.description}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: "13px", color: "#64748b" }}>
                            {formatDate(act.created_at)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {/* Hoạt động không có điểm (points = 0) hiển thị '—' màu xám */}
                            {act.points === 0 ? (
                              <span className="points-badge-col zero-points">—</span>
                            ) : (
                              <span className="points-badge-col">+{act.points}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Nút Xem thêm */}
                  {historyData.has_more && (
                    <div className="load-more-section" style={{ textAlign: "center", marginTop: "24px" }}>
                      <button
                        type="button"
                        className="btn-load-more"
                        onClick={onLoadMoreHistory}
                        disabled={loadingMore}
                      >
                        {loadingMore ? "Đang tải..." : "Xem thêm"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
};
