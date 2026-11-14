import React, { useState, useEffect, useCallback, useMemo } from "react";
import { luckyWheelApi } from "./luckyWheelApi";
import type {
  WheelStatusResponse,
  SpinResultResponse,
  SpinHistoryResponse,
  WheelSlotItem,
  WheelSlotCreateInput,
  WheelSlotUpdateInput,
  AdminSlotStatsResponse,
} from "./types";
import "./lucky_wheel.css";

interface Props {
  onBackToHome?: () => void;
  onNavigateLogin?: () => void;
}

// Hàm chia chữ thông minh đảm bảo 100% chữ nằm trọn trong khung múi xoay
function splitSlotText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= 13) {
    return [trimmed];
  }
  // Nếu có ngoặc đơn (ví dụ (+2đ)), tách thành 2 dòng
  if (trimmed.includes("(") && trimmed.includes(")")) {
    const main = trimmed.replace(/\s*\([^)]*\)/, "").trim();
    const paren = trimmed.match(/\(([^)]*)\)/)?.[0] || "";
    return [main.length > 15 ? main.slice(0, 15) : main, paren];
  }
  // Tách từ các tiền tố quen thuộc
  if (trimmed.startsWith("Huy hiệu ") || trimmed.startsWith("Huy Hiệu ")) {
    return ["Huy hiệu", trimmed.substring(9).trim()];
  }
  if (trimmed.startsWith("Voucher ")) {
    return ["Voucher", trimmed.substring(8).trim()];
  }
  // Tách theo khoảng trắng gần giữa chuỗi nhất
  const words = trimmed.split(" ");
  if (words.length <= 1) {
    return [trimmed.slice(0, 12), trimmed.slice(12, 24)];
  }
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.slice(half).join(" ");
  return [line1, line2];
}

const PRESET_COLORS = [
  "#10b981", "#059669", "#047857", "#0284c7",
  "#f59e0b", "#ec4899", "#8b5cf6", "#64748b",
  "#ef4444", "#14b8a6", "#3b82f6", "#84cc16"
];

const PRESET_ICONS = ["🌱", "🌿", "⭐", "💎", "🎖️", "💚", "🎟️", "🍀", "🎁", "🚀", "🌟", "🏆", "🌳", "🚲"];

