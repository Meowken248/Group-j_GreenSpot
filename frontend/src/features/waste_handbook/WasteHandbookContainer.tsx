import React, { useState, useEffect } from "react";
import "./waste_handbook.css";
import { handbookApi } from "./handbookApi";
import type {
  WasteCategoryItem,
  WasteItemSummary,
  WasteItemDetail,
  WasteHandbookOverview,
} from "./types";

interface WasteHandbookContainerProps {
  onBackToHome?: () => void;
  onNavigateToMap?: (filter?: string) => void;
}

export const WasteHandbookContainer: React.FC<WasteHandbookContainerProps> = ({
  onBackToHome,
  onNavigateToMap,
}) => {
  const [overview, setOverview] = useState<WasteHandbookOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<WasteItemSummary[] | null>(null);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchErrorMsg, setSearchErrorMsg] = useState<string | null>(null);

  // Màn 2: Detail Modal
  const [activeItemDetail, setActiveItemDetail] = useState<WasteItemDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await handbookApi.getOverview();
      setOverview(res);
    } catch (err) {
      setError("Không thể tải danh mục cẩm nang. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSearch = async (queryText?: string, catCode?: string | null) => {
    const q = queryText !== undefined ? queryText : searchQuery;
    const cat = catCode !== undefined ? catCode : selectedCategory;

    // Validation per Table 117
    if (!q.trim() && !cat) {
      setSearchErrorMsg("Vui lòng nhập tên loại rác cần tra cứu");
      return;
    }
    setSearchErrorMsg(null);

    try {
      setSearching(true);
      const items = await handbookApi.searchItems({
        q: q.trim() ? q.trim() : undefined,
        category: cat || undefined,
        limit: 20,
      });
      setSearchResults(items);
    } catch (err) {
      setSearchErrorMsg("Lỗi tìm kiếm. Vui lòng thử lại");
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelectCategory = (catCode: string) => {
    if (selectedCategory === catCode) {
      // Toggle off
      setSelectedCategory(null);
      handleSearch(searchQuery, null);
    } else {
      setSelectedCategory(catCode);
      handleSearch(searchQuery, catCode);
    }
  };

  const handleClearFilter = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSearchResults(null);
    setSearchErrorMsg(null);
  };

  // Màn 2: Xem chi tiết loại rác
  const handleOpenDetail = async (itemId: string) => {
    try {
      setLoadingDetail(true);
      const detail = await handbookApi.getItemDetail(itemId);
      setActiveItemDetail(detail);
    } catch (err) {
      alert("Không thể tải hướng dẫn chi tiết. Vui lòng thử lại");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Copy share link
  const handleCopyShareLink = () => {
    if (!activeItemDetail) return;
    const url = `${window.location.origin}/#handbook?item=${activeItemDetail.item_id}`;
    navigator.clipboard?.writeText(url);
    showToast("Đã sao chép liên kết cẩm nang");
  };

  const handleFindStation = () => {
    if (!activeItemDetail) return;
    setActiveItemDetail(null);
    if (onNavigateToMap) {
      onNavigateToMap(activeItemDetail.facility_filter_type || undefined);
    }
  };

  return (
    <div className="handbook-page-container">
      {/* Toast Notification */}
      {toastMessage && <div className="handbook-toast">{toastMessage}</div>}

      {/* Header */}
      <div className="handbook-header">
        <div className="handbook-header-left">
          <h1>
            <span>📖</span> Thư Viện Sống Xanh: Cẩm Nang Phân Loại Rác
          </h1>
          <p>
            Tra cứu chuẩn hóa cách phân loại, xử lý chất thải sinh hoạt tại nguồn và hướng dẫn bỏ rác đúng thùng
          </p>
        </div>
        {onBackToHome && (
          <button type="button" className="back-home-btn" onClick={onBackToHome}>
            <span>←</span> Quay lại Bản đồ
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
          <div>Đang tải cẩm nang phân loại rác…</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>
          <button type="button" className="btn-secondary" onClick={fetchOverview}>
            Thử lại
          </button>
        </div>
      ) : overview ? (
        <>
          {/* MÀN 1: TWO-COLUMN MAIN LAYOUT */}
          <div className="handbook-main-layout">
            {/* CỘT TRÁI: TÌM KIẾM */}
            <div className="search-box-card">
              <div className="search-box-title">
                <span>🔍</span> Tra Cứu Đồ Vật & Loại Rác
              </div>

              <div className="search-input-wrapper">
                <span className="search-icon-inside">🔎</span>
                <input
                  type="text"
                  className={`search-input-field ${searchErrorMsg ? "input-error" : ""}`}
                  placeholder="Gõ tên đồ vật (vd: vỏ hộp sữa, pin cũ, lá cây)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchErrorMsg) setSearchErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDownSearch}
                />
              </div>

              {searchErrorMsg && (
                <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px", fontWeight: "500" }}>
                  ⚠️ {searchErrorMsg}
                </div>
              )}

              <div className="search-hint-text">
                Nhập từ khóa và bấm Enter để xem ngay cẩm nang hướng dẫn sơ chế và phân loại rác.
              </div>

              <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                Gợi ý tra cứu nhanh:
              </div>
              <div className="quick-search-chips">
                {["Pin cũ", "Vỏ hộp sữa", "Bìa carton", "Bã cà phê", "Bóng đèn huỳnh quang", "Túi nilon"].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      className="chip-btn"
                      onClick={() => {
                        setSearchQuery(term);
                        handleSearch(term, selectedCategory);
                      }}
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* CỘT PHẢI: 4 NHÓM RÁC CHUẨN QUỐC GIA */}
            <div className="categories-grid">
              {overview.categories.map((cat: WasteCategoryItem) => {
                const isSelected = selectedCategory === cat.code;
                return (
                  <div
                    key={cat.code}
                    className={`category-card ${isSelected ? "active" : ""}`}
                    style={{
                      borderColor: isSelected ? cat.color_hex : undefined,
                    }}
                    onClick={() => handleSelectCategory(cat.code)}
                  >
                    <div className="category-card-top">
                      <div
                        className="cat-icon-badge"
                        style={{
                          background: `${cat.color_hex}20`,
                          color: cat.color_hex,
                        }}
                      >
                        {cat.code === "ORGANIC"
                          ? "🍃"
                          : cat.code === "RECYCLABLE"
                          ? "♻️"
                          : cat.code === "HAZARDOUS"
                          ? "☣️"
                          : "🗑️"}
                      </div>
                      <span
                        className="cat-items-count"
                        style={{
                          background: `${cat.color_hex}15`,
                          color: cat.color_hex,
                        }}
                      >
                        {cat.item_count} loại đồ vật
                      </span>
                    </div>

                    <div className="cat-title">{cat.name}</div>
                    <div className="cat-desc">{cat.description}</div>

                    <div className="cat-bin-box">
                      <span
                        className="bin-color-dot"
                        style={{ background: cat.color_hex }}
                      />
                      <span>{cat.bin_name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MÀN 3: KẾT QUẢ TÌM KIẾM HOẶC CÁC LOẠI RÁC NỔI BẬT */}
          <div className="results-section">
            <div className="results-header">
              <h2>
                {searching
                  ? "Đang tìm kiếm…"
                  : searchResults !== null
                  ? `Kết quả tra cứu (${searchResults.length} loại rác)`
                  : "Các loại rác phổ biến trong đời sống"}
              </h2>

              {(searchResults !== null || selectedCategory !== null || searchQuery) && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClearFilter}
                >
                  ✕ Xem tất cả cẩm nang
                </button>
              )}
            </div>

            {searching ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Đang tìm kiếm dữ liệu…
              </div>
            ) : searchResults !== null && searchResults.length === 0 ? (
              /* EMPTY RESULT STATE */
              <div className="empty-handbook-state">
                <div style={{ fontSize: "42px", marginBottom: "12px" }}>🔍</div>
                <h3>Không tìm thấy loại rác phù hợp</h3>
                <p>
                  Thử đổi từ khóa tìm kiếm hoặc chọn 1 trong 4 nhóm rác tiêu chuẩn ở trên.
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClearFilter}
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="items-grid">
                {(searchResults !== null ? searchResults : overview.featured_items).map(
                  (it: WasteItemSummary) => (
                    <div key={it.item_id} className="item-card">
                      <div className="item-img-wrap">
                        <img
                          src={it.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"}
                          alt={it.name}
                          className="item-img"
                        />
                        <span
                          className="item-category-pill"
                          style={{ background: it.category_color }}
                        >
                          {it.category_name}
                        </span>
                      </div>

                      <div className="item-card-body">
                        <div className="item-title">{it.name}</div>
                        <div className="item-bin-note">
                          <span>📦 Bỏ vào: </span>
                          <strong>{it.bin_name}</strong>
                        </div>

                        <button
                          type="button"
                          className="btn-item-detail"
                          onClick={() => handleOpenDetail(it.item_id)}
                        >
                          Xem hướng dẫn chi tiết
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* LOADING DETAIL (Table 118) */}
      {loadingDetail && (
        <div className="modal-overlay">
          <div style={{ background: "#ffffff", padding: "24px 32px", borderRadius: "12px", color: "#64748b", fontWeight: 600 }}>
            Đang tải dữ liệu…
          </div>
        </div>
      )}

      {/* MÀN 2: MODAL CHI TIẾT MỘT LOẠI RÁC (3 KHỐI) */}
      {activeItemDetail && (
        <div className="modal-overlay">
          <div className="handbook-detail-modal">
            <div className="modal-header">
              <h2>Cẩm Nang Xử Lý: {activeItemDetail.name}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveItemDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-detail-three-cols">
              {/* KHỐI 1: HÌNH ẢNH */}
              <div className="col-item-image">
                <img
                  src={activeItemDetail.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"}
                  alt={activeItemDetail.name}
                  className="detail-img-large"
                />
                <div className="detail-item-name">{activeItemDetail.name}</div>
                <div>
                  <span
                    className="detail-category-tag"
                    style={{ background: activeItemDetail.category_color }}
                  >
                    {activeItemDetail.category_name}
                  </span>
                </div>
                {activeItemDetail.alternative_names && (
                  <div className="detail-alt-names">
                    Tên gọi khác: {activeItemDetail.alternative_names}
                  </div>
                )}
              </div>

              {/* KHỐI 2: HƯỚNG DẪN PHÂN LOẠI & THÙNG RÁC */}
              <div className="col-item-guide">
                <div className="guide-section-title">
                  <span>📋</span> Cách sơ chế & Phân loại:
                </div>
                <div className="guide-text-content">{activeItemDetail.sorting_guide}</div>

                <div className="guide-bin-card">
                  <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                    Quy chuẩn màu thùng:
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700" }}>
                    <span
                      className="bin-color-dot"
                      style={{ background: activeItemDetail.bin_color }}
                    />
                    <span>{activeItemDetail.bin_name}</span>
                  </div>
                </div>

                {activeItemDetail.safety_notes && (
                  <div className="guide-safety-warning">
                    <strong>⚠️ Lưu ý an toàn:</strong> {activeItemDetail.safety_notes}
                  </div>
                )}
              </div>

              {/* KHỐI 3: HÀNH ĐỘNG */}
              <div className="col-item-actions">
                <button
                  type="button"
                  className="btn-action-map"
                  onClick={handleFindStation}
                >
                  <span>🗺️</span>
                  <span>{activeItemDetail.station_action_label}</span>
                </button>

                <button
                  type="button"
                  className="btn-action-share"
                  onClick={handleCopyShareLink}
                >
                  <span>🔗</span>
                  <span>Chia sẻ cẩm nang</span>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveItemDetail(null)}
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
