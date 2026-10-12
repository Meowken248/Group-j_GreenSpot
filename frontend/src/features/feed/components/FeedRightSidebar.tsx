/**
 * FeedRightSidebar (Cột phải Bảng tin Geo-Feed)
 * Căn cứ tài liệu: Đồ Án Chuyên Đề Web 1 - Báo Cáo.docx.pdf (Trang 98 - 101)
 * Quản lý Bán kính quét Radar (STT 08 Màn 1 & Màn 3), Bộ lọc chủ đề và Sắp xếp
 */

import React from "react";
import type { FeedSortBy } from "../types/feed.types";
import { FEED_CATEGORIES } from "../services/feedService";

interface FeedRightSidebarProps {
  radiusKm: number;
  onOpenRadiusPicker: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  sortBy: FeedSortBy;
  onSelectSortBy: (sort: FeedSortBy) => void;
  activeDistrict?: string;
  onSelectDistrict?: (district: string) => void;
  isDistrictTab?: boolean;
}

export const FeedRightSidebar: React.FC<FeedRightSidebarProps> = ({
  radiusKm,
  onOpenRadiusPicker,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSelectSortBy,
}) => {
  const formattedRadius =
    radiusKm < 1 ? `${Math.round(radiusKm * 1000)} m` : `${radiusKm.toFixed(1)} km`;

  return (
    <aside className="feed-right-sidebar">
      {/* =================================================================== */}
      {/* 1. KHỐI BÁN KÍNH QUÉT (RADAR WIDGET - SRS PP. 98) */}
      {/* =================================================================== */}
      <div className="radar-radius-card">
        <div className="radar-card-header">
          <span className="card-eyebrow">ĐỊNH VỊ KHÔNG GIAN</span>
          <h4 className="radar-title">Bán kính quét GPS</h4>
        </div>

        <div className="radar-visual-container">
          <div className="radar-visual-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
            <div className="radar-sweep-scanner"></div>
            <div className="radar-pin-center">📍</div>
          </div>
          <div className="radar-info-block">
            <span className="current-radius-value">{formattedRadius}</span>
            <span className="current-radius-desc">Cự ly quét bài xung quanh</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-change-radius"
          onClick={onOpenRadiusPicker}
        >
          <span className="btn-icon">🎯</span>
          <span className="btn-label">Đổi bán kính</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 2. KHỐI SẮP XẾP BÀI VIẾT (MỚI NHẤT / NỔI BẬT / GẦN NHẤT) */}
      {/* =================================================================== */}
      <div className="feed-sort-card">
        <div className="card-header-sub">
          <span className="card-eyebrow">HIỂN THỊ</span>
          <h5 className="card-title-sm">Sắp xếp bảng tin</h5>
        </div>
        <div className="sort-buttons-row">
          <button
            type="button"
            className={`sort-tab-btn ${sortBy === "newest" ? "active" : ""}`}
            onClick={() => onSelectSortBy("newest")}
          >
            ⏱️ Mới nhất
          </button>
          <button
            type="button"
            className={`sort-tab-btn ${sortBy === "popular" ? "active" : ""}`}
            onClick={() => onSelectSortBy("popular")}
          >
            🔥 Nổi bật
          </button>
          <button
            type="button"
            className={`sort-tab-btn ${sortBy === "nearest" ? "active" : ""}`}
            onClick={() => onSelectSortBy("nearest")}
          >
            📍 Gần nhất
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. KHỐI BỘ LỌC CHỦ ĐỀ RÁC THẢI (SRS PP. 100) */}
      {/* =================================================================== */}
      <div className="category-filter-card">
        <div className="card-header-sub">
          <span className="card-eyebrow">CHỦ ĐỀ MÔI TRƯỜNG</span>
          <h5 className="card-title-sm">Lọc theo sự cố & hoạt động</h5>
        </div>

        <div className="categories-list-group">
          {FEED_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`category-chip-item ${
                selectedCategory === cat.key ? "active" : ""
              }`}
              onClick={() => onSelectCategory(cat.key)}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-label">{cat.label}</span>
              {selectedCategory === cat.key && <span className="cat-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4. WIDGET THÔNG ĐIỆP SỐNG XANH */}
      {/* =================================================================== */}
      <div className="eco-tips-card">
        <div className="eco-tips-badge">MẸO SỐNG XANH 🌱</div>
        <p className="eco-tips-text">
          Chụp ảnh hiện trường rõ ràng và bật định vị GPS giúp cơ quan chức năng tiếp nhận và điều phối xử lý nhanh gấp 2 lần!
        </p>
      </div>
    </aside>
  );
};
