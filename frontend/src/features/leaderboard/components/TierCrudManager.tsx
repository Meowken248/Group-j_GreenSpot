import React, { useState, useEffect, useCallback } from "react";
import { leaderboardApi } from "../leaderboardApi";
import type { TierItem, TierCreatePayload, TierUpdatePayload } from "../types";

interface Props {
  onTiersChanged?: () => void;
}

const PRESET_ICONS = ["🥉", "🥈", "🥇", "👑", "💎", "🌟", "⭐", "🌿", "🛡️", "🏆", "🔥", "🚀"];

const PRESET_COLORS = [
  { label: "Đồng", color: "#cd7f32", grad: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" },
  { label: "Bạc", color: "#94a3b8", grad: "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)" },
  { label: "Vàng", color: "#f59e0b", grad: "linear-gradient(135deg, #fef9c3 0%, #fde047 100%)" },
  { label: "Bạch Kim", color: "#8b5cf6", grad: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)" },
  { label: "Kim Cương", color: "#0284c7", grad: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)" },
  { label: "Ruby", color: "#ec4899", grad: "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)" },
  { label: "Lục Bảo", color: "#10b981", grad: "linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)" },
];

export const TierCrudManager: React.FC<Props> = ({ onTiersChanged }) => {
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTier, setEditingTier] = useState<TierItem | null>(null);

  // Form State
  const [tierName, setTierName] = useState<string>("");
  const [tierCode, setTierCode] = useState<string>("");
  const [minPoints, setMinPoints] = useState<number>(100);
  const [badgeIcon, setBadgeIcon] = useState<string>("🌱");
  const [colorHex, setColorHex] = useState<string>("#10b981");
  const [bgGradient, setBgGradient] = useState<string>("linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefitInput, setNewBenefitInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leaderboardApi.getAdminTiers();
      setTiers(data.tiers);
    } catch {
      setError("Không thể tải danh sách cấp bậc. Vui lòng kiểm tra quyền Quản trị viên.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const handleOpenCreate = () => {
    setEditingTier(null);
    setTierName("");
    setTierCode("");
    setMinPoints(tiers.length > 0 ? Math.max(...tiers.map((t) => t.min_points)) + 150 : 100);
    setBadgeIcon("🌟");
    setColorHex("#ec4899");
    setBgGradient("linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)");
    setDiscountPercent(15);
    setDescription("");
    setBenefits([
      "Ưu tiên đổi quà tặng trong danh mục",
      "Vinh danh huy hiệu danh dự trên Bảng Vàng",
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tier: TierItem) => {
    setEditingTier(tier);
    setTierName(tier.tier_name);
    setTierCode(tier.tier_code);
    setMinPoints(tier.min_points);
    setBadgeIcon(tier.badge_icon);
    setColorHex(tier.color_hex);
    setBgGradient(tier.bg_gradient);
    setDiscountPercent(tier.discount_percent);
    setDescription(tier.description || "");
    setBenefits(tier.benefits || []);
    setIsModalOpen(true);
  };

  const handleAddBenefit = () => {
    const text = newBenefitInput.trim();
    if (text) {
      setBenefits([...benefits, text]);
      setNewBenefitInput("");
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleSelectPreset = (p: typeof PRESET_COLORS[0]) => {
    setColorHex(p.color);
    setBgGradient(p.grad);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) {
      alert("Vui lòng nhập tên cấp bậc");
      return;
    }
    if (minPoints < 0) {
      alert("Cột mốc điểm số không được âm");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTier) {
        // Update
        const payload: TierUpdatePayload = {
          tier_name: tierName.trim(),
          min_points: minPoints,
          badge_icon: badgeIcon,
          color_hex: colorHex,
          bg_gradient: bgGradient,
          discount_percent: discountPercent,
          description: description.trim() || undefined,
          benefits: benefits,
        };
        const res = await leaderboardApi.updateTier(editingTier.tier_id, payload);
        showToast(res.message);
      } else {
        // Create
        const payload: TierCreatePayload = {
          tier_code: tierCode.trim().toUpperCase().replace(/\s+/g, "_") || `TIER_${Date.now()}`,
          tier_name: tierName.trim(),
          min_points: minPoints,
          badge_icon: badgeIcon,
          color_hex: colorHex,
          bg_gradient: bgGradient,
          discount_percent: discountPercent,
          description: description.trim() || undefined,
          benefits: benefits,
          order_index: tiers.length + 1,
        };
        const res = await leaderboardApi.createTier(payload);
        showToast(res.message);
      }

      setIsModalOpen(false);
      await fetchTiers();
      if (onTiersChanged) onTiersChanged();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Lỗi lưu cấu hình cấp bậc";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tier: TierItem) => {
    if (tier.min_points === 0) {
      alert("Không thể xóa cấp bậc khởi đầu (mốc 0 điểm). Bạn chỉ có thể sửa thông tin của hạng này.");
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa '${tier.tier_name}' (${tier.min_points}đ)? Các công dân đang đạt hạng này sẽ được tự động xếp vào cấp bậc phù hợp kế tiếp.`
    );
    if (!confirmed) return;

    try {
      const res = await leaderboardApi.deleteTier(tier.tier_id);
      showToast(res.message);
      await fetchTiers();
      if (onTiersChanged) onTiersChanged();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Lỗi xóa cấp bậc";
      alert(msg);
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = window.confirm(
      "Khôi phục bộ 5 cấp bậc chuẩn: Đồng (0đ), Bạc (100đ), Vàng (250đ), Bạch Kim (400đ), Kim Cương (600đ)? Mọi thay đổi tùy chỉnh hiện tại sẽ được thay thế."
    );
    if (!confirmed) return;

    try {
      await leaderboardApi.resetDefaultTiers();
      showToast("Đã khôi phục thành công 5 cấp bậc chuẩn mặc định!");
      await fetchTiers();
      if (onTiersChanged) onTiersChanged();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Lỗi khôi phục mặc định";
      alert(msg);
    }
  };

  // KPI Calculations
  const highestTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
  const totalCitizensClassified = tiers.reduce((acc, t) => acc + (t.users_count || 0), 0);

  return (
    <div className="lb-tiers-admin-card">
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 99999,
          background: "#065f46",
          color: "#ffffff",
          padding: "0.85rem 1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          animation: "lbFadeIn 0.3s ease-out",
        }}>
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="lb-tiers-header-bar">
        <div className="lb-tiers-header-info">
          <h2>
            <span>⚙️</span>
            <span>Quản Lý Cột Mốc Cấp Bậc & Điểm Số Xếp Hạng</span>
          </h2>
          <p>
            Dễ dàng thêm hạng mới, thay đổi cột mốc điểm số xếp hạng, tỷ lệ ưu đãi đổi quà và quyền lợi vinh danh toàn hệ thống.
          </p>
        </div>

        <div className="lb-tiers-actions-row">
          <button className="lb-tier-btn-primary" onClick={handleOpenCreate}>
            <span>➕</span>
            <span>Thêm Hạng Mới</span>
          </button>
          <button className="lb-tier-btn-outline" onClick={handleResetDefaults}>
            <span>🔄</span>
            <span>Khôi Phục Chuẩn (5 Hạng)</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="lb-tier-kpis">
        <div className="lb-tier-kpi-item">
          <div className="lb-tier-kpi-icon">🏆</div>
          <div className="lb-tier-kpi-data">
            <div className="kpi-num">{tiers.length}</div>
            <div className="kpi-label">Tổng số cấp bậc</div>
          </div>
        </div>

        <div className="lb-tier-kpi-item">
          <div className="lb-tier-kpi-icon">🎯</div>
          <div className="lb-tier-kpi-data">
            <div className="kpi-num">0đ – {highestTier?.min_points || 0}đ</div>
            <div className="kpi-label">Khoảng cột mốc điểm số</div>
          </div>
        </div>

        <div className="lb-tier-kpi-item">
          <div className="lb-tier-kpi-icon">👥</div>
          <div className="lb-tier-kpi-data">
            <div className="kpi-num">{totalCitizensClassified.toLocaleString()}</div>
            <div className="kpi-label">Công dân đang phân bổ</div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="lb-spinner" />
      ) : error ? (
        <div className="lb-error-box">
          <p className="lb-error-msg">{error}</p>
          <button className="lb-retry-btn" onClick={fetchTiers}>
            Thử lại
          </button>
        </div>
      ) : (
        <div className="lb-tier-table-wrapper">
          <table className="lb-tier-table">
            <thead>
              <tr>
                <th style={{ width: "80px", textAlign: "center" }}>Huy hiệu</th>
                <th>Tên Cấp Bậc</th>
                <th>Mã Hệ Thống</th>
                <th style={{ textAlign: "center" }}>Cột Mốc Điểm Xếp Hạng</th>
                <th style={{ textAlign: "center" }}>Ưu Đãi Đổi Quà</th>
                <th style={{ textAlign: "center" }}>Công Dân Đạt Hạng</th>
                <th>Quyền Lợi Đặc Quyền</th>
                <th style={{ width: "120px", textAlign: "center" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, idx) => (
                <tr key={t.tier_id || t.tier_code}>
                  <td style={{ textAlign: "center", fontSize: "1.75rem" }}>
                    {t.badge_icon}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.color_hex,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>
                        {t.tier_name}
                      </span>
                      {idx === 0 && (
                        <span style={{ fontSize: "0.72rem", background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "4px" }}>
                          Cơ sở
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: "0.8rem", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                      {t.tier_code}
                    </code>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="lb-tier-min-badge">
                      <span>≥</span>
                      <span>{t.min_points.toLocaleString()}đ</span>
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="lb-tier-discount-badge">
                      Giảm {t.discount_percent}%
                    </span>
                  </td>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                    {t.users_count !== undefined ? `${t.users_count} người` : "—"}
                  </td>
                  <td>
                    <div className="lb-tier-benefits-list">
                      {t.benefits && t.benefits.length > 0 ? (
                        t.benefits.slice(0, 2).map((b, bIdx) => (
                          <span key={bIdx} className="lb-tier-benefit-tag">
                            ✓ {b}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Chưa có quyền lợi</span>
                      )}
                      {t.benefits && t.benefits.length > 2 && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          +{t.benefits.length - 2} quyền lợi khác
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", gap: "6px" }}>
                      <button
                        title="Chỉnh sửa cấp bậc & cột mốc điểm"
                        onClick={() => handleOpenEdit(t)}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          transition: "all 0.15s",
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        title="Xóa cấp bậc này"
                        onClick={() => handleDelete(t)}
                        disabled={t.min_points === 0}
                        style={{
                          background: t.min_points === 0 ? "#f8fafc" : "#fef2f2",
                          border: "1px solid",
                          borderColor: t.min_points === 0 ? "#e2e8f0" : "#fecaca",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          cursor: t.min_points === 0 ? "not-allowed" : "pointer",
                          fontSize: "0.85rem",
                          opacity: t.min_points === 0 ? 0.4 : 1,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="lb-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="lb-tier-modal-content">
            <button className="lb-modal-close" onClick={() => setIsModalOpen(false)}>
              ✕
            </button>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
              {editingTier ? `✏️ Chỉnh Sửa Cấp Bậc: ${editingTier.tier_name}` : "➕ Thêm Cấp Bậc Danh Hiệu Mới"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
              Cài đặt tên gọi, biểu tượng huy hiệu, cột mốc điểm số xếp hạng và quyền lợi đặc quyền cho cấp bậc này.
            </p>

            <form onSubmit={handleSave}>
              <div className="lb-tier-form-grid">
                {/* Tên Cấp Bậc */}
                <div className="lb-tier-field">
                  <label>Tên Cấp Bậc (*):</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Hạng Bạch Kim, Hạng Tinh Hoa..."
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                  />
                </div>

                {/* Mã Cấp Bậc (Tier Code) */}
                <div className="lb-tier-field">
                  <label>Mã Định Danh Duy Nhất (*):</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingTier}
                    placeholder="Ví dụ: PLATINUM, ELITE, RUBY..."
                    value={tierCode}
                    onChange={(e) => setTierCode(e.target.value.toUpperCase())}
                    style={{ background: editingTier ? "#f1f5f9" : "#ffffff" }}
                  />
                </div>

                {/* Cột Mốc Điểm Số Xếp Hạng */}
                <div className="lb-tier-field">
                  <label>Cột Mốc Điểm Xếp Hạng (Min Points) (*):</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      required
                      min={0}
                      step={10}
                      value={minPoints}
                      onChange={(e) => setMinPoints(parseInt(e.target.value) || 0)}
                      style={{ width: "100%", fontWeight: 700, color: "#047857" }}
                    />
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "#64748b" }}>
                      Điểm Xanh
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Công dân đạt số điểm xét hạng từ mốc này trở lên sẽ tự động được xếp vào hạng.
                  </span>
                </div>

                {/* Tỷ Lệ Ưu Đãi Đổi Quà */}
                <div className="lb-tier-field">
                  <label>Ưu Đãi Đổi Quà (% Giảm Điểm):</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                      style={{ width: "100%", fontWeight: 700 }}
                    />
                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "#64748b" }}>
                      %
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    Đặc quyền giảm số điểm cần tiêu hao khi đổi E-Voucher quà tặng sinh thái.
                  </span>
                </div>

                {/* Biểu Tượng Huy Hiệu */}
                <div className="lb-tier-field full-col">
                  <label>Biểu Tượng Huy Hiệu (Badge Icon):</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="text"
                      maxLength={10}
                      value={badgeIcon}
                      onChange={(e) => setBadgeIcon(e.target.value)}
                      style={{ width: "70px", textAlign: "center", fontSize: "1.5rem" }}
                    />
                    <div className="lb-tier-presets-row">
                      {PRESET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className={`lb-tier-preset-btn ${badgeIcon === icon ? "active" : ""}`}
                          onClick={() => setBadgeIcon(icon)}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bảng Màu & Nền Gradient */}
                <div className="lb-tier-field full-col">
                  <label>Bảng Màu & Gradient Nền Thẻ Vinh Danh:</label>
                  <div className="lb-tier-presets-row" style={{ marginBottom: "8px" }}>
                    {PRESET_COLORS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className={`lb-tier-preset-btn ${colorHex === p.color ? "active" : ""}`}
                        onClick={() => handleSelectPreset(p)}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        style={{ width: "36px", height: "36px", border: "none", cursor: "pointer", borderRadius: "6px" }}
                      />
                      <input
                        type="text"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        style={{ width: "70px", fontSize: "0.8rem", padding: "4px" }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Mã CSS Gradient (ví dụ: linear-gradient(135deg, #...))"
                      value={bgGradient}
                      onChange={(e) => setBgGradient(e.target.value)}
                      style={{ fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                {/* Mô Tả Danh Hiệu */}
                <div className="lb-tier-field full-col">
                  <label>Mô Tả Cấp Bậc:</label>
                  <input
                    type="text"
                    placeholder="Mô tả ngắn gọn tinh thần của danh hiệu..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Danh Sách Quyền Lợi */}
                <div className="lb-tier-field full-col">
                  <label>Danh Sách Quyền Lợi Đặc Quyền:</label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      placeholder="Nhập quyền lợi mới (ví dụ: Giảm 15% đổi quà Co.opmart)..."
                      value={newBenefitInput}
                      onChange={(e) => setNewBenefitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBenefit();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="lb-tier-btn-outline"
                      onClick={handleAddBenefit}
                    >
                      + Thêm Quyền Lợi
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {benefits.map((b, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <span>✓ {b}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(idx)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="lb-tier-field full-col">
                  <label>Xem Trước Thẻ Vinh Danh (Live Card Preview):</label>
                  <div className="lb-tier-preview-box">
                    <div className="lb-tier-live-card" style={{ background: bgGradient }}>
                      <div className="lb-tier-live-header">
                        <span className="lb-tier-live-icon">{badgeIcon}</span>
                        <div>
                          <div className="lb-tier-live-title" style={{ color: colorHex }}>
                            {tierName || "Tên Cấp Bậc Mới"}
                          </div>
                          <span className="lb-tier-live-badge">
                            Cột mốc: ≥ {minPoints.toLocaleString()} Điểm Xanh
                          </span>
                        </div>
                      </div>

                      {description && (
                        <p style={{ fontSize: "0.82rem", color: "#334155", margin: 0, fontStyle: "italic" }}>
                          "{description}"
                        </p>
                      )}

                      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "8px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                          Đặc quyền mở khóa ({discountPercent > 0 ? `Ưu đãi -${discountPercent}%` : "Chuẩn"}):
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                          {benefits.slice(0, 3).map((b, bI) => (
                            <span key={bI} style={{ fontSize: "0.75rem", color: "#1e293b" }}>
                              • {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="lb-tier-btn-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="lb-tier-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu..." : editingTier ? "Lưu Cập Nhật" : "Tạo Hạng Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
