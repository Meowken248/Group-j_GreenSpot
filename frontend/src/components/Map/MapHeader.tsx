import { useState, useEffect, useRef, type FC } from "react";
import { searchLivePlacesAPI, type LivePOI } from "../../services/poiService";

interface MapHeaderProps {
  onSelectPlace?: (place: { lat: number; lng: number; name: string }) => void;
  centerCoords?: { lat: number; lng: number } | null;
}

export const MapHeader: FC<MapHeaderProps> = ({ onSelectPlace, centerCoords }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LivePOI[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchLivePlacesAPI(
        query.trim(),
        centerCoords?.lat || 10.7769,
        centerCoords?.lng || 106.7009
      );
      setResults(res);
      setIsOpen(res.length > 0);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, centerCoords]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (poi: LivePOI) => {
    setQuery(poi.name);
    setIsOpen(false);
    if (onSelectPlace) {
      onSelectPlace({
        lat: poi.latitude,
        lng: poi.longitude,
        name: poi.name,
      });
    }
  };

  return (
    <div className="map-header-bar">
      <div className="map-header-left">
        <div className="app-brand">
          <div className="brand-icon">G</div>
          <span className="brand-name">GreenSpot</span>
          <span className="brand-badge">WebGIS</span>
        </div>
      </div>

      <div className="search-container" ref={dropdownRef}>
        <span className="search-icon">{isSearching ? "⏳" : "🔍"}</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="places-input"
          placeholder="Tìm kiếm địa điểm, số nhà, quán xá, toà nhà..."
        />

        {isOpen && results.length > 0 && (
          <div className="places-dropdown">
            {results.map((poi) => (
              <div
                key={poi.id}
                className="places-item"
                onClick={() => handleSelect(poi)}
              >
                <span className="places-item-icon">{poi.icon || "📍"}</span>
                <div className="places-item-text">
                  <span className="places-item-name">{poi.name}</span>
                  <span className="places-item-addr">{poi.fullAddress}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapHeader;
