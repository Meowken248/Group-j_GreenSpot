import React, { useState, useEffect } from "react";
import { reportsApi } from "./reportsApi";
import type { OpenDataIncidentRecord, PublicReportSummary } from "./types";
import { PublicEnvironmentalDashboard } from "./PublicEnvironmentalDashboard";
import "./reports.css";

export const ReportsContainer: React.FC = () => {
  const [mainTab, setMainTab] = useState<"DASHBOARD" | "OPEN_DATA">(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#open-data") return "OPEN_DATA";
    return "DASHBOARD";
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");

  const [summary, setSummary] = useState<PublicReportSummary | null>(null);
  const [records, setRecords] = useState<OpenDataIncidentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === "#open-data") setMainTab("OPEN_DATA");
      else if (hash === "#public-dashboard" || hash === "#reports") setMainTab("DASHBOARD");
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const districtsList = [
    { code: "ALL", name: "Toàn Thành phố" },
    { code: "TP_THU_DUC", name: "TP. Thủ Đức" },
    { code: "QUAN_1", name: "Quận 1" },
    { code: "QUAN_3", name: "Quận 3" },
    { code: "BINH_THANH", name: "Quận Bình Thạnh" },
    { code: "GO_VAP", name: "Quận Gò Vấp" },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sum, recs] = await Promise.all([
        reportsApi.getPublicSummary({
          year: selectedYear,
          month: selectedMonth,
          district: selectedDistrict,
        }),
        reportsApi.getOpenDataRecords({
          year: selectedYear,
          month: selectedMonth,
          district: selectedDistrict,
          limit: 100,
        }),
      ]);
      setSummary(sum);
      setRecords(recs);
    } catch (e: any) {
      console.error("Lỗi tải báo cáo:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === "OPEN_DATA") {
      fetchData();
    }
  }, [mainTab, selectedMonth, selectedYear, selectedDistrict]);

  const handleDownloadExcel = () => {
    reportsApi.downloadExcel(selectedYear, selectedMonth, selectedDistrict);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="reports-container">
      {/* THANH CHUYỂN TAB CHỨC NĂNG 33 & CHỨC NĂNG 36 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "14px" }}>
        <button
          type="button"
          onClick={() => {
            setMainTab("DASHBOARD");
            window.location.hash = "#public-dashboard";
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: mainTab === "DASHBOARD" ? "1px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.08)",
            background: mainTab === "DASHBOARD" ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,78,59,0.4))" : "#0f172a",
            color: mainTab === "DASHBOARD" ? "#34d399" : "#94a3b8",
            boxShadow: mainTab === "DASHBOARD" ? "0 4px 15px rgba(16,185,129,0.2)" : "none",
          }}
        >
          <span>📊</span> BẢNG ĐIỀU KHIỂN DÂN SINH (CN 33)
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab("OPEN_DATA");
            window.location.hash = "#open-data";
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: mainTab === "OPEN_DATA" ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(255,255,255,0.08)",
            background: mainTab === "OPEN_DATA" ? "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(12,74,110,0.4))" : "#0f172a",
            color: mainTab === "OPEN_DATA" ? "#38bdf8" : "#94a3b8",
            boxShadow: mainTab === "OPEN_DATA" ? "0 4px 15px rgba(56,189,248,0.2)" : "none",
          }}
        >
          <span>📑</span> BÁO CÁO ĐỊNH KỲ & DỮ LIỆU MỞ (CN 36)
        </button>
      </div>

      {mainTab === "DASHBOARD" ? (
        <PublicEnvironmentalDashboard />
      ) : (
        <>
          {/* Tiêu đề & Giới thiệu */}
          <div className="reports-header">
            <div>
              <h1 className="reports-title">
                <span>📊</span> Trung Tâm Kết Xuất Bản Tin Báo Cáo & Dữ Liệu Mở Môi Trường (CN 36)
              </h1>
              <p className="reports-subtitle">
                Minh bạch hóa thông tin môi trường đô thị (Open Data): Cho phép người dân, cơ quan báo chí và nhà nghiên cứu tự do tải về báo cáo PDF và bảng dữ liệu Excel đã ẩn danh hóa 100%.
              </p>
            </div>
          </div>

      {/* KHỐI BỘ LỌC (EXP_DDL_PERIOD, EXP_DDL_DISTRICT) */}
      <div className="reports-filters-card">
        <div className="filter-group">
          <label className="filter-label" htmlFor="EXP_DDL_PERIOD">
            📅 Kỳ báo cáo:
          </label>
          <select
            id="EXP_DDL_PERIOD"
            className="filter-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            <option value={10}>Tháng 10 (Kỳ hiện tại)</option>
            <option value={9}>Tháng 09</option>
            <option value={8}>Tháng 08</option>
            <option value={7}>Tháng 07</option>
          </select>

          <label className="filter-label" htmlFor="EXP_DDL_YEAR" style={{ marginLeft: "12px" }}>
            Năm:
          </label>
          <select
            id="EXP_DDL_YEAR"
            className="filter-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>

          <label className="filter-label" htmlFor="EXP_DDL_DISTRICT" style={{ marginLeft: "12px" }}>
            📍 Phạm vi địa bàn:
          </label>
          <select
            id="EXP_DDL_DISTRICT"
            className="filter-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
          >
            {districtsList.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>

          {loading && (
            <span style={{ color: "#38bdf8", fontSize: "12px", marginLeft: "12px" }}>
              Đang tải dữ liệu...
            </span>
          )}
        </div>

        <div style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>
          🔒 Chuẩn bảo vệ quyền riêng tư: 100% Ẩn danh hóa (OPEN_001)
        </div>
      </div>

      {/* KHỐI NÚT KẾT XUẤT VÀ TẢI TỆP (EXP_BTN_DOWNLOAD_PDF, EXP_BTN_DOWNLOAD_XLS, EXP_PREVIEW_MODAL) */}
      <div className="download-actions-card">
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#f8fafc", fontWeight: 800 }}>
            Tải Bản Tin Hiện Trạng Tháng {selectedMonth}/{selectedYear}
          </h3>
          <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
            Định dạng tệp đã được chuẩn hóa phục vụ tra cứu cộng đồng, trích dẫn báo chí và nghiên cứu học thuật.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="download-btn"
            onClick={() => setPreviewOpen(true)}
            style={{ background: "#334155", color: "#fff" }}
          >
            <span>👁️</span> Xem Trước Trực Tuyến
          </button>

          <button
            id="EXP_BTN_DOWNLOAD_PDF"
            type="button"
            className="download-btn download-btn-pdf"
            onClick={handlePrintPDF}
            title="Tải bản tin tóm tắt in ấn định dạng PDF"
          >
            <span>📄</span> Tải Bản Tin PDF
          </button>

          <button
            id="EXP_BTN_DOWNLOAD_XLS"
            type="button"
            className="download-btn download-btn-excel"
            onClick={handleDownloadExcel}
            title="Tải bảng tính Excel dữ liệu mở (.xlsx)"
          >
            <span>📗</span> Tải Dữ Liệu Mở (.xlsx)
          </button>
        </div>
      </div>

      {/* CÁC THẺ CARD CHỈ SỐ MÔI TRƯỜNG ĐÔ THỊ */}
      <div className="reports-stat-grid">
        <div className="stat-card green-accent">
          <div className="stat-card-title">Tổng số phản ánh môi trường</div>
          <div className="stat-card-val" style={{ color: "#38bdf8" }}>
            {summary?.total_incidents || 0}
          </div>
          <div className="stat-card-desc">Ghi nhận từ công dân & trạm giám sát</div>
        </div>

        <div className="stat-card green-accent">
          <div className="stat-card-title">Đã thu gom & dọn sạch</div>
          <div className="stat-card-val" style={{ color: "#22c55e" }}>
            {summary?.resolved_incidents || 0}
          </div>
          <div className="stat-card-desc">Có ảnh đối chứng After nghiệm thu</div>
        </div>

        <div className="stat-card green-accent">
          <div className="stat-card-title">Tỷ lệ hoàn thành đúng hạn (SLA)</div>
          <div className="stat-card-val" style={{ color: "#fbbf24" }}>
            {summary?.resolution_rate || 100}%
          </div>
          <div className="stat-card-desc">Thời gian xử lý trung bình: 36 giờ</div>
        </div>

        <div className="stat-card green-accent">
          <div className="stat-card-title">Chất lượng không khí AQI bình quân</div>
          <div className="stat-card-val" style={{ color: "#4ade80" }}>
            {summary?.average_aqi || 68.5}
          </div>
          <div className="stat-card-desc">{summary?.air_quality_status || "AN TOÀN"}</div>
        </div>
      </div>

      {/* BẢNG TẬP DỮ LIỆU MỞ ẨN DANH HÓA CHO CỘNG ĐỒNG */}
      <div className="open-data-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#38bdf8" }}>
              📋 Bảng Tập Dữ Liệu Mở Sự Cố Môi Trường ({records.length} bản ghi)
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              Toàn bộ dữ liệu cá nhân đã được loại bỏ theo điều kiện ràng buộc kỹ thuật OPEN_001.
            </p>
          </div>
          <span style={{ fontSize: "12px", color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "4px 8px", borderRadius: "6px" }}>
            ✓ Dữ liệu mở công khai
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="open-data-table">
            <thead>
              <tr>
                <th>MÃ SỰ CỐ</th>
                <th>PHÂN LOẠI RÁC / Ô NHIỄM</th>
                <th>MỨC ĐỘ NGUY CẤP</th>
                <th>ĐỊA BÀN PHƯỜNG / QUẬN</th>
                <th>NGÀY TIẾP NHẬN</th>
                <th>TRẠNG THÁI XỬ LÝ</th>
                <th>CAM KẾT SLA</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                    Không có bản ghi ô nhiễm nào trong kỳ báo cáo đã chọn.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.tracking_code}>
                    <td>
                      <strong style={{ color: "#38bdf8" }}>{r.tracking_code}</strong>
                    </td>
                    <td style={{ color: "#f8fafc" }}>{r.category_name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            r.severity === "CRITICAL" || r.severity === "HIGH"
                              ? "#dc2626"
                              : r.severity === "MEDIUM"
                              ? "#d97706"
                              : "#15803d",
                          color: "#fff",
                        }}
                      >
                        {r.severity}
                      </span>
                    </td>
                    <td>{r.district_name}</td>
                    <td>{r.reported_date}</td>
                    <td>
                      <span style={{ color: r.status === "RESOLVED" || r.status === "CLOSED" ? "#22c55e" : "#fbbf24" }}>
                        {r.status === "RESOLVED" || r.status === "CLOSED" ? "Đã dọn sạch" : "Đang xử lý"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: r.sla_status === "ON_TIME" ? "#22c55e" : "#f87171" }}>
                        {r.sla_status === "ON_TIME" ? "✓ Đúng hạn" : "Đang xử lý"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL XEM TRƯỚC BẢN TIN (EXP_PREVIEW_MODAL) */}
      {previewOpen && summary && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000,
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "680px",
              background: "#ffffff",
              color: "#1e293b",
              borderRadius: "16px",
              padding: "28px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #166534", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#166534", fontWeight: 800 }}>
                  BẢN TIN HIỆN TRẠNG MÔI TRƯỜNG ĐÔ THỊ
                </h2>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{summary.period_label} | GreenSpot Open Data Portal</div>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", lineHeight: 1.6, marginBottom: "20px" }}>
              <p>
                <strong>Phạm vi báo cáo:</strong> {summary.district_filter === "ALL" ? "Toàn địa bàn đô thị" : summary.district_filter}
                <br />
                <strong>Thời điểm tạo:</strong> {summary.generated_at}
                <br />
                <strong>Cơ chế bảo mật:</strong> {summary.data_classification}
              </p>

              <h4 style={{ margin: "16px 0 8px", color: "#15803d", fontSize: "14px" }}>I. TÓM TẮT DIỄN BIẾN MÔI TRƯỜNG TRONG KỲ</h4>
              <p>
                Trong kỳ báo cáo, hệ thống GreenSpot đã tiếp nhận tổng cộng <strong>{summary.total_incidents}</strong> lượt phản ánh vi phạm và sự cố vệ sinh môi trường từ cộng đồng dân cư. Lực lượng công ích đô thị và các đội tình nguyện đã hoàn thành dọn dẹp, nghiệm thu sạch sẽ <strong>{summary.resolved_incidents}</strong> điểm ô nhiễm, đạt tỷ lệ hoàn thành <strong>{summary.resolution_rate}%</strong>.
              </p>

              <h4 style={{ margin: "16px 0 8px", color: "#15803d", fontSize: "14px" }}>II. CÁC ĐIỂM NÓNG Ô NHIỄM PHỔ BIẾN</h4>
              <ul style={{ paddingLeft: "20px" }}>
                {summary.top_categories.map((c, idx) => (
                  <li key={idx}>
                    {c.category_name}: {c.count} vụ ({c.percentage}%)
                  </li>
                ))}
              </ul>

              <h4 style={{ margin: "16px 0 8px", color: "#15803d", fontSize: "14px" }}>III. KHUYẾN NGHỊ CỘNG ĐỒNG SỐNG XANH</h4>
              <p>
                Tiếp tục thực hiện phân loại rác thải tại nguồn; tích cực tố giác các hành vi đổ trộm xà bần, chất thải nguy hại qua Cổng GreenSpot để nhận Điểm Thưởng Công Dân Xanh.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handlePrintPDF}
                style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#166534", color: "#fff", cursor: "pointer", fontWeight: 700 }}
              >
                In / Lưu Bản Tin PDF
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
