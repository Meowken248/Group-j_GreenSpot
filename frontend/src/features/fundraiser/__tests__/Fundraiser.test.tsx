import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CampaignListPanel } from "../components/CampaignListPanel";
import { CampaignCreationModal } from "../components/CampaignCreationModal";
import { CampaignDetailModal } from "../components/CampaignDetailModal";
import { DonationModal } from "../components/DonationModal";
import { ExpenseReportView } from "../components/ExpenseReportView";
import { CampaignDeleteModal } from "../components/CampaignDeleteModal";
import { CampaignShareModal } from "../components/CampaignShareModal";
import { FundraiserContainer } from "../FundraiserContainer";
import { AdminFundraiserDashboard } from "../components/AdminFundraiserDashboard";
import { fundraiserService } from "../services/fundraiserService";
import type {
  FundraiserCampaignItem,
  FundraiserDonationItem,
  FundraiserExpenseItem,
} from "../types/fundraiser.types";

vi.mock("../services/fundraiserService", () => ({
  fundraiserService: {
    getCampaigns: vi.fn(),
    listCampaigns: vi.fn(),
    getCampaignDetail: vi.fn(),
    createCampaign: vi.fn(),
    updateCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
    closeCampaign: vi.fn(),
    donate: vi.fn(),
    createDonation: vi.fn(),
    getDonations: vi.fn(),
    listDonations: vi.fn(),
    addExpense: vi.fn(),
    createExpense: vi.fn(),
    getExpenses: vi.fn(),
    listExpenses: vi.fn(),
    reviewCampaign: vi.fn(),
    uploadImage: vi.fn(),
    uploadReceiptImage: vi.fn(),
  },
}));

const mockCampaigns: FundraiserCampaignItem[] = [
  {
    campaign_id: "camp-001",
    creator_id: "user-100",
    creator_name: "Huỳnh Anh Tú",
    creator_avatar: undefined,
    title: "Chung tay làm sạch kênh Nhiêu Lộc - Thị Nghè",
    description: "Chiến dịch nạo vét rác thải và trồng cây ven kênh kênh Nhiêu Lộc.",
    cover_image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09",
    target_amount: 50000000,
    total_donated: 25000000,
    total_spent: 5000000,
    remaining_balance: 20000000,
    donor_count: 12,
    percent_achieved: 50.0,
    days_left: 30,
    start_date: "2026-10-01",
    end_date: "2026-11-30",
    status: "approved",
    district: "Quận 1",
    bank_account_name: "HUYNH ANH TU",
    bank_account_number: "0123456789",
    bank_name: "Vietcombank",
    rejection_reason: undefined,
    created_at: "2026-10-01T08:00:00Z",
    updated_at: "2026-10-01T08:00:00Z",
  },
  {
    campaign_id: "camp-002",
    creator_id: "user-101",
    creator_name: "Nguyễn Văn A",
    creator_avatar: undefined,
    title: "Cây xanh cho trường tiểu học Bình Thạnh",
    description: "Trồng 100 cây xanh che mát khuôn viên trường tiểu học.",
    cover_image_url: undefined,
    target_amount: 10000000,
    total_donated: 10000000,
    total_spent: 0,
    remaining_balance: 10000000,
    donor_count: 5,
    percent_achieved: 100.0,
    days_left: 0,
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "completed",
    district: "Bình Thạnh",
    bank_account_name: undefined,
    bank_account_number: undefined,
    bank_name: undefined,
    rejection_reason: undefined,
    created_at: "2026-09-01T08:00:00Z",
    updated_at: "2026-09-30T08:00:00Z",
  },
  {
    campaign_id: "camp-003",
    creator_id: "user-100",
    creator_name: "Huỳnh Anh Tú",
    title: "Dự án mới chưa có tiền ủng hộ",
    description: "Mô tả dự án mới chưa ai quyên góp.",
    target_amount: 20000000,
    total_donated: 0,
    total_spent: 0,
    remaining_balance: 0,
    donor_count: 0,
    percent_achieved: 0,
    days_left: 45,
    start_date: "2026-10-15",
    end_date: "2026-12-15",
    status: "approved",
    district: "Quận 3",
    created_at: "2026-10-15T08:00:00Z",
    updated_at: "2026-10-15T08:00:00Z",
  },
];

