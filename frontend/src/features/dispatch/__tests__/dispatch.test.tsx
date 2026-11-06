import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Screen1DispatchList } from '../components/Screen1DispatchList';
import { Screen2CreateOrder } from '../components/Screen2CreateOrder';
import { Screen3EditOrder } from '../components/Screen3EditOrder';
import { Screen4CancelModal } from '../components/Screen4CancelModal';
import { Screen5CancelSuccessModal } from '../components/Screen5CancelSuccessModal';
import { Screen6FieldTracking } from '../components/Screen6FieldTracking';
import { DispatchHeader } from '../components/DispatchHeader';
import { DispatchFooter } from '../components/DispatchFooter';
import type {
  DispatchOrderItem,
  TeamOptionItem,
  IncidentComboboxItem,
  FieldTrackingResponse,
} from '../types/dispatch.types';

const MOCK_ORDERS: DispatchOrderItem[] = [
  {
    order_id: "ord-001",
    order_code: "DP-2026-001",
    incident_id: "inc-001",
    incident_title: "Bãi rác tự phát lớn",
    incident_type: "Rác thải",
    team_id: "team-001",
    team_name: "Đội phản ứng nhanh 1",
    team_phone: "0908123456",
    status: "EN_ROUTE",
    status_label: "Đang đến",
    status_color: "#f59e0b",
    priority: "URGENT",
    priority_label: "Khẩn cấp",
    deadline: "2026-10-16T18:00:00",
    assigned_at: "2026-10-16T14:00:00",
    location_address: "142 Lê Văn Sỹ, Quận 3",
    district: "Quận 3",
    version: 1,
  },
  {
    order_id: "ord-002",
    order_code: "DP-2026-002",
    incident_id: "inc-002",
    incident_title: "Tắc nghẽn cống tiêu thoát nước",
    incident_type: "Ngập úng",
    team_id: "team-002",
    team_name: "Đội nạo vét cơ động 2",
    team_phone: "0912345678",
    status: "COMPLETED",
    status_label: "Hoàn tất",
    status_color: "#10b981",
    priority: "HIGH",
    priority_label: "Cao",
    deadline: "2026-10-16T17:00:00",
    assigned_at: "2026-10-16T12:00:00",
    location_address: "Ngã tư NTMK, Quận 1",
    district: "Quận 1",
    version: 2,
  },
];

