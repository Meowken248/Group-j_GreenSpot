import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecyclingFacilityContainer } from "../RecyclingFacilityContainer";
import { FacilityFilterPanel } from "../components/FacilityFilterPanel";
import { FacilityListPanel } from "../components/FacilityListPanel";
import { FacilityActionPanel } from "../components/FacilityActionPanel";
import { FacilityFormView } from "../components/FacilityFormView";
import { FacilityDeleteConfirmModal } from "../components/FacilityDeleteConfirmModal";
import { FacilityDeleteSuccessModal } from "../components/FacilityDeleteSuccessModal";
import { FacilityQRCodeModal } from "../components/FacilityQRCodeModal";
import { QRCodeSvg } from "../components/QRCodeSvg";
import { generateQrMatrix } from "../utils/qrCodeGenerator";
import * as service from "../services/recyclingFacilityService";
import type {
  RecyclingFacilityItem,
  RecyclingFacilityListResponse,
  DistrictItem,
} from "../types/recyclingFacility.types";

// Mock Leaflet
vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      on: vi.fn(),
      panTo: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      on: vi.fn(),
      setLatLng: vi.fn().mockReturnThis(),
      setIcon: vi.fn().mockReturnThis(),
    })),
    divIcon: vi.fn(() => ({})),
  },
}));

vi.mock("../services/recyclingFacilityService", () => ({
  fetchRecyclingFacilities: vi.fn(),
  fetchFacilityDetail: vi.fn(),
  fetchHcmcDistricts: vi.fn(),
  createRecyclingFacility: vi.fn(),
  updateRecyclingFacility: vi.fn(),
  deleteRecyclingFacility: vi.fn(),
  checkFacilityNameUnique: vi.fn(),
  checkFacilityProximity: vi.fn(),
}));

const mockDistricts: DistrictItem[] = [
  { unit_id: 3, unit_name: "Quận 1", unit_level: "QUAN", hcmc_district_name: "Quận 1" },
  { unit_id: 2, unit_name: "TP. Thủ Đức", unit_level: "THANH_PHO", hcmc_district_name: "Thành phố Thủ Đức" },
  { unit_id: 5, unit_name: "Quận 3", unit_level: "QUAN", hcmc_district_name: "Quận 3" },
];

const mockFacilities: RecyclingFacilityItem[] = [
  {
    facility_id: 1,
    facility_code: "REC-Q1-01",
    name: "Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ",
    address: "123 Nguyễn Huệ, P. Bến Nghé, Quận 1",
    unit_id: 3,
    unit_name: "Quận 1",
    latitude: 10.7769,
    longitude: 106.7009,
    accepted_waste_types: ["PIN_CU", "THIET_BI_DIEN_TU", "NHUA"],
    open_time: "07:30",
    close_time: "17:00",
    qr_code: "GREENSPOT-REC-Q1-01-a1b2c3d4",
    contact_phone: "028.3822.1234",
    managing_org: "Công ty Môi Trường Xanh",
    is_active: true,
    created_at: "2026-10-10T10:00:00Z",
    updated_at: "2026-10-10T10:00:00Z",
  },
  {
    facility_id: 2,
    facility_code: "REC-TPTD-01",
    name: "Trạm Phân Loại Tái Chế Phước Long B",
    address: "999 Đỗ Xuân Hợp, Phước Long B, TP. Thủ Đức",
    unit_id: 2,
    unit_name: "TP. Thủ Đức",
    latitude: 10.8250,
    longitude: 106.7750,
    accepted_waste_types: ["PIN_CU", "GIAY", "KIM_LOAI"],
    open_time: "08:00",
    close_time: "18:00",
    qr_code: "GREENSPOT-REC-TPTD-01-e5f6g7h8",
    contact_phone: "028.9999.8888",
    managing_org: "Ban Quản Lý Đô Thị Thủ Đức",
    is_active: false,
    created_at: "2026-10-09T08:00:00Z",
    updated_at: "2026-10-09T08:00:00Z",
  },
];

const mockListResponse: RecyclingFacilityListResponse = {
  items: mockFacilities,
  total: 2,
  page: 1,
  limit: 10,
  total_pages: 1,
  active_count: 1,
  inactive_count: 1,
};

