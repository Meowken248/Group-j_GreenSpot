import React, { type FC } from "react";
import type { MapEngineType } from "../../types/map";

interface MapHeaderProps {
  engine: MapEngineType;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const MapHeader: FC<MapHeaderProps> = ({ engine, searchInputRef }) => {
  return (
    <div className="map-header-bar">
      <div className="map-header-left">
        <div className="app-brand">
          <div className="brand-icon">G</div>
          <span className="brand-name">GreenSpot</span>
          <span className="brand-badge">
            {engine === "google" ? "Google Maps SDK" : "Google Tiles Core"}
          </span>
        </div>
      </div>

      {engine === "google" && (
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="places-input"
            placeholder="Tìm kiếm địa điểm, công viên, toà nhà (Places API)..."
          />
        </div>
      )}
    </div>
  );
};

export default MapHeader;