export const LuckyWheelContainer: React.FC<Props> = ({
  onNavigateLogin,
}) => {
  const [viewMode, setViewMode] = useState<"WHEEL" | "HISTORY" | "ADMIN_CRUD">("WHEEL");

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

  // Admin CRUD State
  const [adminStats, setAdminStats] = useState<AdminSlotStatsResponse | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState<boolean>(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<WheelSlotItem | null>(null);
  const [isSubmittingSlot, setIsSubmittingSlot] = useState<boolean>(false);

  // Form State for Slot Create/Edit
  const [formRewardName, setFormRewardName] = useState<string>("");
  const [formRewardType, setFormRewardType] = useState<string>("POINTS");
  const [formPointsWon, setFormPointsWon] = useState<number>(10);
  const [formBadgeWon, setFormBadgeWon] = useState<string>("");
  const [formVoucherCode, setFormVoucherCode] = useState<string>("");
  const [formIcon, setFormIcon] = useState<string>("🎁");
  const [formColor, setFormColor] = useState<string>("#10b981");
  const [formWeight, setFormWeight] = useState<number>(10);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Fetch Wheel Status (Công dân & Vòng quay)
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

  // 3. Fetch Admin Slots (CRUD)
  const fetchAdminSlots = useCallback(async () => {
    setLoadingAdmin(true);
    try {
      const res = await luckyWheelApi.getAdminSlots();
      setAdminStats(res);
    } catch {
      showToast("Không thể tải danh sách ô thưởng. Vui lòng đăng nhập với quyền Quản trị");
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "ADMIN_CRUD") {
      fetchAdminSlots();
    } else if (viewMode === "HISTORY") {
      fetchHistory();
    }
  }, [viewMode, fetchAdminSlots, fetchHistory]);

  // Danh sách các ô hiển thị trên vòng quay
  const currentSlots: WheelSlotItem[] = useMemo(() => {
    if (status?.slots && status.slots.length > 0) {
      return status.slots;
    }
    return [
      { slot_index: 0, reward_type: "POINTS", reward_name: "+5 Điểm Xanh", points_won: 5, icon: "🌱", color: "#10b981" },
      { slot_index: 1, reward_type: "POINTS", reward_name: "+10 Điểm Xanh", points_won: 10, icon: "🌿", color: "#059669" },
      { slot_index: 2, reward_type: "POINTS", reward_name: "+15 Điểm Xanh", points_won: 15, icon: "⭐", color: "#047857" },
      { slot_index: 3, reward_type: "POINTS", reward_name: "+50 Điểm Xanh đặc biệt", points_won: 50, icon: "💎", color: "#0284c7" },
      { slot_index: 4, reward_type: "BADGE", reward_name: "Huy hiệu Người gieo mầm", points_won: 10, icon: "🎖️", color: "#f59e0b" },
      { slot_index: 5, reward_type: "BADGE", reward_name: "Huy hiệu Trái tim xanh", points_won: 20, icon: "💚", color: "#ec4899" },
      { slot_index: 6, reward_type: "VOUCHER", reward_name: "Voucher ưu đãi sinh thái", points_won: 5, icon: "🎟️", color: "#8b5cf6" },
      { slot_index: 7, reward_type: "LUCK", reward_name: "Khích lệ sống xanh (+2đ)", points_won: 2, icon: "🍀", color: "#64748b" },
    ];
  }, [status]);

  // 4. Quay Vòng May Mắn
  const handleSpin = async () => {
    if (isSpinning) return;

    if (status && status.spins_left_today <= 0) {
      setShowExhaustedModal(true);
      return;
    }

    setIsSpinning(true);

    try {
      const res = await luckyWheelApi.spinWheel();

      // Tính góc quay chuẩn xác đưa tâm của ô trúng về ngay dưới kim chỉ (12h = 0 độ)
      const numSlots = currentSlots.length;
      const slotAngle = 360 / numSlots;
      const targetSlotAngle = 360 - (res.slot_index * slotAngle + slotAngle / 2);
      const extraSpins = 360 * 6; // Quay 6 vòng tăng kịch tính
      const finalDeg = rotationDegrees + extraSpins + (targetSlotAngle - (rotationDegrees % 360));

      setRotationDegrees(finalDeg);

      // Chờ 4 giây cho hiệu ứng quay hoàn tất
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
      showToast("Mất kết nối hoặc hết lượt. Vui lòng thử lại sau!");
    }
  };

  // Keyboard Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (wonResult) setWonResult(null);
        if (showExhaustedModal) setShowExhaustedModal(false);
        if (isSlotModalOpen) setIsSlotModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [wonResult, showExhaustedModal, isSlotModalOpen]);

  // 5. Admin Form Handlers
  const handleOpenCreateModal = () => {
    setEditingSlot(null);
    setFormRewardName("");
    setFormRewardType("POINTS");
    setFormPointsWon(10);
    setFormBadgeWon("");
    setFormVoucherCode("");
    setFormIcon("🌱");
    setFormColor("#10b981");
    setFormWeight(10);
    setFormIsActive(true);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditModal = (slot: WheelSlotItem) => {
    setEditingSlot(slot);
    setFormRewardName(slot.reward_name);
    setFormRewardType(slot.reward_type);
    setFormPointsWon(slot.points_won);
    setFormBadgeWon(slot.badge_won || "");
    setFormVoucherCode(slot.voucher_code || "");
    setFormIcon(slot.icon);
    setFormColor(slot.color);
    setFormWeight(slot.probability_weight || 10);
    setFormIsActive(slot.is_active !== false);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRewardName.trim()) {
      alert("Vui lòng nhập tên phần thưởng");
      return;
    }

    setIsSubmittingSlot(true);
    try {
      if (editingSlot && editingSlot.slot_id) {
        const payload: WheelSlotUpdateInput = {
          reward_name: formRewardName.trim(),
          reward_type: formRewardType,
          points_won: Number(formPointsWon) || 0,
          badge_won: formRewardType === "BADGE" ? formBadgeWon.trim() : null,
          voucher_code: formRewardType === "VOUCHER" ? formVoucherCode.trim() : null,
          icon: formIcon.trim() || "🎁",
          color: formColor,
          probability_weight: Number(formWeight) || 10,
          is_active: formIsActive,
        };
        await luckyWheelApi.updateSlot(editingSlot.slot_id, payload);
        showToast("Đã cập nhật ô giải thưởng thành công!");
      } else {
        const payload: WheelSlotCreateInput = {
          reward_name: formRewardName.trim(),
          reward_type: formRewardType,
          points_won: Number(formPointsWon) || 0,
          badge_won: formRewardType === "BADGE" ? formBadgeWon.trim() : null,
          voucher_code: formRewardType === "VOUCHER" ? formVoucherCode.trim() : null,
          icon: formIcon.trim() || "🎁",
          color: formColor,
          probability_weight: Number(formWeight) || 10,
          is_active: formIsActive,
        };
        await luckyWheelApi.createSlot(payload);
        showToast("Đã thêm mới ô giải thưởng thành công!");
      }

      setIsSlotModalOpen(false);
      await fetchAdminSlots();
      await fetchStatus();
    } catch {
      alert("Lỗi khi lưu ô giải thưởng. Vui lòng kiểm tra quyền quản trị");
    } finally {
      setIsSubmittingSlot(false);
    }
  };

  const handleDeleteSlot = async (slot: WheelSlotItem) => {
    if (!slot.slot_id) return;
    if (adminStats && adminStats.total_slots <= 3) {
      alert("Vòng quay cần tối thiểu 03 ô giải thưởng. Không thể xóa thêm!");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ô '${slot.reward_name}' khỏi vòng quay?`)) {
      return;
    }

    try {
      await luckyWheelApi.deleteSlot(slot.slot_id);
      showToast(`Đã xóa ô '${slot.reward_name}'`);
      await fetchAdminSlots();
      await fetchStatus();
    } catch {
      alert("Lỗi khi xóa ô giải thưởng");
    }
  };

  const handleToggleSlotActive = async (slot: WheelSlotItem) => {
    if (!slot.slot_id) return;
    try {
      await luckyWheelApi.updateSlot(slot.slot_id, {
        is_active: !slot.is_active,
      });
      showToast(`Đã ${!slot.is_active ? "kích hoạt" : "tắt"} ô '${slot.reward_name}'`);
      await fetchAdminSlots();
      await fetchStatus();
    } catch {
      alert("Lỗi khi cập nhật trạng thái ô thưởng");
    }
  };

  const handleResetDefaultSlots = async () => {
    if (!window.confirm("Bạn có chắc muốn khôi phục lại 8 ô giải thưởng mặc định chuẩn ban đầu?")) {
      return;
    }
    try {
      await luckyWheelApi.resetDefaultSlots();
      showToast("Đã khôi phục 8 ô giải thưởng mặc định chuẩn!");
      await fetchAdminSlots();
      await fetchStatus();
    } catch {
      alert("Lỗi khi khôi phục dữ liệu mặc định");
    }
  };

  return (
    <div className="lw-page-container">
      {/* Header Banner */}
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

      {/* Sub-Navigation Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div className="lw-nav-tabs">
          <button
            className={`lw-nav-tab ${viewMode === "WHEEL" ? "active" : ""}`}
            onClick={() => setViewMode("WHEEL")}
          >
            <span>🎡</span>
            <span>Vòng Quay May Mắn</span>
          </button>
          <button
            className={`lw-nav-tab ${viewMode === "HISTORY" ? "active" : ""}`}
            onClick={() => setViewMode("HISTORY")}
          >
            <span>📜</span>
            <span>Lịch Sử Lượt Quay</span>
          </button>
          <button
            className={`lw-nav-tab ${viewMode === "ADMIN_CRUD" ? "active" : ""}`}
            onClick={() => setViewMode("ADMIN_CRUD")}
          >
            <span>⚙️</span>
            <span>Quản Trị Ô Thưởng</span>
            <span className="lw-tab-pill">CRUD</span>
          </button>
        </div>

        {/* Badge cam kết bảo mật & tích điểm trọn đời */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ background: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
            🛡️ Chuẩn kiểm toán SHA-256
          </span>
          <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700 }}>
            1 Lượt / Ngày
          </span>
        </div>
      </div>

      {/* Banner cơ chế động viên lối sống xanh */}
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
        border: "1px solid #a7f3d0",
        borderRadius: "12px",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "10px",
        boxShadow: "0 2px 4px rgba(16, 185, 129, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>🌱</span>
          <div>
            <div style={{ fontWeight: 700, color: "#065f46", fontSize: "0.9rem" }}>
              Cơ chế Động viên Thói quen Sống Xanh Mỗi Ngày
            </div>
            <div style={{ fontSize: "0.8rem", color: "#047857" }}>
              Mỗi lượt quay cộng trực tiếp vào Số dư khả dụng và Điểm xét hạng trọn đời (Bảo toàn 100% khi đổi quà).
            </div>
          </div>
        </div>
        {viewMode === "WHEEL" && (
          <button
            onClick={() => setViewMode("ADMIN_CRUD")}
            style={{
              background: "#059669",
              color: "#ffffff",
              border: "none",
              padding: "5px 12px",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ⚙️ Tùy Chỉnh Ô Thưởng
          </button>
        )}
      </div>

      {/* =====================================================================
          MÀN 1: GIAO DIỆN VÒNG QUAY MAY MẮN (WHEEL VIEW)
          Được căn chỉnh toán học SVG chuẩn: Chữ 100% nằm trọn trong múi
          ===================================================================== */}
      {viewMode === "WHEEL" && (
        <div className="lw-main-grid">
          {/* Cột trái: Bàn quay SVG */}
          <div className="lw-card lw-wheel-stage">
            {/* Kim chỉ vị trí trúng thưởng (Pointer ở đỉnh 12h) */}
            <div className="lw-pointer" />

            {/* Vỏ đĩa quay tròn */}
            <div className="lw-wheel-outer">
              <svg
                viewBox="0 0 360 360"
                className="lw-wheel-svg"
                style={{
                  transform: `rotate(${rotationDegrees}deg)`,
                  transition: isSpinning ? "transform 4s cubic-bezier(0.15, 0.95, 0.35, 1)" : "none",
                }}
              >
                <defs>
                  <filter id="lw-slice-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Vẽ từng múi giải thưởng */}
                {currentSlots.map((slot, i) => {
                  const numSlots = currentSlots.length;
                  const sliceAngle = 360 / numSlots;
                  const startAngle = i * sliceAngle;
                  const endAngle = (i + 1) * sliceAngle;
                  const midAngle = (startAngle + endAngle) / 2;

                  // Tọa độ 2 đỉnh múi tại bán kính R = 175 (Tâm O = 180, 180)
                  const rad1 = (Math.PI / 180) * (startAngle - 90);
                  const rad2 = (Math.PI / 180) * (endAngle - 90);

                  const x1 = 180 + 175 * Math.cos(rad1);
                  const y1 = 180 + 175 * Math.sin(rad1);
                  const x2 = 180 + 175 * Math.cos(rad2);
                  const y2 = 180 + 175 * Math.sin(rad2);

                  // Tách chuỗi chữ thông minh tránh tràn múi
                  const lines = splitSlotText(slot.reward_name);

                  return (
                    <g key={slot.slot_id || slot.slot_index || i}>
                      {/* Cánh quạt / Múi bánh xe */}
                      <path
                        d={`M 180 180 L ${x1} ${y1} A 175 175 0 0 1 ${x2} ${y2} Z`}
                        fill={slot.color}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                      />

                      {/* Khối nội dung xoay dọc theo trục bán kính đối xứng của múi */}
                      <g transform={`rotate(${midAngle}, 180, 180)`}>
                        {/* 1. Biểu tượng Icon đặt gần vành ngoài */}
                        <text
                          x="180"
                          y="32"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="19"
                        >
                          {slot.icon}
                        </text>

                        {/* 2. Dòng chữ nội dung phần thưởng xoay 90 độ đọc từ vành vào trong */}
                        <g transform="translate(180, 84) rotate(90)">
                          {lines.length === 1 ? (
                            <text
                              x="0"
                              y="0"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="#ffffff"
                              fontSize={lines[0].length > 15 ? "10" : "11.5"}
                              fontWeight="800"
                              style={{
                                filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.85))",
                                letterSpacing: "-0.2px",
                              }}
                            >
                              {lines[0]}
                            </text>
                          ) : (
                            <>
                              <text
                                x="0"
                                y="-6"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize={lines[0].length > 14 ? "9" : "10"}
                                fontWeight="800"
                                style={{
                                  filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.85))",
                                  letterSpacing: "-0.2px",
                                }}
                              >
                                {lines[0]}
                              </text>
                              <text
                                x="0"
                                y="6"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="#ffffff"
                                fontSize={lines[1].length > 14 ? "8.5" : "9.5"}
                                fontWeight="700"
                                style={{
                                  filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.85))",
                                  letterSpacing: "-0.2px",
                                }}
                              >
                                {lines[1]}
                              </text>
                            </>
                          )}
                        </g>
                      </g>
                    </g>
                  );
                })}

                {/* Vòng bi đèn LED trang trí quanh viền bánh xe */}
                {Array.from({ length: 16 }).map((_, dotIdx) => {
                  const dotAngle = (dotIdx * 360) / 16;
                  const dotRad = (Math.PI / 180) * (dotAngle - 90);
                  const dx = 180 + 170 * Math.cos(dotRad);
                  const dy = 180 + 170 * Math.sin(dotRad);
                  return (
                    <circle
                      key={dotIdx}
                      cx={dx}
                      cy={dy}
                      r="2.5"
                      fill="#fef08a"
                      stroke="#ca8a04"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Vành đệm bảo vệ trung tâm che đầu nhọn các múi */}
                <circle cx="180" cy="180" r="41" fill="#ffffff" stroke="#e2e8f0" strokeWidth="3" />
              </svg>

              {/* Nút ấn quay ở chính giữa */}
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

          {/* Cột phải: Thông tin lượt quay & Thống kê */}
          <div className="lw-card">
            <div className="lw-spins-title">
              <span>🎯</span>
              <span>Thông Tin Lượt Quay Hôm Nay</span>
            </div>

            {/* Khối hiển thị số lượt */}
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

            {/* Đếm ngược đến 00:00 */}
            <div className="lw-countdown-box">
              <span className="lw-countdown-label">Làm mới lúc 00:00:</span>
              <span className="lw-countdown-timer">{formattedCountdown}</span>
            </div>

            {/* Thống kê cá nhân tích lũy */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.25rem" }}>
              <div className="lw-stat-box" style={{ margin: 0 }}>
                <div className="lw-stat-box-val">{status?.total_points_won || 0}</div>
                <div className="lw-stat-box-lbl">Điểm Xanh Đã Trúng</div>
              </div>
              <div className="lw-stat-box" style={{ margin: 0 }}>
                <div className="lw-stat-box-val">{status?.total_badges_won || 0}</div>
                <div className="lw-stat-box-lbl">Huy Hiệu Đã Trúng</div>
              </div>
            </div>

            {/* Nút bấm hành động */}
            <button
              className="lw-btn-action lw-btn-spin-main"
              disabled={isSpinning || (status ? status.spins_left_today <= 0 : false)}
              onClick={handleSpin}
            >
              <span>🎡</span>
              <span>{isSpinning ? "Đang quay thưởng…" : "Quay ngay"}</span>
            </button>

            <button
              className="lw-btn-action lw-btn-history"
              onClick={() => setViewMode("HISTORY")}
            >
              <span>📜</span>
              <span>Xem lịch sử lượt quay</span>
            </button>

            <button
              className="lw-btn-action"
              style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }}
              onClick={() => setViewMode("ADMIN_CRUD")}
            >
              <span>⚙️</span>
              <span>Quản lý cấu hình ô thưởng (Admin CRUD)</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MÀN 2: LỊCH SỬ LƯỢT QUAY (HISTORY VIEW)
          ===================================================================== */}
      {viewMode === "HISTORY" && (
        <div className="lw-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "10px" }}>
            <div className="lw-spins-title" style={{ margin: 0 }}>
              <span>📜</span>
              <span>Nhật Ký Lịch Sử Quay Thưởng (30 Ngày)</span>
            </div>
            <button
              className="lw-nav-tab active"
              onClick={() => setViewMode("WHEEL")}
              style={{ border: "1px solid #cbd5e1" }}
            >
              <span>⬅️</span>
              <span>Trở về Bàn Quay</span>
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              ⏳ Đang tải lịch sử quay thưởng…
            </div>
          ) : historyError ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#ef4444" }}>
              {historyError}
            </div>
          ) : !historyData || historyData.history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎁</div>
              <div>{historyData?.empty_message || "Bạn chưa có lượt quay nào. Hãy thử vận may hôm nay!"}</div>
            </div>
          ) : (
            <div className="lw-history-grid">
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
                {historyData.history.map((item) => (
                  <div key={item.spin_id} className="lw-history-item">
                    <div>
                      <div className="lw-history-reward">
                        {item.reward_type === "POINTS" && "🌱 "}
                        {item.reward_type === "BADGE" && "🎖️ "}
                        {item.reward_type === "VOUCHER" && "🎟️ "}
                        {item.reward_type === "LUCK" && "🍀 "}
                        {item.reward_name}
                      </div>
                      <div className="lw-history-date">
                        Thời gian: {item.formatted_time} • Ngày {item.spin_date}
                      </div>
                    </div>
                    <div>
                      {item.points_won > 0 && (
                        <span style={{ fontWeight: 800, color: "#059669" }}>
                          +{item.points_won} điểm
                        </span>
                      )}
                      {item.badge_won && (
                        <span style={{ fontWeight: 800, color: "#d97706", marginLeft: "8px" }}>
                          🏅 {item.badge_won}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="lw-stat-box">
                  <div className="lw-stat-box-val">{historyData.total_spins}</div>
                  <div className="lw-stat-box-lbl">Tổng Số Lượt Đã Quay</div>
                </div>
                <div className="lw-stat-box">
                  <div className="lw-stat-box-val">{historyData.total_points_won}</div>
                  <div className="lw-stat-box-lbl">Tổng Điểm Thưởng Tích Lũy</div>
                </div>
                <div className="lw-stat-box">
                  <div className="lw-stat-box-val">{historyData.total_badges_won}</div>
                  <div className="lw-stat-box-lbl">Huy Hiệu Danh Dự Sở Hữu</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MÀN 3: PHÂN HỆ QUẢN TRỊ CRUD Ô GIẢI THƯỞNG (ADMIN CRUD VIEW)
          ===================================================================== */}
      {viewMode === "ADMIN_CRUD" && (
        <div className="lw-card">
          {/* Header Action Bar */}
          <div className="lw-admin-actions-bar">
            <div>
              <div className="lw-spins-title" style={{ margin: 0 }}>
                <span>⚙️</span>
                <span>Quản Trị Danh Mục Ô Giải Thưởng Vòng Quay</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Thêm, sửa, xóa các ô thưởng, cấu hình tỷ lệ xác suất (weight), màu sắc và điểm thưởng.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={handleResetDefaultSlots}
                style={{
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  padding: "0.55rem 1rem",
                  borderRadius: "0.55rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔄 Khôi Phục 8 Ô Chuẩn
              </button>
              <button
                onClick={handleOpenCreateModal}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  padding: "0.55rem 1.15rem",
                  borderRadius: "0.55rem",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)",
                }}
              >
                <span>➕</span>
                <span>Thêm Ô Thưởng Mới</span>
              </button>
            </div>
          </div>

          {/* Cards Thống kê Tổng quan */}
          <div className="lw-admin-stats-grid">
            <div className="lw-admin-stat-card">
              <div className="lw-admin-stat-icon">🎡</div>
              <div>
                <div className="lw-admin-stat-val">{adminStats?.total_slots || 0}</div>
                <div className="lw-admin-stat-lbl">Tổng Số Ô Giải Thưởng</div>
              </div>
            </div>
            <div className="lw-admin-stat-card">
              <div className="lw-admin-stat-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>🟢</div>
              <div>
                <div className="lw-admin-stat-val">
                  {adminStats?.active_slots || 0} / {adminStats?.total_slots || 0}
                </div>
                <div className="lw-admin-stat-lbl">Ô Đang Hoạt Động (Active)</div>
              </div>
            </div>
            <div className="lw-admin-stat-card">
              <div className="lw-admin-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>⚖️</div>
              <div>
                <div className="lw-admin-stat-val">{adminStats?.total_weight || 100}</div>
                <div className="lw-admin-stat-lbl">Tổng Trọng Số Xác Suất</div>
              </div>
            </div>
          </div>

          {/* Bảng Dữ Liệu Các Ô Thưởng */}
          {loadingAdmin ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
              ⏳ Đang tải dữ liệu ô thưởng…
            </div>
          ) : (
            <div className="lw-admin-table-wrapper">
              <table className="lw-admin-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Ô Thưởng & Tên Giải</th>
                    <th>Loại Giải</th>
                    <th>Phần Thưởng</th>
                    <th>Trọng Số & Tỷ Lệ</th>
                    <th>Trạng Thái</th>
                    <th style={{ textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(adminStats?.slots || []).map((slot, idx) => {
                    const totalWeight = adminStats?.total_weight || 100;
                    const weight = slot.probability_weight || 10;
                    const winPercent = totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : "0";

                    return (
                      <tr key={slot.slot_id || idx} style={{ opacity: slot.is_active ? 1 : 0.6 }}>
                        <td style={{ fontWeight: 700, color: "#64748b" }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              className="lw-color-swatch"
                              style={{ backgroundColor: slot.color }}
                              title={`Mã màu: ${slot.color}`}
                            />
                            <span style={{ fontSize: "1.2rem" }}>{slot.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{slot.reward_name}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Mã màu: {slot.color}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`lw-badge-type ${slot.reward_type}`}>
                            {slot.reward_type === "POINTS" && "🌱 Điểm Thưởng"}
                            {slot.reward_type === "BADGE" && "🎖️ Huy Hiệu"}
                            {slot.reward_type === "VOUCHER" && "🎟️ Voucher"}
                            {slot.reward_type === "LUCK" && "🍀 Khích Lệ"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#047857" }}>
                            {slot.points_won > 0 && `+${slot.points_won} điểm`}
                            {slot.badge_won && ` • ${slot.badge_won}`}
                            {slot.voucher_code && ` • [${slot.voucher_code}]`}
                          </div>
                        </td>
                        <td>
                          <div className="lw-weight-bar-container">
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "30px" }}>
                              {weight}
                            </span>
                            <div className="lw-weight-bar-bg">
                              <div
                                className="lw-weight-bar-fill"
                                style={{ width: `${Math.min(100, Number(winPercent))}%` }}
                              />
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{winPercent}%</span>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleSlotActive(slot)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              border: "none",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              background: slot.is_active ? "#dcfce7" : "#f1f5f9",
                              color: slot.is_active ? "#15803d" : "#64748b",
                            }}
                          >
                            {slot.is_active ? "🟢 Bật" : "⚪ Tắt"}
                          </button>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleOpenEditModal(slot)}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                              }}
                              title="Chỉnh sửa ô giải thưởng"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot)}
                              style={{
                                background: "#fee2e2",
                                border: "1px solid #fca5a5",
                                color: "#991b1b",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                              }}
                              title="Xóa ô giải thưởng"
                            >
                              🗑️ Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: THÊM MỚI / CHỈNH SỬA Ô GIẢI THƯỞNG (ADMIN MODAL)
          ===================================================================== */}
      {isSlotModalOpen && (
        <div className="lw-modal-overlay" onClick={() => setIsSlotModalOpen(false)}>
          <div className="lw-modal-card admin-form" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#065f46" }}>
                {editingSlot ? "✏️ Chỉnh Sửa Ô Giải Thưởng" : "➕ Thêm Mới Ô Giải Thưởng"}
              </div>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot}>
              <div className="lw-form-grid">
                {/* Tên phần thưởng */}
                <div className="lw-form-group full-width">
                  <label className="lw-form-label">Tên phần thưởng (*)</label>
                  <input
                    type="text"
                    className="lw-form-input"
                    value={formRewardName}
                    onChange={(e) => setFormRewardName(e.target.value)}
                    placeholder="VD: +20 Điểm Xanh hoặc Huy hiệu Đại Sứ"
                    required
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Chữ sẽ tự động được chia dòng thông minh để nằm 100% trọn vẹn trong múi xoay.
                  </span>
                </div>

                {/* Loại phần thưởng */}
                <div className="lw-form-group">
                  <label className="lw-form-label">Loại giải thưởng</label>
                  <select
                    className="lw-form-select"
                    value={formRewardType}
                    onChange={(e) => setFormRewardType(e.target.value)}
                  >
                    <option value="POINTS">🌱 Điểm Thưởng Xanh (POINTS)</option>
                    <option value="BADGE">🎖️ Huy Hiệu Danh Dự (BADGE)</option>
                    <option value="VOUCHER">🎟️ Voucher Ưu Đãi (VOUCHER)</option>
                    <option value="LUCK">🍀 Lời Khích Lệ (LUCK)</option>
                  </select>
                </div>

                {/* Điểm thưởng */}
                <div className="lw-form-group">
                  <label className="lw-form-label">Số điểm thưởng (+points)</label>
                  <input
                    type="number"
                    className="lw-form-input"
                    value={formPointsWon}
                    onChange={(e) => setFormPointsWon(Number(e.target.value))}
                    min={0}
                    max={1000}
                  />
                </div>

                {/* Tên Huy hiệu (nếu là BADGE) */}
                {formRewardType === "BADGE" && (
                  <div className="lw-form-group full-width">
                    <label className="lw-form-label">Tên huy hiệu trao tặng</label>
                    <input
                      type="text"
                      className="lw-form-input"
                      value={formBadgeWon}
                      onChange={(e) => setFormBadgeWon(e.target.value)}
                      placeholder="VD: Người gieo mầm, Trái tim xanh"
                    />
                  </div>
                )}

                {/* Mã Voucher (nếu là VOUCHER) */}
                {formRewardType === "VOUCHER" && (
                  <div className="lw-form-group full-width">
                    <label className="lw-form-label">Tiền tố mã Voucher sinh thái</label>
                    <input
                      type="text"
                      className="lw-form-input"
                      value={formVoucherCode}
                      onChange={(e) => setFormVoucherCode(e.target.value)}
                      placeholder="VD: ECO-LUCKY-20"
                    />
                  </div>
                )}

                {/* Icon biểu tượng */}
                <div className="lw-form-group">
                  <label className="lw-form-label">Biểu tượng Icon ({formIcon})</label>
                  <input
                    type="text"
                    className="lw-form-input"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    maxLength={4}
                  />
                  <div className="lw-icon-presets">
                    {PRESET_ICONS.map((ic) => (
                      <button
                        type="button"
                        key={ic}
                        className="lw-icon-btn"
                        onClick={() => setFormIcon(ic)}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Màu sắc ô */}
                <div className="lw-form-group">
                  <label className="lw-form-label">Màu sắc ô ({formColor})</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      style={{ width: "40px", height: "38px", border: "none", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="lw-form-input"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="lw-palette-presets">
                    {PRESET_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className="lw-palette-btn"
                        style={{ backgroundColor: c }}
                        onClick={() => setFormColor(c)}
                      />
                    ))}
                  </div>
                </div>

                {/* Trọng số xác suất */}
                <div className="lw-form-group">
                  <label className="lw-form-label">Trọng số xác suất (Weight)</label>
                  <input
                    type="number"
                    className="lw-form-input"
                    value={formWeight}
                    onChange={(e) => setFormWeight(Math.max(1, Number(e.target.value)))}
                    min={1}
                    max={100}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Trọng số càng cao, xác suất quay trúng ô này càng lớn.
                  </span>
                </div>

                {/* Trạng thái Kích hoạt */}
                <div className="lw-form-group" style={{ justifyContent: "center" }}>
                  <label className="lw-form-label">Kích hoạt hiển thị</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px" }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: formIsActive ? "#15803d" : "#64748b" }}>
                      {formIsActive ? "Đang BẬT trên vòng quay" : "Đang TẮT (Ẩn tạm thời)"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview nhỏ của múi xoay */}
              <div style={{
                marginTop: "1.25rem",
                padding: "0.85rem 1rem",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px dashed #cbd5e1",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: formColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  }}>
                    {formIcon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                      {formRewardName || "(Chưa đặt tên)"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {formRewardType} • {formPointsWon}đ • Trọng số: {formWeight}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 700 }}>
                  Xem trước trực quan
                </span>
              </div>

              {/* Buttons Lưu / Hủy */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSlot}
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  {isSubmittingSlot ? "Đang lưu…" : editingSlot ? "Lưu Thay Đổi" : "Thêm Ô Thưởng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP KẾT QUẢ QUAY THƯỞNG THÀNH CÔNG (MODAL REWARD)
          ===================================================================== */}
      {wonResult && (
        <div className="lw-modal-overlay" onClick={() => setWonResult(null)}>
          <div className="lw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lw-modal-badge-img">
              {wonResult.reward_type === "BADGE" && "🎖️"}
              {wonResult.reward_type === "VOUCHER" && "🎟️"}
              {wonResult.reward_type === "POINTS" && "🌱"}
              {wonResult.reward_type === "LUCK" && "🍀"}
            </div>
            <div className="lw-modal-title reward">Xin Chúc Mừng!</div>
            <p style={{ color: "#475569", fontSize: "0.95rem", margin: "0.25rem 0" }}>
              {wonResult.message}
            </p>

            <div className="lw-reward-name-badge">
              {wonResult.reward_name}
            </div>

            {wonResult.voucher_code && (
              <div style={{
                background: "#f3e8ff",
                border: "1px dashed #a855f7",
                borderRadius: "8px",
                padding: "8px 12px",
                marginBottom: "12px",
                color: "#6b21a8",
                fontWeight: 700,
              }}>
                Mã Voucher của bạn: {wonResult.voucher_code}
              </div>
            )}

            <div style={{ fontSize: "0.9rem", color: "#065f46", fontWeight: 700, marginBottom: "1rem" }}>
              Số dư khả dụng mới: {wonResult.new_total_points} Điểm Xanh
            </div>

            <div className="lw-modal-buttons">
              <button
                className="lw-btn-action lw-btn-spin-main"
                style={{ width: "auto", padding: "0.75rem 2rem", margin: 0 }}
                onClick={() => setWonResult(null)}
              >
                Tuyệt Vời!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP HẾT LƯỢT QUAY HÔM NAY (EXHAUSTED MODAL)
          ===================================================================== */}
      {showExhaustedModal && (
        <div className="lw-modal-overlay" onClick={() => setShowExhaustedModal(false)}>
          <div className="lw-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "3.5rem", marginBottom: "0.5rem" }}>⏳</div>
            <div className="lw-modal-title exhausted">Hôm Nay Bạn Đã Hết Lượt</div>
            <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
              Mỗi công dân được cấp <strong>01 lượt quay may mắn miễn phí</strong> mỗi ngày để nhận điểm thưởng và quà sinh thái.
            </p>
            <div className="lw-countdown-box" style={{ margin: "1.25rem 0" }}>
              <span className="lw-countdown-label">Làm mới lượt sau:</span>
              <span className="lw-countdown-timer">{formattedCountdown}</span>
            </div>
            <div className="lw-modal-buttons">
              <button
                className="lw-btn-action lw-btn-history"
                style={{ width: "auto", margin: 0 }}
                onClick={() => {
                  setShowExhaustedModal(false);
                  setViewMode("HISTORY");
                }}
              >
                Xem Lịch Sử Trúng Thưởng
              </button>
              <button
                className="lw-btn-action lw-btn-spin-main"
                style={{ width: "auto", margin: 0 }}
                onClick={() => setShowExhaustedModal(false)}
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toastMessage && <div className="lw-toast">{toastMessage}</div>}
    </div>
  );
};
