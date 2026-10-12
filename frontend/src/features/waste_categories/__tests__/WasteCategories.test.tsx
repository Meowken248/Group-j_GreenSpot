import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WasteCategoryContainer } from "../WasteCategoryContainer";
import { CategoryFilterPanel } from "../components/CategoryFilterPanel";
import { CategoryListPanel } from "../components/CategoryListPanel";
import { CategoryActionPanel } from "../components/CategoryActionPanel";
import { CategoryFormView } from "../components/CategoryFormView";
import { CategoryDeleteConfirmModal } from "../components/CategoryDeleteConfirmModal";
import { CategoryDeleteSuccessModal } from "../components/CategoryDeleteSuccessModal";
import * as service from "../services/wasteCategoryService";
import type {
  WasteCategoryItem,
  WasteCategoryListResponse,
} from "../types/wasteCategory.types";

vi.mock("../services/wasteCategoryService", () => ({
  fetchWasteCategories: vi.fn(),
  getWasteCategories: vi.fn(),
  fetchCategoryDetail: vi.fn(),
  createCategory: vi.fn(),
  createWasteCategory: vi.fn(),
  updateCategory: vi.fn(),
  updateWasteCategory: vi.fn(),
  deleteCategory: vi.fn(),
  deleteWasteCategory: vi.fn(),
  checkCategoryCodeUnique: vi.fn(),
  checkCategoryNameUnique: vi.fn(),
}));

const mockCategories: WasteCategoryItem[] = [
  {
    category_id: 1,
    category_code: "RAC_SINH_HOAT",
    name: "Rác sinh hoạt",
    description: "Rác hữu cơ, vô cơ thông thường",
    default_severity: "MEDIUM",
    sla_hours: 24,
    sla_warning_hours: 4,
    is_active: true,
    unresolved_incidents_count: 3,
    created_at: "2026-10-10T10:00:00Z",
  },
  {
    category_id: 2,
    category_code: "RAC_NGUY_HAI",
    name: "Rác nguy hại",
    description: "Pin, hóa chất, thiết bị điện tử",
    default_severity: "CRITICAL",
    sla_hours: 12,
    sla_warning_hours: 2,
    is_active: false,
    unresolved_incidents_count: 0,
    created_at: "2026-10-09T08:00:00Z",
  },
];

const mockListResponse: WasteCategoryListResponse = {
  items: mockCategories,
  total: 2,
  page: 1,
  limit: 10,
  total_pages: 1,
};

