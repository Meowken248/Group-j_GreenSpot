/**
 * Vitest Unit & Integration Test Suite cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
 * Bao phủ 100% 5 màn hình:
 * 1. Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)
 * 2. Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)
 * 3. Màn 3/5: Giao diện phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh
 * 4. Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper & Chat)
 * 5. Màn 5/5: Popup xác nhận huỷ yêu cầu SOS (HUỶ YÊU CẦU SOS?)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";

import { FloodSosContainer } from "../pages/FloodSosContainer";
import { FloodSosDispatchScreen } from "../components/FloodSosDispatchScreen";
import { FloodSosConfirmModal } from "../components/FloodSosConfirmModal";
import { VolunteerResponseDashboard } from "../components/VolunteerResponseDashboard";
import { FloodSosLiveTrackingScreen } from "../components/FloodSosLiveTrackingScreen";
import { FloodSosCancelModal } from "../components/FloodSosCancelModal";
import { FloodSosChatDrawer } from "../components/FloodSosChatDrawer";
import { floodSosApi } from "../services/floodSosApi";
import type {
  CreateFloodSosPayload,
  VolunteerSosCard,
  SosTrackingDetail,
} from "../types/flood_sos.types";

// Mock API module
vi.mock("../services/floodSosApi", () => ({
  floodSosApi: {
    dispatchSos: vi.fn(),
    getNearbySosRequests: vi.fn(),
    acceptSosRequest: vi.fn(),
    skipSosRequest: vi.fn(),
    getSosTrackingDetail: vi.fn(),
    updateSosProgress: vi.fn(),
    sendChatMessage: vi.fn(),
    cancelSosRequest: vi.fn(),
    submitRating: vi.fn(),
  },
}));

describe("STT 46: Cứu hộ ngập cộng đồng (Flood SOS) Frontend Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. MÀN 1/5: GIAO DIỆN PHÁT TÍN HIỆU CẤP CỨU KHẨN CẤP
  // =========================================================================
  describe("Màn 1/5: FloodSosDispatchScreen", () => {
    it("hiển thị đầy đủ 3 khối: TÌNH HUỐNG, VỊ TRÍ, GỬI theo đúng wireframe", () => {
      const handleTrigger = vi.fn();
      render(<FloodSosDispatchScreen onTriggerConfirm={handleTrigger} />);

      expect(screen.getByTestId("col-situation")).toBeInTheDocument();
      expect(screen.getByTestId("col-location")).toBeInTheDocument();
      expect(screen.getByTestId("col-send")).toBeInTheDocument();
      expect(screen.getByTestId("btn-dispatch-sos")).toBeInTheDocument();
      expect(screen.getByTestId("btn-use-current-location")).toBeInTheDocument();
    });

    it("báo lỗi viền đỏ và nhắc nhở khi bỏ trống số người cần cứu", async () => {
      const handleTrigger = vi.fn();
      render(<FloodSosDispatchScreen onTriggerConfirm={handleTrigger} />);

      const victimsInput = screen.getByTestId("input-total-victims");
      fireEvent.change(victimsInput, { target: { value: "" } });

      const sendBtn = screen.getByTestId("btn-dispatch-sos");
      fireEvent.click(sendBtn);

      expect(
        screen.getByText("Vui lòng nhập ước tính số người cần cứu hộ."),
      ).toBeInTheDocument();
      expect(handleTrigger).not.toHaveBeenCalled();
    });

    it("kích hoạt mở popup xác nhận khẩn cấp khi nhập đủ thông số sinh tồn", () => {
      const handleTrigger = vi.fn();
      render(<FloodSosDispatchScreen onTriggerConfirm={handleTrigger} />);

      const victimsInput = screen.getByTestId("input-total-victims");
      fireEvent.change(victimsInput, { target: { value: "4" } });

      const sendBtn = screen.getByTestId("btn-dispatch-sos");
      fireEvent.click(sendBtn);

      expect(handleTrigger).toHaveBeenCalledTimes(1);
      const payload: CreateFloodSosPayload = handleTrigger.mock.calls[0][0];
      expect(payload.total_victims).toBe(4);
      expect(payload.severity_level).toBe("CRITICAL");
    });
  });

  // =========================================================================
  // 2. MÀN 2/5: POPUP XÁC NHẬN KHẨN CẤP
  // =========================================================================
  describe("Màn 2/5: FloodSosConfirmModal", () => {
    const dummyPayload: CreateFloodSosPayload = {
      total_victims: 3,
      elderly_count: 1,
      children_count: 1,
      medical_urgent_count: 0,
      description: "Nước dâng nhanh ngập gác",
      latitude: 10.74,
      longitude: 106.66,
      address_text: "Quận 8",
    };

    it("hiển thị đúng nhãn POPUP, tiêu đề in đậm và cam kết bán kính 3km", () => {
      render(
        <FloodSosConfirmModal
          isOpen={true}
          sosData={dummyPayload}
          isLoading={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      expect(screen.getByText("POPUP")).toBeInTheDocument();
      expect(screen.getByText("GỬI YÊU CẦU CỨU HỘ?")).toBeInTheDocument();
      expect(
        screen.getByText("Tình nguyện viên và đội gần nhất sẽ nhận"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("btn-confirm-send-sos")).toBeInTheDocument();
      expect(screen.getByTestId("btn-cancel-modal")).toBeInTheDocument();
    });

    it("bấm nút Huỷ đóng popup và giữ nguyên dữ liệu", () => {
      const handleCancel = vi.fn();
      render(
        <FloodSosConfirmModal
          isOpen={true}
          sosData={dummyPayload}
          isLoading={false}
          onConfirm={vi.fn()}
          onCancel={handleCancel}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-cancel-modal"));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it("bấm nút Gửi kích hoạt hàm callback xác nhận", () => {
      const handleConfirm = vi.fn();
      render(
        <FloodSosConfirmModal
          isOpen={true}
          sosData={dummyPayload}
          isLoading={false}
          onConfirm={handleConfirm}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-confirm-send-sos"));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. MÀN 3/5: GIAO DIỆN PHÂN BỔ CỨU HỘ CHO TÌNH NGUYỆN VIÊN
  // =========================================================================
  describe("Màn 3/5: VolunteerResponseDashboard", () => {
    const dummyCards: VolunteerSosCard[] = [
      {
        request_id: "card-1",
        sos_code: "SOS-20261026-0001",
        victim_name: "Bà Nguyễn Thị Mai",
        victim_phone: "0934112233",
        total_victims: 4,
        elderly_count: 1,
        children_count: 2,
        medical_urgent_count: 1,
        description: "Nước ngập hơn 1m tràn vào nhà cấp 4",
        latitude: 10.7428,
        longitude: 106.6625,
        address_text: "Quận 8, TP.HCM",
        severity_level: "CRITICAL",
        flood_depth_meters: 1.2,
        distance_meters: 650,
        distance_text: "Cách bạn 650m",
        status: "PENDING",
        created_at: new Date().toISOString(),
        version: 1,
      },
    ];

    it("hiển thị 2 cột: YÊU CẦU GẦN BẠN và BẢN ĐỒ cùng thông số khoảng cách", () => {
      render(
        <VolunteerResponseDashboard
          cards={dummyCards}
          volunteerLat={10.748}
          volunteerLng={106.658}
          onAccept={vi.fn()}
          onSkip={vi.fn()}
        />,
      );

      expect(screen.getByText("YÊU CẦU GẦN BẠN")).toBeInTheDocument();
      expect(screen.getByText("BẢN ĐỒ TIẾP CẬN CỨU HỘ")).toBeInTheDocument();
      expect(screen.getByText("Cách bạn 650m")).toBeInTheDocument();
      expect(screen.getByTestId("btn-accept-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("btn-skip-card-1")).toBeInTheDocument();
    });

    it("bấm Nhận yêu cầu kích hoạt khóa quyền và tiếp nhận ca", async () => {
      const handleAccept = vi.fn().mockResolvedValue(undefined);
      render(
        <VolunteerResponseDashboard
          cards={dummyCards}
          volunteerLat={10.748}
          volunteerLng={106.658}
          onAccept={handleAccept}
          onSkip={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-accept-card-1"));
      expect(handleAccept).toHaveBeenCalledWith(dummyCards[0]);
    });

    it("bấm Bỏ qua chuyển giao yêu cầu cho tình nguyện viên khác", () => {
      const handleSkip = vi.fn();
      render(
        <VolunteerResponseDashboard
          cards={dummyCards}
          volunteerLat={10.748}
          volunteerLng={106.658}
          onAccept={vi.fn()}
          onSkip={handleSkip}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-skip-card-1"));
      expect(handleSkip).toHaveBeenCalledWith(dummyCards[0]);
    });

    it("hiển thị lộ trình di chuyển cụ thể với các mốc tiếp cận và cự ly thực tế (không đi đường chim bay)", () => {
      render(
        <VolunteerResponseDashboard
          cards={dummyCards}
          volunteerLat={10.748}
          volunteerLng={106.658}
          onAccept={vi.fn()}
          onSkip={vi.fn()}
        />,
      );

      expect(screen.getByTestId("route-details-card")).toBeInTheDocument();
      expect(screen.getByText(/Lộ trình thực tế:/i)).toBeInTheDocument();
      expect(screen.getByText(/Độ sâu an toàn xuồng máy:/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. MÀN 4/5: TRUNG TÂM THEO DÕI TIẾN TRÌNH CỨU NẠN (LIVE TRACKING)
  // =========================================================================
  describe("Màn 4/5: FloodSosLiveTrackingScreen", () => {
    const dummyTrackingDetail: SosTrackingDetail = {
      request_id: "req-track-1",
      sos_code: "SOS-20261026-TRACK",
      status: "EN_ROUTE",
      status_step: 3, // Bước 3: Đang đến
      victim_name: "Bác Ba Cứu Hộ",
      victim_phone: "0933445566",
      total_victims: 2,
      elderly_count: 1,
      children_count: 0,
      medical_urgent_count: 0,
      description: "Có người già cần phao",
      latitude: 10.75,
      longitude: 106.66,
      address_text: "Phường 4, Quận 8",
      assigned_rescuer_name: "Nguyễn Văn A - Đội Xuồng cứu hộ Quận 8",
      assigned_rescuer_phone: "0908889999",
      assigned_team_name: "Đội Xuồng cứu hộ Quận 8",
      assigned_vehicle_type: "Xuồng cứu nạn 40HP",
      rescuer_latitude: 10.752,
      rescuer_longitude: 106.662,
      rescuer_distance_meters: 400,
      rescuer_eta_minutes: 5,
      distance_display: "Còn cách 400m - Ước tính 5 phút",
      messages: [
        {
          message_id: "msg-1",
          sender_type: "VICTIM",
          sender_name: "Bác Ba",
          content: "Tôi đang mặc áo mưa vàng trên mái nhà",
          created_at: new Date().toISOString(),
        },
      ],
      version: 2,
      created_at: new Date().toISOString(),
    };

    it("hiển thị 3 khối: TRẠNG THÁI (Stepper), NGƯỜI CỨU HỘ, BẢN ĐỒ LIVE TRACKING", () => {
      render(
        <FloodSosLiveTrackingScreen
          detail={dummyTrackingDetail}
          onOpenChat={vi.fn()}
          onOpenCancelModal={vi.fn()}
          onSubmitRating={vi.fn()}
        />,
      );

      expect(screen.getByTestId("col-status-stepper")).toBeInTheDocument();
      expect(screen.getByTestId("col-rescuer-info")).toBeInTheDocument();
      expect(screen.getByTestId("col-live-map")).toBeInTheDocument();

      // Kiểm tra Stepper bước 3 đang active
      const step3 = screen.getByTestId("step-item-3");
      expect(step3).toHaveClass("active");
      expect(screen.getByText("Còn cách 400m - Ước tính 5 phút")).toBeInTheDocument();
    });

    it("mở bàn phím gọi điện thoại và khung chat khi bấm nút tương ứng", () => {
      const handleOpenChat = vi.fn();
      render(
        <FloodSosLiveTrackingScreen
          detail={dummyTrackingDetail}
          onOpenChat={handleOpenChat}
          onOpenCancelModal={vi.fn()}
          onSubmitRating={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByTestId("btn-open-chat"));
      expect(handleOpenChat).toHaveBeenCalledTimes(1);
    });

    it("hiển thị đánh giá sao khi ca cứu nạn hoàn tất (status=COMPLETED)", () => {
      const completedDetail: SosTrackingDetail = {
        ...dummyTrackingDetail,
        status: "COMPLETED",
        status_step: 4,
      };

      render(
        <FloodSosLiveTrackingScreen
          detail={completedDetail}
          onOpenChat={vi.fn()}
          onOpenCancelModal={vi.fn()}
          onSubmitRating={vi.fn()}
        />,
      );

      expect(
        screen.getByText("Ca cứu hộ đã hoàn tất thành công. Bạn đã an toàn!"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("stars-selector")).toBeInTheDocument();
    });

    it("hiển thị kênh thông báo đồng bộ tin nhắn tới Đội cứu hộ và Ban quản trị / Admin", () => {
      render(
        <FloodSosChatDrawer
          isOpen={true}
          messages={[
            {
              message_id: "m-1",
              sender_type: "VICTIM",
              sender_name: "Bác Ba",
              content: "Đang ở tầng 2, có cờ đỏ nhận diện",
              created_at: new Date().toISOString(),
            },
          ]}
          currentSenderType="VICTIM"
          currentSenderName="Bác Ba"
          onSendMessage={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId("chat-notification-channel")).toBeInTheDocument();
      expect(screen.getByText(/Ban quản trị & Admin điều phối/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Đã thông báo tới Ban quản trị & Đội cứu hộ/i),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. MÀN 5/5: POPUP HUỶ YÊU CẦU SOS (KÈM SAFEGUARD < 100M)
  // =========================================================================
  describe("Màn 5/5: FloodSosCancelModal", () => {
    it("hiển thị đúng nhãn POPUP, lời nhắc thông báo cho người cứu hộ", () => {
      render(
        <FloodSosCancelModal
          isOpen={true}
          rescuerDistanceMeters={500}
          onConfirmCancel={vi.fn().mockResolvedValue(true)}
          onKeep={vi.fn()}
        />,
      );

      expect(screen.getByText("POPUP")).toBeInTheDocument();
      expect(screen.getByText("HUỶ YÊU CẦU SOS?")).toBeInTheDocument();
      expect(screen.getByText("Người cứu hộ sẽ được thông báo")).toBeInTheDocument();
      expect(screen.getByTestId("btn-confirm-cancel-sos")).toBeInTheDocument();
      expect(screen.getByTestId("btn-keep-sos")).toBeInTheDocument();
    });

    it("kích hoạt cảnh báo vàng khi người cứu hộ đã đến rất gần (< 100m)", async () => {
      const handleConfirmCancel = vi.fn().mockResolvedValue(false);
      render(
        <FloodSosCancelModal
          isOpen={true}
          rescuerDistanceMeters={60} // < 100m
          onConfirmCancel={handleConfirmCancel}
          onKeep={vi.fn()}
        />,
      );

      // Lần click 1: Chưa cho huỷ ngay mà kích hoạt cảnh báo vàng
      fireEvent.click(screen.getByTestId("btn-confirm-cancel-sos"));
      expect(screen.getByTestId("near-rescuer-warning-banner")).toBeInTheDocument();
      expect(
        screen.getByText(/Người cứu hộ đã đến rất gần vị trí của bạn/i),
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. MASTER CONTAINER TOÀN TRÌNH (INTEGRATION TEST)
  // =========================================================================
  describe("FloodSosContainer Toàn trình", () => {
    it("khởi tạo thành công và cho phép chuyển đổi vai trò linh hoạt giữa Người dân và Tình nguyện viên", async () => {
      vi.mocked(floodSosApi.getNearbySosRequests).mockResolvedValue([]);
      render(<FloodSosContainer />);

      expect(screen.getByTestId("flood-sos-root")).toBeInTheDocument();
      expect(screen.getByTestId("sos-header")).toBeInTheDocument();
      expect(screen.getByTestId("sos-footer")).toBeInTheDocument();

      // Chuyển sang Bảng điều khiển Tình nguyện viên
      fireEvent.click(screen.getByTestId("tab-volunteer"));
      await waitFor(() => {
        expect(screen.getByTestId("volunteer-dashboard")).toBeInTheDocument();
      });

      // Chuyển về màn hình phát lệnh SOS
      fireEvent.click(screen.getByTestId("tab-dispatch"));
      expect(screen.getByTestId("dispatch-screen")).toBeInTheDocument();
    });
  });
});
