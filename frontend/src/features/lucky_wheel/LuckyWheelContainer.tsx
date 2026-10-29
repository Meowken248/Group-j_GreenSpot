import React, { useState, useEffect, useCallback, useMemo } from "react";
import { luckyWheelApi } from "./luckyWheelApi";
import type {
  WheelStatusResponse,
  SpinResultResponse,
  SpinHistoryResponse,
  WheelSlotItem,
} from "./types";
import "./lucky_wheel.css";

interface Props {
  onBackToHome?: () => void;
  onNavigateLogin?: () => void;
}

export const LuckyWheelContainer: React.FC<Props> = ({
  onNavigateLogin,
}) => {
  const [viewMode, setViewMode] = useState<"WHEEL" | "HISTORY">("WHEEL");

  // Status & Spinning States
  const [status, setStatus] = useState<WheelStatusResponse | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Result & Modals
  const [wonResult, setWonResult] = useState<SpinResultResponse | null>(null);
  const [showExhaustedModal, setShowExhaustedModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // History State
  const [historyData, setHistoryData] = useState<SpinHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // 1. Fetch Wheel Status
  const fetchStatus = useCallback(async () => {
    try {
      const data = await luckyWheelApi.getWheelStatus();
      setStatus(data);
      setCountdownSeconds(data.next_reset_seconds);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer to midnight 00:00
  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds]);

  const formattedCountdown = useMemo(() => {
    const hours = Math.floor(countdownSeconds / 3600);
    const mins = Math.floor((countdownSeconds % 3600) / 60);
    const secs = countdownSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [countdownSeconds]);

  // 2. Fetch History
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await luckyWheelApi.getSpinHistory();
      setHistoryData(data);
    } catch {
      setHistoryError("Không thể tải lịch sử lượt quay. Vui lòng thử lại");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // 3. Execute Spin
  const handleSpin = async () => {
    if (isSpinning) return;

    if (status && status.spins_left_today <= 0) {
      // Màn 4: Popup Hết lượt hôm nay
      setShowExhaustedModal(true);
      return;
    }

    setIsSpinning(true);

    try {
      const res = await luckyWheelApi.spinWheel();

      // Calculate target rotation angle for chosen slot
      // 8 slots = 45 deg each. Pointer is at TOP (0 deg).
      // Slot center = slot_index * 45 + 22.5 deg.
      // To bring slot under pointer at 0 deg: rotate by 360 - (slot_index * 45 + 22.5)
      const slotAngle = 360 / 8;
      const targetSlotAngle = 360 - (res.slot_index * slotAngle + slotAngle / 2);
      const extraSpins = 360 * 6; // 6 full circles
      const finalDeg = rotationDegrees + extraSpins + (targetSlotAngle - (rotationDegrees % 360));

      setRotationDegrees(finalDeg);

      // Wait 4 seconds for rotation to settle
      setTimeout(() => {
        setIsSpinning(false);
        setWonResult(res);
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                spins_left_today: 0,
                has_spins_today: false,
                total_points_won: prev.total_points_won + res.points_won,
              }
            : null
        );
      }, 4000);
    } catch (err: unknown) {
      setIsSpinning(false);
      if (err && typeof err === "object" && "response" in err) {
        const r = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
        if (r?.status === 401) {
          if (onNavigateLogin) {
            onNavigateLogin();
          } else {
            window.location.hash = "login";
          }
          return;
        } else if (r?.data?.detail === "Hôm nay bạn đã hết lượt quay") {
          setShowExhaustedModal(true);
          return;
        }
      }
      setToastMessage("Mất kết nối. Phần thưởng đã được lưu tự động");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Keyboard Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (wonResult) setWonResult(null);
        if (showExhaustedModal) setShowExhaustedModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [wonResult, showExhaustedModal]);

  const defaultSlots: WheelSlotItem[] = status?.slots || [
    { slot_index: 0, reward_type: "POINTS", reward_name: "+5 Điểm", points_won: 5, icon: "🌱", color: "#10b981" },
    { slot_index: 1, reward_type: "POINTS", reward_name: "+10 Điểm", points_won: 10, icon: "🌿", color: "#059669" },
    { slot_index: 2, reward_type: "POINTS", reward_name: "+15 Điểm", points_won: 15, icon: "⭐", color: "#047857" },
    { slot_index: 3, reward_type: "POINTS", reward_name: "+50 Điểm", points_won: 50, icon: "💎", color: "#0284c7" },
    { slot_index: 4, reward_type: "BADGE", reward_name: "Người gieo mầm", points_won: 10, icon: "🎖️", color: "#f59e0b" },
    { slot_index: 5, reward_type: "BADGE", reward_name: "Trái tim xanh", points_won: 20, icon: "💚", color: "#ec4899" },
    { slot_index: 6, reward_type: "VOUCHER", reward_name: "Voucher 20%", points_won: 5, icon: "🎟️", color: "#8b5cf6" },
    { slot_index: 7, reward_type: "LUCK", reward_name: "Chúc may mắn", points_won: 2, icon: "🍀", color: "#64748b" },
  ];

  return (
    <div className="lw-page-container">
      {/* Header */}
      <div className="lw-header">
        <div>
          <div className="lw-title">
            <span>🎡</span>
            <span>Vòng Quay May Mắn Sinh Thái</span>
          </div>
          <p className="lw-subtitle">
            Mỗi ngày một lượt quay miễn phí! Cơ hội nhận Điểm Xanh, huy hiệu danh dự độc quyền và voucher ưu đãi xanh cùng cộng đồng TP.HCM.
          </p>
        </div>
      </div>

      {/* Main View: Wheel (Màn 1) */}
      {viewMode === "WHEEL" ? (
        <div className="lw-main-grid">
          {/* Left Column: Wheel Stage */}
          <div className="lw-card lw-wheel-stage">
            {/* Top Indicator Pointer */}
            <div className="lw-pointer" />

            {/* Wheel Canvas / SVG */}
            <div className="lw-wheel-outer">
              <svg
                viewBox="0 0 360 360"
                className="lw-wheel-svg"
                style={{
                  transform: `rotate(${rotationDegrees}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.95, 0.35, 1)" : "none",
                }}
              >
                {defaultSlots.map((slot, i) => {
                  const angle = 360 / 8;
                  const startAngle = i * angle;
                  const endAngle = (i + 1) * angle;

                  const rad1 = (Math.PI / 180) * (startAngle - 90);
                  const rad2 = (Math.PI / 180) * (endAngle - 90);
                  const midRad = (Math.PI / 180) * ((startAngle + endAngle) / 2 - 90);

                  const x1 = 180 + 180 * Math.cos(rad1);
                  const y1 = 180 + 180 * Math.sin(rad1);
                  const x2 = 180 + 180 * Math.cos(rad2);
                  const y2 = 180 + 180 * Math.sin(rad2);

                  const tx = 180 + 115 * Math.cos(midRad);
                  const ty = 180 + 115 * Math.sin(midRad);

                  return (
                    <g key={slot.slot_index}>
                      {/* Pie slice */}
                      <path
                        d={`M 180 180 L ${x1} ${y1} A 180 180 0 0 1 ${x2} ${y2} Z`}
                        fill={slot.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Slot text label & icon */}
                      <text
                        x={tx}
                        y={ty}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        transform={`rotate(${(startAngle + endAngle) / 2}, ${tx}, ${ty})`}
                      >
                        {slot.icon} {slot.reward_name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Center Spin Button */}
              <button
                className="lw-center-spin-btn"
                disabled={isSpinning || (status ? status.spins_left_today <= 0 : false)}
                onClick={handleSpin}
              >
                {isSpinning ? "Đang quay…" : "QUAY"}
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, textAlign: "center" }}>
              Bấm nút "QUAY" để thử vận may sinh thái hôm nay
            </p>
          </div>

          {/* Right Column: Spins & Stats */}
          <div className="lw-card">
            <div className="lw-spins-title">
              <span>🎯</span>
              <span>Thông Tin Lượt Quay Hôm Nay</span>
            </div>

            {/* Availability Box */}
            <div
              className={`lw-status-box ${
                status && status.spins_left_today <= 0 ? "exhausted" : ""
              }`}
            >
              <div className="lw-status-icon">
                {status && status.spins_left_today <= 0 ? "⏳" : "🎁"}
              </div>
              <div>
                <div className="lw-status-text-title">
                  {status && status.spins_left_today > 0
                    ? "Còn 1 lượt hôm nay"
                    : "Đã hết lượt hôm nay"}
                </div>
                <div className="lw-status-text-desc">
                  {status && status.spins_left_today > 0
                    ? "Bạn có 1 lượt quay miễn phí có sẵn để nhận quà!"
                    : "Mỗi tài khoản được cấp 01 lượt miễn phí mỗi ngày."}
                </div>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="lw-countdown-box">
              <span className="lw-countdown-label">Làm mới lúc 00:00:</span>
              <span className="lw-countdown-timer">{formattedCountdown}</span>
            </div>

            {/* Action Buttons */}
            <button
              className="lw-btn-action lw-btn-spin-main"
              disabled={isSpinning || (status ? status.spins_left_today <= 0 : false)}
              onClick={handleSpin}
            >
              <span>{isSpinning ? "⏳" : "🎡"}</span>
              <span>{isSpinning ? "Vòng quay đang quay…" : "Quay ngay"}</span>
            </button>

            <button
              className="lw-btn-action lw-btn-history"
              onClick={() => {
                setViewMode("HISTORY");
                fetchHistory();
              }}
            >
              <span>📜</span>
              <span>Xem lịch sử lượt quay</span>
            </button>
          </div>
        </div>
      ) : (
        /* Màn 3: Lịch Sử Lượt Quay (Table 147) */
        <div className="lw-history-grid">
          {/* Left Column: History list */}
          <div className="lw-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div className="lw-spins-title" style={{ margin: 0 }}>
                <span>📜</span>
                <span>Nhật Ký 30 Ngày Gần Nhất</span>
              </div>
              <button
                className="lw-btn-history"
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem", borderRadius: "0.375rem" }}
                onClick={() => setViewMode("WHEEL")}
              >
                ← Quay lại vòng quay
              </button>
            </div>

            {historyError ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>
                <p>{historyError}</p>
                <button
                  className="lw-btn-spin-main"
                  style={{ width: "auto", margin: "0 auto", padding: "0.5rem 1rem" }}
                  onClick={fetchHistory}
                >
                  Thử lại
                </button>
              </div>
            ) : loadingHistory ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                Đang nạp dữ liệu lịch sử…
              </div>
            ) : historyData?.history.length === 0 ? (
              <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🍀</div>
                <p style={{ fontWeight: 600 }}>
                  {historyData?.empty_message || "Bạn chưa có lượt quay nào. Hãy thử vận may hôm nay!"}
                </p>
              </div>
            ) : (
              <div>
                {historyData?.history.map((item) => (
                  <div key={item.spin_id} className="lw-history-item">
                    <div>
                      <span className="lw-history-reward">{item.reward_name}</span>
                      <div className="lw-history-date">{item.formatted_time}</div>
                    </div>
                    {item.points_won > 0 && (
                      <span style={{ fontWeight: 800, color: "#059669" }}>
                        +{item.points_won} Điểm
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Aggregates */}
          <div className="lw-card">
            <div className="lw-spins-title">
              <span>📊</span>
              <span>Tổng Kết Phần Thưởng</span>
            </div>

            <div className="lw-stat-box">
              <div className="lw-stat-box-val">
                {historyData?.total_points_won.toLocaleString() || 0}
              </div>
              <div className="lw-stat-box-lbl">Tổng Điểm Xanh đã trúng</div>
            </div>

            <div className="lw-stat-box">
              <div className="lw-stat-box-val">
                {historyData?.total_badges_won || 0}
              </div>
              <div className="lw-stat-box-lbl">Huy hiệu độc quyền sở hữu</div>
            </div>

            <button
              className="lw-btn-action lw-btn-spin-main"
              onClick={() => setViewMode("WHEEL")}
            >
              Về bàn quay thưởng
            </button>
          </div>
        </div>
      )}

      {/* MÀN 2: POPUP BẠN TRÚNG THƯỞNG (Table 146) */}
      {wonResult && (
        <div className="lw-modal-overlay" onClick={() => setWonResult(null)}>
          <div className="lw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lw-modal-badge-img">
              {wonResult.reward_type === "BADGE" ? "🎖️" : wonResult.reward_type === "VOUCHER" ? "🎟️" : "💎"}
            </div>
            <h3 className="lw-modal-title reward">BẠN TRÚNG THƯỞNG!</h3>
            <div className="lw-reward-name-badge">
              {wonResult.reward_name}
            </div>
            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, margin: "0.5rem 0" }}>
              {wonResult.message}
            </p>
            <div className="lw-modal-buttons">
              <button
                className="lw-btn-action lw-btn-spin-main"
                style={{ width: "auto", padding: "0.65rem 1.75rem" }}
                onClick={() => {
                  setWonResult(null);
                  setToastMessage("Phần thưởng đã được cộng vào tài khoản của bạn");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
              >
                Nhận thưởng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN 4: POPUP HẾT LƯỢT HÔM NAY (Table 148) */}
      {showExhaustedModal && (
        <div className="lw-modal-overlay" onClick={() => setShowExhaustedModal(false)}>
          <div className="lw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⏳</div>
            <h3 className="lw-modal-title exhausted">HẾT LƯỢT HÔM NAY</h3>
            <p style={{ color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, margin: "1rem 0" }}>
              Hôm nay bạn đã hết lượt quay. Hãy quay lại vào ngày mai để nhận lượt quay miễn phí mới!
            </p>
            <div className="lw-countdown-box" style={{ justifyContent: "center", gap: "1rem" }}>
              <span className="lw-countdown-label">Làm mới sau:</span>
              <span className="lw-countdown-timer">{formattedCountdown}</span>
            </div>
            <div className="lw-modal-buttons">
              <button
                className="lw-btn-action lw-btn-history"
                style={{ width: "auto", padding: "0.65rem 1.75rem" }}
                onClick={() => setShowExhaustedModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast message */}
      {toastMessage && (
        <div className="lw-toast">{toastMessage}</div>
      )}
    </div>
  );
};

export default LuckyWheelContainer;