describe("Waste Categories & SLA Management (Feature 22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (service.fetchWasteCategories as any).mockResolvedValue(mockListResponse);
    (service.getWasteCategories as any).mockResolvedValue(mockListResponse);
    (service.checkCategoryCodeUnique as any).mockResolvedValue({ is_valid: true });
    (service.checkCategoryNameUnique as any).mockResolvedValue({ is_valid: true });
  });

  describe("1. Access Control & Permission Guard", () => {
    it("denies access when user is not admin", () => {
      render(
        <WasteCategoryContainer
          currentUser={{ role: "CITIZEN", email: "citizen@example.com" }}
        />
      );
      expect(screen.getByText("Truy cập bị từ chối")).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn không có quyền truy cập chức năng này/)
      ).toBeInTheDocument();
    });

    it("allows access when user is ADMIN", async () => {
      render(
        <WasteCategoryContainer
          currentUser={{ role: "ADMIN", email: "admin@ecoreport.gov.vn" }}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText("Quản trị Danh mục Rác thải Đô thị & Cấu hình Quy chuẩn SLA")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("BỘ LỌC")).toBeInTheDocument();
      expect(screen.getByText("DANH SÁCH DANH MỤC RÁC")).toBeInTheDocument();
      expect(screen.getByText("THAO TÁC")).toBeInTheDocument();
    });
  });

  describe("2. List View (Màn 1) Components", () => {
    it("renders table with category details and inactive row opacity", () => {
      render(
        <CategoryListPanel
          categories={mockCategories}
          loading={false}
          error={null}
          hasFilters={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onAddNew={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(screen.getByText("RAC_SINH_HOAT")).toBeInTheDocument();
      expect(screen.getByText("Rác sinh hoạt")).toBeInTheDocument();
      expect(screen.getByText("24 giờ")).toBeInTheDocument();
      expect(screen.getByText("🟡 Trung bình")).toBeInTheDocument();
      expect(screen.getByText(/Đang áp dụng/)).toBeInTheDocument();

      expect(screen.getByText("RAC_NGUY_HAI")).toBeInTheDocument();
      expect(screen.getByText("Rác nguy hại")).toBeInTheDocument();
      expect(screen.getByText("🚨 Khẩn cấp")).toBeInTheDocument();
      expect(screen.getByText(/Ngưng áp dụng/)).toBeInTheDocument();
    });

    it("displays empty state when no categories exist", () => {
      render(
        <CategoryListPanel
          categories={[]}
          loading={false}
          error={null}
          hasFilters={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onAddNew={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(
        screen.getByText("Chưa có danh mục rác thải nào")
      ).toBeInTheDocument();
      expect(screen.getByText("+ Thêm mới")).toBeInTheDocument();
    });

    it("displays filter empty state when searching yields no results", () => {
      render(
        <CategoryListPanel
          categories={[]}
          loading={false}
          error={null}
          hasFilters={true}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onAddNew={vi.fn()}
          onRetry={vi.fn()}
        />
      );

      expect(
        screen.getByText("Không tìm thấy danh mục phù hợp")
      ).toBeInTheDocument();
    });

    it("renders CategoryActionPanel with stats and pagination", () => {
      const onAddNew = vi.fn();
      render(
        <CategoryActionPanel
          total={2}
          activeCount={1}
          inactiveCount={1}
          currentPage={1}
          totalPages={1}
          onPageChange={vi.fn()}
          onAddNew={onAddNew}
        />
      );

      expect(screen.getByText("Thêm mới")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // total
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === "SPAN" &&
            (el?.textContent?.replace(/\s+/g, " ").includes("Trang 1 / 1") ?? false)
        )
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Thêm mới"));
      expect(onAddNew).toHaveBeenCalledTimes(1);
    });

    it("handles CategoryFilterPanel search and status filtering", () => {
      const onApply = vi.fn();
      const onReset = vi.fn();

      render(
        <CategoryFilterPanel
          initialSearch=""
          initialStatus="ALL"
          onApply={onApply}
          onReset={onReset}
        />
      );

      const searchInput = screen.getByPlaceholderText("Nhập mã hoặc tên loại rác...");
      fireEvent.change(searchInput, { target: { value: "RAC_SINH" } });
      fireEvent.click(screen.getByText("Đang áp dụng"));
      fireEvent.click(screen.getByText("Áp dụng"));

      expect(onApply).toHaveBeenCalledWith("RAC_SINH", "ACTIVE");

      fireEvent.click(screen.getByText("Đặt lại"));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Form Create & Validation (Màn 2)", () => {
    it("validates required fields before submitting create form", async () => {
      const onSaveCreate = vi.fn();
      render(
        <CategoryFormView
          mode="create"
          onSaveCreate={onSaveCreate}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      // Click Lưu when fields are empty
      fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

      await waitFor(() => {
        expect(screen.getByText("Vui lòng nhập mã danh mục")).toBeInTheDocument();
      });
      expect(screen.getByText("Vui lòng nhập tên loại rác")).toBeInTheDocument();
      expect(onSaveCreate).not.toHaveBeenCalled();
    });

    it("validates invalid category code format and warning vs SLA constraints", async () => {
      const onSaveCreate = vi.fn();
      render(
        <CategoryFormView
          mode="create"
          onSaveCreate={onSaveCreate}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      // Input lowercase / invalid code
      const codeInput = screen.getByPlaceholderText("VD: DOMESTIC_WASTE");
      fireEvent.change(codeInput, { target: { value: "invalid code!" } });

      const nameInput = screen.getByPlaceholderText("VD: Rác thải sinh hoạt ứ đọng");
      fireEvent.change(nameInput, { target: { value: "Rác tái chế sinh hoạt" } });

      // SLA 10, Warning 12 (Warning >= SLA)
      const slaInput = screen.getByLabelText(/Thời hạn xử lý SLA/i);
      const warnInput = screen.getByLabelText(/Cảnh báo trước hạn/i);
      fireEvent.change(slaInput, { target: { value: "10" } });
      fireEvent.change(warnInput, { target: { value: "12" } });

      fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

      await waitFor(() => {
        expect(
          screen.getByText("Mã chỉ gồm chữ hoa, số, dấu gạch dưới (tối đa 20 ký tự)")
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("Thời gian cảnh báo phải nhỏ hơn thời hạn SLA")
      ).toBeInTheDocument();
      expect(onSaveCreate).not.toHaveBeenCalled();
    });
  });

  describe("4. Form Edit & Inactive Warning (Màn 3)", () => {
    it("locks category code and warns when deactivating a category with unresolved incidents", () => {
      render(
        <CategoryFormView
          mode="edit"
          initialItem={mockCategories[0]} // has 3 unresolved incidents
          onSaveCreate={vi.fn()}
          onSaveUpdate={vi.fn()}
          onCancelRequest={vi.fn()}
        />
      );

      const codeInput = screen.getByDisplayValue("RAC_SINH_HOAT");
      expect(codeInput).toHaveAttribute("readonly");

      // Initially active -> Toggle to inactive
      const toggleCheckbox = screen.getByRole("checkbox");
      expect(toggleCheckbox).toBeChecked();

      fireEvent.click(toggleCheckbox);
      expect(toggleCheckbox).not.toBeChecked();

      // Yellow warning banner should appear
      expect(
        screen.getByText(
          (_, el) =>
            Boolean(el?.classList.contains("callout-text")) &&
            (el?.textContent?.includes("3 phản ánh chưa xử lý") ?? false)
        )
      ).toBeInTheDocument();
    });
  });

  describe("5. Delete Confirmation & Success (Màn 4 & Màn 5)", () => {
    it("displays warning banner when deleting category with unresolved incidents in Màn 4", async () => {
      const onConfirmDelete = vi.fn().mockResolvedValue(undefined);
      render(
        <CategoryDeleteConfirmModal
          isOpen={true}
          category={mockCategories[0]}
          onConfirmDelete={onConfirmDelete}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText("⚠️ XÁC NHẬN XOÁ")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Danh mục đang có 3 phản ánh chưa xử lý\. Không thể khôi phục sau khi xoá!/
        )
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Xoá" }));
      await waitFor(() => {
        expect(onConfirmDelete).toHaveBeenCalledWith(1);
      });
    });

    it("renders Màn 5 success modal with category name and code", () => {
      const onClose = vi.fn();
      render(
        <CategoryDeleteSuccessModal
          isOpen={true}
          category={mockCategories[0]}
          onClose={onClose}
        />
      );

      expect(screen.getByText("ĐÃ XOÁ THÀNH CÔNG")).toBeInTheDocument();
      expect(screen.getByText("Danh sách đã được cập nhật.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
