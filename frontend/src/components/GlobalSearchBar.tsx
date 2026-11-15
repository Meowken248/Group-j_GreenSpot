import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getSearchAutocompleteAPI,
  searchGlobalAPI,
} from "../services/searchApi";
import type {
  AutocompleteItem,
  GlobalSearchResultItem,
  GlobalSearchResponse,
} from "../services/searchApi";
import "./GlobalSearchBar.scss";

interface GlobalSearchBarProps {
  isDarkMode?: boolean;
  onNavigate?: (urlPath: string) => void;
  userCoords?: { lat: number; lng: number } | null;
}

const ENTITY_CONFIG: Record<
  string,
  { label: string; icon: string; badgeClass: string }
> = {
  incident: {
    label: "Sự cố",
    icon: "🔴",
    badgeClass: "badge-incident",
  },
  hotspot: {
    label: "Điểm nóng",
    icon: "🔥",
    badgeClass: "badge-hotspot",
  },
  sos: {
    label: "SOS Ngập",
    icon: "🚨",
    badgeClass: "badge-sos",
  },
  event: {
    label: "Sự kiện",
    icon: "🌱",
    badgeClass: "badge-event",
  },
  post: {
    label: "Bài viết",
    icon: "💬",
    badgeClass: "badge-post",
  },
  handbook: {
    label: "Cẩm nang",
    icon: "♻️",
    badgeClass: "badge-handbook",
  },
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  isDarkMode = false,
  onNavigate,
  userCoords,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Modal kết quả tìm kiếm chi tiết
  const [showFullModal, setShowFullModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearchingFull, setIsSearchingFull] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phím tắt Ctrl+K hoặc Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowFullModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Autocomplete
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await getSearchAutocompleteAPI(trimmed, undefined, 8);
        setSuggestions(res.suggestions);
        setIsOpen(true);
      } catch (err) {
        console.warn("Autocomplete error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Thực hiện tìm kiếm toàn diện
  const executeFullSearch = useCallback(
    async (qText: string, filter: string = "all") => {
      if (!qText.trim()) return;
      setIsSearchingFull(true);
      setShowFullModal(true);
      setIsOpen(false);
      try {
        const entityTypes = filter !== "all" ? [filter] : undefined;
        const res = await searchGlobalAPI({
          q: qText.trim(),
          entity_types: entityTypes,
          lat: userCoords?.lat,
          lon: userCoords?.lng,
          radius_km: 25,
          page: 1,
          page_size: 20,
        });
        setSearchResults(res);
      } catch (err) {
        console.error("Full search error:", err);
      } finally {
        setIsSearchingFull(false);
      }
    },
    [userCoords]
  );

  const handleSelectItem = (item: AutocompleteItem) => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(item.url_path);
    } else {
      window.location.hash = item.url_path.startsWith("/")
        ? `#${item.url_path.slice(1)}`
        : `#${item.url_path}`;
    }
  };

  const handleResultClick = (item: GlobalSearchResultItem) => {
    setShowFullModal(false);
    if (onNavigate) {
      onNavigate(item.url_path);
    } else {
      window.location.hash = item.url_path.startsWith("/")
        ? `#${item.url_path.slice(1)}`
        : `#${item.url_path}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelectItem(suggestions[selectedIndex]);
      } else {
        executeFullSearch(query, selectedFilter);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`global-search-container ${isDarkMode ? "dark-mode" : ""}`}
      data-testid="global-search-container"
    >
      {/* Ô nhập từ khóa tìm kiếm */}
      <div
        className="global-search-input-wrapper"
        onClick={() => inputRef.current?.focus()}
      >
        <button
          type="button"
          className="search-lens-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (query.trim()) {
              executeFullSearch(query, selectedFilter);
            } else {
              inputRef.current?.focus();
            }
          }}
          title={query.trim() ? "Nhấn để tìm kiếm" : "Nhấp để nhập từ khóa tìm kiếm"}
          aria-label="Thực hiện tìm kiếm"
        >
          🔍
        </button>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Tìm kiếm sự cố, SOS, sự kiện, cẩm nang... (Ctrl+K)"
          aria-label="Tìm kiếm toàn hệ thống"
          className="search-input-field"
        />
        {/* Phím tắt / icon xoá */}
        <div className="search-input-actions">
          {isLoading ? (
            <span className="search-loading-spinner">⏳</span>
          ) : query ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="search-clear-btn"
              title="Xoá tìm kiếm"
            >
              ✕
            </button>
          ) : (
            <kbd className="search-kbd-shortcut">Ctrl K</kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="global-search-autocomplete-dropdown">
          <div className="autocomplete-header">
            <span>Gợi ý nhanh từ Elasticsearch</span>
            <span className="results-count">
              {suggestions.length} kết quả
            </span>
          </div>

          <div className="autocomplete-list">
            {suggestions.map((item, idx) => {
              const cfg = ENTITY_CONFIG[item.entity_type] || {
                label: item.entity_type,
                icon: "📌",
                badgeClass: "badge-post",
              };
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.entity_type}-${item.id}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`autocomplete-item ${isSelected ? "selected" : ""}`}
                >
                  <div className="item-main">
                    <span className="item-icon">{cfg.icon}</span>
                    <span className="item-title">{item.title}</span>
                    {item.category && (
                      <span className="item-category">
                        • {item.category}
                      </span>
                    )}
                  </div>
                  <span className={`item-badge ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            onClick={() => executeFullSearch(query, selectedFilter)}
            className="autocomplete-footer-action"
          >
            🔎 Xem toàn bộ kết quả cho "{query}" ➔
          </div>
        </div>
      )}

      {/* Backdrop mờ nền để click ra ngoài đóng panel kết quả */}
      {showFullModal && (
        <div
          className="global-search-backdrop"
          onClick={() => setShowFullModal(false)}
          aria-hidden="true"
        />
      )}

      {/* PANEL KẾT QUẢ TÌM KIẾM - NEO TRỰC TIẾP DƯỚI NÚT / THANH TÌM KIẾM */}
      {showFullModal && (
        <div
          className="global-search-dialog"
          role="dialog"
          aria-modal="true"
        >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="header-title-group">
                <span className="header-icon">🔍</span>
                <div className="header-text">
                  <h3>Kết quả tìm kiếm toàn hệ thống</h3>
                  <p>
                    Từ khóa: <strong>"{query}"</strong>
                    {searchResults && ` • Tìm thấy ${searchResults.total} kết quả (${searchResults.took_ms}ms)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="modal-close-btn"
                title="Đóng hộp thoại"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="modal-filter-tabs">
              {[
                { key: "all", label: "Tất cả" },
                { key: "incident", label: "🔴 Sự cố" },
                { key: "hotspot", label: "🔥 Điểm nóng" },
                { key: "sos", label: "🚨 SOS Ngập" },
                { key: "event", label: "🌱 Sự kiện" },
                { key: "handbook", label: "♻️ Cẩm nang" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(tab.key);
                    executeFullSearch(query, tab.key);
                  }}
                  className={`filter-pill-btn ${selectedFilter === tab.key ? "active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="modal-results-body">
              {isSearchingFull ? (
                <div className="loading-state-box">
                  <div className="spinner">⏳</div>
                  <p>Đang truy vấn Elasticsearch Cluster...</p>
                </div>
              ) : searchResults && searchResults.items.length > 0 ? (
                searchResults.items.map((item) => {
                  const cfg = ENTITY_CONFIG[item.entity_type] || {
                    label: item.entity_type,
                    icon: "📌",
                    badgeClass: "badge-post",
                  };

                  return (
                    <div
                      key={`${item.entity_type}-${item.entity_id}`}
                      onClick={() => handleResultClick(item)}
                      className="search-result-card"
                    >
                      <div className="card-header-row">
                        <div className="card-title-group">
                          <span className="card-icon">{cfg.icon}</span>
                          <h4
                            className="card-title"
                            dangerouslySetInnerHTML={{
                              __html: item.highlight_title || item.title,
                            }}
                          />
                          {item.code && (
                            <span className="card-code">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <span className={`card-badge ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {item.description && (
                        <p
                          className="card-description"
                          dangerouslySetInnerHTML={{
                            __html: item.highlight_description || item.description,
                          }}
                        />
                      )}

                      <div className="card-metadata-row">
                        {item.address && <span>📍 {item.address}</span>}
                        {item.distance_km !== null && item.distance_km !== undefined && (
                          <span className="meta-distance">
                            📏 Cách {item.distance_km} km
                          </span>
                        )}
                        {item.category && <span>📂 {item.category}</span>}
                        {item.status && <span>Trạng thái: {item.status}</span>}
                        <span className="meta-score">
                          Độ khớp: {item.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state-box">
                  <div className="empty-icon">🔍</div>
                  <h4 className="empty-title">Không tìm thấy kết quả nào phù hợp</h4>
                  <p className="empty-hint">Thử điều chỉnh từ khóa hoặc đổi danh mục lọc.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <span className="footer-branding">Được hỗ trợ bởi Elasticsearch 8.x + Custom Vietnamese Analyzer</span>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="footer-close-btn"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
    </div>
  );
};
