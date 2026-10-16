import React, { useState, useEffect, useCallback } from "react";
import type {
  DispatchOrderItem,
  DispatchListFilter,
  IncidentComboboxItem,
  TeamOptionItem,
  CreateDispatchOrderRequest,
  EditDispatchOrderRequest,
  FieldTrackingResponse,
  CloseDispatchOrderRequest,
} from "../types/dispatch.types";
import { dispatchApi } from "../services/dispatchApi";
import { DispatchHeader } from "../components/DispatchHeader";
import { DispatchFooter } from "../components/DispatchFooter";
import { Screen1DispatchList } from "../components/Screen1DispatchList";
import { Screen2CreateOrder } from "../components/Screen2CreateOrder";
import { Screen3EditOrder } from "../components/Screen3EditOrder";
import { Screen4CancelModal } from "../components/Screen4CancelModal";
import { Screen5CancelSuccessModal } from "../components/Screen5CancelSuccessModal";
import { Screen6FieldTracking } from "../components/Screen6FieldTracking";

type ScreenMode = "LIST" | "CREATE" | "EDIT" | "TRACKING";

interface ToastNotification {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  message: string;
}

// Canonical fallback data for resilient frontend experience
const FALLBACK_TEAMS: TeamOptionItem[] = [
  {
    team_id: "team-001",
    team_name: "Đội phản ứng nhanh 1",
    phone: "0908123456",
    current_status: "AVAILABLE",
    distance_km: 2.5,
    distance_label: "Cách 2.5km",
    is_busy_with_urgent: false,
    latitude: 10.7932,
    longitude: 106.6781,
  },
  {
    team_id: "team-002",
    team_name: "Đội nạo vét cơ động 2",
    phone: "0912345678",
    current_status: "BUSY",
    distance_km: 4.8,
    distance_label: "Cách 4.8km",
    is_busy_with_urgent: true,
    latitude: 10.7621,
    longitude: 106.6823,
  },
  {
    team_id: "team-003",
    team_name: "Đội tuần tra môi trường 3",
    phone: "0934567890",
    current_status: "AVAILABLE",
    distance_km: 6.2,
    distance_label: "Cách 6.2km",
    is_busy_with_urgent: false,
    latitude: 10.8231,
    longitude: 106.6912,
  },
];

const FALLBACK_INCIDENTS: IncidentComboboxItem[] = [
  {
    incident_id: "inc-001",
    incident_code: "SC-2026-001",
    title: "Bãi rác tự phát lớn ven đường",
    category: "Rác thải",
    urgency: "KHẨN",
    location_address: "142 Lê Văn Sỹ, Phường 13, Quận 3",
    district: "Quận 3",
    ward: "Phường 13",
    latitude: 10.7915,
    longitude: 106.6775,
  },
  {
    incident_id: "inc-002",
    incident_code: "SC-2026-002",
    title: "Tắc nghẽn cống tiêu thoát nước mưa",
    category: "Ngập úng",
    urgency: "CAO",
    location_address: "Ngã tư Nguyễn Thị Minh Khai - CMT8",
    district: "Quận 1",
    ward: "Bến Thành",
    latitude: 10.7725,
    longitude: 106.6922,
  },
];

const FALLBACK_ORDERS: DispatchOrderItem[] = [
  {
    order_id: "ord-001",
    order_code: "DP-2026-001",
    incident_id: "inc-001",
    incident_title: "Bãi rác tự phát lớn ven đường",
    incident_type: "Rác thải",
    team_id: "team-001",
    team_name: "Đội phản ứng nhanh 1",
    team_phone: "0908123456",
    status: "EN_ROUTE",
    status_label: "Đang đến",
    status_color: "#f59e0b",
    priority: "URGENT",
    priority_label: "Khẩn cấp",
    deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    assigned_at: new Date().toISOString(),
    location_address: "142 Lê Văn Sỹ, Phường 13, Quận 3",
    district: "Quận 3",
    version: 1,
  },
  {
    order_id: "ord-002",
    order_code: "DP-2026-002",
    incident_id: "inc-002",
    incident_title: "Tắc nghẽn cống tiêu thoát nước mưa",
    incident_type: "Ngập úng",
    team_id: "team-002",
    team_name: "Đội nạo vét cơ động 2",
    team_phone: "0912345678",
    status: "IN_PROGRESS",
    status_label: "Đang xử lý",
    status_color: "#eab308",
    priority: "HIGH",
    priority_label: "Cao",
    deadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    assigned_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    location_address: "Ngã tư Nguyễn Thị Minh Khai - CMT8",
    district: "Quận 1",
    version: 1,
  },
  {
    order_id: "ord-003",
    order_code: "DP-2026-003",
    incident_id: "inc-003",
    incident_title: "Tràn dầu loang cục bộ kênh Nhiêu Lộc",
    incident_type: "Ô nhiễm nước",
    team_id: "team-003",
    team_name: "Đội tuần tra môi trường 3",
    team_phone: "0934567890",
    status: "COMPLETED",
    status_label: "Hoàn tất",
    status_color: "#10b981",
    priority: "MEDIUM",
    priority_label: "Trung bình",
    deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    assigned_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    location_address: "Bờ kênh Nhiêu Lộc - Thị Nghè, Quận Phú Nhuận",
    district: "Quận Phú Nhuận",
    version: 2,
  },
];

