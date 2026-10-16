import React, { useState, useEffect, useCallback } from "react";
import { HotspotHeader } from "../components/HotspotHeader";
import { HotspotFooter } from "../components/HotspotFooter";
import { Screen1HotspotMap } from "../components/Screen1HotspotMap";
import { Screen2ForecastDashboard } from "../components/Screen2ForecastDashboard";
import { Screen3HotspotDetailModal } from "../components/Screen3HotspotDetailModal";
import { hotspotApi } from "../services/hotspotApi";
import type {
  HotspotCluster,
  TopHotspotItem,
  IncidentType,
  TimeRange,
  AreaOptionItem,
  ForecastResponse,
  HotspotDetailResponse,
  SuggestedDispatchOrder,
} from "../types/hotspot.types";
import "../styles/hotspots.scss";

interface ToastState {
  message: string;
  type: "info" | "warning" | "success" | "error";
}

interface HotspotContainerProps {
  onNavigateToDispatch?: (prefill?: SuggestedDispatchOrder, activeOrderId?: string) => void;
  currentUser?: {
    full_name?: string;
    role?: string;
  };
}

export const HotspotContainer: React.FC<HotspotContainerProps> = ({
  onNavigateToDispatch,
  currentUser,
}) => {
  // Trạng thái màn hình: Màn 1/3 ("map") hoặc Màn 2/3 ("forecast")
  const [activeScreen, setActiveScreen] = useState<"map" | "forecast">("map");

  // Dữ liệu Màn 1/3 (Bản đồ)
  const [incidentType, setIncidentType] = useState<IncidentType>("ALL");
  const [timeRange, setTimeRange] = useState<TimeRange>("30_DAYS");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [clusters, setClusters] = useState<HotspotCluster[]>([]);
  const [top5, setTop5] = useState<TopHotspotItem[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState<boolean>(false);
  const [tileServerError, setTileServerError] = useState<boolean>(false);

  // Dữ liệu Màn 2/3 (Dự báo 7 ngày)
  const [areas, setAreas] = useState<AreaOptionItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("dist-q8");
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Màn 3/3 (Popup Chi tiết)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<HotspotDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Toast thông báo
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastState["type"] = "info") => {
    setToast({ message, type });
    // Tự tắt sau 4s
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Tải dữ liệu Màn 1/3
  const loadHotspotMap = useCallback(async () => {
    setIsMapLoading(true);
    try {
      const data = await hotspotApi.getHotspotMap({
        incident_type: incidentType,
        time_range: timeRange,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setClusters(data.clusters || []);
      setTop5(data.top_5 || []);
      setTileServerError(false);
      showToast("Đã tải xong dữ liệu phân tích cụm điểm nóng KDE", "success");
    } catch (err) {
      // Giả lập lỗi hoặc fallback
      setClusters([]);
      setTop5([]);
      showToast("Không thể kết nối máy chủ phân tích không gian", "error");
    } finally {
      setIsMapLoading(false);
    }
  }, [incidentType, timeRange, startDate, endDate, showToast]);

  // Tải danh sách khu vực khi vào Màn 2/3
  const loadAreas = useCallback(async () => {
    try {
      const areaList = await hotspotApi.getAvailableAreas();
      setAreas(areaList);
      if (areaList.length > 0 && !selectedAreaId) {
        setSelectedAreaId(areaList[0].id);
      }
    } catch {
      // Fallback nếu có lỗi
    }
  }, [selectedAreaId]);

  // Tải dữ liệu dự báo cho khu vực được chọn
  const loadForecast = useCallback(async (targetId: string) => {
    setIsForecastLoading(true);
    try {
      const areaObj = areas.find((a) => a.id === targetId);
      const targetType = areaObj?.type || "DISTRICT";
      const data = await hotspotApi.get7DayForecast(targetId, targetType);
      setForecastData(data);
    } catch {
      showToast("Không thể tải dữ liệu dự báo 7 ngày", "error");
    } finally {
      setIsForecastLoading(false);
    }
  }, [areas, showToast]);

  // Tự động tải bản đồ khi bộ lọc thay đổi
  useEffect(() => {
    loadHotspotMap();
  }, [loadHotspotMap]);

  // Tải danh sách khu vực khi khởi tạo
  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  // Tải dữ liệu dự báo khi đổi khu vực hoặc chuyển tab sang forecast
  useEffect(() => {
    if (activeScreen === "forecast" && selectedAreaId) {
      loadForecast(selectedAreaId);
    }
  }, [activeScreen, selectedAreaId, loadForecast]);

  // Mở Popup Chi tiết (Màn 3/3)
  const handleOpenDetailModal = async () => {
    if (!selectedClusterId) {
      showToast("Vui lòng chọn một cụm điểm nóng trên bản đồ để xem chi tiết", "warning");
      return;
    }

    setIsDetailOpen(true);
    setIsDetailLoading(true);
    try {
      const detail = await hotspotApi.getHotspotDetail(selectedClusterId);
      setDetailData(detail);
    } catch {
      showToast("Không thể tải chi tiết điểm nóng", "error");
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Click trực tiếp vào một điểm nóng
  const handleSelectCluster = (clusterId: string) => {
    setSelectedClusterId(clusterId);
  };

  // Xuất báo cáo dự báo
  const handleExportReport = async (format: "PDF" | "EXCEL") => {
    setIsExporting(true);
    try {
      const res = await hotspotApi.exportForecastReport({
        format,
        target_id: selectedAreaId,
        time_range: "7_DAYS",
      });
      if (res.success) {
        showToast(`Xuất báo cáo dự báo 7 ngày thành công (Tệp: ${res.file_name})`, "success");
      } else {
        showToast(res.message || "Xuất báo cáo thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi xuất báo cáo", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Điều hướng sang STT 43 tạo lệnh mới với dữ liệu điền sẵn
  const handleCreateDispatch = (prefill: SuggestedDispatchOrder) => {
    setIsDetailOpen(false);
    try {
      localStorage.setItem("greenspot_prefill_dispatch", JSON.stringify(prefill));
    } catch {
      // Ignored
    }

    if (onNavigateToDispatch) {
      onNavigateToDispatch(prefill);
    } else {
      window.location.hash = "#dispatch";
    }
  };

  // Điều hướng sang STT 43 theo dõi hiện trường với orderId
  const handleViewActiveOrder = (orderId: string) => {
    setIsDetailOpen(false);
    try {
      localStorage.setItem("greenspot_track_order_id", orderId);
    } catch {
      // Ignored
    }

    if (onNavigateToDispatch) {
      onNavigateToDispatch(undefined, orderId);
    } else {
      window.location.hash = `#dispatch?order_id=${encodeURIComponent(orderId)}`;
    }
  };

  return (
    <div className="hotspot-dashboard-container" data-testid="hotspot-container">
      {/* Header chuẩn hóa */}
      <HotspotHeader
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        userName={currentUser?.full_name || "Chuyên viên phân tích"}
        userRole={currentUser?.role || "Cán bộ quản lý môi trường"}
      />

      {/* Thanh Toast thông báo trạng thái */}
      {toast && (
        <div
          className={`status-toast-bar ${toast.type}`}
          role="status"
          data-testid="status-toast-bar"
        >
          <div className="toast-content">
            <span>
              {toast.type === "success"
                ? "✅"
                : toast.type === "warning"
                ? "⚠️"
                : toast.type === "error"
                ? "❌"
                : "ℹ️"}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Không gian làm việc chính */}
      <main className="hotspot-main-workspace">
        {activeScreen === "map" ? (
          <Screen1HotspotMap
            clusters={clusters}
            top5={top5}
            selectedClusterId={selectedClusterId}
            onSelectCluster={handleSelectCluster}
            onOpenDetailModal={handleOpenDetailModal}
            incidentType={incidentType}
            onChangeIncidentType={setIncidentType}
            timeRange={timeRange}
            onChangeTimeRange={setTimeRange}
            startDate={startDate}
            endDate={endDate}
            onChangeStartDate={setStartDate}
            onChangeEndDate={setEndDate}
            tileServerError={tileServerError}
            onRetryTiles={() => {
              setTileServerError(false);
              loadHotspotMap();
            }}
            isLoading={isMapLoading}
          />
        ) : (
          <Screen2ForecastDashboard
            areas={areas}
            selectedAreaId={selectedAreaId}
            onSelectArea={setSelectedAreaId}
            forecastData={forecastData}
            isLoading={isForecastLoading}
            onExportReport={handleExportReport}
            isExporting={isExporting}
          />
        )}
      </main>

      {/* Màn 3/3: Popup Chi tiết điểm nóng */}
      <Screen3HotspotDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        detail={detailData}
        isLoading={isDetailLoading}
        onCreateDispatch={handleCreateDispatch}
        onViewActiveOrder={handleViewActiveOrder}
      />

      {/* Footer chuẩn hóa */}
      <HotspotFooter />
    </div>
  );
};
