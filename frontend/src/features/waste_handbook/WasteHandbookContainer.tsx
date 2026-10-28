import React, { useState, useEffect, useRef } from "react";
import "./waste_handbook.css";
import { handbookApi } from "./handbookApi";
import type {
  WasteCategoryItem,
  WasteItemSummary,
  WasteItemDetail,
  WasteHandbookOverview,
  WasteHandbookAdminItem,
  WasteItemCreatePayload,
} from "./types";
import { AUTH_STORAGE_KEYS } from "../auth";

interface WasteHandbookContainerProps {
  onBackToHome?: () => void;
  onNavigateToMap?: (filter?: string) => void;
}

export const WasteHandbookContainer: React.FC<WasteHandbookContainerProps> = ({
  onBackToHome,
  onNavigateToMap,
}) => {
  // Kiểm tra quyền Admin
  let isAdmin = false;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO) || localStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    isAdmin = u?.role === "ADMIN" || u?.role_code === "ADMIN";
  } catch {}

  const [activeTab, setActiveTab] = useState<"citizen" | "admin_cms">("citizen");

  // ==========================================
  // CITIZEN STATE
  // ==========================================
  const [overview, setOverview] = useState<WasteHandbookOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<WasteItemSummary[] | null>(null);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchErrorMsg, setSearchErrorMsg] = useState<string | null>(null);

  // Instant Autocomplete Search State
  const [autocompleteItems, setAutocompleteItems] = useState<WasteItemSummary[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState<boolean>(false);
  const [isAutocompleting, setIsAutocompleting] = useState<boolean>(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Màn 2: Detail Modal
  const [activeItemDetail, setActiveItemDetail] = useState<WasteItemDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ==========================================
  // INTERACTIVE MINI-QUIZ: VẬT PHẨM DỄ NHẦM LẪN (LUẬT BVMT 2020)
  // ==========================================
  const TRICKY_WASTE_QUIZ = [
    {
      id: "quiz_1",
      itemName: "Vỏ hộp sữa giấy (Tetra Pak)",
      hint: "Có cấu tạo 6 lớp gồm giấy (75%), nhựa PE (20%) và màng nhôm mỏng (5%).",
      correctCategory: "RECYCLABLE",
      correctBinLabel: "♻️ Rác Tái Chế",
      explanation:
        "Vỏ hộp sữa giấy hoàn toàn tái chế được thành tấm lợp sinh thái và giấy carton! Bạn chỉ cần tháo ống hút, tráng sạch sữa thừa, làm dẹp và bỏ vào Thùng Rác Tái Chế.",
    },
    {
      id: "quiz_2",
      itemName: "Hộp xốp đựng cơm dính đầy dầu mỡ & thức ăn",
      hint: "Nhựa PS số 6 đã ngấm dầu mỡ thực phẩm, không thể tái chế cơ học.",
      correctCategory: "OTHER",
      correctBinLabel: "🗑️ Rác Khác (Rác còn lại)",
      explanation:
        "Nhiều người nhầm hộp xốp là Rác Tái Chế! Thực tế hộp xốp bẩn dính dầu mỡ không thể tái chế và nếu lẫn vào thùng tái chế sẽ làm hỏng cả mẻ giấy/nhựa sạch. Hãy gạt thức ăn thừa sang thùng Hữu cơ và bỏ vỏ hộp xốp vào Thùng Rác Khác.",
    },
    {
      id: "quiz_3",
      itemName: "Pin tiểu AA / Pin cúc áo đồng hồ đã hết điện",
      hint: "Chứa chì, thủy ngân và cadmium cực độc nếu rò rỉ ra đất và nguồn nước.",
      correctCategory: "HAZARDOUS",
      correctBinLabel: "☣️ Rác Nguy Hại",
      explanation:
        "1 viên pin nhỏ bị chôn lấp có thể làm ô nhiễm 500 lít nước ngầm trong 50 năm! Tuyệt đối không bỏ chung với rác sinh hoạt mà phải gom riêng đem tới Trạm Thu Hồi Rác Nguy Hại.",
    },
    {
      id: "quiz_4",
      itemName: "Bã cà phê, túi lọc trà giấy & vỏ trứng gà",
      hint: "Nguồn gốc sinh học tự nhiên, dễ phân hủy vi sinh thành phân bón compost.",
      correctCategory: "ORGANIC",
      correctBinLabel: "🍃 Rác Hữu Cơ",
      explanation:
        "Bã cà phê, bã trà và vỏ trứng đập vụn là nguyên liệu vàng để ủ phân hữu cơ (Compost) giàu dinh dưỡng cho cây trồng đô thị.",
    },
  ];
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizClaiming, setQuizClaiming] = useState<boolean>(false);
  const [quizRewardedIds, setQuizRewardedIds] = useState<string[]>([]);

  // ==========================================
  // ADMIN CMS STATE
  // ==========================================
  const [adminItems, setAdminItems] = useState<WasteHandbookAdminItem[]>([]);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminSearch, setAdminSearch] = useState<string>("");
  const [adminCategory, setAdminCategory] = useState<string>("");
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<WasteHandbookAdminItem | null>(null);
  const [adminSubmitting, setAdminSubmitting] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Form State for Admin Create / Edit
  const [formName, setFormName] = useState<string>("");
  const [formCategory, setFormCategory] = useState<string>("ORGANIC");
  const [formAltNames, setFormAltNames] = useState<string>("");
  const [formSortingGuide, setFormSortingGuide] = useState<string>("");
  const [formBinName, setFormBinName] = useState<string>("Thùng rác hữu cơ (Màu xanh lá)");
  const [formBinColor, setFormBinColor] = useState<string>("#10b981");
  const [formSafetyNotes, setFormSafetyNotes] = useState<string>("");
  const [formHasStation, setFormHasStation] = useState<boolean>(false);
  const [formStationLabel, setFormStationLabel] = useState<string>("📍 Xem trạm thu gom gần bạn");
  const [formFacilityFilter, setFormFacilityFilter] = useState<string>("recycling");
  const [formImageUrl, setFormImageUrl] = useState<string>("");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
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
    // Hỗ trợ mở trực tiếp vật phẩm khi truy cập link chia sẻ #handbook?item=ITEM_ID
    const hash = window.location.hash || "";
    if (hash.includes("?item=")) {
      const itemId = hash.split("?item=")[1]?.split("&")[0]?.trim();
      if (itemId) {
        handleOpenDetail(decodeURIComponent(itemId));
      }
    }
  }, []);

  const handleSelectQuizAnswer = async (catCode: string) => {
    const currentQ = TRICKY_WASTE_QUIZ[quizIndex];
    setQuizSelected(catCode);
    if (catCode === currentQ.correctCategory && !quizRewardedIds.includes(currentQ.id)) {
      setQuizRewardedIds((prev) => [...prev, currentQ.id]);
      const hasToken = !!localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      if (hasToken) {
        try {
          setQuizClaiming(true);
          await handbookApi.claimQuizReward(currentQ.itemName);
          showToast(`🎉 Chính xác! Bạn nhận được +2 Điểm Xanh vào Ví nhờ phân loại đúng "${currentQ.itemName}"!`);
        } catch {
          showToast(`🎉 Chính xác! Bạn đã nắm vững quy chuẩn phân loại "${currentQ.itemName}"!`);
        } finally {
          setQuizClaiming(false);
        }
      } else {
        showToast(`🎉 Chính xác! Hãy đăng nhập để nhận +2 Điểm Xanh khi trả lời đúng nhé!`);
      }
    }
  };

  // Đóng autocomplete dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Instant Autocomplete live search debounce (250ms)
  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setAutocompleteItems([]);
      setShowAutocomplete(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsAutocompleting(true);
        const results = await handbookApi.searchItems({
          q: term,
          limit: 6,
        });
        setAutocompleteItems(results);
        setShowAutocomplete(true);
      } catch (err) {
        setAutocompleteItems([]);
      } finally {
        setIsAutocompleting(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (queryText?: string, catCode?: string | null) => {
    const q = queryText !== undefined ? queryText : searchQuery;
    const cat = catCode !== undefined ? catCode : selectedCategory;

    if (!q.trim() && !cat) {
      setSearchErrorMsg("Vui lòng nhập tên loại rác cần tra cứu");
      return;
    }
    setSearchErrorMsg(null);
    setShowAutocomplete(false);

    try {
      setSearching(true);
      const items = await handbookApi.searchItems({
        q: q.trim() ? q.trim() : undefined,
        category: cat || undefined,
        limit: 30,
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
      setShowAutocomplete(false);
      handleSearch();
    }
  };

  const handleSelectCategory = (catCode: string) => {
    if (selectedCategory === catCode) {
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
    setShowAutocomplete(false);
  };

  // Màn 2: Xem chi tiết loại rác
  const handleOpenDetail = async (itemId: string) => {
    setShowAutocomplete(false);
    try {
      setLoadingDetail(true);
      const detail = await handbookApi.getItemDetail(itemId);
      setActiveItemDetail(detail);
    } catch (err) {
      showToast("Không thể tải hướng dẫn chi tiết. Vui lòng thử lại");
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
    const filter = activeItemDetail.facility_filter_type || "recycling";
    setActiveItemDetail(null);
    if (onNavigateToMap) {
      onNavigateToMap(filter);
    }
  };

  // ==========================================
  // ADMIN CMS LOGIC
  // ==========================================
  const fetchAdminItems = async () => {
    try {
      setAdminLoading(true);
      const res = await handbookApi.adminGetItems({
        q: adminSearch.trim() || undefined,
        category: adminCategory || undefined,
        limit: 100,
      });
      setAdminItems(res.items);
    } catch (err) {
      showToast("Không thể tải danh sách quản trị");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admin_cms") {
      fetchAdminItems();
    }
  }, [activeTab, adminCategory]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategory("ORGANIC");
    setFormAltNames("");
    setFormSortingGuide("");
    setFormBinName("Thùng rác hữu cơ (Màu xanh lá)");
    setFormBinColor("#10b981");
    setFormSafetyNotes("");
    setFormHasStation(false);
    setFormStationLabel("📍 Xem trạm thu gom gần bạn");
    setFormFacilityFilter("recycling");
    setFormImageUrl("");
    setFormOrder(adminItems.length + 1);
    setFormIsActive(true);
    setAdminError(null);
    setAdminModalOpen(true);
  };

  const handleOpenEditModal = (item: WasteHandbookAdminItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category_code);
    setFormAltNames(item.alternative_names || "");
    setFormSortingGuide(item.sorting_guide);
    setFormBinName(item.bin_name);
    setFormBinColor(item.bin_color);
    setFormSafetyNotes(item.safety_notes || "");
    setFormHasStation(item.has_dedicated_station);
    setFormStationLabel(item.station_action_label);
    setFormFacilityFilter(item.facility_filter_type || "recycling");
    setFormImageUrl(item.image_url || "");
    setFormOrder(item.display_order);
    setFormIsActive(item.is_active);
    setAdminError(null);
    setAdminModalOpen(true);
  };

  const handleSaveAdminItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setAdminError("Vui lòng nhập tên loại rác");
      return;
    }
    if (!formSortingGuide.trim()) {
      setAdminError("Vui lòng nhập hướng dẫn sơ chế & phân loại");
      return;
    }

    setAdminSubmitting(true);
    setAdminError(null);

    const payload: WasteItemCreatePayload = {
      name: formName.trim(),
      category_code: formCategory,
      alternative_names: formAltNames.trim() || undefined,
      sorting_guide: formSortingGuide.trim(),
      bin_name: formBinName.trim(),
      bin_color: formBinColor,
      safety_notes: formSafetyNotes.trim() || undefined,
      has_dedicated_station: formHasStation,
      station_action_label: formStationLabel.trim(),
      facility_filter_type: formFacilityFilter,
      image_url: formImageUrl.trim() || undefined,
      display_order: Number(formOrder) || 1,
      is_active: formIsActive,
    };

    try {
      if (editingItem) {
        await handbookApi.adminUpdateItem(editingItem.item_id, payload);
        showToast("Đã cập nhật loại rác thành công!");
      } else {
        await handbookApi.adminCreateItem(payload);
        showToast("Đã thêm loại rác mới vào cẩm nang!");
      }
      setAdminModalOpen(false);
      fetchAdminItems();
      fetchOverview();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Lỗi lưu dữ liệu. Vui lòng kiểm tra lại";
      setAdminError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeleteAdminItem = async (item: WasteHandbookAdminItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${item.name}" khỏi cẩm nang?`)) {
      return;
    }
    try {
      await handbookApi.adminDeleteItem(item.item_id);
      showToast(`Đã xóa "${item.name}" thành công`);
      fetchAdminItems();
      fetchOverview();
    } catch (err: any) {
      showToast("Không thể xóa loại rác này. Vui lòng thử lại");
    }
  };

  // Helper auto-set default bin color when category changes
  const handleCategoryChange = (code: string) => {
    setFormCategory(code);
    if (code === "ORGANIC") {
      setFormBinName("Thùng rác hữu cơ (Màu xanh lá)");
      setFormBinColor("#10b981");
      setFormHasStation(false);
    } else if (code === "RECYCLABLE") {
      setFormBinName("Thùng rác tái chế (Màu vàng/trắng)");
      setFormBinColor("#3b82f6");
      setFormHasStation(false);
    } else if (code === "HAZARDOUS") {
      setFormBinName("Thùng rác nguy hại (Màu đỏ)");
      setFormBinColor("#ef4444");
      setFormHasStation(true);
      setFormStationLabel("📍 Xem trạm thu hồi rác nguy hại gần bạn nhất");
      setFormFacilityFilter("recycling");
    } else {
      setFormBinName("Thùng rác còn lại (Màu xám/đen)");
      setFormBinColor("#64748b");
      setFormHasStation(false);
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
            Tra cứu chuẩn hóa cách phân loại, xử lý chất thải sinh hoạt tại nguồn bám sát Luật BVMT 2020
          </p>
        </div>

        <div className="handbook-header-actions">
          {/* Admin Switcher */}
          {isAdmin && (
            <div className="admin-nav-segmented">
              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "citizen" ? "active" : ""}`}
                onClick={() => setActiveTab("citizen")}
              >
                <span>📖</span> Cẩm nang người dân
              </button>
              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "admin_cms" ? "active" : ""}`}
                onClick={() => setActiveTab("admin_cms")}
              >
                <span>⚙️</span> Quản trị từ điển rác (CMS)
              </button>
            </div>
          )}

          {onBackToHome && (
            <button type="button" className="back-home-btn" onClick={onBackToHome}>
              <span>←</span> Quay lại Bản đồ
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GIAO DIỆN CÔNG DÂN / TRA CỨU CẨM NANG             */}
      {/* ======================================================== */}
      {activeTab === "citizen" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "16px", fontWeight: "600" }}>Đang tải cẩm nang phân loại rác…</div>
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
                {/* CỘT TRÁI: TÌM KIẾM CÓ AUTOCOMPLETE INSTANT SEARCH */}
                <div className="search-box-card" ref={autocompleteRef}>
                  <div className="search-box-title">
                    <span>🔍</span> Tra Cứu Đồ Vật & Loại Rác
                  </div>

                  <div className="search-input-wrapper">
                    <span className="search-icon-inside">🔎</span>
                    <input
                      type="text"
                      className={`search-input-field ${searchErrorMsg ? "input-error" : ""}`}
                      placeholder="Gõ tên đồ vật (vd: pin cũ, vỏ lon bia, bóng đèn, hộp xốp)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchErrorMsg) setSearchErrorMsg(null);
                      }}
                      onKeyDown={handleKeyDownSearch}
                      onFocus={() => {
                        if (autocompleteItems.length > 0) setShowAutocomplete(true);
                      }}
                    />
                    {isAutocompleting && <span className="autocomplete-spinner">⏳</span>}

                    {/* INSTANT AUTOCOMPLETE DROPDOWN */}
                    {showAutocomplete && autocompleteItems.length > 0 && (
                      <div className="autocomplete-dropdown">
                        <div className="autocomplete-header">
                          Gợi ý nhanh ({autocompleteItems.length} kết quả):
                        </div>
                        {autocompleteItems.map((item) => (
                          <div
                            key={item.item_id}
                            className="autocomplete-item"
                            onClick={() => handleOpenDetail(item.item_id)}
                          >
                            <div className="autocomplete-item-left">
                              <span
                                className="autocomplete-cat-dot"
                                style={{ background: item.category_color }}
                              />
                              <span className="autocomplete-item-name">{item.name}</span>
                            </div>
                            <div className="autocomplete-item-right">
                              <span
                                className="autocomplete-cat-tag"
                                style={{
                                  background: `${item.category_color}18`,
                                  color: item.category_color,
                                }}
                              >
                                {item.bin_name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {searchErrorMsg && (
                    <div style={{ color: "#dc2626", fontSize: "12px", marginBottom: "12px", fontWeight: "500" }}>
                      ⚠️ {searchErrorMsg}
                    </div>
                  )}

                  <div className="search-hint-text">
                    Gõ từ khóa để nhận gợi ý tức thì, hoặc nhấn Enter để lọc danh sách bên dưới.
                  </div>

                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                    Gợi ý tra cứu nhanh:
                  </div>
                  <div className="quick-search-chips">
                    {[
                      "Pin cũ",
                      "Vỏ hộp sữa",
                      "Bìa carton",
                      "Bã cà phê",
                      "Bóng đèn huỳnh quang",
                      "Túi nilon",
                    ].map((term) => (
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
                    ))}
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

              {/* MÀN 1.5: MINI-QUIZ TƯƠNG TÁC HỌC ĐI ĐÔI VỚI HÀNH (+2 ĐIỂM XANH) */}
              {(() => {
                const currentQ = TRICKY_WASTE_QUIZ[quizIndex];
                const isCorrect = quizSelected === currentQ.correctCategory;
                const isAnswered = quizSelected !== null;
                return (
                  <div
                    style={{
                      marginBottom: "24px",
                      padding: "18px 22px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
                      border: "1px solid #86efac",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>🎯</span>
                        <strong style={{ fontSize: "15px", color: "#065f46" }}>
                          Thử Tài Phân Loại Rác 30 Giây (Câu {quizIndex + 1}/{TRICKY_WASTE_QUIZ.length})
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 10px",
                            borderRadius: "999px",
                            background: "#059669",
                            color: "#ffffff",
                          }}
                        >
                          +2 Điểm Xanh / câu đúng
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizSelected(null);
                          setQuizIndex((prev) => (prev + 1) % TRICKY_WASTE_QUIZ.length);
                        }}
                        style={{
                          padding: "5px 12px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "8px",
                          border: "1px solid #059669",
                          background: "#ffffff",
                          color: "#047857",
                          cursor: "pointer",
                        }}
                      >
                        🔄 Câu hỏi tiếp theo →
                      </button>
                    </div>

                    <div style={{ fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>
                      Đồ vật dễ nhầm lẫn:{" "}
                      <strong style={{ color: "#047857", fontSize: "15px" }}>"{currentQ.itemName}"</strong> cần bỏ vào
                      thùng rác nào theo Luật BVMT 2020?
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569", marginBottom: "12px" }}>
                      💡 Gợi ý cấu tạo: {currentQ.hint}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {[
                        { code: "ORGANIC", label: "🍃 Thùng Hữu Cơ", color: "#16a34a" },
                        { code: "RECYCLABLE", label: "♻️ Thùng Tái Chế", color: "#2563eb" },
                        { code: "HAZARDOUS", label: "☣️ Thùng Nguy Hại", color: "#dc2626" },
                        { code: "OTHER", label: "🗑️ Thùng Rác Khác", color: "#475569" },
                      ].map((opt) => {
                        const isPicked = quizSelected === opt.code;
                        const isRightOpt = opt.code === currentQ.correctCategory;
                        let bg = "#ffffff";
                        let border = "1px solid #cbd5e1";
                        if (isAnswered) {
                          if (isRightOpt) {
                            bg = "#dcfce7";
                            border = "2px solid #16a34a";
                          } else if (isPicked && !isRightOpt) {
                            bg = "#fee2e2";
                            border = "2px solid #dc2626";
                          }
                        }
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            disabled={quizClaiming}
                            onClick={() => handleSelectQuizAnswer(opt.code)}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "10px",
                              border,
                              background: bg,
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: "13px",
                              cursor: "pointer",
                              textAlign: "left",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span>{opt.label}</span>
                            {isAnswered && isRightOpt && <span>✅</span>}
                            {isAnswered && isPicked && !isRightOpt && <span>❌</span>}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: isCorrect ? "#dcfce7" : "#fef3c7",
                          border: isCorrect ? "1px solid #86efac" : "1px solid #fde68a",
                          fontSize: "13px",
                          color: isCorrect ? "#14532d" : "#78350f",
                        }}
                      >
                        <strong>
                          {isCorrect
                            ? `🎉 Chính xác! Đáp án chuẩn là ${currentQ.correctBinLabel}: `
                            : `💡 Chưa chính xác! Đáp án đúng phải là ${currentQ.correctBinLabel}: `}
                        </strong>
                        {currentQ.explanation}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                              src={
                                it.image_url ||
                                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"
                              }
                              alt={it.name}
                              className="item-img"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400";
                              }}
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
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GIAO DIỆN QUẢN TRỊ ADMIN CMS                      */}
      {/* ======================================================== */}
      {activeTab === "admin_cms" && (
        <div className="admin-cms-card">
          <div className="admin-cms-topbar">
            <div>
              <h2 className="admin-cms-title">⚙️ Quản Lý Từ Điển Danh Mục Rác Thải</h2>
              <p className="admin-cms-sub">
                Thêm mới, cập nhật mẹo sơ chế, màu thùng và điều phối liên kết Bản đồ WebGIS
              </p>
            </div>

            <button
              type="button"
              className="btn-admin-add"
              onClick={handleOpenCreateModal}
            >
              <span>➕</span> Thêm loại rác mới
            </button>
          </div>

          {/* Admin Filter bar */}
          <div className="admin-filter-bar">
            <input
              type="text"
              className="admin-search-input"
              placeholder="Tìm theo tên hoặc từ đồng nghĩa..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchAdminItems()}
            />

            <select
              className="admin-select"
              value={adminCategory}
              onChange={(e) => setAdminCategory(e.target.value)}
            >
              <option value="">Tất cả phân loại</option>
              <option value="ORGANIC">Rác hữu cơ</option>
              <option value="RECYCLABLE">Rác tái chế</option>
              <option value="HAZARDOUS">Rác nguy hại</option>
              <option value="OTHER">Rác khác</option>
            </select>

            <button
              type="button"
              className="btn-admin-search"
              onClick={fetchAdminItems}
            >
              Tìm kiếm
            </button>
          </div>

          {/* Table */}
          {adminLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              Đang tải danh sách từ điển rác…
            </div>
          ) : adminItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              Chưa có đồ vật nào trong danh mục. Hãy bấm "Thêm loại rác mới"!
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên đồ vật / Loại rác</th>
                    <th>Nhóm phân loại</th>
                    <th>Quy chuẩn thùng</th>
                    <th>Trạm thu hồi WebGIS</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "center" }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {adminItems.map((item, idx) => (
                    <tr key={item.item_id}>
                      <td style={{ fontWeight: 600, color: "#64748b" }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={
                              item.image_url ||
                              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100"
                            }
                            alt={item.name}
                            className="admin-thumb-img"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100";
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.name}</div>
                            {item.alternative_names && (
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                Từ khác: {item.alternative_names}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className="admin-cat-badge"
                          style={{
                            background: `${item.category_color}20`,
                            color: item.category_color,
                            border: `1px solid ${item.category_color}50`,
                          }}
                        >
                          {item.category_name}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            className="bin-color-dot"
                            style={{ background: item.bin_color }}
                          />
                          <span style={{ fontSize: "12px", fontWeight: 600 }}>{item.bin_name}</span>
                        </div>
                      </td>

                      <td>
                        {item.has_dedicated_station ? (
                          <span className="badge-station-yes">
                            📍 Có trạm thu hồi ({item.facility_filter_type || "recycling"})
                          </span>
                        ) : (
                          <span className="badge-station-no">Rác sinh hoạt</span>
                        )}
                      </td>

                      <td>
                        {item.is_active ? (
                          <span className="badge-status-active">Hiển thị</span>
                        ) : (
                          <span className="badge-status-inactive">Đã ẩn</span>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn-table-edit"
                            onClick={() => handleOpenEditModal(item)}
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            className="btn-table-del"
                            onClick={() => handleDeleteAdminItem(item)}
                          >
                            🗑️ Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL THÊM / CHỈNH SỬA LOẠI RÁC (ADMIN CMS)             */}
      {/* ======================================================== */}
      {adminModalOpen && (
        <div className="modal-overlay">
          <div className="admin-form-modal">
            <div className="modal-header">
              <h2>{editingItem ? `Chỉnh Sửa Loại Rác: ${editingItem.name}` : "Thêm Loại Rác Mới"}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setAdminModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminItem} className="admin-form-body">
              {adminError && <div className="admin-form-error">⚠️ {adminError}</div>}

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tên loại rác / đồ vật <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Vỏ hộp sữa, Pin cúc áo, Bã trà..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phân loại rác chuẩn quốc gia <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={formCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="ORGANIC">🍃 Rác Hữu Cơ (Dễ phân hủy)</option>
                    <option value="RECYCLABLE">♻️ Rác Tái Chế (Giấy, nhựa, kim loại)</option>
                    <option value="HAZARDOUS">☣️ Rác Nguy Hại (Pin, hóa chất, điện tử)</option>
                    <option value="OTHER">🗑️ Rác Thải Khác (Rác còn lại)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tên gọi thay thế / Từ đồng nghĩa (cách nhau bởi dấu phẩy):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: vỏ sữa tươi, hộp giấy tetrapak, vỏ socola"
                  value={formAltNames}
                  onChange={(e) => setFormAltNames(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Hướng dẫn cách sơ chế & phân loại <span className="req">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="VD: Rửa sạch bên trong, để ráo nước, gấp dẹp lại để tiết kiệm thể tích..."
                  value={formSortingGuide}
                  onChange={(e) => setFormSortingGuide(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Tên quy chuẩn thùng rác:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formBinName}
                    onChange={(e) => setFormBinName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Mã màu thùng rác (Hex):</label>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={formBinColor}
                      onChange={(e) => setFormBinColor(e.target.value)}
                      style={{ width: "42px", height: "38px", border: "none", cursor: "pointer" }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={formBinColor}
                      onChange={(e) => setFormBinColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Lưu ý an toàn môi trường (nếu có):</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Tuyệt đối không đốt hay đập dập pin để tránh nổ"
                  value={formSafetyNotes}
                  onChange={(e) => setFormSafetyNotes(e.target.value)}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>URL Hình ảnh minh họa:</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Thứ tự ưu tiên hiển thị:</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Checkbox Trạm chuyên dụng & Trạng thái */}
              <div className="admin-checkbox-card">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formHasStation}
                    onChange={(e) => setFormHasStation(e.target.checked)}
                  />
                  <div>
                    <strong>Có điểm / Trạm thu hồi chuyên dụng trên WebGIS</strong>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      Khi bật tùy chọn này, người dân sẽ thấy nút "📍 Xem trạm thu hồi gần bạn nhất" dẫn sang Bản đồ
                    </div>
                  </div>
                </label>

                {formHasStation && (
                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600 }}>Nhãn nút bấm dẫn sang bản đồ:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formStationLabel}
                        onChange={(e) => setFormStationLabel(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600 }}>Bộ lọc lớp bản đồ:</label>
                      <select
                        className="form-select"
                        value={formFacilityFilter}
                        onChange={(e) => setFormFacilityFilter(e.target.value)}
                      >
                        <option value="recycling">Trạm Xanh / Thu gom tái chế & pin</option>
                        <option value="all">Tất cả địa điểm</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: "12px" }}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  <span>Kích hoạt hiển thị cho người dân tra cứu</span>
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: "24px", padding: 0 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAdminModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={adminSubmitting}
                >
                  {adminSubmitting ? "Đang lưu…" : editingItem ? "Cập Nhật Loại Rác" : "Thêm Vào Cẩm Nang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOADING DETAIL (Table 118) */}
      {loadingDetail && (
        <div className="modal-overlay">
          <div style={{ background: "#ffffff", padding: "24px 32px", borderRadius: "12px", color: "#64748b", fontWeight: 600 }}>
            Đang tải dữ liệu cẩm nang…
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MÀN 2: MODAL CHI TIẾT MỘT LOẠI RÁC (3 KHỐI)             */}
      {/* ======================================================== */}
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
                  src={
                    activeItemDetail.image_url ||
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"
                  }
                  alt={activeItemDetail.name}
                  className="detail-img-large"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400";
                  }}
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

              {/* KHỐI 3: HÀNH ĐỘNG DẪN SANG BẢN ĐỒ WEBGIS */}
              <div className="col-item-actions">
                {activeItemDetail.has_dedicated_station || activeItemDetail.category_code === "HAZARDOUS" ? (
                  <button
                    type="button"
                    className="btn-action-map btn-action-map-highlight"
                    onClick={handleFindStation}
                    title="Chuyển sang bản đồ WebGIS và lọc các Trạm Xanh lân cận"
                  >
                    <span>📍</span>
                    <span>{activeItemDetail.station_action_label || "Xem trạm thu hồi rác nguy hại"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-action-map"
                    onClick={handleFindStation}
                  >
                    <span>🗺️</span>
                    <span>{activeItemDetail.station_action_label || "Xem bản đồ thu gom"}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-action-share"
                  style={{
                    background: "#ecfdf5",
                    color: "#047857",
                    borderColor: "#6ee7b7",
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    setActiveItemDetail(null);
                    window.location.hash = "#qr-scan";
                  }}
                  title="Chuyển sang cổng Quét mã QR tại Trạm Xanh để nhận điểm thưởng"
                >
                  <span>📷</span>
                  <span>Quét QR tích điểm tại Trạm Thu Gom</span>
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
