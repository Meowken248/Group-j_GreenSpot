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
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  hotspot: {
    label: "Điểm nóng",
    icon: "🔥",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  sos: {
    label: "SOS Ngập",
    icon: "🚨",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  event: {
    label: "Sự kiện",
    icon: "🌱",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  post: {
    label: "Bài viết",
    icon: "💬",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  handbook: {
    label: "Cẩm nang",
    icon: "♻️",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
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
      className="global-search-container relative flex-1 max-w-md mx-2"
      data-testid="global-search-container"
    >
      {/* Ô nhập từ khóa tìm kiếm */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">
          🔍
        </span>
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
          placeholder="Tìm kiếm sự cố, SOS, sự kiện, rác thải... (Ctrl+K)"
          aria-label="Tìm kiếm toàn hệ thống"
          className={`w-full pl-9 pr-14 py-1.5 text-xs rounded-full border transition-all duration-200 outline-none ${
            isDarkMode
              ? "bg-slate-800/90 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              : "bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm"
          }`}
        />
        {/* Phím tắt / icon xoá */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading ? (
            <span className="text-[10px] text-emerald-500 animate-spin">⏳</span>
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-xs px-1"
              title="Xoá tìm kiếm"
            >
              ✕
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-gray-400 bg-gray-100 dark:bg-slate-700 rounded border border-gray-300 dark:border-slate-600">
              Ctrl K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className={`absolute left-0 right-0 mt-1.5 rounded-xl shadow-2xl border overflow-hidden z-50 text-xs ${
            isDarkMode
              ? "bg-slate-900 border-slate-700 text-slate-200 divide-y divide-slate-800"
              : "bg-white border-slate-200 text-slate-800 divide-y divide-slate-100"
          }`}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Gợi ý nhanh từ Elasticsearch</span>
            <span className="text-[10px] lowercase text-emerald-500 font-normal">
              {suggestions.length} kết quả
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((item, idx) => {
              const cfg = ENTITY_CONFIG[item.entity_type] || {
                label: item.entity_type,
                icon: "📌",
                badgeClass: "bg-gray-100 text-gray-700",
              };
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={`${item.entity_type}-${item.id}`}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? isDarkMode
                        ? "bg-slate-800 text-emerald-400"
                        : "bg-emerald-50 text-emerald-900"
                      : isDarkMode
                      ? "hover:bg-slate-800/60"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-sm shrink-0">{cfg.icon}</span>
                    <span className="font-medium truncate">{item.title}</span>
                    {item.category && (
                      <span className="text-[10px] text-gray-400 shrink-0">
                        • {item.category}
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${cfg.badgeClass}`}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            onClick={() => executeFullSearch(query, selectedFilter)}
            className={`px-3 py-2 text-center text-xs font-semibold cursor-pointer transition-colors ${
              isDarkMode
                ? "bg-slate-800 text-emerald-400 hover:bg-slate-750"
                : "bg-slate-50 text-emerald-700 hover:bg-slate-100"
            }`}
          >
            🔎 Xem toàn bộ kết quả cho "{query}" ➔
          </div>
        </div>
      )}

      {/* MODAL KẾT QUẢ TÌM KIẾM TOÀN DIỆN (FULL SEARCH DIALOG) */}
      {showFullModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`relative w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
              isDarkMode
                ? "bg-slate-900 border-slate-700 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <div>
                  <h3 className="font-bold text-base">Kết quả tìm kiếm toàn hệ thống</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Từ khóa: <strong className="text-emerald-600 dark:text-emerald-400">"{query}"</strong>
                    {searchResults && ` • Tìm thấy ${searchResults.total} kết quả (${searchResults.took_ms}ms)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-6 py-2 border-b border-gray-100 dark:border-slate-800 flex gap-2 overflow-x-auto text-xs">
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
                  className={`px-3 py-1.5 rounded-full font-medium transition-colors ${
                    selectedFilter === tab.key
                      ? "bg-emerald-600 text-white shadow-sm"
                      : isDarkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {isSearchingFull ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-2xl animate-spin mb-2">⏳</div>
                  <p className="text-xs">Đang truy vấn Elasticsearch Cluster...</p>
                </div>
              ) : searchResults && searchResults.items.length > 0 ? (
                searchResults.items.map((item) => {
                  const cfg = ENTITY_CONFIG[item.entity_type] || {
                    label: item.entity_type,
                    icon: "📌",
                    badgeClass: "bg-gray-100 text-gray-700",
                  };

                  return (
                    <div
                      key={`${item.entity_type}-${item.entity_id}`}
                      onClick={() => handleResultClick(item)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                        isDarkMode
                          ? "bg-slate-800/80 border-slate-700 hover:border-emerald-500"
                          : "bg-slate-50 border-slate-200 hover:border-emerald-500 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cfg.icon}</span>
                          <h4
                            className="font-bold text-sm text-emerald-700 dark:text-emerald-400"
                            dangerouslySetInnerHTML={{
                              __html: item.highlight_title || item.title,
                            }}
                          />
                          {item.code && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {item.description && (
                        <p
                          className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: item.highlight_description || item.description,
                          }}
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                        {item.address && <span>📍 {item.address}</span>}
                        {item.distance_km !== null && item.distance_km !== undefined && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            📏 Cách {item.distance_km} km
                          </span>
                        )}
                        {item.category && <span>📂 {item.category}</span>}
                        {item.status && <span>Trạng thái: {item.status}</span>}
                        <span className="text-gray-400 text-[10px]">
                          Độ khớp: {item.score.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-gray-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm font-medium">Không tìm thấy kết quả nào phù hợp</p>
                  <p className="text-xs mt-1">Thử điều chỉnh từ khóa hoặc đổi danh mục lọc.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-xs text-gray-500">
              <span>Được hỗ trợ bởi Elasticsearch 8.x + Custom Vietnamese Analyzer</span>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors"
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
