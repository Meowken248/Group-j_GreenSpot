/**
 *  Admin System Activity Overview Dashboard
 *
 * File   : FrontEnd/src/features/admin_dashboard/components/ActivityDashboard.tsx
 * Chức năng:
 *   - 3 KPI Cards (Người dùng mới, Bài đăng mới, Nhóm mới + % tăng trưởng)
 *   - Multi-line Trend Chart (Chart.js) với 3 màu phân biệt + tooltip
 *   - Bộ lọc nhanh: 7 ngày / 30 ngày / Tuỳ chọn
 *   - Smooth transition khi đổi filter
 *   - Error state với nút "Tải lại dữ liệu"
 */

import React, { useCallback, useEffect, useState } from "react";
import { MultiLineTrendChart } from "./MultiLineTrendChart";
import { fetchDashboardOverview } from "../services/dashboardApi";
import type {
  ActivityDashboardResponse,
  CustomDateRange,
  LoadingState,
  PeriodFilter,
} from "../types/dashboard.types";
import "../styles/dashboard.scss";

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: string;
  label: string;
  value: number;
  growthPct: number;
  colorClass: string;
  loading?: boolean;
  navHint?: string;
  onNavigate?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  growthPct,
  colorClass,
  loading = false,
  navHint,
  onNavigate,
}) => {
  if (loading) return <div className="skeleton skeleton-kpi" />;

  const isUp = growthPct > 0;
  const isDown = growthPct < 0;
  const growthClass = isUp ? "kpi-growth--up" : isDown ? "kpi-growth--down" : "kpi-growth--flat";
  const arrow = isUp ? "↑" : isDown ? "↓" : "→";

  return (
    <div className="adm-dash__kpi-card" data-testid={`kpi-card-${colorClass}`}>
      <div className={`kpi-icon kpi-icon--${colorClass}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">+{value.toLocaleString("vi-VN")}</div>
      <div className={`kpi-growth ${growthClass}`}>
        <span>{arrow}</span>
        <span>{Math.abs(growthPct).toFixed(1)}%</span>
        <span className="trend-vs">so với kỳ trước</span>
      </div>

      {navHint && onNavigate && (
        <button
          type="button"
          onClick={onNavigate}
          className="kpi-nav-link"
          style={{
            marginTop: "10px",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "0.75rem",
            cursor: "pointer",
            textAlign: "left",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
          title={navHint}
        >
          <span>{navHint}</span>
          <span style={{ fontSize: "0.85rem" }}>➔</span>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ActivityDashboardProps {
  standalone?: boolean;
  onNavigateTable?: () => void;
  onNavigateModule?: (moduleKey: string) => void;
}

export const ActivityDashboard: React.FC<ActivityDashboardProps> = ({
  standalone = true,
  onNavigateTable,
  onNavigateModule,
}) => {
  const [data, setData] = useState<ActivityDashboardResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadingState>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<PeriodFilter>(30);
  const [showCustom, setShowCustom] = useState(false);
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    from_date: "",
    to_date: "",
  });

  const loadData = useCallback(
    async (filter: PeriodFilter, range?: CustomDateRange) => {
      setLoadState("loading");
      setErrorMsg("");
      try {
        const result = await fetchDashboardOverview(
          filter,
          range?.from_date,
          range?.to_date
        );
        setData(result);
        setLoadState("success");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Không thể đồng bộ dữ liệu thống kê hoạt động. Vui lòng kiểm tra lại dịch vụ Analytics.";
        setErrorMsg(msg);
        setLoadState("error");
      }
    },
    []
  );

  useEffect(() => {
    loadData(30);
  }, [loadData]);

  const handleFilterClick = (filter: PeriodFilter) => {
    setActiveFilter(filter);
    if (filter === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      loadData(filter);
    }
  };

  const handleCustomApply = () => {
    if (!customRange.from_date || !customRange.to_date) return;
    loadData("custom", customRange);
  };

  const isLoading = loadState === "loading";

  const handleNav = (hash: string) => {
    if (onNavigateModule) {
      onNavigateModule(hash);
    } else {
      window.location.hash = hash;
    }
  };

  const colsContent = (
    <>
      <div className="adm-dash__cols">
        {/* ── Cột trái: KPI Cards ── */}
        <div className="adm-dash__kpi-col">
          <div className="section-label">CHỈ SỐ</div>

          <KpiCard
            icon="👤"
            label="Người dùng mới"
            value={data?.kpi.total_new_users ?? 0}
            growthPct={data?.kpi.users_growth_pct ?? 0}
            colorClass="users"
            loading={isLoading}
            navHint="Quản lý tài khoản & RBAC"
            onNavigate={() => handleNav("#rbac")}
          />
          <KpiCard
            icon="📝"
            label="Bài đăng mới"
            value={data?.kpi.total_new_posts ?? 0}
            growthPct={data?.kpi.posts_growth_pct ?? 0}
            colorClass="posts"
            loading={isLoading}
            navHint="Duyệt bài đăng cộng đồng"
            onNavigate={() => handleNav("#posts")}
          />
          <KpiCard
            icon="👥"
            label="Nhóm mới"
            value={data?.kpi.total_new_groups ?? 0}
            growthPct={data?.kpi.groups_growth_pct ?? 0}
            colorClass="groups"
            loading={isLoading}
            navHint="Danh sách nhóm cộng đồng"
            onNavigate={() => handleNav("#groups")}
          />
        </div>

        {/* ── Cột giữa: Multi-line Chart ── */}
        <div className="adm-dash__chart-col">
          <div className="chart-header">
            <div className="chart-title">Đường theo ngày (3 chỉ số)</div>
            <div className="chart-legend">
              <div className="legend-item">
                <span className="dot" style={{ background: "#3b82f6" }} />
                Người dùng
              </div>
              <div className="legend-item">
                <span className="dot" style={{ background: "#10b981" }} />
                Bài đăng
              </div>
              <div className="legend-item">
                <span className="dot" style={{ background: "#f97316" }} />
                Nhóm
              </div>
            </div>
          </div>

          <div className="chart-canvas-wrap">
            {isLoading && <div className="skeleton skeleton-chart" />}

            {loadState === "error" && (
              <div className="chart-error">
                <span>⚠️</span>
                <p className="error-msg">{errorMsg}</p>
                <button
                  type="button"
                  className="retry-btn"
                  id="btn-retry-dashboard"
                  onClick={() =>
                    loadData(
                      activeFilter,
                      customRange.from_date ? customRange : undefined
                    )
                  }
                >
                  🔄 Tải lại dữ liệu
                </button>
              </div>
            )}

            {loadState === "success" && data && (
              <MultiLineTrendChart dailySeries={data.daily_series} />
            )}
          </div>
        </div>

        {/* ── Cột phải: Filter ── */}
        <div className="adm-dash__filter-col">
          <div className="section-label">LỌC</div>

          <button
            type="button"
            id="btn-filter-7days"
            data-testid="btn-filter-7days"
            className={`filter-btn ${activeFilter === 7 ? "filter-btn--active" : ""}`}
            onClick={() => handleFilterClick(7)}
          >
            📅 7 ngày
          </button>

          <button
            type="button"
            id="btn-filter-30days"
            data-testid="btn-filter-30days"
            className={`filter-btn ${activeFilter === 30 ? "filter-btn--active" : ""}`}
            onClick={() => handleFilterClick(30)}
          >
            📅 30 ngày
          </button>

          <button
            type="button"
            id="btn-filter-custom"
            data-testid="btn-filter-custom"
            className={`filter-btn ${activeFilter === "custom" ? "filter-btn--active" : ""}`}
            onClick={() => handleFilterClick("custom")}
          >
            🗓️ Tuỳ chọn
          </button>

          {showCustom && (
            <div className="custom-range-box">
              <div>
                <label htmlFor="custom-from">Từ ngày</label>
                <input
                  id="custom-from"
                  type="date"
                  value={customRange.from_date}
                  onChange={(e) =>
                    setCustomRange((p) => ({ ...p, from_date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="custom-to">Đến ngày</label>
                <input
                  id="custom-to"
                  type="date"
                  value={customRange.to_date}
                  onChange={(e) =>
                    setCustomRange((p) => ({ ...p, to_date: e.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                id="btn-apply-custom"
                className="apply-btn"
                disabled={!customRange.from_date || !customRange.to_date}
                onClick={handleCustomApply}
              >
                Áp dụng
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!standalone) {
    return <div data-testid="activity-dashboard">{colsContent}</div>;
  }

  return (
    <div className="adm-dash" data-testid="activity-dashboard">
      {/* HEADER */}
      <header className="adm-dash__header">
        <div className="adm-dash__header-brand">
          <div className="logo-icon">🌱</div>
          <div className="brand-titles">
            <h1>HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG GREENSPOT</h1>
            <span>Bảng điều khiển quản trị tổng thể — Ban Giám đốc &amp; Admin cấp cao</span>
          </div>
        </div>
        <nav className="adm-dash__header-nav">
          <button type="button" className="nav-btn nav-btn--active">📊 Tổng quan</button>
          <button
            type="button"
            className="nav-btn"
            onClick={onNavigateTable}
          >
            📋 Báo cáo chi tiết
          </button>
          <button type="button" className="nav-btn">⚙️ Cấu hình</button>
        </nav>
        <div className="adm-dash__header-controls">
          <button type="button" className="bell-btn" aria-label="Thông báo">
            🔔
            <span className="badge" />
          </button>
          <div className="avatar-box" title="Quản trị viên">
            <div className="av-img">QT</div>
            <div className="av-meta">
              <div className="av-name">Quản trị viên</div>
              <div className="av-role">Admin cấp cao</div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="adm-dash__body">
        {/* Page header */}
        <div className="adm-dash__page-header">
          <div className="page-title">
            THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG
            <span className="title-badge">LIVE</span>
          </div>
          {data && (
            <span className="updated-at">
              🕐 {data.message}
            </span>
          )}
        </div>

        {colsContent}
      </div>

      {/* FOOTER */}
      <footer className="adm-dash__footer">
        <span>© 2026 GreenSpot. Nền tảng Đô thị Môi trường Thông minh TP.HCM</span>
        <div className="footer-links">
          <a href="#contact">Liên hệ</a>
          <a href="#privacy">Chính sách</a>
          <a href="#terms">Điều khoản</a>
        </div>
      </footer>
    </div>
  );
};

export default ActivityDashboard;
