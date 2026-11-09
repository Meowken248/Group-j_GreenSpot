import React, { useState, useEffect } from "react";
import type {
  EcoRewardItem,
  CreateRewardRequest,
  UpdateRewardRequest,
  RedemptionAnalyticsResponse,
} from "../types";
import { rewardsApi } from "../rewardsApi";

interface EcoRewardsCatalogProps {
  onRewardRedeemed?: () => void;
  onNavigateToMyVouchers?: () => void;
}

export const EcoRewardsCatalog: React.FC<EcoRewardsCatalogProps> = ({
  onRewardRedeemed,
  onNavigateToMyVouchers,
}) => {
  // Trạng thái màn hình chính: "list" (Màn 1) | "create" (Màn 2) | "edit" (Màn 3) | "analytics" (Màn 6)
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit" | "analytics">("list");

  // Dữ liệu danh sách
  const [items, setItems] = useState<EcoRewardItem[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [totalOutOfStock, setTotalOutOfStock] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bộ lọc Màn 1
  const [searchKeyword, setSearchKeyword] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("ALL");

  // Dữ liệu chỉnh sửa (Màn 3)
  const [editingItem, setEditingItem] = useState<EcoRewardItem | null>(null);

  // Popup xóa quà (Màn 4 & Màn 5)
  const [deleteTarget, setDeleteTarget] = useState<EcoRewardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessModal, setDeleteSuccessModal] = useState(false);

  // Dữ liệu thống kê (Màn 6)
  const [analyticsData, setAnalyticsData] = useState<RedemptionAnalyticsResponse | null>(null);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState("MONTH");
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Dữ liệu Form Thêm / Sửa
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    brand: "GreenSpot ESG",
    points_required: 100,
    reward_type: "VOUCHER",
    stock_quantity: 50,
    image_url: "",
    expiry_date: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Trạng thái xác nhận thoát khi có thay đổi chưa lưu (Table 127 R7)
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);

  // Đổi quà nhanh
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  // Tải danh mục
  const loadCatalog = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await rewardsApi.getRewardCatalog({
        search: searchKeyword.trim() || undefined,
        stock_status: stockStatusFilter,
      });
      setItems(data.items);
      setTotalActive(data.total_active);
      setTotalOutOfStock(data.total_out_of_stock);
    } catch {
      setErrorMessage("Không thể tải danh mục quà tặng. Vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [stockStatusFilter]);

  // Tải thống kê
  const loadAnalytics = async (range = analyticsTimeRange) => {
    setIsLoadingAnalytics(true);
    try {
      const data = await rewardsApi.getRedemptionAnalytics(range);
      setAnalyticsData(data);
    } catch {
      showToast("Không thể tải số liệu thống kê. Vui lòng thử lại");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (viewMode === "analytics") {
      loadAnalytics(analyticsTimeRange);
    }
  }, [viewMode, analyticsTimeRange]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Mở màn thêm quà
  const handleOpenCreate = () => {
    const defaultExpiry = new Date();
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 6);
    setFormData({
      title: "",
      description: "",
      brand: "GreenSpot ESG",
      points_required: 100,
      reward_type: "VOUCHER",
      stock_quantity: 50,
      image_url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=600&q=80",
      expiry_date: defaultExpiry.toISOString().slice(0, 10),
    });
    setFormErrors({});
    setViewMode("create");
  };

  // Mở màn sửa quà
  const handleOpenEdit = (item: EcoRewardItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      brand: item.brand || "GreenSpot ESG",
      points_required: item.points_required,
      reward_type: item.reward_type,
      stock_quantity: item.stock_quantity,
      image_url: item.image_url || "",
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : "",
    });
    setFormErrors({});
    setViewMode("edit");
  };

  // Validate form
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) {
      errs.title = "Vui lòng nhập tên quà tặng";
    } else if (formData.title.trim().length > 150) {
      errs.title = "Tên quà tặng tối đa 150 ký tự";
    }

    if (formData.description && formData.description.length > 1000) {
      errs.description = "Mô tả tối đa 1000 ký tự";
    }

    if (formData.points_required < 10) {
      errs.points_required = "Số lượng và điểm đổi phải lớn hơn 0 (tối thiểu 10 điểm)";
    }

    if (formData.stock_quantity < 0 || formData.stock_quantity > 10000) {
      errs.stock_quantity = "Số lượng tồn phải từ 1 đến 10.000";
    }

    if (!formData.expiry_date) {
      errs.expiry_date = "Hạn sử dụng phải sau thời điểm hiện tại";
    } else {
      const exp = new Date(formData.expiry_date);
      const now = new Date();
      if (exp <= now) {
        errs.expiry_date = "Hạn sử dụng phải sau thời điểm hiện tại";
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit tạo mới
  const handleSaveCreate = async () => {
    if (!validateForm()) {
      showToast("Vui lòng nhập đầy đủ và chính xác thông tin quà tặng");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateRewardRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        brand: formData.brand.trim() || "GreenSpot ESG",
        points_required: Number(formData.points_required),
        reward_type: formData.reward_type,
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url.trim() || undefined,
        expiry_date: new Date(formData.expiry_date).toISOString(),
      };
      await rewardsApi.createReward(payload);
      showToast("Thêm quà tặng mới thành công");
      setViewMode("list");
      loadCatalog();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Không thể thêm quà tặng. Vui lòng thử lại";
      showToast(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit cập nhật
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!validateForm()) {
      showToast("Vui lòng kiểm tra lại thông tin chỉnh sửa");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: UpdateRewardRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        brand: formData.brand.trim() || undefined,
        points_required: Number(formData.points_required),
        stock_quantity: Number(formData.stock_quantity),
        image_url: formData.image_url.trim() || undefined,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
      };
      await rewardsApi.updateReward(editingItem.reward_id, payload);
      showToast("Đã cập nhật thông tin quà tặng");
      setViewMode("list");
      loadCatalog();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Không thể cập nhật quà tặng. Vui lòng thử lại";
      showToast(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa quà tặng (Màn 4 & 5)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await rewardsApi.deleteReward(deleteTarget.reward_id);
      setDeleteTarget(null);
      setDeleteSuccessModal(true);
      loadCatalog();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Không thể xoá quà tặng này. Vui lòng thử lại";
      showToast(detail);
    } finally {
      setIsDeleting(false);
    }
  };

  // Đổi quà trực tiếp
  const handleRedeemQuick = async (item: EcoRewardItem) => {
    if (item.stock_quantity <= 0 || item.stock_status !== "IN_STOCK") {
      showToast("Phần quà này hiện đã hết hàng trong kho!");
      return;
    }
    setRedeemingId(item.reward_id);
    try {
      const res = await rewardsApi.redeemReward(item.reward_id);
      showToast(`🎉 ${res.message}`);
      loadCatalog();
      if (onRewardRedeemed) onRewardRedeemed();
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Đổi quà thất bại. Vui lòng kiểm tra lại số dư điểm.";
      showToast(detail);
    } finally {
      setRedeemingId(null);
    }
  };

  // Hủy form có kiểm tra thay đổi
  const handleCancelForm = () => {
    const isDirty = Boolean(formData.title.trim());
    if (isDirty) {
      setShowCancelConfirmModal(true);
    } else {
      setViewMode("list");
    }
  };

  // Format ngày
  const formatDateStr = (dateStr?: string | null) => {
    if (!dateStr) return "Không thời hạn";
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // --------------------------------------------------------------------------
  // RENDER: MÀN 6 - BẢNG ĐIỀU KHIỂN PHÂN TÍCH QUY ĐỔI QUÀ TẶNG
  // --------------------------------------------------------------------------
  if (viewMode === "analytics") {
    return (
      <div className="analytics-container fade-in">
        <div className="section-header flex-between">
          <div>
            <h2 className="section-title">📊 Bảng Phân Tích Số Liệu Quy Đổi Quà Tặng</h2>
            <p className="section-subtitle">
              Thống kê xu hướng đổi quà sinh thái, đo lường mức độ hưởng ứng của công dân và hiệu quả tài trợ ESG.
            </p>
          </div>
          <button
            type="button"
            className="action-btn-secondary"
            onClick={() => setViewMode("list")}
          >
            ← Quay về danh mục
          </button>
        </div>

        {/* Bố cục 3 khối theo Báo cáo */}
        <div className="analytics-layout-grid">
          {/* CỘT TRÁI: BỘ LỌC */}
          <div className="filter-card">
            <h3 className="card-subtitle">⏱️ Khoảng Thời Gian</h3>
            <div className="filter-pills-vertical">
              <button
                type="button"
                className={`filter-pill-btn ${analyticsTimeRange === "WEEK" ? "active" : ""}`}
                onClick={() => setAnalyticsTimeRange("WEEK")}
              >
                Tuần này (7 ngày)
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${analyticsTimeRange === "MONTH" ? "active" : ""}`}
                onClick={() => setAnalyticsTimeRange("MONTH")}
              >
                Tháng này (30 ngày)
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${analyticsTimeRange === "QUARTER" ? "active" : ""}`}
                onClick={() => setAnalyticsTimeRange("QUARTER")}
              >
                Quý này (90 ngày)
              </button>
            </div>

            <div className="summary-stat-box" style={{ marginTop: "24px" }}>
              <div className="stat-label">Tổng lượt đổi điểm</div>
              <div className="stat-value text-emerald">
                {analyticsData?.total_redemptions || 0}
              </div>
              <div className="stat-label" style={{ marginTop: "12px" }}>Tổng điểm xanh đã tiêu</div>
              <div className="stat-value text-amber">
                {analyticsData?.total_points_spent.toLocaleString() || 0} đ
              </div>
            </div>
          </div>

          {/* CỘT GIỮA: BIỂU ĐỒ */}
          <div className="chart-card">
            <h3 className="card-subtitle">📈 Biểu Đồ Phân Bổ & Xu Hướng</h3>

            {isLoadingAnalytics ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Đang tổng hợp số liệu thống kê...</p>
              </div>
            ) : analyticsData ? (
              <div className="charts-wrapper">
                {/* Biểu đồ cột */}
                <div className="chart-block">
                  <h4 className="chart-title">Phân bổ lượt đổi theo loại quà</h4>
                  <div className="bar-chart-container">
                    {analyticsData.bar_chart.map((bar, idx) => {
                      const maxVal = Math.max(...analyticsData.bar_chart.map((b) => b.count), 1);
                      const pct = Math.round((bar.count / maxVal) * 100);
                      return (
                        <div key={bar.reward_id || idx} className="bar-row">
                          <span className="bar-label" title={bar.title}>{bar.title}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%` }}>
                              <span className="bar-value">{bar.count} lượt</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Biểu đồ đường xu hướng theo ngày */}
                <div className="chart-block" style={{ marginTop: "20px" }}>
                  <h4 className="chart-title">Xu hướng đổi điểm theo ngày</h4>
                  <div className="trend-dots-container">
                    {analyticsData.line_chart.slice(-10).map((pt, idx) => (
                      <div key={pt.date || idx} className="trend-dot-col">
                        <span className="trend-val">{pt.count}</span>
                        <div
                          className="trend-bar-pip"
                          style={{ height: `${Math.max(12, Math.min(100, pt.count * 15))}px` }}
                        />
                        <span className="trend-date">{pt.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-catalog-state">
                <p>Không có dữ liệu đổi quà trong giai đoạn này</p>
              </div>
            )}
          </div>

          {/* CỘT PHẢI: TOP QUÀ & XUẤT BÁO CÁO */}
          <div className="top-card">
            <h3 className="card-subtitle">🏆 Quà Đổi Nhiều Nhất</h3>
            <div className="top-list">
              {analyticsData?.top_rewards.map((top, idx) => (
                <div key={top.reward_id || idx} className="top-item-row">
                  <div className="top-rank-badge">#{idx + 1}</div>
                  <div className="top-item-info">
                    <strong className="top-title">{top.title}</strong>
                    <span className="top-brand">{top.brand}</span>
                  </div>
                  <div className="top-item-stat">
                    <span className="top-count">{top.count} lượt</span>
                    <span className="top-pct">{top.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="export-statement-btn"
              style={{ marginTop: "24px", width: "100%" }}
              onClick={() => rewardsApi.downloadAnalyticsCsv(analyticsTimeRange)}
            >
              📥 Xuất báo cáo CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: MÀN 2 & MÀN 3 - FORM THÊM / CHỈNH SỬA QUÀ TẶNG & KHO VOUCHER
  // --------------------------------------------------------------------------
  if (viewMode === "create" || viewMode === "edit") {
    const isEdit = viewMode === "edit";
    return (
      <div className="form-container fade-in">
        <div className="section-header flex-between">
          <div>
            <h2 className="section-title">
              {isEdit ? "✏️ Chỉnh Sửa Quà Tặng & Điều Chỉnh Kho Voucher" : "🎁 Thêm Quà Tặng Sinh Thái Mới Vào Kho"}
            </h2>
            <p className="section-subtitle">
              {isEdit
                ? "Cập nhật thông tin, điều chỉnh số lượng tồn kho hoặc gia hạn voucher đang lưu hành."
                : "Khởi tạo quà tặng sinh thái hoặc lô voucher mới vào hệ thống đổi điểm công dân."}
            </p>
          </div>
          <button type="button" className="action-btn-secondary" onClick={handleCancelForm}>
            ✕ Thoát
          </button>
        </div>

        {/* Bố cục 3 khối theo Báo cáo */}
        <div className="form-layout-grid">
          {/* CỘT TRÁI: KHỐI THÔNG TIN */}
          <div className="form-block-card">
            <h3 className="card-subtitle">📋 Khối Thông Tin Sản Phẩm</h3>

            <div className="form-group">
              <label className="form-label">
                Tên quà tặng <span className="text-red">*</span> (tối đa 150 ký tự)
              </label>
              <input
                type="text"
                className={`form-input ${formErrors.title ? "input-error" : ""}`}
                placeholder="VD: Bình giữ nhiệt Eco Inox 500ml, E-Voucher Co.opmart 50.000đ"
                value={formData.title}
                maxLength={150}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              {formErrors.title && <span className="field-error-msg">{formErrors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Thương hiệu / Nhà tài trợ ESG</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Saigon Co.op, Lock&Lock, GreenSpot ESG"
                value={formData.brand}
                maxLength={100}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chi tiết & Tiêu chuẩn sống xanh (tối đa 1.000 ký tự)</label>
              <textarea
                className={`form-textarea ${formErrors.description ? "input-error" : ""}`}
                rows={4}
                placeholder="Mô tả công dụng, nguồn gốc sinh thái hoặc hướng dẫn sử dụng voucher..."
                value={formData.description}
                maxLength={1000}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              {formErrors.description && (
                <span className="field-error-msg">{formErrors.description}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Ảnh sản phẩm (URL trực tuyến hoặc ảnh mẫu)</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://..."
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              {formData.image_url && (
                <div className="image-preview-box">
                  <img src={formData.image_url} alt="Preview" className="preview-img" />
                </div>
              )}
            </div>
          </div>

          {/* CỘT GIỮA: KHỐI KHO VOUCHER */}
          <div className="form-block-card">
            <h3 className="card-subtitle">📦 Khối Kho Voucher & Định Ngạch</h3>

            <div className="form-group">
              <label className="form-label">Loại quà tặng</label>
              <select
                className="form-select"
                value={formData.reward_type}
                onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
              >
                <option value="VOUCHER">E-Voucher điện tử (Mã QR & Barcode)</option>
                <option value="PHYSICAL_GIFT">Hiện vật sinh thái (Nhận tại Trạm Xanh)</option>
                <option value="DIGITAL_COUPON">Mã giảm giá tiêu dùng xanh</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Số lượng tồn kho <span className="text-red">*</span> (1 đến 10.000)
              </label>
              <input
                type="number"
                min={0}
                max={10000}
                className={`form-input ${formErrors.stock_quantity ? "input-error" : ""}`}
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
              />
              {formErrors.stock_quantity && (
                <span className="field-error-msg">{formErrors.stock_quantity}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Điểm Xanh cần đổi <span className="text-red">*</span> (Tối thiểu 10 điểm)
              </label>
              <input
                type="number"
                min={10}
                className={`form-input ${formErrors.points_required ? "input-error" : ""}`}
                value={formData.points_required}
                onChange={(e) => setFormData({ ...formData, points_required: Number(e.target.value) })}
              />
              {formErrors.points_required && (
                <span className="field-error-msg">{formErrors.points_required}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Hạn sử dụng voucher <span className="text-red">*</span> (Sau ngày hiện tại)
              </label>
              <input
                type="date"
                className={`form-input ${formErrors.expiry_date ? "input-error" : ""}`}
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
              {formErrors.expiry_date && (
                <span className="field-error-msg">{formErrors.expiry_date}</span>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: KHỐI LƯU */}
          <div className="form-block-card">
            <h3 className="card-subtitle">💾 Xác Nhận Lưu Dữ Liệu</h3>
            <p className="card-desc-muted">
              Kiểm tra kỹ các thông tin trước khi lưu. Đối với quà đã phát hành, số lượng tồn kho không thể điều chỉnh nhỏ hơn số voucher chưa sử dụng.
            </p>

            <div className="form-actions-col">
              <button
                type="button"
                className="primary-action-btn"
                disabled={isSubmitting}
                onClick={isEdit ? handleSaveEdit : handleSaveCreate}
              >
                {isSubmitting ? (
                  <span className="btn-loading-flex">
                    <span className="spinner-sm" /> Đang lưu thay đổi…
                  </span>
                ) : isEdit ? (
                  "💾 Cập nhật quà tặng"
                ) : (
                  "✨ Lưu quà tặng mới"
                )}
              </button>

              <button
                type="button"
                className="cancel-action-btn"
                disabled={isSubmitting}
                onClick={handleCancelForm}
              >
                Huỷ bỏ
              </button>
            </div>
          </div>
        </div>

        {/* Modal xác nhận thoát khi chưa lưu (Table 127 R7) */}
        {showCancelConfirmModal && (
          <div className="reward-modal-backdrop">
            <div className="confirm-modal-box">
              <div className="confirm-modal-icon">⚠️</div>
              <h3 className="confirm-modal-title">Bạn có thay đổi chưa lưu</h3>
              <p className="confirm-modal-desc">
                Các thông tin bạn vừa nhập sẽ bị mất nếu thoát bây giờ. Bạn có chắc chắn muốn rời đi?
              </p>
              <div className="confirm-modal-actions">
                <button
                  type="button"
                  className="action-btn-secondary"
                  onClick={() => setShowCancelConfirmModal(false)}
                >
                  Ở lại chỉnh sửa
                </button>
                <button
                  type="button"
                  className="action-btn-danger"
                  onClick={() => {
                    setShowCancelConfirmModal(false);
                    setViewMode("list");
                  }}
                >
                  Thoát không lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: MÀN 1 - DANH SÁCH QUẢN TRỊ QUÀ TẶNG & KHO VOUCHER (BỐ CỤC 3 KHỐI)
  // --------------------------------------------------------------------------
  return (
    <div className="catalog-container fade-in">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="reward-toast-notification">
          <span>🔔 {toastMessage}</span>
        </div>
      )}

      {/* Tiêu đề & Giới thiệu */}
      <div className="section-header flex-between">
        <div>
          <h2 className="section-title">🏪 Danh Mục Quà Tặng Xanh & Quản Trị Kho Voucher</h2>
          <p className="section-subtitle">
            Hệ sinh thái quy đổi quà tặng sinh thái từ Điểm Thưởng Công Dân Xanh, kết nối cùng các nhà tài trợ ESG uy tín.
          </p>
        </div>

        <div className="header-action-group">
          {onNavigateToMyVouchers && (
            <button
              type="button"
              className="action-btn-secondary"
              onClick={onNavigateToMyVouchers}
            >
              🎟️ Kho Voucher Của Tôi
            </button>
          )}
        </div>
      </div>

      {/* BỐ CỤC 3 KHỐI THEO CHUẨN BÁO CÁO */}
      <div className="catalog-layout-grid">
        {/* KHỐI 1: BỘ LỌC (CỘT TRÁI) */}
        <div className="catalog-filter-card">
          <h3 className="card-subtitle">🔍 Bộ Lọc Kho Quà</h3>

          <div className="filter-group">
            <label className="filter-label">Tìm kiếm</label>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Tên quà hoặc thương hiệu ESG..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadCatalog()}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Trạng thái tồn kho</label>
            <div className="radio-options">
              <label className="radio-item">
                <input
                  type="radio"
                  name="stock_filter"
                  checked={stockStatusFilter === "ALL"}
                  onChange={() => setStockStatusFilter("ALL")}
                />
                <span>Tất cả</span>
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="stock_filter"
                  checked={stockStatusFilter === "IN_STOCK"}
                  onChange={() => setStockStatusFilter("IN_STOCK")}
                />
                <span>Còn hàng</span>
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="stock_filter"
                  checked={stockStatusFilter === "OUT_OF_STOCK"}
                  onChange={() => setStockStatusFilter("OUT_OF_STOCK")}
                />
                <span>Hết hàng / Quá hạn</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            className="filter-apply-btn"
            onClick={loadCatalog}
          >
            Áp dụng bộ lọc
          </button>
        </div>

        {/* KHỐI 2: DANH SÁCH QUÀ (CỘT GIỮA) */}
        <div className="catalog-items-card">
          <div className="card-header-flex">
            <h3 className="card-subtitle">📦 Danh Sách Quà Tặng & Voucher ({items.length})</h3>
            <span className="card-tag-badge">Cập nhật thời gian thực</span>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Đang tải danh mục quà tặng...</p>
            </div>
          ) : errorMessage ? (
            <div className="error-catalog-state">
              <p>{errorMessage}</p>
              <button type="button" className="retry-btn" onClick={loadCatalog}>
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="empty-catalog-state">
              <div className="empty-icon">🍃</div>
              <p>Không tìm thấy quà tặng phù hợp bộ lọc</p>
            </div>
          ) : (
            <div className="catalog-table-wrapper">
              <table className="rewards-data-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>Tên Quà / Nhà Tài Trợ</th>
                    <th>Tồn Kho</th>
                    <th>Hạn Dùng</th>
                    <th>Điểm Đổi</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isOutOfStock = item.stock_quantity <= 0 || item.stock_status !== "IN_STOCK";
                    return (
                      <tr key={item.reward_id} className={isOutOfStock ? "row-out-of-stock" : ""}>
                        <td className="col-img">
                          <img
                            src={item.image_url || "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=200&q=80"}
                            alt={item.title}
                            className="reward-thumb-img"
                          />
                        </td>
                        <td className="col-info">
                          <strong className="reward-item-title">{item.title}</strong>
                          <div className="reward-item-meta">
                            <span className="brand-badge">{item.brand || "GreenSpot ESG"}</span>
                            <span className="code-text">#{item.reward_code}</span>
                          </div>
                        </td>
                        <td className="col-stock">
                          {isOutOfStock ? (
                            <span className="badge-out-of-stock">Hết hàng</span>
                          ) : (
                            <span className="stock-count">{item.stock_quantity} cái</span>
                          )}
                        </td>
                        <td className="col-exp">
                          <span className="expiry-text">{formatDateStr(item.expiry_date)}</span>
                        </td>
                        <td className="col-points">
                          <span className="points-pill">{item.points_required} đ</span>
                        </td>
                        <td className="col-actions">
                          <div className="table-btn-row">
                            <button
                              type="button"
                              className="btn-table-edit"
                              title="Chỉnh sửa thông tin và điều chỉnh kho"
                              onClick={() => handleOpenEdit(item)}
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              className="btn-table-delete"
                              title="Xóa quà tặng khỏi danh mục"
                              onClick={() => setDeleteTarget(item)}
                            >
                              Xoá
                            </button>
                            <button
                              type="button"
                              className="btn-table-redeem"
                              disabled={isOutOfStock || redeemingId === item.reward_id}
                              title="Đổi điểm lấy quà ngay"
                              onClick={() => handleRedeemQuick(item)}
                            >
                              {redeemingId === item.reward_id ? "Đang đổi..." : "Đổi quà"}
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

        {/* KHỐI 3: THAO TÁC (CỘT PHẢI) */}
        <div className="catalog-actions-card">
          <h3 className="card-subtitle">⚡ Thao Tác Quản Trị</h3>

          <div className="action-buttons-stack">
            <button
              type="button"
              className="primary-action-btn"
              onClick={handleOpenCreate}
            >
              ➕ Thêm quà mới vào kho
            </button>

            <button
              type="button"
              className="action-btn-secondary"
              onClick={() => setViewMode("analytics")}
            >
              📊 Xem thống kê lượt đổi
            </button>
          </div>

          <div className="catalog-status-summary">
            <h4 className="summary-title">Tình Trạng Kho Hệ Thống</h4>
            <div className="summary-row">
              <span>Đang hoạt động:</span>
              <strong className="text-emerald">{totalActive} mặt hàng</strong>
            </div>
            <div className="summary-row">
              <span>Hết hàng / Quá hạn:</span>
              <strong className="text-amber">{totalOutOfStock} mặt hàng</strong>
            </div>
            <div className="summary-row">
              <span>Quy tắc tự động:</span>
              <small className="text-muted">Quà hết tồn kho sẽ tự động gắn nhãn "Hết hàng" và tạm ẩn.</small>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP XÁC NHẬN XÓA (MÀN 4) */}
      {deleteTarget && (
        <div className="reward-modal-backdrop">
          <div className="confirm-modal-box">
            <div className="confirm-modal-icon text-red">🗑️</div>
            <h3 className="confirm-modal-title">Xác Nhận Xoá Quà Tặng?</h3>
            <p className="confirm-modal-desc">
              Bạn có chắc chắn muốn gỡ bỏ <strong>"{deleteTarget.title}"</strong> khỏi danh mục đổi thưởng?
              Hành động này sẽ ngăn công dân đổi mới và cập nhật lại kho voucher.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="action-btn-secondary"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                className="action-btn-danger"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? "Đang xoá quà tặng…" : "Xoá vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP THÔNG BÁO ĐÃ XÓA THÀNH CÔNG (MÀN 5) */}
      {deleteSuccessModal && (
        <div className="reward-modal-backdrop">
          <div className="confirm-modal-box">
            <div className="confirm-modal-icon text-emerald">✅</div>
            <span className="modal-mini-tag">POPUP</span>
            <h3 className="confirm-modal-title">ĐÃ XOÁ QUÀ TẶNG</h3>
            <p className="confirm-modal-desc">Danh sách đã cập nhật</p>
            <div className="confirm-modal-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="primary-action-btn"
                style={{ minWidth: "140px" }}
                onClick={() => setDeleteSuccessModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
