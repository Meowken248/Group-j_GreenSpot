import React from "react";
import type { IncidentManagementStats } from "../types/incident_management.types";

interface Props {
  stats: IncidentManagementStats;
  selectedFilter: string;
  onSelectFilter: (filterKey: string) => void;
}

export const IncidentStatsCards: React.FC<Props> = ({
  stats,
  selectedFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      key: "ALL",
      label: "Tổng phản ánh",
      count: stats.total,
      icon: "📋",
      colorClass: "card-total",
    },
    {
      key: "PENDING",
      label: "Chưa kiểm chứng",
      count: stats.unverified,
      icon: "🟡",
      colorClass: "card-unverified",
      badgeText: "Cần duyệt",
    },
    {
      key: "CRITICAL",
      label: "Khẩn cấp / Cao",
      count: stats.critical,
      icon: "🚨",
      colorClass: "card-critical",
      badgeText: "Ưu tiên",
    },
    {
      key: "IN_PROGRESS",
      label: "Đang xử lý",
      count: stats.in_progress,
      icon: "⚙️",
      colorClass: "card-progress",
    },
    {
      key: "RESOLVED",
      label: "Đã hoàn thành",
      count: stats.resolved,
      icon: "✅",
      colorClass: "card-resolved",
    },
    {
      key: "SLA_WARNING",
      label: "Cảnh báo SLA",
      count: stats.sla_warning,
      icon: "⏱️",
      colorClass: "card-sla",
    },
  ];

  return (
    <div className="incident-stats-grid">
      {cards.map((c) => {
        const isActive = selectedFilter === c.key;
        return (
          <button
            key={c.key}
            type="button"
            className={`stat-card ${c.colorClass} ${isActive ? "active" : ""}`}
            onClick={() => onSelectFilter(c.key)}
          >
            <div className="stat-card-header">
              <span className="stat-icon">{c.icon}</span>
              {c.badgeText && <span className="stat-badge">{c.badgeText}</span>}
            </div>
            <div className="stat-card-body">
              <span className="stat-number">{c.count}</span>
              <span className="stat-label">{c.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