const mockDonations: FundraiserDonationItem[] = [
  {
    donation_id: "don-001",
    campaign_id: "camp-001",
    donor_id: "user-200",
    donor_name: "Lê Văn Hảo",
    amount: 500000,
    message: "Ủng hộ các bạn làm sạch môi trường TP!",
    is_anonymous: false,
    created_at: "2026-10-05T10:00:00Z",
  },
  {
    donation_id: "don-002",
    campaign_id: "camp-001",
    donor_id: null,
    donor_name: "Mạnh thường quân ẩn danh",
    amount: 1000000,
    message: "Chúc dự án thành công tốt đẹp",
    is_anonymous: true,
    created_at: "2026-10-06T14:30:00Z",
  },
];

const mockExpenses: FundraiserExpenseItem[] = [
  {
    expense_id: "exp-001",
    campaign_id: "camp-001",
    amount: 5000000,
    purpose: "Mua bao tay, ủng cao su và túi rác chuyên dụng",
    spent_date: "2026-10-10",
    receipt_image_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c",
    created_at: "2026-10-11T09:00:00Z",
  },
];

describe("Feature 20: Gây quỹ cộng đồng (Fundraiser)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // MÀN 1: TRANG TỔNG HỢP CHIẾN DỊCH
  // ==========================================
  it("Test 1: Render danh sách chiến dịch, hiển thị tiêu đề, quận, mục tiêu và tiến độ", () => {
    render(
      <CampaignListPanel
        campaigns={mockCampaigns}
        total={3}
        currentPage={1}
        pageSize={12}
        isLoading={false}
        error={null}
        statusFilter="all"
        districtFilter=""
        searchQuery=""
        myCampaignsOnly={false}
        isLoggedIn={true}
        onStatusChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onSearchChange={vi.fn()}
        onMyCampaignsToggle={vi.fn()}
        onPageChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onOpenCreateModal={vi.fn()}
        onRetry={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    expect(
      screen.getByText("Chung tay làm sạch kênh Nhiêu Lộc - Thị Nghè")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cây xanh cho trường tiểu học Bình Thạnh")
    ).toBeInTheDocument();
    expect(screen.getByText(/50\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText("📍 Quận 1")).toBeInTheDocument();
  });

  it("Test 2: Hiển thị trạng thái rỗng khi không có chiến dịch nào phù hợp", () => {
    render(
      <CampaignListPanel
        campaigns={[]}
        total={0}
        currentPage={1}
        pageSize={12}
        isLoading={false}
        error={null}
        statusFilter="approved"
        districtFilter="Cần Giờ"
        searchQuery="không có"
        myCampaignsOnly={false}
        isLoggedIn={true}
        onStatusChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onSearchChange={vi.fn()}
        onMyCampaignsToggle={vi.fn()}
        onPageChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onOpenCreateModal={vi.fn()}
        onRetry={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    expect(
      screen.getByText("Không tìm thấy chiến dịch phù hợp")
    ).toBeInTheDocument();
  });

  it("Test 3: Kích hoạt các bộ lọc trạng thái và quận/huyện", () => {
    const onStatusChange = vi.fn();
    const onDistrictChange = vi.fn();

    render(
      <CampaignListPanel
        campaigns={mockCampaigns}
        total={3}
        currentPage={1}
        pageSize={12}
        isLoading={false}
        error={null}
        statusFilter="all"
        districtFilter=""
        searchQuery=""
        myCampaignsOnly={false}
        isLoggedIn={true}
        onStatusChange={onStatusChange}
        onDistrictChange={onDistrictChange}
        onSearchChange={vi.fn()}
        onMyCampaignsToggle={vi.fn()}
        onPageChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onOpenCreateModal={vi.fn()}
        onRetry={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    const statusSelect = screen.getByTestId("select-status-filter");
    fireEvent.change(statusSelect, { target: { value: "approved" } });
    expect(onStatusChange).toHaveBeenCalledWith("approved");

    const districtSelect = screen.getByTestId("select-district-filter");
    fireEvent.change(districtSelect, { target: { value: "Quận 1" } });
    expect(onDistrictChange).toHaveBeenCalledWith("Quận 1");
  });

  it("Test 4: Nhắc nhở đăng nhập khi bấm Tạo chiến dịch mà chưa đăng nhập", () => {
    const onNavigateToLogin = vi.fn();

    render(
      <CampaignListPanel
        campaigns={mockCampaigns}
        total={3}
        currentPage={1}
        pageSize={12}
        isLoading={false}
        error={null}
        statusFilter="all"
        districtFilter=""
        searchQuery=""
        myCampaignsOnly={false}
        isLoggedIn={false}
        onStatusChange={vi.fn()}
        onDistrictChange={vi.fn()}
        onSearchChange={vi.fn()}
        onMyCampaignsToggle={vi.fn()}
        onPageChange={vi.fn()}
        onSelectCampaign={vi.fn()}
        onOpenCreateModal={vi.fn()}
        onRetry={vi.fn()}
        onNavigateToLogin={onNavigateToLogin}
      />
    );

    const createBtn = screen.getByTestId("btn-create-campaign");
    fireEvent.click(createBtn);

    expect(screen.getByTestId("fundraiser-login-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Vui lòng đăng nhập để tạo chiến dịch gây quỹ/i)
    ).toBeInTheDocument();

    const loginPromptBtn = screen.getByTestId("btn-go-to-login");
    fireEvent.click(loginPromptBtn);
    expect(onNavigateToLogin).toHaveBeenCalled();
  });

  // ==========================================
  // MÀN 2: FORM TẠO CHIẾN DỊCH
  // ==========================================
  it("Test 5: Validation tên chiến dịch và mô tả khi submit", async () => {
    render(
      <CampaignCreationModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        pendingCampaignCount={0}
      />
    );

    const submitBtn = screen.getByTestId("btn-submit-create");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Vui lòng nhập tên chiến dịch")).toBeInTheDocument();
      expect(screen.getByText("Vui lòng nhập mô tả chiến dịch")).toBeInTheDocument();
    });
  });

  it("Test 6: Validation mục tiêu tài chính (> 0) và hạn chót (1-90 ngày)", async () => {
    render(
      <CampaignCreationModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        pendingCampaignCount={0}
      />
    );

    const titleInput = screen.getByTestId("input-campaign-title");
    fireEvent.change(titleInput, { target: { value: "Chiến dịch xanh hợp lệ" } });

    const descInput = screen.getByTestId("input-campaign-desc");
    fireEvent.change(descInput, {
      target: {
        value: "Mô tả chi tiết chiến dịch trên 20 ký tự để vượt qua validation cơ bản.",
      },
    });

    const submitBtn = screen.getByTestId("btn-submit-create");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Mục tiêu phải là số lớn hơn 0")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Hạn chót phải từ ngày mai và tối đa 90 ngày")
      ).toBeInTheDocument();
    });
  });

  it("Test 7: Hiển thị cảnh báo bảo mật tài khoản ngân hàng chỉ Admin thấy", () => {
    render(
      <CampaignCreationModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        pendingCampaignCount={0}
      />
    );

    expect(
      screen.getByText(/Chỉ Quản trị viên xem khi duyệt/i)
    ).toBeInTheDocument();
  });

  it("Test 8: Hiển thị modal xác nhận hủy khi form đã nhập liệu (dirty)", () => {
    const onClose = vi.fn();

    render(
      <CampaignCreationModal
        isOpen={true}
        onClose={onClose}
        onSuccess={vi.fn()}
        pendingCampaignCount={0}
      />
    );

    const titleInput = screen.getByTestId("input-campaign-title");
    fireEvent.change(titleInput, { target: { value: "Đang nhập dở..." } });

    const cancelBtn = screen.getByTestId("btn-cancel-create");
    fireEvent.click(cancelBtn);

    expect(screen.getByTestId("discard-confirm-modal")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    const confirmDiscardBtn = screen.getByTestId("btn-discard-exit");
    fireEvent.click(confirmDiscardBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("Test 9: Chặn tạo chiến dịch mới nếu tài khoản đang có 3 chiến dịch chờ duyệt", () => {
    render(
      <CampaignCreationModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        pendingCampaignCount={3}
      />
    );

    expect(screen.getByTestId("banner-pending-limit")).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn đang có 3 chiến dịch chờ duyệt/i)
    ).toBeInTheDocument();
  });

  // ==========================================
  // MÀN 3: CHI TIẾT CHIẾN DỊCH
  // ==========================================
  it("Test 10: Hiển thị Top Box tiến độ, số tiền đã quyên và phần trăm", async () => {
    (fundraiserService.getDonations as any).mockResolvedValue([]);
    (fundraiserService.getExpenses as any).mockResolvedValue([]);

    render(
      <CampaignDetailModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        currentUserId="user-999"
        isAdmin={false}
        isLoggedIn={true}
        onClose={vi.fn()}
        onCampaignUpdated={vi.fn()}
        onCampaignDeleted={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    expect(screen.getByText(/25\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("Test 11: Chuyển đổi giữa các tab Giới thiệu, Người quyên góp, Báo cáo sử dụng", async () => {
    (fundraiserService.getDonations as any).mockResolvedValue(mockDonations);
    (fundraiserService.getExpenses as any).mockResolvedValue(mockExpenses);

    render(
      <CampaignDetailModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        currentUserId="user-999"
        isAdmin={false}
        isLoggedIn={true}
        onClose={vi.fn()}
        onCampaignUpdated={vi.fn()}
        onCampaignDeleted={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    // Tab mặc định là Giới thiệu
    expect(
      screen.getByText(
        "Chiến dịch nạo vét rác thải và trồng cây ven kênh kênh Nhiêu Lộc."
      )
    ).toBeInTheDocument();

    // Chuyển sang tab Người quyên góp
    const donorsTabBtn = screen.getByTestId("tab-btn-donors");
    fireEvent.click(donorsTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Lê Văn Hảo")).toBeInTheDocument();
      expect(screen.getByText("Mạnh thường quân ẩn danh")).toBeInTheDocument();
    });

    // Chuyển sang tab Báo cáo sử dụng
    const expensesTabBtn = screen.getByTestId("tab-btn-expenses");
    fireEvent.click(expensesTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId("expense-report-view")).toBeInTheDocument();
    });
  });

  it("Test 12: Khóa sửa thông tin tài chính khi chiến dịch đã có tiền quyên góp", async () => {
    (fundraiserService.getDonations as any).mockResolvedValue(mockDonations);
    (fundraiserService.getExpenses as any).mockResolvedValue(mockExpenses);

    render(
      <CampaignDetailModal
        isOpen={true}
        campaign={mockCampaigns[0]} // campaign có total_donated = 25.000.000 > 0, creator = user-100
        currentUserId="user-100" // là chủ chiến dịch
        isAdmin={false}
        isLoggedIn={true}
        onClose={vi.fn()}
        onCampaignUpdated={vi.fn()}
        onCampaignDeleted={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    // Mở popup cập nhật mô tả
    const editBtn = screen.getByTestId("btn-edit-campaign");
    fireEvent.click(editBtn);

    expect(screen.getByText("Cập nhật mô tả chiến dịch")).toBeInTheDocument();
    expect(
      screen.getByText(/Chiến dịch đã nhận quyên góp, chỉ có thể bổ sung mô tả/i)
    ).toBeInTheDocument();
  });

  // ==========================================
  // MÀN 4: POPUP QUYÊN GÓP
  // ==========================================
  it("Test 13: Bấm nút gợi ý số tiền nhanh và validate tối thiểu 10.000 VNĐ", async () => {
    (fundraiserService.donate as any).mockResolvedValue(mockDonations[0]);

    render(
      <DonationModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Mặc định chọn 50.000 đ
    expect(screen.getByTestId("btn-preset-50000")).toBeInTheDocument();

    // Nhập số tiền nhỏ hơn 10.000
    const amountInput = screen.getByTestId("input-custom-donation-amount");
    fireEvent.change(amountInput, { target: { value: "5000" } });

    const donateBtn = screen.getByTestId("btn-confirm-donation");
    fireEvent.click(donateBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Số tiền tối thiểu là 10.000 VNĐ")
      ).toBeInTheDocument();
    });
  });

  it("Test 14: Checkbox ẩn danh hiển thị ghi chú ẩn danh", () => {
    render(
      <DonationModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const anonCheckbox = screen.getByTestId("checkbox-anonymous");
    expect(anonCheckbox).not.toBeChecked();

    fireEvent.click(anonCheckbox);
    expect(anonCheckbox).toBeChecked();
    expect(
      screen.getByText(/Mạnh thường quân ẩn danh/i)
    ).toBeInTheDocument();
  });

  // ==========================================
  // MÀN 5: BÁO CÁO SỬ DỤNG QUỸ
  // ==========================================
  it("Test 15: Top Box tài chính và chặn thêm khoản chi vượt quá quỹ", async () => {
    render(
      <ExpenseReportView
        campaign={mockCampaigns[0]} // total_donated = 25M, total_spent = 5M
        expenses={mockExpenses}
        isCreator={true}
        onExpenseAdded={vi.fn()}
      />
    );

    expect(screen.getByTestId("summary-card-donated")).toHaveTextContent(/25\.000\.000/);
    expect(screen.getByTestId("summary-card-spent")).toHaveTextContent(/5\.000\.000/);
    expect(screen.getByTestId("summary-card-balance")).toHaveTextContent(/20\.000\.000/);

    // Bấm Thêm khoản chi mới
    const addExpenseBtn = screen.getByTestId("btn-open-add-expense");
    fireEvent.click(addExpenseBtn);

    // Nhập khoản chi 30.000.000 đ (vượt quá 20.000.000 đ còn lại)
    const amountInput = screen.getByTestId("input-expense-amount");
    fireEvent.change(amountInput, { target: { value: "30000000" } });

    const contentInput = screen.getByTestId("input-expense-content");
    fireEvent.change(contentInput, {
      target: { value: "Chi phí vượt quá quỹ" },
    });

    // Submit khoản chi
    const submitExpenseBtn = screen.getByText("Lưu khoản chi");
    fireEvent.click(submitExpenseBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Vui lòng nhập nội dung, số tiền và ảnh minh chứng|Tổng chi không được vượt số tiền đã quyên/i)
      ).toBeInTheDocument();
    });
  });

  it("Test 16: Cảnh báo sau 30 ngày chiến dịch kết thúc chưa có báo cáo chi tiêu", () => {
    const expiredCampaign: FundraiserCampaignItem = {
      ...mockCampaigns[0],
      end_date: "2026-08-01", // Đã kết thúc hơn 30 ngày
      status: "closed",
    };

    render(
      <ExpenseReportView
        campaign={expiredCampaign}
        expenses={[]} // Chưa có khoản chi nào
        isCreator={true}
        onExpenseAdded={vi.fn()}
      />
    );

    expect(screen.getByTestId("banner-warning-30-days")).toBeInTheDocument();
    expect(
      screen.getByText(/Người tạo chưa cập nhật báo cáo sử dụng quỹ/i)
    ).toBeInTheDocument();
  });

  // ==========================================
  // MÀN 6: XÓA / KẾT THÚC SỚM & ADMIN REVIEW
  // ==========================================
  it("Test 17: Cho phép xóa khi total_donated = 0, cấm xóa và chuyển thành Kết thúc sớm khi total_donated > 0", () => {
    // Trường hợp 1: total_donated = 0 -> Có thể xóa
    const { unmount } = render(
      <CampaignDeleteModal
        isOpen={true}
        campaign={mockCampaigns[2]} // total_donated = 0
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onClosedEarly={vi.fn()}
      />
    );

    expect(screen.getByText("XOÁ CHIẾN DỊCH?")).toBeInTheDocument();
    expect(screen.getByTestId("btn-confirm-delete")).toBeInTheDocument();

    unmount();

    // Trường hợp 2: total_donated > 0 -> Cấm xóa, đổi thành Kết thúc sớm
    render(
      <CampaignDeleteModal
        isOpen={true}
        campaign={mockCampaigns[0]} // total_donated = 25M
        onClose={vi.fn()}
        onDeleted={vi.fn()}
        onClosedEarly={vi.fn()}
      />
    );

    expect(screen.getByText("KẾT THÚC SỚM CHIẾN DỊCH")).toBeInTheDocument();
    expect(
      screen.getByText(/Chiến dịch đã nhận quyên góp nên không thể xoá/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("btn-confirm-close-early")).toBeInTheDocument();
  });

  it("Test 18: Admin phê duyệt hoặc từ chối chiến dịch kèm lý do", async () => {
    (fundraiserService.getDonations as any).mockResolvedValue([]);
    (fundraiserService.getExpenses as any).mockResolvedValue([]);
    (fundraiserService.reviewCampaign as any).mockResolvedValue({
      ...mockCampaigns[0],
      status: "rejected",
      rejection_reason: "Thiếu chứng từ kế hoạch chi tiết",
    });

    render(
      <CampaignDetailModal
        isOpen={true}
        campaign={{ ...mockCampaigns[0], status: "pending" }}
        currentUserId="admin-1"
        isAdmin={true}
        isLoggedIn={true}
        onClose={vi.fn()}
        onCampaignUpdated={vi.fn()}
        onCampaignDeleted={vi.fn()}
        onNavigateToLogin={vi.fn()}
      />
    );

    // Admin nhìn thấy nút Kiểm duyệt
    const reviewBtn = screen.getByTestId("btn-admin-review");
    fireEvent.click(reviewBtn);

    expect(screen.getByText("Kiểm duyệt chiến dịch")).toBeInTheDocument();

    // Chọn Từ chối
    const rejectRadio = screen.getByTestId("radio-reject");
    fireEvent.click(rejectRadio);

    const reasonInput = screen.getByTestId("textarea-rejection-reason");
    fireEvent.change(reasonInput, {
      target: { value: "Thiếu chứng từ kế hoạch chi tiết" },
    });

    const submitReviewBtn = screen.getByTestId("btn-submit-review");
    fireEvent.click(submitReviewBtn);

    await waitFor(() => {
      expect(fundraiserService.reviewCampaign).toHaveBeenCalledWith(
        "camp-001",
        "reject",
        "Thiếu chứng từ kế hoạch chi tiết"
      );
    });
  });

  // ==========================================
  // NÂNG CẤP MỚI: ADMIN DASHBOARD, VIETQR & CSS MXH
  // ==========================================
  it("Test 19: DonationModal hiển thị khối VietQR Napas247 và thông tin ngân hàng", () => {
    render(
      <DonationModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByTestId("vietqr-payment-card")).toBeInTheDocument();
    expect(screen.getByText(/NAPAS 24\/7 • VIETQR/i)).toBeInTheDocument();
    expect(screen.getByText(/HUYNH ANH TU/i)).toBeInTheDocument();
    expect(screen.getByText(/0123456789/i)).toBeInTheDocument();
    expect(screen.getByText(/Cam kết bảo trợ tài chính GreenSpot/i)).toBeInTheDocument();
  });

  it("Test 20: CampaignShareModal có footer nút chia sẻ chuẩn MXH", () => {
    render(
      <CampaignShareModal
        isOpen={true}
        campaign={mockCampaigns[0]}
        onClose={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    expect(screen.getByTestId("btn-close-share")).toBeInTheDocument();
    expect(screen.getByTestId("btn-confirm-share")).toBeInTheDocument();
    expect(screen.getByText("Chia sẻ ngay")).toBeInTheDocument();
  });

  it("Test 21: FundraiserContainer hiển thị thanh chuyển đổi chế độ Quản trị khi người dùng là Admin", async () => {
    (fundraiserService.listCampaigns as any).mockResolvedValue({
      items: mockCampaigns,
      total: mockCampaigns.length,
      page: 1,
      page_size: 12,
    });

    render(
      <FundraiserContainer
        currentUser={{ id: "admin-1", role: "ADMIN", username: "admin" }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("admin-mode-switch-bar")).toBeInTheDocument();
      expect(screen.getByTestId("btn-mode-admin")).toBeInTheDocument();
      expect(screen.getByTestId("btn-mode-public")).toBeInTheDocument();
    });

    // Bấm chuyển sang tab Admin
    fireEvent.click(screen.getByTestId("btn-mode-admin"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-fundraiser-dashboard")).toBeInTheDocument();
    });
  });

  it("Test 22: AdminFundraiserDashboard hiển thị bảng quản trị và duyệt chiến dịch", async () => {
    (fundraiserService.listCampaigns as any).mockResolvedValue({
      items: mockCampaigns,
      total: mockCampaigns.length,
      page: 1,
      page_size: 50,
    });

    render(
      <AdminFundraiserDashboard
        onSelectCampaign={vi.fn()}
        onRefreshList={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Bảng Quản Trị Quỹ Môi Trường GreenSpot")).toBeInTheDocument();
      expect(screen.getByText("Tổng quỹ đã huy động")).toBeInTheDocument();
      expect(screen.getByText("Tổng ngân sách đã giải ngân")).toBeInTheDocument();
      expect(screen.getByText("Chiến dịch đang hoạt động")).toBeInTheDocument();
      expect(screen.getByText("Chiến dịch chờ duyệt gấp")).toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-campaigns-table")).toBeInTheDocument();
  });
});