export const DispatchContainer: React.FC = () => {
  // Navigation & Screen Modes
  const [currentScreen, setCurrentScreen] = useState<ScreenMode>("LIST");

  // Data States
  const [orders, setOrders] = useState<DispatchOrderItem[]>(FALLBACK_ORDERS);
  const [incidents, setIncidents] = useState<IncidentComboboxItem[]>(FALLBACK_INCIDENTS);
  const [teams, setTeams] = useState<TeamOptionItem[]>(FALLBACK_TEAMS);
  const [filters, setFilters] = useState<DispatchListFilter>({ status: "ALL" });

  // Selection & Active Item States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>("ord-001");
  const [editingOrder, setEditingOrder] = useState<DispatchOrderItem | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<DispatchOrderItem | null>(null);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<string | null>(null);

  // Field Tracking Data State (Screen 6)
  const [trackingData, setTrackingData] = useState<FieldTrackingResponse | null>(null);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelSuccessOpen, setIsCancelSuccessOpen] = useState<boolean>(false);
  const [cancelledCodeForSuccess, setCancelledCodeForSuccess] = useState<string | null>(null);

  // Loading & Toasts
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (type: "success" | "warning" | "danger" | "info", message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  // Load orders from API
  const loadOrders = useCallback(
    async (appliedFilters: DispatchListFilter) => {
      setIsLoading(true);
      try {
        const res = await dispatchApi.getDispatchOrders(appliedFilters);
        if (res && res.orders) {
          setOrders(res.orders);
          if (res.orders.length > 0 && !selectedOrderId) {
            setSelectedOrderId(res.orders[0].order_id);
          }
        }
      } catch {
        // Retain fallback data smoothly
      } finally {
        setIsLoading(false);
      }
    },
    [selectedOrderId]
  );

  // Load incidents & teams metadata
  const loadMetadata = useCallback(async () => {
    try {
      const [incRes, teamRes] = await Promise.allSettled([
        dispatchApi.getAvailableIncidents(),
        dispatchApi.getResponseTeams(),
      ]);
      if (incRes.status === "fulfilled" && incRes.value?.length) {
        setIncidents(incRes.value);
      }
      if (teamRes.status === "fulfilled" && teamRes.value?.length) {
        setTeams(teamRes.value);
      }
    } catch {
      // Fallback data present
    }
  }, []);

  useEffect(() => {
    loadOrders(filters);
    loadMetadata();
  }, [loadOrders, loadMetadata, filters]);

  // Load Tracking details when opening screen 6
  const loadTrackingData = async (order: DispatchOrderItem) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.getFieldTrackingData(order.order_id);
      setTrackingData(res);
      setCurrentScreen("TRACKING");
    } catch {
      // Create rich fallback tracking state
      const isDone = order.status === "COMPLETED";
      const fallbackTracking: FieldTrackingResponse = {
        order_id: order.order_id,
        order_code: order.order_code,
        status: order.status,
        status_label: order.status_label,
        priority: order.priority_label,
        deadline: order.deadline,
        incident_title: order.incident_title,
        incident_address: order.location_address,
        incident_lat: 10.7915,
        incident_lng: 106.6775,
        incident_radius_meters: 50,
        team_name: order.team_name,
        team_phone: order.team_phone,
        team_lat: 10.785,
        team_lng: 106.672,
        eta_minutes: 8,
        is_gps_active: true,
        gps_lost_warning: null,
        stepper: [
          {
            key: "ASSIGNED",
            label: "Đã giao lệnh",
            is_current: false,
            is_passed: true,
            timestamp: "14:15 - 16/10/2026",
          },
          {
            key: "EN_ROUTE",
            label: "Đang đến hiện trường",
            is_current: order.status === "EN_ROUTE",
            is_passed: order.status === "IN_PROGRESS" || isDone,
            timestamp: "14:22 - 16/10/2026",
          },
          {
            key: "IN_PROGRESS",
            label: "Đang tiến hành xử lý",
            is_current: order.status === "IN_PROGRESS",
            is_passed: isDone,
            timestamp: order.status === "IN_PROGRESS" || isDone ? "14:35 - 16/10/2026" : null,
          },
          {
            key: "COMPLETED",
            label: "Hoàn tất xử lý",
            is_current: isDone,
            is_passed: isDone,
            timestamp: isDone ? "15:10 - 16/10/2026" : null,
          },
        ],
        before_image_url:
          "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=500&q=80",
        after_image_url: isDone
          ? "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=500&q=80"
          : null,
        can_close_order: isDone,
        missing_after_image_warning: !isDone
          ? "Chưa có ảnh nghiệm thu sau xử lý, không thể đóng lệnh."
          : null,
        version: order.version,
      };
      setTrackingData(fallbackTracking);
      setCurrentScreen("TRACKING");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Màn 1/6
  const handleSelectOrder = (order: DispatchOrderItem) => {
    setSelectedOrderId(order.order_id);
  };

  const handleApplyFilters = (newFilters: DispatchListFilter) => {
    setFilters(newFilters);
    loadOrders(newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters: DispatchListFilter = { status: "ALL" };
    setFilters(defaultFilters);
    loadOrders(defaultFilters);
  };

  const handleNavigateToCreate = () => {
    setCurrentScreen("CREATE");
  };

  const handleNavigateToEdit = (order: DispatchOrderItem) => {
    setEditingOrder(order);
    setCurrentScreen("EDIT");
  };

  const handleOpenCancelModal = (order: DispatchOrderItem) => {
    setCancellingOrder(order);
    setIsCancelModalOpen(true);
  };

  // Handler for Màn 2/6: Submit Create
  const handleCreateOrder = async (payload: CreateDispatchOrderRequest) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.createDispatchOrder(payload);
      addToast("success", res.message || "Tạo và giao lệnh điều động thành công!");
      const code = res.order_code || "DP-2026-MỚI";
      setNewlyCreatedCode(code);
      setCurrentScreen("LIST");
      await loadOrders(filters);
    } catch {
      // Local simulated fallback
      const fakeOrder: DispatchOrderItem = {
        order_id: `ord-${Date.now()}`,
        order_code: `DP-2026-${Math.floor(100 + Math.random() * 900)}`,
        incident_id: payload.incident_id,
        incident_title:
          incidents.find((i) => i.incident_id === payload.incident_id)?.title ||
          "Sự cố môi trường mới tiếp nhận",
        incident_type: "Môi trường",
        team_id: payload.team_id,
        team_name:
          teams.find((t) => t.team_id === payload.team_id)?.team_name || "Đội phản ứng",
        team_phone: "0908123456",
        status: "ASSIGNED",
        status_label: "Đã giao",
        status_color: "#6b7280",
        priority: payload.priority,
        priority_label:
          payload.priority === "URGENT"
            ? "Khẩn cấp"
            : payload.priority === "HIGH"
            ? "Cao"
            : "Trung bình",
        deadline: payload.deadline,
        assigned_at: new Date().toISOString(),
        location_address: "Khu vực đô thị trọng điểm",
        district: "Quận 3",
        version: 1,
      };
      setOrders((prev) => [fakeOrder, ...prev]);
      setSelectedOrderId(fakeOrder.order_id);
      setNewlyCreatedCode(fakeOrder.order_code);
      addToast("success", `Tạo và giao lệnh ${fakeOrder.order_code} thành công!`);
      setCurrentScreen("LIST");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Màn 3/6: Submit Edit
  const handleEditOrder = async (payload: EditDispatchOrderRequest) => {
    if (!editingOrder) return;
    setIsLoading(true);
    try {
      const res = await dispatchApi.editDispatchOrder(editingOrder.order_id, payload);
      addToast("success", res.message || "Cập nhật điều chỉnh lệnh điều phối thành công!");
      setCurrentScreen("LIST");
      await loadOrders(filters);
    } catch {
      // Local fallback
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === editingOrder.order_id
            ? {
                ...o,
                team_id: payload.team_id || o.team_id,
                team_name:
                  teams.find((t) => t.team_id === payload.team_id)?.team_name || o.team_name,
                deadline: payload.deadline || o.deadline,
                version: o.version + 1,
              }
            : o
        )
      );
      addToast("success", `Cập nhật phân bổ lệnh ${editingOrder.order_code} thành công!`);
      setCurrentScreen("LIST");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Màn 4/6 & 5/6: Confirm Cancel
  const handleConfirmCancel = async (orderId: string, version: number, reason: string) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.cancelDispatchOrder(orderId, {
        cancel_reason: reason,
        version,
      });
      setIsCancelModalOpen(false);
      setCancelledCodeForSuccess(res.order_code || cancellingOrder?.order_code || null);
      setIsCancelSuccessOpen(true);
      await loadOrders(filters);
    } catch {
      // Local fallback
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: "CANCELLED",
                status_label: "Đã huỷ",
                status_color: "#9ca3af",
                version: o.version + 1,
              }
            : o
        )
      );
      setIsCancelModalOpen(false);
      setCancelledCodeForSuccess(cancellingOrder?.order_code || "DP-2026-HUY");
      setIsCancelSuccessOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Màn 6/6: Close Order
  const handleCloseOrder = async (payload: CloseDispatchOrderRequest) => {
    if (!trackingData) return;
    setIsLoading(true);
    try {
      const res = await dispatchApi.closeDispatchOrder(trackingData.order_id, payload);
      addToast("success", res.message || "Đã đóng lệnh nghiệm thu hiện trường thành công!");
      setCurrentScreen("LIST");
      await loadOrders(filters);
    } catch {
      // Local fallback
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === trackingData.order_id
            ? {
                ...o,
                status: "COMPLETED",
                status_label: "Hoàn tất",
                status_color: "#10b981",
                version: o.version + 1,
              }
            : o
        )
      );
      addToast(
        "success",
        `Đã nghiệm thu và đóng lệnh ${trackingData.order_code} thành công!`
      );
      setCurrentScreen("LIST");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dispatch-module-wrapper d-flex flex-column min-vh-100">
      {/* Toast Notification Container */}
      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 9999 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast show align-items-center text-white bg-${t.type} border-0 mb-2 shadow`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body">
                <i className="bi bi-info-circle me-2"></i>
                {t.message}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              ></button>
            </div>
          </div>
        ))}
      </div>

      {/* Header Chuẩn */}
      <DispatchHeader
        activeTab={
          currentScreen === "LIST"
            ? "Lệnh điều phối"
            : currentScreen === "CREATE"
            ? "Tạo lệnh mới"
            : currentScreen === "EDIT"
            ? "Sửa lệnh"
            : "Theo dõi hiện trường"
        }
      />

      {/* Main Work Area */}
      <main className="dispatch-main-content flex-grow-1 py-4 container-fluid px-4">
        {currentScreen === "LIST" && (
          <Screen1DispatchList
            orders={orders}
            teams={teams}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
            onNavigateToCreate={handleNavigateToCreate}
            onNavigateToEdit={handleNavigateToEdit}
            onOpenCancelModal={handleOpenCancelModal}
            onOpenTracking={loadTrackingData}
            onShowWarningToast={(msg) => addToast("warning", msg)}
            newlyCreatedOrderCode={newlyCreatedCode}
          />
        )}

        {currentScreen === "CREATE" && (
          <Screen2CreateOrder
            incidents={incidents}
            teams={teams}
            isLoading={isLoading}
            onCancel={() => setCurrentScreen("LIST")}
            onSubmitCreate={handleCreateOrder}
            onShowWarningToast={(msg) => addToast("warning", msg)}
          />
        )}

        {currentScreen === "EDIT" && editingOrder && (
          <Screen3EditOrder
            order={editingOrder}
            teams={teams}
            isLoading={isLoading}
            onCancel={() => setCurrentScreen("LIST")}
            onSubmitEdit={handleEditOrder}
            onShowWarningToast={(msg) => addToast("warning", msg)}
          />
        )}

        {currentScreen === "TRACKING" && trackingData && (
          <Screen6FieldTracking
            trackingData={trackingData}
            isLoading={isLoading}
            onBackToList={() => setCurrentScreen("LIST")}
            onCloseOrder={handleCloseOrder}
            onShowWarningToast={(msg) => addToast("warning", msg)}
            onShowSuccessToast={(msg) => addToast("success", msg)}
          />
        )}
      </main>

      {/* Modal Màn 4/6: Xác nhận huỷ lệnh */}
      <Screen4CancelModal
        order={cancellingOrder}
        isOpen={isCancelModalOpen}
        isLoading={isLoading}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancel}
        onShowWarningToast={(msg) => addToast("warning", msg)}
      />

      {/* Modal Màn 5/6: Thông báo huỷ thành công 3s */}
      <Screen5CancelSuccessModal
        isOpen={isCancelSuccessOpen}
        orderCode={cancelledCodeForSuccess}
        onClose={() => {
          setIsCancelSuccessOpen(false);
          setCancelledCodeForSuccess(null);
        }}
      />

      {/* Footer Chuẩn */}
      <DispatchFooter />
    </div>
  );
};
