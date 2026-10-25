import React, { useState } from "react";
import type {
  FilterAnalysisRequest,
  FilterAnalysisResponse,
  RiskPeriodType,
  RiskTypeCode,
} from "../types/riskDashboard.types";
import { DonutPieChart } from "./DonutPieChart";

interface Screen2AnalysisProps {
  analysisData: FilterAnalysisResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onApplyFilter: (request: FilterAnalysisRequest) => void;
  onExport: (format: "csv" | "excel" | "pdf") => void;
  onRetry: () => void;
}

const DISTRICT_OPTIONS = [
  { id: 1, name: "Quận Bình Tân" },
  { id: 2, name: "Quận 8" },
  { id: 3, name: "Huyện Hóc Môn" },
  { id: 4, name: "TP. Thủ Đức" },
  { id: 5, name: "Quận Bình Thạnh" },
  { id: 6, name: "Quận 7" },
  { id: 7, name: "Quận 12" },
  { id: 8, name: "Quận Tân Phú" },
  { id: 9, name: "Quận Gò Vấp" },
  { id: 10, name: "Huyện Bình Chánh" },
  { id: 11, name: "Quận Tân Bình" },
  { id: 12, name: "Quận 6" },
  { id: 13, name: "Quận 4" },
  { id: 14, name: "Quận 11" },
  { id: 15, name: "Quận 10" },
  { id: 16, name: "Huyện Nhà Bè" },
  { id: 17, name: "Quận 5" },
  { id: 18, name: "Quận Phú Nhuận" },
  { id: 19, name: "Huyện Củ Chi" },
  { id: 20, name: "Quận 3" },
  { id: 21, name: "Quận 1" },
  { id: 22, name: "Huyện Cần Giờ" },
];

