import React, { useState, useMemo } from "react";
import type { ProvinceTableRow } from "./types";

interface DataTableTabProps {
  rows: ProvinceTableRow[];
  loading: boolean;
  onSelectProvince?: (slug: string) => void;
}

type SortField = "name" | "aqi" | "pm2_5" | "pm10" | "temp" | "humidity" | "wind_speed" | "rain";

export const DataTableTab: React.FC<DataTableTabProps> = ({
  rows,
  loading,
  onSelectProvince,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Tất cả");
  const [sortField, setSortField] = useState<SortField>("aqi");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for metrics
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    return rows
      .filter((r) => {
        const matchesSearch =
          r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.macro_region.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
          selectedFilter === "Tất cả" || r.status_label === selectedFilter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortAsc
          ? (Number(aVal) || 0) - (Number(bVal) || 0)
          : (Number(bVal) || 0) - (Number(aVal) || 0);
      });
  }, [rows, searchTerm, selectedFilter, sortField, sortAsc]);

  const handleExportCSV = () => {
    const headers = [
      "Tỉnh Thành",
      "Vùng Miền",
      "Chỉ Số AQI",
      "Mức Cảnh Báo",
      "Chất Chủ Đạo",
      "PM2.5 (µg/m³)",
      "PM10 (µg/m³)",
      "Nhiệt Độ (°C)",
      "Độ Ẩm (%)",
      "Tốc Độ Gió (km/h)",
      "Lượng Mưa (mm)",
    ];
    const csvRows = [headers.join(",")];
    for (const r of filteredAndSortedRows) {
      csvRows.push(
        [
          `"${r.name}"`,
          `"${r.macro_region}"`,
          r.aqi,
          `"${r.status_label}"`,
          `"${r.dominant_pollutant}"`,
          r.pm2_5,
          r.pm10,
          r.temp,
          r.humidity,
          r.wind_speed,
          r.rain,
        ].join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Vietnam_AQI_34_Provinces_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const aqiFilterOptions = [
    "Tất cả",
    "Tốt",
    "Vừa phải",
    "Không lành mạnh cho nhóm nhạy cảm",
    "Không khỏe mạnh",
    "Rất không tốt cho sức khỏe",
  ];

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
        Đang tải bảng dữ liệu 34 tỉnh thành...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* TOOLBAR CONTROLS */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          background: "rgba(30, 41, 59, 0.5)",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
          {/* SEARCH INPUT */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="🔍 Tìm theo tên tỉnh, vùng miền..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(15, 23, 42, 0.8)",
                color: "#f8fafc",
                fontSize: "13px",
                minWidth: "240px",
                outline: "none",
              }}
            />
          </div>

          {/* FILTER BY AQI STATUS */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              background: "rgba(15, 23, 42, 0.8)",
              color: "#f8fafc",
              fontSize: "13px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {aqiFilterOptions.map((opt) => (
              <option key={opt} value={opt}>
                Mức: {opt}
              </option>
            ))}
          </select>
        </div>

        {/* EXPORT BUTTON */}
        <button
          type="button"
          onClick={handleExportCSV}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            background: "rgba(56, 189, 248, 0.15)",
            color: "#38bdf8",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>📥</span>
          <span>Xuất Báo Cáo CSV</span>
        </button>
      </div>

      {/* DATA TABLE */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(15, 23, 42, 0.7)", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("name")}>
                  Tỉnh/Thành {sortField === "name" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px" }}>Vùng Miền</th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("aqi")}>
                  AQI {sortField === "aqi" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px" }}>Đánh Giá</th>
                <th style={{ padding: "12px 14px" }}>Chất Chủ Yếu</th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("pm2_5")}>
                  PM2.5 {sortField === "pm2_5" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("pm10")}>
                  PM10 {sortField === "pm10" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("temp")}>
                  Nhiệt Độ {sortField === "temp" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("humidity")}>
                  Độ Ẩm {sortField === "humidity" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("wind_speed")}>
                  Gió {sortField === "wind_speed" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => handleSort("rain")}>
                  Mưa {sortField === "rain" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map((r, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    color: "#cbd5e1",
                    cursor: onSelectProvince ? "pointer" : "default",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => onSelectProvince && onSelectProvince(r.slug)}
                >
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "#f8fafc" }}>
                    {r.name}
                  </td>
                  <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{r.macro_region}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontWeight: 700,
                        color: r.color,
                        background: `${r.color}20`,
                      }}
                    >
                      {r.aqi}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px", color: r.color, fontWeight: 500 }}>
                    {r.status_label}
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 600, color: "#38bdf8" }}>
                    {r.dominant_pollutant}
                  </td>
                  <td style={{ padding: "12px 14px" }}>{r.pm2_5} µg/m³</td>
                  <td style={{ padding: "12px 14px" }}>{r.pm10} µg/m³</td>
                  <td style={{ padding: "12px 14px" }}>{r.temp} °C</td>
                  <td style={{ padding: "12px 14px" }}>{r.humidity} %</td>
                  <td style={{ padding: "12px 14px" }}>{r.wind_speed} km/h</td>
                  <td style={{ padding: "12px 14px" }}>{r.rain} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default DataTableTab;
