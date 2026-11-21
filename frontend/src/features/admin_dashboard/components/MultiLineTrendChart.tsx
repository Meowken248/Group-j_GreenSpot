/**
 * Biểu Đồ Đường Đa Chỉ Số (SVG Multi-line Trend Chart)
 *
 * File   : FrontEnd/src/features/admin_dashboard/components/MultiLineTrendChart.tsx
 * Chức năng:
 *   - Hiển thị đồng thời 3 đường chỉ số theo ngày:
 *       1. Người dùng mới (Xanh dương - #3b82f6)
 *       2. Bài đăng mới (Xanh ngọc - #10b981)
 *       3. Nhóm mới (Cam - #f97316)
 *   - Lưới tọa độ X/Y với chia mốc tự động
 *   - Gradient area fill nhẹ nhàng tạo chiều sâu
 *   - Con trỏ hover tương tác mượt mà kèm Tooltip chi tiết
 *   - 100% SVG thuần, không phụ thuộc thư viện ngoài, tương thích React 19
 */

import React, { useState } from "react";
import type { DailyStatPoint } from "../types/dashboard.types";

export interface MultiLineTrendChartProps {
  dailySeries: DailyStatPoint[];
}

export const MultiLineTrendChart: React.FC<MultiLineTrendChartProps> = ({
  dailySeries,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!dailySeries || dailySeries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "260px",
          color: "#64748b",
          fontSize: "0.85rem",
        }}
      >
        Không có dữ liệu chuỗi ngày để vẽ biểu đồ
      </div>
    );
  }

  const width = 800;
  const height = 280;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Tính giá trị lớn nhất trong 3 chỉ số để scale trục Y
  const maxUser = Math.max(...dailySeries.map((d) => d.new_users), 0);
  const maxPost = Math.max(...dailySeries.map((d) => d.new_posts), 0);
  const maxGroup = Math.max(...dailySeries.map((d) => d.new_groups), 0);
  const peak = Math.max(maxUser, maxPost, maxGroup, 10);
  // Làm tròn mốc trục Y lên bội số của 10 hoặc 50
  const yMax = Math.ceil((peak * 1.15) / 10) * 10;

  // Tính tọa độ các điểm
  const n = dailySeries.length;
  const getX = (index: number) =>
    padLeft + (n > 1 ? (index / (n - 1)) * chartW : chartW / 2);
  const getY = (val: number) =>
    padTop + chartH - (val / yMax) * chartH;

  // Tạo đường path trơn (smooth SVG path)
  const buildSmoothPath = (values: number[]) => {
    if (values.length === 0) return "";
    const pts = values.map((val, i) => ({ x: getX(i), y: getY(val) }));
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const userPath = buildSmoothPath(dailySeries.map((d) => d.new_users));
  const postPath = buildSmoothPath(dailySeries.map((d) => d.new_posts));
  const groupPath = buildSmoothPath(dailySeries.map((d) => d.new_groups));

  // Area paths cho background gradient
  const userArea = `${userPath} L ${getX(n - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;
  const postArea = `${postPath} L ${getX(n - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;
  const groupArea = `${groupPath} L ${getX(n - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;

  // Mốc trục Y (4 mốc)
  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax];

  // Mốc ngày trục X (hiển thị tối đa 7 nhãn phân bố đều)
  const stepX = Math.max(1, Math.floor(n / 6));
  const xIndices: number[] = [];
  for (let i = 0; i < n; i += stepX) {
    xIndices.push(i);
  }
  if (xIndices[xIndices.length - 1] !== n - 1) {
    xIndices.push(n - 1);
  }

  // Điểm được hover hiện tại
  const currentHover = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < n
    ? dailySeries[hoverIndex]
    : null;
  const hoverX = hoverIndex !== null ? getX(hoverIndex) : 0;

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      data-testid="activity-trend-chart"
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}
        role="img"
        aria-label="Biểu đồ đường thống kê 3 chỉ số: Người dùng mới, Bài đăng mới, Nhóm mới"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {/* Gradient Người dùng (Xanh dương) */}
          <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>

          {/* Gradient Bài đăng (Xanh ngọc) */}
          <linearGradient id="postGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>

          {/* Gradient Nhóm (Cam) */}
          <linearGradient id="groupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* ── LƯỚI TỌA ĐỘ VÀ NHÃN TRỤC Y ─────────────────────────────────── */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                fill="#64748b"
                fontSize="11"
                textAnchor="end"
                fontFamily="system-ui, sans-serif"
              >
                {tick.toLocaleString("vi-VN")}
              </text>
            </g>
          );
        })}

        {/* ── NHÃN TRỤC X (NGÀY) ────────────────────────────────────────── */}
        {xIndices.map((idx) => {
          const x = getX(idx);
          const rawDate = dailySeries[idx]?.stat_date ?? "";
          let label = rawDate;
          if (rawDate.includes("-")) {
            const parts = rawDate.split("-");
            label = `${parts[2]}/${parts[1]}`;
          }
          return (
            <g key={idx}>
              <line
                x1={x}
                y1={padTop + chartH}
                x2={x}
                y2={padTop + chartH + 5}
                stroke="rgba(255, 255, 255, 0.1)"
              />
              <text
                x={x}
                y={padTop + chartH + 20}
                fill="#64748b"
                fontSize="11"
                textAnchor="middle"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── DIỆN TÍCH GRADIENT PHÍA DƯỚI ĐƯỜNG ────────────────────────── */}
        <path d={userArea} fill="url(#userGrad)" />
        <path d={postArea} fill="url(#postGrad)" />
        <path d={groupArea} fill="url(#groupGrad)" />

        {/* ── ĐƯỜNG CONG CHỈ SỐ CHÍNH (STROKE) ─────────────────────────── */}
        {/* 1. Người dùng mới (Xanh dương) */}
        <path
          d={userPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Bài đăng mới (Xanh ngọc) */}
        <path
          d={postPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Nhóm mới (Cam) */}
        <path
          d={groupPath}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── CON TRỎ HOVER (CROSSHAIR & ACTIVE POINTS) ────────────────── */}
        {hoverIndex !== null && currentHover && (
          <g>
            {/* Đường gióng dọc */}
            <line
              x1={hoverX}
              y1={padTop}
              x2={hoverX}
              y2={padTop + chartH}
              stroke="rgba(255, 255, 255, 0.25)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />

            {/* Điểm Người dùng */}
            <circle
              cx={hoverX}
              cy={getY(currentHover.new_users)}
              r="6"
              fill="#3b82f6"
              stroke="#0f172a"
              strokeWidth="2.5"
            />

            {/* Điểm Bài đăng */}
            <circle
              cx={hoverX}
              cy={getY(currentHover.new_posts)}
              r="6"
              fill="#10b981"
              stroke="#0f172a"
              strokeWidth="2.5"
            />

            {/* Điểm Nhóm */}
            <circle
              cx={hoverX}
              cy={getY(currentHover.new_groups)}
              r="6"
              fill="#f97316"
              stroke="#0f172a"
              strokeWidth="2.5"
            />
          </g>
        )}

        {/* ── VÙNG BẮT SỰ KIỆN CHUỘT (INVISIBLE HIT RECTANGLES) ─────────── */}
        {dailySeries.map((_, i) => {
          const sliceW = chartW / n;
          const x = getX(i) - sliceW / 2;
          return (
            <rect
              key={i}
              x={Math.max(x, padLeft)}
              y={padTop}
              width={sliceW}
              height={chartH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* ── TOOLTIP NỔI TƯƠNG TÁC ────────────────────────────────────────── */}
      {currentHover && hoverIndex !== null && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: `${Math.min(Math.max((hoverX / width) * 100, 15), 85)}%`,
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            padding: "10px 14px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            pointerEvents: "none",
            zIndex: 10,
            minWidth: "170px",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#f1f5f9",
              marginBottom: "8px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "4px",
            }}
          >
            Ngày {currentHover.stat_date}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              fontSize: "0.76rem",
              color: "#94a3b8",
              marginBottom: "4px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#3b82f6",
                }}
              />
              Người dùng mới
            </span>
            <strong style={{ color: "#60a5fa" }}>
              +{currentHover.new_users.toLocaleString("vi-VN")}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              fontSize: "0.76rem",
              color: "#94a3b8",
              marginBottom: "4px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              Bài đăng mới
            </span>
            <strong style={{ color: "#34d399" }}>
              +{currentHover.new_posts.toLocaleString("vi-VN")}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              fontSize: "0.76rem",
              color: "#94a3b8",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#f97316",
                }}
              />
              Nhóm mới
            </span>
            <strong style={{ color: "#fb923c" }}>
              +{currentHover.new_groups.toLocaleString("vi-VN")}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiLineTrendChart;
