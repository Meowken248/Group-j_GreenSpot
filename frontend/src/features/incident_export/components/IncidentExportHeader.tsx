import React from "react";
import { IconBell, IconFileSpreadsheet, IconBarChart, IconSliders } from "./ExportIcons";

interface IncidentExportHeaderProps {
  activeTab?: string;
}

export const IncidentExportHeader: React.FC<IncidentExportHeaderProps> = ({
  activeTab = "export",
}) => {
  return (
    <header className="export-header" data-testid="export-header">
      <div className="header-inner">
        {/* Logo & Tên hệ thống */}
        <div className="brand-section">
          <div className="brand-icon" aria-label="Logo GreenSpot">
            🌱
          </div>
          <div className="brand-titles">
            <h1>HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG GREENSPOT</h1>
            <span>Cổng trích xuất & Báo cáo số liệu sự cố đô thị </span>
          </div>
        </div>

        {/* Menu quản trị */}
        <nav className="header-nav" aria-label="Menu quản trị">
          <button
            type="button"
            className={`nav-item ${activeTab === "export" ? "active" : ""}`}
            title="Trích xuất dữ liệu"
          >
            <IconFileSpreadsheet size={16} style={{ display: "inline", marginRight: "6px" }} />
            Trích xuất sự cố
          </button>
          <button type="button" className="nav-item" title="Bộ lọc & Thống kê">
            <IconBarChart size={16} style={{ display: "inline", marginRight: "6px" }} />
            Thống kê báo cáo
          </button>
          <button type="button" className="nav-item" title="Cấu hình hệ thống">
            <IconSliders size={16} style={{ display: "inline", marginRight: "6px" }} />
            Cấu hình
          </button>
        </nav>

        {/* Chuông & Avatar */}
        <div className="header-user-controls">
          <button
            type="button"
            className="bell-button"
            aria-label="Thông báo hệ thống"
            title="Thông báo"
          >
            <IconBell size={18} />
            <span className="badge-dot" />
          </button>

          <div className="avatar-wrap" title="Tài khoản Cán bộ thống kê">
            <div className="avatar-img">CB</div>
            <div className="user-meta">
              <div className="name">Lê Anh Tuấn</div>
              <div className="role">Cán bộ Thống kê / QTV</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
