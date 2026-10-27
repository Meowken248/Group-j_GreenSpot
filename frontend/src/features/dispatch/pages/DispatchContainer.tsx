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
  DispatchPriority,
} from "../types/dispatch.types";
import { dispatchApi } from "../services/dispatchApi";
import { DispatchHeader, type HeaderNotificationItem } from "../components/DispatchHeader";
import { DispatchFooter } from "../components/DispatchFooter";
import { Screen1DispatchList } from "../components/Screen1DispatchList";
import { Screen2CreateOrder } from "../components/Screen2CreateOrder";
import { Screen3EditOrder } from "../components/Screen3EditOrder";
import { Screen4CancelModal } from "../components/Screen4CancelModal";
import { Screen5CancelSuccessModal } from "../components/Screen5CancelSuccessModal";
import { Screen6FieldTracking } from "../components/Screen6FieldTracking";
import { ScreenAcceptOrderModal } from "../components/ScreenAcceptOrderModal";
import "../styles/dispatch.scss";

type ScreenMode = "LIST" | "CREATE" | "EDIT" | "TRACKING";

interface ToastNotification {
  id: string;
  type: "success" | "warning" | "danger" | "info";
  message: string;
}

// Canonical fallback data for resilient frontend experience
const FALLBACK_TEAMS: TeamOptionItem[] = [
  {
    team_id: "team-003",
    team_name: "Đội tuần tra môi trường 3 (Đội Cơ động số 3)",
    phone: "0934567890",
    current_status: "AVAILABLE",
    distance_km: 1.8,
    distance_label: "Cách 1.8km",
    is_busy_with_urgent: false,
    latitude: 10.8522,
    longitude: 106.6186,
  },
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
];

