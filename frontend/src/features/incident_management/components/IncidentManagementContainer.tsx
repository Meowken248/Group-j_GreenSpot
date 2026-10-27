import React, { useState, useEffect, useCallback } from "react";
import {
  fetchIncidentsForManagement,
  verifyIncident,
  updateIncidentStatus,
} from "../services/incidentManagementService";
import type {
  IncidentListItem,
  IncidentManagementStats,
  IncidentFilterParams,
} from "../types/incident_management.types";
import { IncidentStatsCards } from "./IncidentStatsCards";
import { IncidentVerificationModal } from "./IncidentVerificationModal";
import "../IncidentManagement.scss";

const HCMC_DISTRICTS = [
  { id: 3, name: "Quận 1" },
  { id: 4, name: "Quận 7" },
  { id: 5, name: "Quận Bình Thạnh" },
  { id: 2, name: "TP. Thủ Đức" },
  { id: 6, name: "Huyện Cần Giờ" },
];

interface Props {
  onNavigateToMap?: (lat: number, lng: number) => void;
}

export const IncidentManagementContainer: React.FC<Props> = ({ onNavigateToMap }) => {
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [stats, setStats] = useState<IncidentManagementStats>({
    total: 0,
    unverified: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
    critical: 0,
    sla_warning: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedKpiCard, setSelectedKpiCard] = useState<string>("ALL");

  // Selected incident for verification modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentListItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: IncidentFilterParams = {
        search: search.trim() || undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        unit_id: districtFilter > 0 ? districtFilter : undefined,
        page: currentPage,
        limit: 15,
      };

      const res = await fetchIncidentsForManagement(params);
      setIncidents(res.items);
      setTotalCount(res.total);
      setStats(res.stats);
    } catch (err: any) {
      console.error("Lỗi tải danh sách sự cố:", err);
      setError("Không thể tải danh sách sự cố. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter, statusFilter, districtFilter, currentPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Click KPI card handler
  const handleSelectKpiCard = (key: string) => {
    setSelectedKpiCard(key);
    setCurrentPage(1);

    if (key === "ALL") {
      setSeverityFilter("ALL");
      setStatusFilter("ALL");
    } else if (key === "CRITICAL") {
      setSeverityFilter("CRITICAL");
      setStatusFilter("ALL");
    } else if (key === "PENDING" || key === "IN_PROGRESS" || key === "RESOLVED") {
      setStatusFilter(key);
      setSeverityFilter("ALL");
    } else if (key === "SLA_WARNING") {
      setStatusFilter("PENDING");
      setSeverityFilter("ALL");
    }
  };

  // Verify handler
  const handleVerify = async (action: "VERIFY" | "REJECT", note?: string) => {
    if (!selectedIncident) return;
    await verifyIncident(selectedIncident.incident_id, action, note);
    showToast(
      action === "VERIFY"
        ? `Đã xác thực sự cố ${selectedIncident.tracking_code} thành công!`
        : `Đã từ chối phản ánh ${selectedIncident.tracking_code}`
    );
    loadData();
  };

  // Status update handler
  const handleUpdateStatus = async (
    status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED",
    note?: string
  ) => {
    if (!selectedIncident) return;
    await updateIncidentStatus(selectedIncident.incident_id, status, note);
    showToast(`Đã cập nhật trạng thái sự cố ${selectedIncident.tracking_code}`);
    loadData();
  };

  const totalPages = Math.ceil(totalCount / 15) || 1;

  return (
    <div className="incident-management-page">
      {/* TOAST NOTIFICATION */}
      {toastMessage && <div className="floating-toast-alert">{toastMessage}</div>}

      {/* HEADER SECTION */}
      <div className="page-header-banner">
        <div className="header-text-block">
          <h1 className="main-title">🛡️ Quản lý & Kiểm chứng Phản ánh Môi trường</h1>
          <p className="sub-title">
            Tiếp nhận, kiểm duyệt bằng chứng hình ảnh (Watermark thời gian + GPS), lọc mức độ khẩn cấp và điều phối xử lý theo SLA.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh-data"
          onClick={() => loadData()}
          disabled={loading}
        >
          🔄 {loading ? "Đang tải..." : "Làm mới dữ liệu"}
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      <IncidentStatsCards
        stats={stats}
        selectedFilter={selectedKpiCard}
        onSelectFilter={handleSelectKpiCard}
      />

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="toolbar-filter-panel">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo mã sự cố (#INC-...), tiêu đề, địa chỉ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {search && (
            <button type="button" className="clear-search" onClick={() => setSearch("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          {/* LỌC MỨC ĐỘ KHẨN CẤP */}
          <div className="filter-select-group">
            <label className="select-label">Mức khẩn cấp:</label>
            <select
              className="custom-select"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">🚨 Khẩn cấp</option>
              <option value="HIGH">⚠️ Mức độ cao</option>
              <option value="MEDIUM">🟢 Bình thường</option>
            </select>
          </div>

          {/* LỌC TRẠNG THÁI KIỂM CHỨNG / XỬ LÝ */}
          <div className="filter-select-group">
            <label className="select-label">Kiểm chứng & Trạng thái:</label>
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">🟡 Chưa kiểm chứng (Cần duyệt)</option>
              <option value="IN_PROGRESS">🟢 Đã kiểm chứng (Đang xử lý)</option>
              <option value="RESOLVED">✅ Đã hoàn thành</option>
              <option value="REJECTED">🔴 Từ chối (Báo sai lệch)</option>
            </select>
          </div>

          {/* LỌC QUẬN / HUYỆN */}
          <div className="filter-select-group">
            <label className="select-label">Quận / Huyện:</label>
            <select
              className="custom-select"
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={0}>Tất cả khu vực</option>
              {HCMC_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && <div className="alert-error-message">{error}</div>}

      {/* INCIDENTS TABLE */}
      <div className="incident-table-wrapper">
        <table className="incident-data-table">
          <thead>
            <tr>
              <th>Mã sự cố</th>
              <th>Bằng chứng</th>
              <th>Tiêu đề & Danh mục</th>
              <th>Độ khẩn cấp</th>
              <th>Khu vực / Quận</th>
              <th>Kiểm chứng</th>
              <th>Hạn xử lý (SLA)</th>
              <th className="th-action">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  <div className="table-loader-spinner">Đang tải danh sách phản ánh...</div>
                </td>
              </tr>
            ) : incidents.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  <p>Không tìm thấy phản ánh nào phù hợp với bộ lọc.</p>
                </td>
              </tr>
            ) : (
              incidents.map((inc) => {
                const isOverdue = inc.is_sla_overdue;
                return (
                  <tr key={inc.incident_id} className={`incident-row ${inc.severity.toLowerCase()}`}>
                    <td className="cell-code">
                      <span className="code-badge">{inc.tracking_code}</span>
                      <span className="time-sub">
                        {new Date(inc.created_at).toLocaleDateString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </td>

                    <td className="cell-media">
                      {inc.thumbnail_url ? (
                        <div
                          className="thumb-preview-box"
                          onClick={() => setSelectedIncident(inc)}
                        >
                          <img src={inc.thumbnail_url} alt={inc.title} className="thumb-img" />
                          <span className="watermark-indicator">🏷️ WM</span>
                        </div>
                      ) : (
                        <span className="no-media-text">Không có ảnh</span>
                      )}
                    </td>

                    <td className="cell-title">
                      <div className="title-text" onClick={() => setSelectedIncident(inc)}>
                        {inc.title}
                      </div>
                      <div className="category-sub">📁 {inc.category_name}</div>
                    </td>

                    <td className="cell-severity">
                      {inc.severity === "CRITICAL" || inc.severity === "EMERGENCY" ? (
                        <span className="pill-severity critical">🚨 KHẨN CẤP</span>
                      ) : inc.severity === "HIGH" ? (
                        <span className="pill-severity high">⚠️ MỨC CAO</span>
                      ) : (
                        <span className="pill-severity normal">🟢 BÌNH THƯỜNG</span>
                      )}
                    </td>

                    <td className="cell-location">
                      <div className="district-text">🏛️ {inc.unit_name || "TP.HCM"}</div>
                      <div className="address-sub" title={inc.address_text}>
                        {inc.address_text}
                      </div>
                    </td>

                    <td className="cell-status">
                      {inc.status === "PENDING" && (
                        <span className="pill-status unverified">🟡 Chưa kiểm chứng</span>
                      )}
                      {inc.status === "IN_PROGRESS" && (
                        <span className="pill-status verified">🟢 Đã kiểm chứng</span>
                      )}
                      {inc.status === "RESOLVED" && (
                        <span className="pill-status resolved">✅ Đã hoàn thành</span>
                      )}
                      {inc.status === "REJECTED" && (
                        <span className="pill-status rejected">🔴 Đã từ chối</span>
                      )}
                    </td>

                    <td className="cell-sla">
                      <div className={`sla-time ${isOverdue ? "text-danger" : ""}`}>
                        {inc.sla_deadline
                          ? new Date(inc.sla_deadline).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })
                          : "Theo SLA"}
                      </div>
                      {isOverdue && <span className="sla-alert-tag">Quá hạn</span>}
                    </td>

                    <td className="cell-action">
                      <button
                        type="button"
                        className="btn-review-row"
                        onClick={() => setSelectedIncident(inc)}
                      >
                        {inc.status === "PENDING" ? "⚡ Duyệt ngay" : "Chi tiết"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="table-pagination-bar">
          <span className="page-info">
            Trang {currentPage} / {totalPages} (Tổng {totalCount} phản ánh)
          </span>
          <div className="pagination-buttons">
            <button
              type="button"
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ← Trang trước
            </button>
            <button
              type="button"
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau →
            </button>
          </div>
        </div>
      )}

      {/* VERIFICATION / DETAIL MODAL */}
      {selectedIncident && (
        <IncidentVerificationModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onVerify={handleVerify}
          onUpdateStatus={handleUpdateStatus}
          onNavigateToMap={(lat, lng) => {
            setSelectedIncident(null);
            if (onNavigateToMap) {
              onNavigateToMap(lat, lng);
            }
          }}
        />
      )}
    </div>
  );
};

