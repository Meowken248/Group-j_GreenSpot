import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DonationModal } from "../components/DonationModal";
import { PendingDonations } from "../components/PendingDonations";
import { ExpenseReportView } from "../components/ExpenseReportView";
import { fundraiserService } from "../services/fundraiserService";
import type { FundraiserCampaignItem } from "../types/fundraiser.types";
import imagePlaceholder from "../../../assets/image-unavailable.svg";

vi.mock("../services/fundraiserService", () => ({ fundraiserService: {
  getPaymentDetails: vi.fn(), donate: vi.fn(), getPendingDonations: vi.fn(), confirmDonation: vi.fn(),
}}));
const campaign = { campaign_id: "campaign", title: "Quỹ xanh" } as FundraiserCampaignItem;
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

describe("Đối soát và gửi lặp quyên góp", () => {
  it("hiển thị ảnh thay thế khi chứng từ gốc bị mất", () => {
    const {container} = render(<ExpenseReportView campaign={{...campaign, total_donated:100000}} expenses={[
      {expense_id:"expense", content:"Mua cây", amount:10000, expense_date:"2026-11-01", proof_image_url:"/uploads/missing.jpg"} as never,
    ]} isCreator={false} onExpenseAdded={vi.fn()} />);
    fireEvent.click(screen.getByTestId("btn-view-proof-expense"));
    const img = container.querySelector("[data-testid='proof-lightbox'] img")!;
    fireEvent.error(img);
    expect(img.src).toBe(new URL(imagePlaceholder, window.location.href).href);
    const fallback = img.src;
    fireEvent.error(img);
    expect(img.src).toBe(fallback);
  });

  it("không hiển thị tài khoản tự đặt khi không tải được thông tin", async () => {
    vi.mocked(fundraiserService.getPaymentDetails).mockRejectedValue(new Error("offline"));
    const onClose = vi.fn();
    render(<DonationModal isOpen campaign={campaign} onClose={onClose} onSuccess={vi.fn()} />);
    await screen.findByTestId("donation-error-banner");
    expect(screen.queryByTestId("vietqr-payment-card")).toBeNull();
    expect(screen.getByTestId("btn-confirm-donation")).toBeDisabled();
    fireEvent.click(screen.getByTestId("btn-close-donation-modal"));
    expect(onClose).toHaveBeenCalledOnce();
    expect(fundraiserService.donate).not.toHaveBeenCalled();
  });

  it("giữ mã giao dịch khi thử lại và chặn hai lần submit đang chạy", async () => {
    vi.mocked(fundraiserService.getPaymentDetails).mockResolvedValue({bank_name:"Sacombank", bank_account_name:"NGUOI NHAN", bank_account_number:"123456"});
    vi.mocked(fundraiserService.donate).mockRejectedValueOnce(new Error("response lost"));
    render(<DonationModal isOpen campaign={campaign} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await screen.findByTestId("vietqr-payment-card");
    expect(screen.getByAltText("Mã VietQR thanh toán tự động").getAttribute("src")).toContain("STB-123456");
    fireEvent.submit(screen.getByTestId("donation-form"));
    await waitFor(() => expect(fundraiserService.donate).toHaveBeenCalledTimes(1));
    await screen.findByTestId("donation-error-banner");
    const reference = vi.mocked(fundraiserService.donate).mock.calls[0][1].client_reference;
    expect(screen.getByText(`DON-${reference.replace(/-/g, "")}`)).toBeInTheDocument();
    vi.mocked(fundraiserService.donate).mockImplementation(() => new Promise(() => {}));
    fireEvent.submit(screen.getByTestId("donation-form"));
    fireEvent.submit(screen.getByTestId("donation-form"));
    expect(fundraiserService.donate).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fundraiserService.donate).mock.calls[1][1].client_reference).toBe(reference);
  });

  it("không xác nhận tiền nếu quản trị viên hủy bước đối soát", async () => {
    vi.mocked(fundraiserService.getPendingDonations).mockResolvedValue([{donation_id:"d", donor_name:"A", amount:50000, transaction_code:"DON-abc"} as never]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<PendingDonations campaignId="campaign" onConfirmed={vi.fn()} />);
    fireEvent.click(await screen.findByText("Xác nhận đã nhận tiền"));
    expect(confirm).toHaveBeenCalled();
    expect(fundraiserService.confirmDonation).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