export const Screen2Analysis: React.FC<Screen2AnalysisProps> = ({
  analysisData,
  isLoading,
  errorMessage,
  onApplyFilter,
  onExport,
  onRetry,
}) => {
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "ALL">("ALL");
  const [period, setPeriod] = useState<RiskPeriodType>("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [selectedTypes, setSelectedTypes] = useState<Record<RiskTypeCode, boolean>>({
    DOMESTIC_WASTE: true,
    HAZARDOUS_WASTE: true,
    FLOOD: true,
    AIR_POLLUTION: true,
  });

  const handleToggleType = (code: RiskTypeCode) => {
    setSelectedTypes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleExecuteFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeTypes = (Object.keys(selectedTypes) as RiskTypeCode[]).filter((k) => selectedTypes[k]);

    const req: FilterAnalysisRequest = {
      district_ids: selectedDistrictId === "ALL" ? undefined : [selectedDistrictId],
      risk_types: activeTypes.length > 0 ? activeTypes : undefined,
      period,
      start_date: period === "CUSTOM" && customStartDate ? customStartDate : undefined,
      end_date: period === "CUSTOM" && customEndDate ? customEndDate : undefined,
    };
    onApplyFilter(req);
  };

  const hasData = analysisData?.has_data ?? false;
  const isPositiveComparison = analysisData?.period_comparison?.is_positive ?? true;

  return (
    <div className="three-column-grid">
      {/* 1. KHỐI "BỘ LỌC" (CỘT TRÁI) */}
      <section className="col-card" aria-label="Khối Bộ lọc chuyên sâu">
        <div className="col-header">
          <div className="col-title">
            <span>⚙️</span>
            <span>BỘ LỌC</span>
          </div>
          <span className="col-badge">Tùy biến</span>
        </div>

        <form className="filters-form" onSubmit={handleExecuteFilter}>
          {/* Lọc Quận/Huyện */}
          <div className="filter-group">
            <label htmlFor="filter-district">Quận/Huyện:</label>
            <select
              id="filter-district"
              value={selectedDistrictId}
              onChange={(e) => setSelectedDistrictId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            >
              <option value="ALL">Toàn thành phố (22 Quận/Huyện & TP. Thủ Đức)</option>
              {DISTRICT_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Loại rủi ro */}
          <div className="filter-group">
            <label>Loại rủi ro:</label>
            <div className="checkbox-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.DOMESTIC_WASTE}
                  onChange={() => handleToggleType("DOMESTIC_WASTE")}
                />
                <span>Rác sinh hoạt ùn ứ</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.HAZARDOUS_WASTE}
                  onChange={() => handleToggleType("HAZARDOUS_WASTE")}
                />
                <span>Rác nguy hại y tế/công nghiệp</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.FLOOD}
                  onChange={() => handleToggleType("FLOOD")}
                />
                <span>Điểm ngập nước</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedTypes.AIR_POLLUTION}
                  onChange={() => handleToggleType("AIR_POLLUTION")}
                />
                <span>Ô nhiễm khói bụi</span>
              </label>
            </div>
          </div>

          {/* Lọc Khoảng thời gian */}
          <div className="filter-group">
            <label htmlFor="filter-period">Khoảng thời gian:</label>
            <select
              id="filter-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as RiskPeriodType)}
            >
              <option value="THIS_MONTH">Tháng này</option>
              <option value="THIS_QUARTER">Quý này</option>
              <option value="LAST_6_MONTHS">6 tháng qua</option>
              <option value="CUSTOM">Khoảng ngày tùy chỉnh</option>
            </select>

            {period === "CUSTOM" && (
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Từ ngày"
                  title="Từ ngày"
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="Đến ngày"
                  title="Đến ngày"
                />
              </div>
            )}
          </div>

          {/* Nút "Áp dụng" theo đúng wireframe */}
          <button type="submit" className="btn-apply-filter" disabled={isLoading}>
            {isLoading ? <span>⏳ Đang phân tích...</span> : <span>🔍 Áp dụng</span>}
          </button>

          {/* Nút Trích xuất Excel & PDF phục vụ cuộc họp giao ban */}
          <div className="export-actions">
            <button
              type="button"
              className="btn-export"
              onClick={() => onExport("csv")}
              title="Xuất bảng số liệu ra Excel (.CSV UTF-8)"
            >
              <span>📥</span>
              <span>Xuất Excel</span>
            </button>
            <button
              type="button"
              className="btn-export"
              onClick={() => onExport("pdf")}
              title="Xuất báo cáo PDF giao ban định kỳ"
            >
              <span>📄</span>
              <span>Xuất PDF</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. KHỐI "KẾT QUẢ" (CỘT GIỮA) */}
      <section className="col-card" aria-label="Khối Kết quả phân tích">
        <div className="col-header">
          <div className="col-title">
            <span>📋</span>
            <span>KẾT QUẢ</span>
          </div>
          <span className="col-badge">Chi tiết định lượng</span>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Đang phân tích và xử lý dữ liệu lớn...</span>
          </div>
        ) : errorMessage ? (
          <div className="error-container">
            <span>❌ {errorMessage}</span>
            <button type="button" className="btn-retry" onClick={onRetry}>
              Thử lại
            </button>
          </div>
        ) : !hasData ? (
          <div className="empty-state">
            <span>📭</span>
            <span>{analysisData?.empty_message || "Không có dữ liệu phân tích trong giai đoạn đã chọn"}</span>
          </div>
        ) : (
          <div className="results-stack">
            {/* Bảng số liệu định lượng chi tiết */}
            <div className="results-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Chỉ tiêu định lượng</th>
                    <th>Giá trị đo đạc</th>
                    <th>Đánh giá hiện trạng</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Tổng số sự cố phát sinh</strong></td>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>
                      {analysisData?.summary_table.total_incidents} vụ
                    </td>
                    <td>
                      <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: 600 }}>
                        {analysisData?.summary_table.open_incidents} đang mở • {analysisData?.summary_table.resolved_incidents} đã nghiệm thu
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Khối lượng rác ước tính</strong></td>
                    <td style={{ fontWeight: 700, color: "#0284c7" }}>
                      {analysisData?.summary_table.estimated_waste_volume_m3.toLocaleString("vi-VN")} m³
                    </td>
                    <td style={{ fontSize: "12px", color: "#64748b" }}>
                      Quy chuẩn tính theo thể tích thu gom cơ giới
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Tỷ lệ xử lý đúng hạn SLA</strong></td>
                    <td style={{ fontWeight: 700, color: "#10b981" }}>
                      {analysisData?.summary_table.sla_on_time_rate_percent}%
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: (analysisData?.summary_table.sla_on_time_rate_percent ?? 0) >= 90 ? "#d1fae5" : "#fee2e2",
                          color: (analysisData?.summary_table.sla_on_time_rate_percent ?? 0) >= 90 ? "#065f46" : "#991b1b",
                        }}
                      >
                        {(analysisData?.summary_table.sla_on_time_rate_percent ?? 0) >= 90 ? "Đạt chuẩn cam kết" : "Cần đẩy nhanh tiến độ"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Biểu đồ tròn theo loại */}
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
                Biểu đồ tròn theo loại: Tỷ lệ % giữa các dạng rủi ro môi trường
              </div>
              <DonutPieChart data={analysisData?.risk_type_distribution || []} />
            </div>
          </div>
        )}
      </section>

      {/* 3. KHỐI "SO SÁNH" (CỘT PHẢI) */}
      <section className="col-card" aria-label="Khối So sánh chu kỳ">
        <div className="col-header">
          <div className="col-title">
            <span>⚖️</span>
            <span>SO SÁNH</span>
          </div>
          <span className="col-badge">Kỳ này vs kỳ trước</span>
        </div>

        {isLoading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Đang đối soát số liệu chu kỳ...</span>
          </div>
        ) : !hasData ? (
          <div className="empty-state">
            <span>Chưa có dữ liệu so sánh</span>
          </div>
        ) : (
          <div className="comparison-stack">
            {/* Box hiển thị tăng trưởng / suy giảm */}
            <div
              className={`comparison-metric-box ${
                isPositiveComparison ? "positive-trend" : "negative-trend"
              }`}
            >
              <span className="trend-label">Biến động chỉ số rủi ro môi trường</span>
              <div className="trend-value">
                <span>{isPositiveComparison ? "📉" : "📈"}</span>
                <span>{analysisData?.period_comparison.comparison_text}</span>
              </div>
              <span className="trend-note" style={{ color: isPositiveComparison ? "#047857" : "#b91c1c" }}>
                {analysisData?.period_comparison.message}
              </span>
            </div>

            {/* Chi tiết điểm số đối chiếu */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b" }}>Điểm kỳ hiện tại:</span>
                <span style={{ fontWeight: 700 }}>{analysisData?.period_comparison.current_period_score} / 100</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px", background: "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: "#64748b" }}>Điểm cùng kỳ trước:</span>
                <span style={{ fontWeight: 700 }}>{analysisData?.period_comparison.previous_period_score} / 100</span>
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "#64748b", lineHeight: "1.5", marginTop: "10px" }}>
              💡 <em>Đánh giá:</em> Giúp cán bộ chuyên trách đánh giá hiệu quả của các biện pháp xử lý môi trường đã triển khai trong kỳ, nhận diện dạng rủi ro chiếm tỷ trọng lớn nhất để có giải pháp xử lý triệt để.
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