const MOCK_TEAMS: TeamOptionItem[] = [
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

const MOCK_INCIDENTS: IncidentComboboxItem[] = [
  {
    incident_id: "inc-001",
    incident_code: "SC-2026-001",
    title: "Bãi rác tự phát lớn",
    category: "Rác thải",
    urgency: "KHẨN",
    location_address: "142 Lê Văn Sỹ, Phường 13, Quận 3",
    district: "Quận 3",
    latitude: 10.7915,
    longitude: 106.6775,
  },
];

const MOCK_TRACKING: FieldTrackingResponse = {
  order_id: "ord-001",
  order_code: "DP-2026-001",
  status: "EN_ROUTE",
  status_label: "Đang đến",
  priority: "Khẩn cấp",
  deadline: "2026-10-16T18:00:00",
  incident_title: "Bãi rác tự phát lớn",
  incident_address: "142 Lê Văn Sỹ, Quận 3",
  incident_lat: 10.7915,
  incident_lng: 106.6775,
  incident_radius_meters: 50,
  team_name: "Đội phản ứng nhanh 1",
  team_phone: "0908123456",
  team_lat: 10.785,
  team_lng: 106.672,
  eta_minutes: 8,
  is_gps_active: true,
  gps_lost_warning: null,
  stepper: [
    { key: "ASSIGNED", label: "Đã giao lệnh", is_current: false, is_passed: true, timestamp: "14:15" },
    { key: "EN_ROUTE", label: "Đang đến hiện trường", is_current: true, is_passed: false, timestamp: "14:22" },
    { key: "IN_PROGRESS", label: "Đang tiến hành xử lý", is_current: false, is_passed: false, timestamp: null },
    { key: "COMPLETED", label: "Hoàn tất xử lý", is_current: false, is_passed: false, timestamp: null },
  ],
  before_image_url: "https://example.com/before.jpg",
  after_image_url: null,
  can_close_order: false,
  missing_after_image_warning: "Chưa có ảnh nghiệm thu sau xử lý, không thể đóng lệnh.",
  version: 1,
};

describe("Khối Giao diện Điều Phối Tác Nghiệp (Operations Dispatch)", () => {
  it("Header và Footer hiển thị đúng nội dung chuẩn mực", () => {
    render(<DispatchHeader activeTab="Lệnh điều phối" />);
    expect(screen.getByText("Trung tâm Điều phối Tác nghiệp")).toBeInTheDocument();
    expect(screen.getByText("Lệnh điều phối")).toBeInTheDocument();

    render(<DispatchFooter />);
    expect(screen.getByText(/Hệ thống Điều phối Lực lượng Hiện trường/i)).toBeInTheDocument();
  });

  describe("Màn 1/6: Danh sách lệnh xử lý", () => {
    it("Hiển thị danh sách lệnh, bộ lọc và các nút thao tác đúng", () => {
      const handleSelect = vi.fn();
      const handleApplyFilters = vi.fn();
      const handleReset = vi.fn();
      const handleCreate = vi.fn();
      const handleEdit = vi.fn();
      const handleCancel = vi.fn();
      const handleTracking = vi.fn();
      const handleWarning = vi.fn();

      render(
        <Screen1DispatchList
          orders={MOCK_ORDERS}
          teams={MOCK_TEAMS}
          selectedOrderId="ord-001"
          onSelectOrder={handleSelect}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleReset}
          onNavigateToCreate={handleCreate}
          onNavigateToEdit={handleEdit}
          onOpenCancelModal={handleCancel}
          onOpenTracking={handleTracking}
          onShowWarningToast={handleWarning}
        />
      );

      // Verify Table Rows
      expect(screen.getByText("DP-2026-001")).toBeInTheDocument();
      expect(screen.getByText("DP-2026-002")).toBeInTheDocument();
      expect(screen.getByText("Bãi rác tự phát lớn")).toBeInTheDocument();

      // Action Buttons
      const btnCreate = screen.getByText("Tạo lệnh mới");
      expect(btnCreate).toBeInTheDocument();
      fireEvent.click(btnCreate);
      expect(handleCreate).toHaveBeenCalledTimes(1);

      const btnEdit = screen.getByText("Sửa");
      fireEvent.click(btnEdit);
      expect(handleEdit).toHaveBeenCalledWith(MOCK_ORDERS[0]);

      const btnCancel = screen.getByText("Huỷ lệnh");
      fireEvent.click(btnCancel);
      expect(handleCancel).toHaveBeenCalledWith(MOCK_ORDERS[0]);

      // Filter interaction
      const btnApply = screen.getByText("Áp dụng");
      fireEvent.click(btnApply);
      expect(handleApplyFilters).toHaveBeenCalled();
    });

    it("Double click vào hàng mở Màn 6/6 Theo dõi hiện trường", () => {
      const handleTracking = vi.fn();
      render(
        <Screen1DispatchList
          orders={MOCK_ORDERS}
          teams={MOCK_TEAMS}
          selectedOrderId="ord-001"
          onSelectOrder={vi.fn()}
          onApplyFilters={vi.fn()}
          onResetFilters={vi.fn()}
          onNavigateToCreate={vi.fn()}
          onNavigateToEdit={vi.fn()}
          onOpenCancelModal={vi.fn()}
          onOpenTracking={handleTracking}
          onShowWarningToast={vi.fn()}
        />
      );

      const row = screen.getByTestId("order-row-ord-001");
      fireEvent.doubleClick(row);
      expect(handleTracking).toHaveBeenCalledWith(MOCK_ORDERS[0]);
    });
  });

  describe("Màn 2/6: Tạo lệnh mới", () => {
    it("Hiển thị form tạo lệnh, chọn sự cố trích xuất GPS và gửi tạo thành công", async () => {
      const handleCancel = vi.fn();
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleWarning = vi.fn();

      render(
        <Screen2CreateOrder
          incidents={MOCK_INCIDENTS}
          teams={MOCK_TEAMS}
          isLoading={false}
          onCancel={handleCancel}
          onSubmitCreate={handleSubmit}
          onShowWarningToast={handleWarning}
        />
      );

      expect(screen.getByText("Tạo lệnh điều động xử lý hiện trường mới")).toBeInTheDocument();
      expect(screen.getByText("142 Lê Văn Sỹ, Phường 13, Quận 3")).toBeInTheDocument();

      // Submit Giao lệnh
      const btnSubmit = screen.getByText("Giao lệnh");
      fireEvent.click(btnSubmit);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe("Màn 3/6: Sửa lệnh và kiểm tra khoá hoàn tất", () => {
    it("Khối hiện tại hiển thị read-only và yêu cầu lý do điều chỉnh", async () => {
      const handleSubmit = vi.fn().mockResolvedValue(undefined);
      const handleWarning = vi.fn();

      render(
        <Screen3EditOrder
          order={MOCK_ORDERS[0]}
          teams={MOCK_TEAMS}
          isLoading={false}
          onCancel={vi.fn()}
          onSubmitEdit={handleSubmit}
          onShowWarningToast={handleWarning}
        />
      );

      expect(screen.getByText("Hồ sơ lệnh hiện tại")).toBeInTheDocument();
      expect(screen.getByText("DP-2026-001")).toBeInTheDocument();

      // Bấm cập nhật khi chưa điền lý do sẽ kích hoạt cảnh báo
      const btnUpdate = screen.getByText("Cập nhật");
      fireEvent.click(btnUpdate);
      expect(handleWarning).toHaveBeenCalled();
      expect(handleSubmit).not.toHaveBeenCalled();

      // Điền lý do điều chỉnh
      const textareaNotes = screen.getByPlaceholderText(/Đội cũ xe nạo vét gặp sự cố/i);
      fireEvent.change(textareaNotes, { target: { value: "Đội xe hỏng cần điều chuyển gấp" } });

      fireEvent.click(btnUpdate);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it("Lệnh trạng thái Hoàn tất bị khoá và hiển thị cảnh báo", () => {
      render(
        <Screen3EditOrder
          order={MOCK_ORDERS[1]} // COMPLETED
          teams={MOCK_TEAMS}
          isLoading={false}
          onCancel={vi.fn()}
          onSubmitEdit={vi.fn()}
          onShowWarningToast={vi.fn()}
        />
      );

      expect(screen.getByText(/Lệnh đã hoàn tất/i)).toBeInTheDocument();
      const btnUpdate = screen.getByText("Cập nhật");
      expect(btnUpdate).toBeDisabled();
    });
  });

  describe("Màn 4/6 & 5/6: Huỷ lệnh và thông báo huỷ thành công", () => {
    it("Màn 4/6 mở modal, yêu cầu lý do huỷ và gọi confirm cancel", async () => {
      const handleConfirm = vi.fn().mockResolvedValue(undefined);
      const handleWarning = vi.fn();

      render(
        <Screen4CancelModal
          order={MOCK_ORDERS[0]}
          isOpen={true}
          isLoading={false}
          onClose={vi.fn()}
          onConfirmCancel={handleConfirm}
          onShowWarningToast={handleWarning}
        />
      );

      expect(screen.getByText("HUỶ LỆNH XỬ LÝ?")).toBeInTheDocument();

      // Submit without reason
      const btnCancelConfirm = screen.getByRole("button", { name: /Huỷ lệnh/i });
      fireEvent.click(btnCancelConfirm);
      expect(handleWarning).toHaveBeenCalled();

      // Input reason
      const textarea = screen.getByPlaceholderText(/Sự cố đã được người dân tự khắc phục/i);
      fireEvent.change(textarea, { target: { value: "Người dân đã tự dọn dẹp" } });

      fireEvent.click(btnCancelConfirm);
      expect(handleConfirm).toHaveBeenCalledWith("ord-001", 1, "Người dân đã tự dọn dẹp");
    });

    it("Màn 5/6 hiển thị ĐÃ HUỶ LỆNH với checkmark", () => {
      const handleClose = vi.fn();
      render(
        <Screen5CancelSuccessModal
          isOpen={true}
          orderCode="DP-2026-001"
          onClose={handleClose}
        />
      );

      expect(screen.getByText("ĐÃ HUỶ LỆNH")).toBeInTheDocument();
      expect(screen.getByText(/Lệnh xử lý đã được huỷ thành công/i)).toBeInTheDocument();

      const btnClose = screen.getByText("Đóng");
      fireEvent.click(btnClose);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Màn 6/6: Theo dõi hiện trường, Stepper và nghiệm thu", () => {
    it("Hiển thị bản đồ, stepper 4 bước và kiểm tra điều kiện Đóng lệnh", async () => {
      const handleClose = vi.fn().mockResolvedValue(undefined);
      const handleWarning = vi.fn();
      const handleSuccess = vi.fn();

      render(
        <Screen6FieldTracking
          trackingData={MOCK_TRACKING}
          isLoading={false}
          onBackToList={vi.fn()}
          onCloseOrder={handleClose}
          onShowWarningToast={handleWarning}
          onShowSuccessToast={handleSuccess}
        />
      );

      expect(screen.getByText("Giám sát hiện trường: DP-2026-001")).toBeInTheDocument();
      expect(screen.getByTestId("tracking-stepper")).toBeInTheDocument();
      expect(screen.getByText("Chờ đội tải ảnh nghiệm thu")).toBeInTheDocument();

      // Nút Đóng lệnh khi chưa có ảnh nghiệm thu sẽ báo cảnh báo
      const btnCloseOrder = screen.getByTestId("btn-close-order");
      fireEvent.click(btnCloseOrder);
      expect(handleWarning).toHaveBeenCalledWith(
        "Chưa có ảnh nghiệm thu sau xử lý, không thể đóng lệnh."
      );
      expect(handleClose).not.toHaveBeenCalled();

      // Nút Gọi đội mở hộp thoại liên lạc
      const btnCall = screen.getByTestId("btn-call-team");
      fireEvent.click(btnCall);
      expect(screen.getByText("Liên hệ Đội cơ động")).toBeInTheDocument();
      expect(screen.getAllByText("0908123456").length).toBeGreaterThan(0);
    });
  });
});