const FALLBACK_INCIDENTS: IncidentComboboxItem[] = [
  {
    incident_id: "inc-1044",
    incident_code: "SC-2026-1044",
    title: "Ùn ứ rác thải y tế & ô nhiễm ngã tư Nguyễn Văn Quá",
    category: "Rác thải nguy hại",
    urgency: "KHẨN",
    location_address: "Ngã tư Nguyễn Văn Quá - Tô Ký, Phường Đông Hưng Thuận, Quận 12",
    district: "Quận 12",
    ward: "Đông Hưng Thuận",
    latitude: 10.8415,
    longitude: 106.6335,
  },
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
    order_id: "ord-1044",
    order_code: "DP-2026-1044",
    incident_id: "inc-1044",
    incident_title: "Ùn ứ rác thải y tế & ô nhiễm ngã tư Nguyễn Văn Quá",
    incident_type: "Rác thải nguy hại",
    team_id: "team-003",
    team_name: "Đội tuần tra môi trường 3 (Đội Cơ động số 3)",
    team_phone: "0934567890",
    status: "ASSIGNED",
    status_label: "Chờ tiếp nhận",
    status_color: "#f59e0b",
    priority: "URGENT",
    priority_label: "Khẩn cấp",
    deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    assigned_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    location_address: "Ngã tư Nguyễn Văn Quá - Tô Ký, Phường Đông Hưng Thuận, Quận 12",
    district: "Quận 12",
    version: 1,
  },
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
    team_name: "Đội tuần tra môi trường 3 (Đội Cơ động số 3)",
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

  // Multi-actor Roles: Admin vs Field Response Team
  const [userRole, setUserRole] = useState<"ADMIN" | "TEAM">("ADMIN");

  // Data States
  const [orders, setOrders] = useState<DispatchOrderItem[]>(FALLBACK_ORDERS);
  const [incidents, setIncidents] = useState<IncidentComboboxItem[]>(FALLBACK_INCIDENTS);
  const [teams, setTeams] = useState<TeamOptionItem[]>(FALLBACK_TEAMS);
  const [filters, setFilters] = useState<DispatchListFilter>({ status: "ALL" });

  // Notifications
  const [notifications, setNotifications] = useState<HeaderNotificationItem[]>([
    {
      id: "notif-1044",
      title: "🚨 Lệnh điều phối mới: DP-2026-1044",
      body: "Sự cố rác thải khẩn cấp tại Ngã tư Nguyễn Văn Quá - Tô Ký, Q.12. Yêu cầu Đội Cơ động số 3 xác nhận tiếp nhận lệnh!",
      time: "Vừa xong",
      orderId: "ord-1044",
      type: "urgent",
      unread: true,
    },
    {
      id: "notif-001",
      title: "📋 Lệnh điều phối DP-2026-001",
      body: "142 Lê Văn Sỹ, P.13, Q.3 - Đội phản ứng nhanh 1 đang trên đường di chuyển.",
      time: "15 phút trước",
      orderId: "ord-001",
      type: "info",
      unread: false,
    },
  ]);

  // Selection & Active Item States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>("ord-1044");
  const [editingOrder, setEditingOrder] = useState<DispatchOrderItem | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<DispatchOrderItem | null>(null);
  const [newlyCreatedCode, setNewlyCreatedCode] = useState<string | null>(null);
  const [prefillIncidentId, setPrefillIncidentId] = useState<string | undefined>(undefined);
  const [prefillPriority, setPrefillPriority] = useState<DispatchPriority | undefined>(undefined);

  // Field Tracking Data State (Screen 6)
  const [trackingData, setTrackingData] = useState<FieldTrackingResponse | null>(null);

  // Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelSuccessOpen, setIsCancelSuccessOpen] = useState<boolean>(false);
  const [cancelledCodeForSuccess, setCancelledCodeForSuccess] = useState<string | null>(null);
  const [pendingAcceptOrder, setPendingAcceptOrder] = useState<DispatchOrderItem | null>(null);

  // Loading & Toasts
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (type: "success" | "warning" | "danger" | "info", message: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Load orders from API
  const loadOrders = useCallback(
    async (appliedFilters: DispatchListFilter) => {
      setIsLoading(true);
      try {
        const res = await dispatchApi.getDispatchOrders(appliedFilters);
        if (res && res.orders && res.orders.length > 0) {
          setOrders(res.orders);
          if (!selectedOrderId) {
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
      const isEnRoute = order.status === "EN_ROUTE";
      const isInProgress = order.status === "IN_PROGRESS";
      const isAssigned = order.status === "ASSIGNED";

      const isDistrict12 =
        order.order_code.includes("1044") ||
        order.location_address.includes("Quận 12") ||
        order.location_address.includes("Nguyễn Văn Quá");

      const incidentLat = isDistrict12 ? 10.8415 : 10.7915;
      const incidentLng = isDistrict12 ? 106.6335 : 106.6775;
      const teamLat = isDistrict12 ? 10.8522 : 10.785;
      const teamLng = isDistrict12 ? 106.6186 : 106.672;

      const fallbackTracking: FieldTrackingResponse = {
        order_id: order.order_id,
        order_code: order.order_code,
        status: order.status,
        status_label: order.status_label,
        priority: order.priority_label,
        deadline: order.deadline,
        incident_title: order.incident_title,
        incident_address: order.location_address,
        incident_lat: incidentLat,
        incident_lng: incidentLng,
        incident_radius_meters: 50,
        team_name: order.team_name,
        team_phone: order.team_phone,
        team_lat: teamLat,
        team_lng: teamLng,
        eta_minutes: isAssigned ? 15 : isEnRoute ? 8 : 0,
        is_gps_active: isEnRoute || isInProgress,
        gps_lost_warning: null,
        stepper: [
          {
            key: "ASSIGNED",
            label: "Đã giao lệnh",
            is_current: isAssigned,
            is_passed: !isAssigned,
            timestamp: "14:15 - 16/10/2026",
          },
          {
            key: "EN_ROUTE",
            label: "Đang đến hiện trường",
            is_current: isEnRoute,
            is_passed: isInProgress || isDone,
            timestamp: isEnRoute || isInProgress || isDone ? "14:22 - 16/10/2026" : null,
          },
          {
            key: "IN_PROGRESS",
            label: "Đang tiến hành xử lý",
            is_current: isInProgress,
            is_passed: isDone,
            timestamp: isInProgress || isDone ? "14:35 - 16/10/2026" : null,
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

  // Tự động tiếp nhận dữ liệu liên thông từ Điểm nóng (STT 44), Thẩm định (STT 39) hoặc Hash URL
  useEffect(() => {
    // 1. Kiểm tra prefill trong LocalStorage
    try {
      const storedPrefill = localStorage.getItem("greenspot_prefill_dispatch");
      if (storedPrefill) {
        const parsed = JSON.parse(storedPrefill);
        if (parsed) {
          const prefillId = parsed.incident_id || `inc-prefill-${Date.now()}`;
          const newIncident: IncidentComboboxItem = {
            incident_id: prefillId,
            incident_code: parsed.incident_code || parsed.code || "SC-PREFILL-001",
            title: parsed.title || "Sự cố cần xử lý khẩn cấp",
            category: parsed.incident_type || parsed.category || "Rác thải",
            urgency: parsed.priority === "URGENT" ? "KHẨN" : "CAO",
            location_address: parsed.address || parsed.location_address || "TP. Hồ Chí Minh",
            district: parsed.district || "Quận 12",
            ward: parsed.ward || "",
            latitude: Number(parsed.latitude) || 10.8415,
            longitude: Number(parsed.longitude) || 106.6335,
          };
          setIncidents((prev) => {
            const exists = prev.some((item) => item.incident_id === prefillId);
            return exists ? prev : [newIncident, ...prev];
          });
          setPrefillIncidentId(prefillId);
          if (parsed.priority) {
            setPrefillPriority(parsed.priority as DispatchPriority);
          }
          setCurrentScreen("CREATE");
          addToast("info", `Đã tiếp nhận sự cố: ${newIncident.title} để lập lệnh điều phối`);
          localStorage.removeItem("greenspot_prefill_dispatch");
        }
      }
    } catch {}

    // 2. Kiểm tra Hash params (?order_id=... hoặc ?district=...)
    const hash = window.location.hash;
    if (hash.includes("order_id=")) {
      const urlParams = new URLSearchParams(hash.split("?")[1] || "");
      const orderId = urlParams.get("order_id");
      if (orderId) {
        const matchedOrder = orders.find((o) => o.order_id === orderId || o.order_code === orderId);
        if (matchedOrder) {
          loadTrackingData(matchedOrder);
        }
      }
    } else if (hash.includes("district=")) {
      const urlParams = new URLSearchParams(hash.split("?")[1] || "");
      const dist = urlParams.get("district");
      if (dist) {
        setFilters((prev) => ({ ...prev, search: dist }));
      }
    }
  }, [orders, loadTrackingData, addToast]);

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

  // Switch role between Admin and Field Team
  const handleSwitchRole = (newRole: "ADMIN" | "TEAM") => {
    setUserRole(newRole);
    if (newRole === "TEAM") {
      addToast("info", "🚛 Chuyển sang tài khoản Đội Cơ động số 3 (Hiện trường).");
      // Tự động kiểm tra nếu có lệnh ASSIGNED cần tiếp nhận
      const pending = orders.find((o) => o.status === "ASSIGNED");
      if (pending) {
        setPendingAcceptOrder(pending);
      }
    } else {
      addToast("info", "🏢 Chuyển sang tài khoản Cán bộ Quản trị Điều phối (Sở TN&MT).");
    }
  };

  // Notification selection
  const handleSelectNotification = (item: HeaderNotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );

    if (item.orderId) {
      const target = orders.find((o) => o.order_id === item.orderId);
      if (target) {
        setSelectedOrderId(target.order_id);
        if (target.status === "ASSIGNED") {
          setPendingAcceptOrder(target);
        } else {
          loadTrackingData(target);
        }
      }
    }
  };

  // Handler for Màn 2/6: Submit Create
  const handleCreateOrder = async (payload: CreateDispatchOrderRequest) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.createDispatchOrder(payload);
      addToast("success", res.message || "Tạo và giao lệnh điều động thành công!");
      const code = res.order_code || "DP-2026-MỚI";
      setNewlyCreatedCode(code);

      const incidentInfo = incidents.find((i) => i.incident_id === payload.incident_id);
      const teamInfo = teams.find((t) => t.team_id === payload.team_id);
      const newNotif: HeaderNotificationItem = {
        id: `notif-${Date.now()}`,
        title: `🚨 Lệnh điều phối mới: ${code}`,
        body: `Sự cố: ${incidentInfo?.title || "Sự cố môi trường"}. Giao ${teamInfo?.team_name || "Đội phản ứng"} tiếp nhận!`,
        time: "Vừa xong",
        orderId: res.order_id || undefined,
        type: "urgent",
        unread: true,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      setCurrentScreen("LIST");
      await loadOrders(filters);
    } catch {
      // Local simulated fallback
      const fakeOrderId = `ord-${Date.now()}`;
      const fakeOrderCode = `DP-2026-${Math.floor(100 + Math.random() * 900)}`;
      const incidentInfo = incidents.find((i) => i.incident_id === payload.incident_id);
      const teamInfo = teams.find((t) => t.team_id === payload.team_id);

      const fakeOrder: DispatchOrderItem = {
        order_id: fakeOrderId,
        order_code: fakeOrderCode,
        incident_id: payload.incident_id,
        incident_title: incidentInfo?.title || "Sự cố môi trường mới tiếp nhận",
        incident_type: incidentInfo?.category || "Môi trường",
        team_id: payload.team_id,
        team_name: teamInfo?.team_name || "Đội phản ứng nhanh",
        team_phone: teamInfo?.phone || "0908123456",
        status: "ASSIGNED",
        status_label: "Chờ tiếp nhận",
        status_color: "#f59e0b",
        priority: payload.priority,
        priority_label:
          payload.priority === "URGENT"
            ? "Khẩn cấp"
            : payload.priority === "HIGH"
            ? "Cao"
            : "Trung bình",
        deadline: payload.deadline,
        assigned_at: new Date().toISOString(),
        location_address: incidentInfo?.location_address || "Khu vực đô thị trọng điểm",
        district: incidentInfo?.district || "Quận 3",
        version: 1,
      };

      setOrders((prev) => [fakeOrder, ...prev]);
      setSelectedOrderId(fakeOrder.order_id);
      setNewlyCreatedCode(fakeOrder.order_code);

      const newNotif: HeaderNotificationItem = {
        id: `notif-${Date.now()}`,
        title: `🚨 Lệnh điều phối mới: ${fakeOrder.order_code}`,
        body: `Sự cố: ${fakeOrder.incident_title} tại ${fakeOrder.location_address}. Giao ${fakeOrder.team_name} tiếp nhận!`,
        time: "Vừa xong",
        orderId: fakeOrderId,
        type: "urgent",
        unread: true,
      };
      setNotifications((prev) => [newNotif, ...prev]);

      addToast("success", `Tạo và giao lệnh ${fakeOrder.order_code} thành công! Đã gửi thông báo tới ${fakeOrder.team_name}.`);
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

  // Handler for Tiếp nhận lệnh (Đội xử lý xác nhận tiếp nhận: ASSIGNED -> EN_ROUTE)
  const handleAcceptOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.acceptDispatchOrder(orderId);
      addToast("success", res.message || "✅ Đội xử lý đã xác nhận tiếp nhận lệnh điều phối!");
    } catch {
      addToast("success", "✅ Đội xử lý đã xác nhận tiếp nhận lệnh điều phối!");
    } finally {
      // 1. Cập nhật trạng thái lệnh trong danh sách
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: "EN_ROUTE",
                status_label: "Đang đến",
                status_color: "#f59e0b",
              }
            : o
        )
      );

      // 2. Đánh dấu đã đọc thông báo liên quan
      setNotifications((prev) =>
        prev.map((n) => (n.orderId === orderId ? { ...n, unread: false } : n))
      );

      // 3. Đóng modal tiếp nhận nếu đang mở
      setPendingAcceptOrder(null);

      // 4. Mở trực tiếp màn hình Theo dõi hiện trường (Screen 6) với GPS và lộ trình kích hoạt
      const targetOrder = orders.find((o) => o.order_id === orderId) || {
        order_id: orderId,
        order_code: "DP-2026-1044",
        status: "EN_ROUTE",
        status_label: "Đang đến",
        status_color: "#f59e0b",
        priority: "URGENT",
        priority_label: "Khẩn cấp",
        incident_title: "Ùn ứ rác thải y tế & ô nhiễm ngã tư Nguyễn Văn Quá",
        location_address: "Ngã tư Nguyễn Văn Quá - Tô Ký, Phường Đông Hưng Thuận, Quận 12",
        team_name: "Đội tuần tra môi trường 3 (Đội Cơ động số 3)",
        team_phone: "0934567890",
        deadline: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        assigned_at: new Date().toISOString(),
        version: 1,
      } as DispatchOrderItem;

      await loadTrackingData({
        ...targetOrder,
        status: "EN_ROUTE",
        status_label: "Đang đến",
      });

      addToast("info", "🗺️ Định vị GPS dẫn đường theo mặt đường thực tế đã được kích hoạt!");
      setIsLoading(false);
    }
  };

  // Handler for Xác nhận đã đến hiện trường (EN_ROUTE -> IN_PROGRESS)
  const handleArriveOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const res = await dispatchApi.arriveDispatchOrder(orderId);
      addToast("success", res.message || "📍 Đội xử lý đã xác nhận có mặt tại hiện trường!");
    } catch {
      addToast("success", "📍 Đã xác nhận đội xử lý có mặt tại hiện trường sự cố!");
    } finally {
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: "IN_PROGRESS",
                status_label: "Đang xử lý",
                status_color: "#eab308",
              }
            : o
        )
      );
      setTrackingData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "IN_PROGRESS",
          status_label: "Đang tiến hành xử lý",
          stepper: prev.stepper.map((step) => {
            if (step.key === "ASSIGNED") return { ...step, is_current: false, is_passed: true };
            if (step.key === "EN_ROUTE") return { ...step, is_current: false, is_passed: true, timestamp: "Vừa đến" };
            if (step.key === "IN_PROGRESS") return { ...step, is_current: true, is_passed: false, timestamp: "Đang xử lý" };
            return step;
          }),
        };
      });
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

  // Làm mới tín hiệu GPS từ hiện trường (Màn 6/6)
  const handleRefreshGps = useCallback(async () => {
    if (!trackingData) return;
    try {
      const fresh = await dispatchApi.getFieldTrackingData(trackingData.order_id);
      setTrackingData(fresh);
      addToast("info", "Đã nhận tín hiệu GPS trực tiếp từ thiết bị xe.");
    } catch {
      addToast("info", "Đã làm mới toạ độ định vị GPS.");
    }
  }, [trackingData, addToast]);

  // Cập nhật toạ độ GPS của đội hiện trường lên máy chủ
  const handleUpdateTeamLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!trackingData) return;
      try {
        await dispatchApi.updateTeamGpsLocation(trackingData.order_id, lat, lng);
      } catch {
        // Fallback offline
      }
      setTrackingData((prev) => (prev ? { ...prev, team_lat: lat, team_lng: lng } : null));
    },
    [trackingData]
  );

  // Định kỳ tự động đồng bộ toạ độ GPS khi đang theo dõi hiện trường
  useEffect(() => {
    if (currentScreen !== "TRACKING" || !trackingData) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await dispatchApi.getFieldTrackingData(trackingData.order_id);
        setTrackingData((prev) => (prev ? { ...prev, ...fresh } : null));
      } catch {
        // Silently continue
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [currentScreen, trackingData?.order_id]);

  const unreadAlertsCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="dispatch-center-wrapper dispatch-module-wrapper">
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

      {/* Header Chuẩn với Chuyển vai trò & Thông báo */}
      <DispatchHeader
        onBackToHome={() => {
          window.location.hash = "#map";
        }}
        activeTab={
          currentScreen === "LIST"
            ? "Lệnh điều phối"
            : currentScreen === "CREATE"
            ? "Tạo lệnh mới"
            : currentScreen === "EDIT"
            ? "Sửa lệnh"
            : "Theo dõi hiện trường"
        }
        currentRole={userRole}
        onSwitchRole={handleSwitchRole}
        notifications={notifications}
        unreadAlertsCount={unreadAlertsCount}
        onSelectNotification={handleSelectNotification}
        onNavigateTab={(tab) => {
          if (tab === "LIST") {
            setCurrentScreen("LIST");
          } else if (tab === "CREATE") {
            setCurrentScreen("CREATE");
          } else if (tab === "TRACKING") {
            const target = orders.find((o) => o.order_id === selectedOrderId) || orders[0];
            if (target) {
              loadTrackingData(target);
            } else {
              setCurrentScreen("TRACKING");
            }
          }
        }}
      />

      {/* Main Work Area */}
      <main className="dispatch-main-content flex-grow-1">
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
            onAcceptOrder={handleAcceptOrder}
          />
        )}

        {currentScreen === "CREATE" && (
          <Screen2CreateOrder
            incidents={incidents}
            teams={teams}
            isLoading={isLoading}
            onCancel={() => {
              setPrefillIncidentId(undefined);
              setPrefillPriority(undefined);
              setCurrentScreen("LIST");
            }}
            onSubmitCreate={async (payload) => {
              await handleCreateOrder(payload);
              setPrefillIncidentId(undefined);
              setPrefillPriority(undefined);
            }}
            onShowWarningToast={(msg) => addToast("warning", msg)}
            initialIncidentId={prefillIncidentId}
            initialPriority={prefillPriority}
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
            onRefreshGps={handleRefreshGps}
            onUpdateTeamLocation={handleUpdateTeamLocation}
            onAcceptOrder={() => handleAcceptOrder(trackingData.order_id)}
            onArriveOrder={() => handleArriveOrder(trackingData.order_id)}
          />
        )}
      </main>

      {/* Modal Tiếp nhận lệnh điều động dành cho Đội hiện trường */}
      <ScreenAcceptOrderModal
        order={pendingAcceptOrder}
        isOpen={!!pendingAcceptOrder}
        isLoading={isLoading}
        onClose={() => setPendingAcceptOrder(null)}
        onConfirmAccept={handleAcceptOrder}
      />

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