describe("Quản trị Mạng lưới Trạm Tái chế & Điểm Tiếp nhận", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (service.fetchHcmcDistricts as any).mockResolvedValue(mockDistricts);
    (service.fetchRecyclingFacilities as any).mockResolvedValue(mockListResponse);
    (service.checkFacilityNameUnique as any).mockResolvedValue({ is_valid: true });
    (service.checkFacilityProximity as any).mockResolvedValue({ is_valid: true });
  });

  describe("1. Phân quyền truy cập & Bảo vệ phân hệ", () => {
    it("từ chối truy cập nếu vai trò không phải là ADMIN", () => {
      render(
        <RecyclingFacilityContainer
          currentUser={{ role: "CITIZEN", email: "citizen@example.com" }}
        />
      );
      expect(screen.getByText("Truy cập bị từ chối")).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn không có quyền truy cập chức năng này/)
      ).toBeInTheDocument();
    });

    it("cho phép truy cập khi vai trò là ADMIN", async () => {
      render(
        <RecyclingFacilityContainer
          currentUser={{ role: "ADMIN", email: "admin@ecoreport.gov.vn" }}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Quản trị Mạng lưới Trạm Tái chế & Điểm Tiếp nhận")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Vai trò: Admin")).toBeInTheDocument();
      expect(screen.getByText("DANH SÁCH TRẠM TÁI CHẾ")).toBeInTheDocument();
    });
  });

  describe("2. Bộ sinh mã QR và Thành phần hiển thị", () => {
    it("sinh ma trận QR chuẩn không bị lỗi", () => {
      const text = "GREENSPOT-REC-Q1-01-12345678";
      const matrix = generateQrMatrix(text);
      expect(matrix.length).toBeGreaterThanOrEqual(21);
      expect(matrix[0].length).toBeGreaterThanOrEqual(21);
    });

    it("render SVG QR Code thành công", () => {
      const { container } = render(
        <QRCodeSvg value="GREENSPOT-REC-Q1-01-test" size={150} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute("width")).toBe("150");
    });

    it("mở Modal xem và tải mã QR với đầy đủ thông tin", () => {
      render(
        <FacilityQRCodeModal
          isOpen={true}
          facility={mockFacilities[0]}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Mã QR Định Danh Trạm Tiếp Nhận")).toBeInTheDocument();
      expect(screen.getByText("REC-Q1-01")).toBeInTheDocument();
      expect(screen.getByText(mockFacilities[0].name)).toBeInTheDocument();
      expect(screen.getByText("🖨️ In biển hiệu")).toBeInTheDocument();
      expect(screen.getByText("⬇️ Tải ảnh PNG")).toBeInTheDocument();
    });
  });

  describe("3. Màn 1: Bộ lọc, Danh sách & Bố cục 3 khối", () => {
    it("hiển thị danh sách các trạm với mã trạm, địa chỉ và badge trạng thái", async () => {
      render(
        <RecyclingFacilityContainer
          currentUser={{ role: "ADMIN", email: "admin@ecoreport.gov.vn" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("REC-Q1-01")).toBeInTheDocument();
        expect(screen.getByText("REC-TPTD-01")).toBeInTheDocument();
      });

      expect(screen.getByText("Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ")).toBeInTheDocument();
      expect(screen.getByText("Trạm Phân Loại Tái Chế Phước Long B")).toBeInTheDocument();
      expect(screen.getAllByText("Đang hoạt động").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Ngưng hoạt động").length).toBeGreaterThanOrEqual(1);
    });

    it("gọi service tìm kiếm khi nhấn nút Áp dụng trên khối Bộ lọc", async () => {
      const onApply = vi.fn();
      render(
        <FacilityFilterPanel
          districts={mockDistricts}
          onApply={onApply}
          onReset={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText("Nhập mã trạm hoặc tên trạm…");
      fireEvent.change(searchInput, { target: { value: "Nguyễn Huệ" } });

      const applyBtn = screen.getByRole("button", { name: "Áp dụng" });
      fireEvent.click(applyBtn);

      expect(onApply).toHaveBeenCalledWith("Nguyễn Huệ", "ALL", undefined);
    });

    it("hiển thị thống kê và phân trang trên khối Thao tác", () => {
      render(
        <FacilityActionPanel
          total={2}
          activeCount={1}
          inactiveCount={1}
          currentPage={1}
          totalPages={1}
          onPageChange={vi.fn()}
          onAddNew={vi.fn()}
        />
      );

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(
        screen.getByText((_, el) => el?.classList.contains("pagination-info") === true && el.textContent?.includes("Tổng 2 trạm") === true)
      ).toBeInTheDocument();
    });
  });

  describe("4. Màn 2: Thêm mới trạm tái chế", () => {
    it("chuyển sang màn hình thêm mới khi bấm nút Thêm trạm mới", async () => {
      render(
        <RecyclingFacilityContainer
          currentUser={{ role: "ADMIN", email: "admin@ecoreport.gov.vn" }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Thêm trạm mới")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Thêm trạm mới"));

      expect(screen.getByText("THÔNG TIN CHUNG")).toBeInTheDocument();
      expect(screen.getByText("CẤU HÌNH & VỊ TRÍ GIS")).toBeInTheDocument();
      expect(screen.getByText("TỰ ĐỘNG SINH")).toBeInTheDocument();
    });

    it("báo lỗi nếu bỏ trống tên trạm hoặc địa chỉ khi bấm Lưu", async () => {
      const onSave = vi.fn();
      render(
        <FacilityFormView
          mode="create"
          districts={mockDistricts}
          onSaveCreate={onSave}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      const saveBtn = screen.getByRole("button", { name: "Lưu trạm" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText("Vui lòng nhập tên trạm")).toBeInTheDocument();
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it("báo lỗi nếu giờ mở cửa lớn hơn hoặc bằng giờ đóng cửa", async () => {
      const onSave = vi.fn();
      render(
        <FacilityFormView
          mode="create"
          districts={mockDistricts}
          onSaveCreate={onSave}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      // Điền tên và địa chỉ
      fireEvent.change(screen.getByPlaceholderText("VD: Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ"), {
        target: { value: "Trạm Tái Chế Mới" },
      });
      fireEvent.change(screen.getByPlaceholderText(/Số 123 Đường Nguyễn Huệ/), {
        target: { value: "123 Đường Mới, Quận 1" },
      });

      // Nhập giờ không hợp lệ: 18:00 đến 07:00
      const timeInputs = screen.getAllByDisplayValue(/^(07:30|17:00)$/);
      fireEvent.change(timeInputs[0], { target: { value: "18:00" } });
      fireEvent.change(timeInputs[1], { target: { value: "07:00" } });

      const saveBtn = screen.getByRole("button", { name: "Lưu trạm" });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText("Giờ đóng cửa phải sau giờ mở cửa")).toBeInTheDocument();
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe("5. Màn 3: Chỉnh sửa trạm tái chế", () => {
    it("hiển thị mã trạm read-only và cho phép cập nhật", async () => {
      const onUpdate = vi.fn();
      render(
        <FacilityFormView
          mode="edit"
          initialItem={mockFacilities[0]}
          districts={mockDistricts}
          onSaveCreate={vi.fn()}
          onSaveUpdate={onUpdate}
          onCancelRequest={vi.fn()}
        />
      );

      expect(screen.getByText("REC-Q1-01")).toBeInTheDocument();
      expect(screen.getByText("Mã trạm cố định không thể sửa")).toBeInTheDocument();

      // Thay đổi tên trạm
      const nameInput = screen.getByDisplayValue("Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ");
      fireEvent.change(nameInput, { target: { value: "Điểm Tiếp Nhận Nguyễn Huệ (Mới)" } });

      const updateBtn = screen.getByRole("button", { name: "Cập nhật" });
      fireEvent.click(updateBtn);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            name: "Điểm Tiếp Nhận Nguyễn Huệ (Mới)",
          })
        );
      });
    });

    it("hiển thị cảnh báo ẩn khỏi bản đồ khi chuyển sang Tạm ngưng", () => {
      render(
        <FacilityFormView
          mode="edit"
          initialItem={{ ...mockFacilities[0], is_active: false }}
          districts={mockDistricts}
          onSaveCreate={vi.fn()}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      expect(
        screen.getByText("Trạm sẽ bị ẩn khỏi bản đồ và kết quả tra cứu của công dân")
      ).toBeInTheDocument();
    });

    it("hiển thị thông báo xung đột version và nút Tải lại khi gặp lỗi 409", async () => {
      const onReload = vi.fn();
      const mockConflictUpdate = vi.fn().mockRejectedValue({
        response: {
          data: {
            detail: "Trạm đã được thay đổi bởi người khác. Vui lòng tải lại",
          },
        },
      });

      render(
        <FacilityFormView
          mode="edit"
          initialItem={mockFacilities[0]}
          districts={mockDistricts}
          onSaveCreate={vi.fn()}
          onSaveUpdate={mockConflictUpdate}
          onCancelRequest={vi.fn()}
          onReload={onReload}
        />
      );

      // Thay đổi tên để enable nút Cập nhật
      const nameInput = screen.getByDisplayValue("Điểm Tiếp Nhận Rác Tái Chế Nguyễn Huệ");
      fireEvent.change(nameInput, { target: { value: "Tên Trạm Đã Bị Sửa" } });

      const updateBtn = screen.getByRole("button", { name: "Cập nhật" });
      fireEvent.click(updateBtn);

      await waitFor(() => {
        expect(
          screen.getByText("Trạm đã được thay đổi bởi người khác. Vui lòng tải lại")
        ).toBeInTheDocument();
      });

      const reloadBtn = screen.getByRole("button", { name: /Tải lại/i });
      expect(reloadBtn).toBeInTheDocument();
      fireEvent.click(reloadBtn);
      expect(onReload).toHaveBeenCalled();
    });
  });

  describe("6. Màn 4 & 5: Xoá mềm trạm và phản hồi thành công", () => {
    it("hiển thị cảnh báo vô hiệu hoá QR khi mở modal xoá", () => {
      render(
        <FacilityDeleteConfirmModal
          isOpen={true}
          facility={mockFacilities[0]}
          onConfirmDelete={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText("XÁC NHẬN XOÁ")).toBeInTheDocument();
      expect(
        screen.getByText("Trạm sẽ bị gỡ khỏi bản đồ và mã QR sẽ không còn hiệu lực")
      ).toBeInTheDocument();
      expect(screen.getByText("Dữ liệu liên quan sẽ bị ảnh hưởng")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Xoá" })).toBeInTheDocument();
    });

    it("hiển thị modal xoá thành công sau khi hoàn tất", () => {
      render(
        <FacilityDeleteSuccessModal
          isOpen={true}
          facility={mockFacilities[0]}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("ĐÃ XOÁ THÀNH CÔNG")).toBeInTheDocument();
      expect(
        screen.getByText("Danh sách đã được cập nhật")
      ).toBeInTheDocument();
    });
  });
});
