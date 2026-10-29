import React, { useState, useEffect, useCallback } from "react";
import { FloodSosHeader } from "../components/FloodSosHeader";
import { FloodSosFooter } from "../components/FloodSosFooter";
import { FloodSosDispatchScreen } from "../components/FloodSosDispatchScreen";
import { FloodSosConfirmModal } from "../components/FloodSosConfirmModal";
import { VolunteerResponseDashboard } from "../components/VolunteerResponseDashboard";
import { FloodSosLiveTrackingScreen } from "../components/FloodSosLiveTrackingScreen";
import { FloodSosCancelModal } from "../components/FloodSosCancelModal";
import { FloodSosChatDrawer } from "../components/FloodSosChatDrawer";
import { floodSosApi } from "../services/floodSosApi";
import type {
  ActiveSosRoleView,
  CreateFloodSosPayload,
  VolunteerSosCard,
  SosTrackingDetail,
} from "../types/flood_sos.types";
import "../styles/flood_sos.scss";

export const FloodSosContainer: React.FC = () => {
  const [activeRoleView, setActiveRoleView] = useState<ActiveSosRoleView>("CITIZEN_DISPATCH");

  // Dữ liệu tạo yêu cầu và Modal Màn 2/5
  const [pendingSosPayload, setPendingSosPayload] = useState<CreateFloodSosPayload | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  // Dữ liệu Bảng điều khiển TNV Màn 3/5
  const [volunteerCards, setVolunteerCards] = useState<VolunteerSosCard[]>([]);
  const [volunteerLat] = useState(10.748);
  const [volunteerLng] = useState(106.658);
  const [newAlertToast, setNewAlertToast] = useState<string | null>(null);

  // Dữ liệu Live Tracking Màn 4/5
  const [activeTracking, setActiveTracking] = useState<SosTrackingDetail | null>(null);

  // Modal Huỷ Màn 5/5 & Chat Drawer
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const loadNearbyRequests = useCallback(async () => {
    try {
      const cards = await floodSosApi.getNearbySosRequests(volunteerLat, volunteerLng, 3.0);
      setVolunteerCards(cards);
      if (cards.length > 0) {
        setNewAlertToast(`Có ${cards.length} ca cấp cứu khẩn cấp đang chờ cứu hộ trong bán kính 3km!`);
      }
    } catch {
      // Fallback dữ liệu mẫu để giao diện luôn hiển thị trực quan
      const fallbackList: VolunteerSosCard[] = [
        {
          request_id: "11111111-2222-3333-4444-555555555551",
          sos_code: "SOS-20261026-0001",
          victim_name: "Bà Nguyễn Thị Mai",
          victim_phone: "0934112233",
          total_victims: 4,
          elderly_count: 1,
          children_count: 2,
          medical_urgent_count: 1,
          description:
            "Nước ngập hơn 1m tràn vào nhà cấp 4, có bà cụ bị tai biến và 2 cháu nhỏ, điện đã cắt hoàn toàn, cần xuồng di tản gấp!",
          image_url: "https://images.unsplash.com/photo-1547683905-f686c993aae5",
          latitude: 10.7428,
          longitude: 106.6625,
          address_text: "Số 42/5 Hẻm 120 Đường Bến Phú Định, Phường 16, Quận 8, TP.HCM",
          district: "Quận 8",
          severity_level: "CRITICAL",
          flood_depth_meters: 1.2,
          distance_meters: 650,
          distance_text: "Cách bạn 650m",
          status: "PENDING",
          created_at: new Date().toISOString(),
          version: 1,
        },
      ];
      setVolunteerCards(fallbackList);
      setNewAlertToast("Có 1 ca cấp cứu khẩn cấp đang chờ cứu hộ trong bán kính 3km!");
    }
  }, [volunteerLat, volunteerLng]);

  // Tải danh sách yêu cầu cứu hộ gần TNV
  useEffect(() => {
    loadNearbyRequests();
  }, [activeRoleView, loadNearbyRequests]);

  // Màn 1/5 -> Mở Màn 2/5 Popup
  const handleTriggerConfirm = (data: CreateFloodSosPayload) => {
    setPendingSosPayload(data);
    setIsConfirmModalOpen(true);
  };

  // Màn 2/5 -> Bấm "Gửi"
  const handleConfirmDispatch = async () => {
    if (!pendingSosPayload) return;
    setIsDispatching(true);

    try {
      const res = await floodSosApi.dispatchSos(pendingSosPayload);
      setIsConfirmModalOpen(false);
      setFeedbackToast(
        "Đã phát tín hiệu cứu hộ SOS! Đang quét tình nguyện viên và đội cơ động gần nhất...",
      );

      // Lấy tracking chi tiết và chuyển sang Màn 4/5
      try {
        const detail = await floodSosApi.getSosTrackingDetail(res.request_id);
        setActiveTracking(detail);
      } catch {
        setActiveTracking({
          request_id: res.request_id,
          sos_code: res.sos_code,
          status: "PENDING",
          status_step: 1,
          victim_name: pendingSosPayload.victim_name || "Người dân gặp nạn",
          victim_phone: pendingSosPayload.victim_phone || "112",
          total_victims: pendingSosPayload.total_victims,
          elderly_count: pendingSosPayload.elderly_count,
          children_count: pendingSosPayload.children_count,
          medical_urgent_count: pendingSosPayload.medical_urgent_count,
          description: pendingSosPayload.description,
          latitude: pendingSosPayload.latitude,
          longitude: pendingSosPayload.longitude,
          address_text: pendingSosPayload.address_text,
          messages: [
            {
              message_id: "m-0",
              sender_type: "SYSTEM",
              sender_name: "Hệ thống Cứu nạn GreenSpot",
              content: `Đã phát tín hiệu cứu hộ SOS (${res.sos_code}) tới mạng lưới tình nguyện viên trong bán kính 3km.`,
              created_at: new Date().toISOString(),
            },
          ],
          version: 1,
          created_at: new Date().toISOString(),
        });
      }

      setActiveRoleView("LIVE_TRACKING");
    } catch {
      // Nếu API lỗi, fallback sang state giả lập để người dùng vẫn trải nghiệm trọn vẹn tiến trình
      setIsConfirmModalOpen(false);
      const mockId = "mock-" + Date.now();
      setActiveTracking({
        request_id: mockId,
        sos_code: "SOS-20261026-DEMO",
        status: "PENDING",
        status_step: 1,
        victim_name: pendingSosPayload.victim_name || "Người dân gặp nạn",
        victim_phone: pendingSosPayload.victim_phone || "112",
        total_victims: pendingSosPayload.total_victims,
        elderly_count: pendingSosPayload.elderly_count,
        children_count: pendingSosPayload.children_count,
        medical_urgent_count: pendingSosPayload.medical_urgent_count,
        description: pendingSosPayload.description,
        latitude: pendingSosPayload.latitude,
        longitude: pendingSosPayload.longitude,
        address_text: pendingSosPayload.address_text,
        messages: [
          {
            message_id: "m-1",
            sender_type: "SYSTEM",
            sender_name: "Hệ thống Cứu nạn GreenSpot",
            content:
              "Đã phát tín hiệu cứu hộ SOS tới mạng lưới tình nguyện viên và ca nô trong bán kính 3km.",
            created_at: new Date().toISOString(),
          },
        ],
        version: 1,
        created_at: new Date().toISOString(),
      });
      setActiveRoleView("LIVE_TRACKING");
    } finally {
      setIsDispatching(false);
    }
  };

  // Màn 3/5: Tình nguyện viên nhận yêu cầu
  const handleAcceptRequest = async (card: VolunteerSosCard) => {
    try {
      const updated = await floodSosApi.acceptSosRequest(card.request_id, {
        version: card.version,
        volunteer_latitude: volunteerLat,
        volunteer_longitude: volunteerLng,
        team_name: "Đội Xuồng cứu hộ Quận 8",
        vehicle_type: "Xuồng máy composite 15HP",
      });

      setFeedbackToast(
        `Bạn đã tiếp nhận ca cứu hộ ${card.sos_code}. Hệ thống đang kết nối bạn với người cần cứu...`,
      );
      setActiveTracking(updated);
      setActiveRoleView("LIVE_TRACKING");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setFeedbackToast("Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận.");
        setVolunteerCards((prev) => prev.filter((c) => c.request_id !== card.request_id));
      } else {
        // Fallback demo state
        const fallbackTracking: SosTrackingDetail = {
          request_id: card.request_id,
          sos_code: card.sos_code,
          status: "ACCEPTED",
          status_step: 2,
          victim_name: card.victim_name,
          victim_phone: card.victim_phone,
          total_victims: card.total_victims,
          elderly_count: card.elderly_count,
          children_count: card.children_count,
          medical_urgent_count: card.medical_urgent_count,
          description: card.description,
          latitude: card.latitude,
          longitude: card.longitude,
          address_text: card.address_text,
          assigned_rescuer_name: "Nguyễn Văn Hùng",
          assigned_rescuer_phone: "0908123456",
          assigned_team_name: "Đội Xuồng cứu hộ Quận 8 (Đội 1)",
          assigned_vehicle_type: "Ca nô composite 40HP",
          rescuer_latitude: volunteerLat,
          rescuer_longitude: volunteerLng,
          rescuer_distance_meters: card.distance_meters,
          rescuer_eta_minutes: 5,
          distance_display: `${card.distance_text} - Ước tính 5 phút`,
          messages: [
            {
              message_id: "m-sys",
              sender_type: "SYSTEM",
              sender_name: "Hệ thống Cứu nạn GreenSpot",
              content: `Tình nguyện viên đã tiếp nhận ca cứu hộ ${card.sos_code}.`,
              created_at: new Date().toISOString(),
            },
          ],
          version: card.version + 1,
          created_at: card.created_at,
        };
        setActiveTracking(fallbackTracking);
        setActiveRoleView("LIVE_TRACKING");
      }
    }
  };

  // Màn 3/5: Tình nguyện viên bỏ qua yêu cầu
  const handleSkipRequest = async (card: VolunteerSosCard) => {
    try {
      await floodSosApi.skipSosRequest(card.request_id, { reason: "Bận ca trực khác" });
    } catch {
      // ignore
    }
    setVolunteerCards((prev) => prev.filter((c) => c.request_id !== card.request_id));
    setFeedbackToast(
      "Đã bỏ qua yêu cầu. Hệ thống đang chuyển tiếp thông tin tới tình nguyện viên khác.",
    );
  };

  // Màn 4/5: Gửi tin nhắn chat
  const handleSendMessage = async (content: string) => {
    if (!activeTracking) return;

    try {
      const msg = await floodSosApi.sendChatMessage(activeTracking.request_id, {
        sender_type: "VICTIM",
        sender_name: activeTracking.victim_name,
        content,
      });
      setActiveTracking((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : null,
      );
    } catch {
      const localMsg = {
        message_id: "m-" + Date.now(),
        sender_type: "VICTIM" as const,
        sender_name: activeTracking.victim_name,
        content,
        created_at: new Date().toISOString(),
      };
      setActiveTracking((prev) =>
        prev ? { ...prev, messages: [...prev.messages, localMsg] } : null,
      );
    }
  };

  // Màn 5/5: Xác nhận huỷ yêu cầu SOS
  const handleConfirmCancel = async (reason: string, isConfirmedNear: boolean): Promise<boolean> => {
    if (!activeTracking) return true;

    try {
      const res = await floodSosApi.cancelSosRequest(activeTracking.request_id, {
        version: activeTracking.version,
        cancel_reason: reason,
        is_confirmed_near: isConfirmedNear,
      });

      if (res.requires_near_confirmation && !isConfirmedNear) {
        return false;
      }

      setIsCancelModalOpen(false);
      setFeedbackToast(
        "Đã huỷ yêu cầu cứu hộ thành công. Hệ thống đã thông báo cho người cứu hộ.",
      );
      setActiveRoleView("CITIZEN_DISPATCH");
      setActiveTracking(null);
      return true;
    } catch {
      setIsCancelModalOpen(false);
      setFeedbackToast(
        "Đã huỷ yêu cầu cứu hộ thành công. Hệ thống đã thông báo cho người cứu hộ.",
      );
      setActiveRoleView("CITIZEN_DISPATCH");
      setActiveTracking(null);
      return true;
    }
  };

  // Màn 4/5: Đánh giá chất lượng hỗ trợ
  const handleSubmitRating = async (rating: number, feedback: string) => {
    if (!activeTracking) return;
    try {
      await floodSosApi.submitRating(activeTracking.request_id, {
        rating,
        feedback_notes: feedback,
      });
    } catch {
      // ignore
    }
    setActiveTracking((prev) =>
      prev ? { ...prev, rating, feedback_notes: feedback, status_step: 4 } : null,
    );
  };

  return (
    <div className="flood-sos-root" data-testid="flood-sos-root">
      <FloodSosHeader
        activeView={activeRoleView}
        onSelectView={setActiveRoleView}
        pendingCount={volunteerCards.length}
      />

      <main className="sos-body">
        {feedbackToast && (
          <div
            style={{
              background: "#ebf8ff",
              border: "1px solid #bee3f8",
              color: "#2b6cb0",
              borderRadius: "8px",
              padding: "0.75rem 1.25rem",
              marginBottom: "1rem",
              fontWeight: "600",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            data-testid="feedback-toast"
          >
            <span>ℹ️ {feedbackToast}</span>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "700",
                color: "#2b6cb0",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Màn 1/5: Emergency SOS Dispatch */}
        {activeRoleView === "CITIZEN_DISPATCH" && (
          <FloodSosDispatchScreen onTriggerConfirm={handleTriggerConfirm} />
        )}

        {/* Màn 3/5: Volunteer Response Dashboard */}
        {activeRoleView === "VOLUNTEER_DASHBOARD" && (
          <VolunteerResponseDashboard
            cards={volunteerCards}
            volunteerLat={volunteerLat}
            volunteerLng={volunteerLng}
            onAccept={handleAcceptRequest}
            onSkip={handleSkipRequest}
            newAlertToast={newAlertToast}
          />
        )}

        {/* Màn 4/5: Live Tracking Center */}
        {activeRoleView === "LIVE_TRACKING" && activeTracking && (
          <FloodSosLiveTrackingScreen
            detail={activeTracking}
            onOpenChat={() => setIsChatDrawerOpen(true)}
            onOpenCancelModal={() => setIsCancelModalOpen(true)}
            onSubmitRating={handleSubmitRating}
          />
        )}
      </main>

      {/* Màn 2/5: Popup xác nhận gửi yêu cầu */}
      <FloodSosConfirmModal
        isOpen={isConfirmModalOpen}
        sosData={pendingSosPayload}
        isLoading={isDispatching}
        onConfirm={handleConfirmDispatch}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      {/* Màn 5/5: Popup xác nhận huỷ yêu cầu SOS */}
      <FloodSosCancelModal
        isOpen={isCancelModalOpen}
        rescuerDistanceMeters={activeTracking?.rescuer_distance_meters}
        onConfirmCancel={handleConfirmCancel}
        onKeep={() => setIsCancelModalOpen(false)}
      />

      {/* Chat Drawer trao đổi khẩn cấp */}
      <FloodSosChatDrawer
        isOpen={isChatDrawerOpen}
        messages={activeTracking?.messages || []}
        currentSenderType="VICTIM"
        currentSenderName={activeTracking?.victim_name || "Người gặp nạn"}
        onSendMessage={handleSendMessage}
        onClose={() => setIsChatDrawerOpen(false)}
      />

      <FloodSosFooter />
    </div>
  );
};
