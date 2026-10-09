import { useState, useCallback, useRef, type FC } from "react";
import type L from "leaflet";
import { useFastGeolocation } from "../../hooks/useFastGeolocation";
import type { MapBaseType } from "../../types/map";

import LeafletFallbackView from "./LeafletFallbackView";
import MapHeader from "./MapHeader";
import MapHud from "./MapHud";
import MapControls from "./MapControls";
import "./map.css";

export const GoogleMapView: FC = () => {
  const mapInstanceRef = useRef<L.Map | null>(null);

  // States bản đồ & bộ lọc chuyển đổi
  const [mapType, setMapType] = useState<MapBaseType>("roadmap");
  const [showTraffic, setShowTraffic] = useState(false);
  const [showCircle, setShowCircle] = useState(true);
  const [searchLocation, setSearchLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Hook định vị GPS siêu tốc
  const {
    coords,
    accuracy,
    isLocating,
    error: gpsError,
    isFromCache,
    gpsFixDurationMs,
    refreshGps,
  } = useFastGeolocation();

  // Chuyển đổi giữa các kiểu bản đồ (Google Roadmap -> Google Vệ tinh -> OpenStreetMap)
  const toggleMapType = useCallback(() => {
    setMapType((prev) => {
      if (prev === "roadmap") return "satellite";
      if (prev === "satellite") return "osm";
      return "roadmap";
    });
  }, []);

  // Bật / tắt lớp giao thông thời gian thực
  const toggleTraffic = useCallback(() => {
    setShowTraffic((prev) => !prev);
  }, []);

  // Định vị lại về tâm vị trí GPS
  const handleRecenter = useCallback(() => {
    if (coords && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([coords.lat, coords.lng], { animate: true });
      mapInstanceRef.current.setZoom(17);
    }
    refreshGps();
  }, [coords, refreshGps]);

  // Xử lý khi chọn địa điểm từ thanh tìm kiếm
  const handleSelectPlace = useCallback(
    (place: { lat: number; lng: number; name: string }) => {
      setSearchLocation(place);
    },
    []
  );

  return (
    <div className="map-wrapper">
      {/* Bản đồ chính chạy trực tiếp mượt mà 100%, không bị lỗi màn hình đen */}
      <LeafletFallbackView
        coords={coords}
        accuracy={accuracy}
        showCircle={showCircle}
        mapType={mapType}
        showTraffic={showTraffic}
        searchLocation={searchLocation}
        onMapReady={(map) => {
          mapInstanceRef.current = map;
        }}
      />

      {/* Thanh Header Brand & Tìm kiếm địa điểm thời gian thực */}
      <MapHeader
        centerCoords={coords}
        onSelectPlace={handleSelectPlace}
      />

      {/* Bảng HUD hiệu năng & GPS */}
      <MapHud
        mapType={mapType}
        showTraffic={showTraffic}
        coords={coords}
        accuracy={accuracy}
        isLocating={isLocating}
        isFromCache={isFromCache}
        gpsFixDurationMs={gpsFixDurationMs}
        gpsError={gpsError}
      />

      {/* Bộ nút điều khiển nổi: Định vị, Đổi kiểu bản đồ, Lớp giao thông, Bán kính GPS */}
      <MapControls
        isLocating={isLocating}
        mapType={mapType}
        showTraffic={showTraffic}
        showCircle={showCircle}
        onRecenter={handleRecenter}
        onToggleMapType={toggleMapType}
        onToggleTraffic={toggleTraffic}
        onToggleCircle={() => setShowCircle((prev) => !prev)}
      />
    </div>
  );
};

export default GoogleMapView;
