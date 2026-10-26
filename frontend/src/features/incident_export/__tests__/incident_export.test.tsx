import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { IncidentExportContainer } from "../pages/IncidentExportContainer";
import { ExportSuccessModal } from "../components/ExportSuccessModal";
import { ExportEmptyWarningModal } from "../components/ExportEmptyWarningModal";
import { incidentExportApi } from "../services/incidentExportApi";
import type {
  ExportCreatedResponse,
  ExportMetadataOptionsResponse,
  IncidentPreviewResponse,
} from "../types/incident_export.types";

// Giả lập API Service
vi.mock("../services/incidentExportApi", () => ({
  incidentExportApi: {
    getFilterOptions: vi.fn(),
    previewIncidents: vi.fn(),
    generateExport: vi.fn(),
    checkExportStatus: vi.fn(),
    getDownloadUrl: vi.fn((id: string) => `/api/v1/incidents/export/${id}/download`),
  },
}));

const mockFilterOptions: ExportMetadataOptionsResponse = {
  districts: ["Tất cả", "Quận Bình Tân", "Quận 6", "TP. Thủ Đức"],
  categories: ["Tất cả", "Rác thải tự phát", "Ngập úng đô thị"],
  statuses: [
    { value: "Tất cả", label: "Tất cả" },
    { value: "Chờ tiếp nhận", label: "Chờ tiếp nhận" },
    { value: "Đang xử lý", label: "Đang xử lý" },
    { value: "Đã hoàn tất", label: "Đã hoàn tất" },
    { value: "Đã đóng", label: "Đã đóng" },
  ],
  quick_ranges: [
    { value: "TODAY", label: "Hôm nay" },
    { value: "THIS_WEEK", label: "Tuần này" },
    { value: "THIS_MONTH", label: "Tháng này" },
    { value: "THIS_QUARTER", label: "Quý này" },
  ],
};

const mockPreviewSuccess: IncidentPreviewResponse = {
  success: true,
  message: "Tìm thấy 2 bản ghi sự cố phù hợp với bộ lọc.",
  total_records: 2,
  page: 1,
  page_size: 10,
  total_pages: 1,
  is_empty: false,
  items: [
    {
      incident_id: "inc-1",
      tracking_code: "SC-2026-081",
      category_name: "Rác thải tự phát",
      district_name: "Quận Bình Tân",
      status: "Đang xử lý",
      status_code: "IN_PROGRESS",
      title: "Bãi rác tự phát lớn",
      address_text: "123 Đường Số 7, Bình Tân",
      created_at: "26/10/2026 14:30",
    },
    {
      incident_id: "inc-2",
      tracking_code: "SC-2026-082",
      category_name: "Ngập úng đô thị",
      district_name: "Quận 6",
      status: "Đã hoàn tất",
      status_code: "RESOLVED",
      title: "Ngập sâu ngã tư Hậu Giang",
      address_text: "456 Đường Hậu Giang, Quận 6",
      created_at: "26/10/2026 15:10",
    },
  ],
};

const mockPreviewEmpty: IncidentPreviewResponse = {
  success: true,
  message: "Không có dữ liệu sự cố nào phù hợp để xuất báo cáo.",
  total_records: 0,
  page: 1,
  page_size: 10,
  total_pages: 0,
  is_empty: true,
  items: [],
};

const mockExportCreatedExcel: ExportCreatedResponse = {
  success: true,
  export_id: "test-uuid-1234",
  file_name: "BaoCao_SuCo_20261026_143000.xlsx",
  file_type: "EXCEL",
  file_size_formatted: "1.4 MB",
  file_size_bytes: 1468006,
  expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  is_expired: false,
  download_url: "/api/v1/incidents/export/test-uuid-1234/download",
  message: "ĐÃ TẠO TỆP. Tệp sẵn sàng tải về.",
};

describe("STT 47: Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(incidentExportApi.getFilterOptions).mockResolvedValue(mockFilterOptions);
    vi.mocked(incidentExportApi.previewIncidents).mockResolvedValue(mockPreviewSuccess);
    vi.mocked(incidentExportApi.generateExport).mockResolvedValue(mockExportCreatedExcel);
  });

  // ===========================================================================
  // 1. MÀN 1/4: GIAO DIỆN QUẢN LÝ VÀ TRÍCH XUẤT DỮ LIỆU (3 CỘT)
  // ===========================================================================
  it("Màn 1/4: Render đầy đủ Header, Footer và 3 khối làm việc chuẩn", async () => {
    render(<IncidentExportContainer />);

    // Kiểm tra Header
    expect(screen.getByTestId("export-header")).toBeInTheDocument();
    expect(screen.getByText("HỆ THỐNG GIÁM SÁT MÔI TRƯỜNG GREENSPOT")).toBeInTheDocument();

    // Kiểm tra 3 Khối
    expect(screen.getByTestId("col-filter-card")).toBeInTheDocument();
    expect(screen.getByTestId("col-list-card")).toBeInTheDocument();
    expect(screen.getByTestId("col-action-card")).toBeInTheDocument();

    // Kiểm tra Cột 1 BỘ LỌC
    expect(screen.getByTestId("select-district")).toBeInTheDocument();
    expect(screen.getByTestId("select-category")).toBeInTheDocument();
    expect(screen.getByTestId("select-status")).toBeInTheDocument();
    expect(screen.getByTestId("btn-apply-filter")).toBeInTheDocument();

    // Kiểm tra Cột 2 BẢNG DANH SÁCH XEM TRƯỚC
    await waitFor(() => {
      expect(screen.getByTestId("row-SC-2026-081")).toBeInTheDocument();
      expect(screen.getByTestId("row-SC-2026-082")).toBeInTheDocument();
      expect(screen.getByTestId("result-summary-message")).toHaveTextContent(
        "Tìm thấy 2 bản ghi sự cố phù hợp với bộ lọc."
      );
    });

    // Kiểm tra Cột 3 THAO TÁC
    expect(screen.getByTestId("btn-export-trigger")).toBeInTheDocument();

    // Kiểm tra Footer
    expect(screen.getByTestId("export-footer")).toBeInTheDocument();
  });

  it("Màn 1/4: Hiển thị banner cảnh báo đỏ khi xảy ra lỗi truy vấn CSDL", async () => {
    vi.mocked(incidentExportApi.previewIncidents).mockRejectedValueOnce(new Error("Database error"));

    render(<IncidentExportContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("error-banner-alert")).toBeInTheDocument();
      expect(screen.getByTestId("error-banner-alert")).toHaveTextContent(
        "Lỗi truy vấn danh sách sự cố. Vui lòng thử lại sau ít phút."
      );
    });
  });

  // ===========================================================================
  // 2. MÀN 2/4: MODAL POPUP 'XUẤT DANH SÁCH' (TÙY CHỌN ĐỊNH DẠNG EXCEL/PDF)
  // ===========================================================================
  it("Màn 2/4: Bấm 'Xuất danh sách' khi có dữ liệu -> Mở popup chọn định dạng (Excel mặc định)", async () => {
    render(<IncidentExportContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("row-SC-2026-081")).toBeInTheDocument();
    });

    const exportBtn = screen.getByTestId("btn-export-trigger");
    fireEvent.click(exportBtn);

    // Kiểm tra popup Màn 2/4 hiển thị
    expect(screen.getByTestId("export-format-modal")).toBeInTheDocument();
    expect(screen.getByText("POPUP")).toBeInTheDocument();
    expect(screen.getByText("XUẤT DANH SÁCH")).toBeInTheDocument();

    // Định dạng Excel (.xlsx) được chọn mặc định
    const excelRadio = screen.getByLabelText(/Microsoft Excel/i);
    expect(excelRadio).toBeChecked();

    // Dòng xác nhận theo bộ lọc hiện tại
    expect(screen.getByTestId("filter-inherit-badge")).toHaveTextContent("Theo bộ lọc hiện tại");
  });

  it("Màn 2/4: Chọn định dạng PDF và bấm Xuất -> Hiển thị spinner và gọi API tạo tệp", async () => {
    render(<IncidentExportContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("row-SC-2026-081")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-export-trigger"));

    // Chọn PDF
    const pdfRadio = screen.getByLabelText(/Adobe PDF/i);
    fireEvent.click(pdfRadio);
    expect(pdfRadio).toBeChecked();

    // Bấm nút "Xuất"
    const submitBtn = screen.getByTestId("btn-format-submit");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(incidentExportApi.generateExport).toHaveBeenCalledWith(
        expect.objectContaining({
          export_format: "PDF",
        })
      );
    });
  });

  it("Màn 2/4: Bấm nút 'Huỷ' đóng popup an toàn quay về Màn 1/4", async () => {
    render(<IncidentExportContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("row-SC-2026-081")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-export-trigger"));
    expect(screen.getByTestId("export-format-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("btn-format-cancel"));
    expect(screen.queryByTestId("export-format-modal")).not.toBeInTheDocument();
  });

  // ===========================================================================
  // 3. MÀN 3/4: MODAL POPUP 'ĐÃ TẠO TỆP' (DOWNLOAD VÀ BẢO MẬT HẾT HẠN 15 PHÚT)
  // ===========================================================================
  it("Màn 3/4: Hiển thị tệp sẵn sàng tải về kèm thông tin tên tệp và dung lượng", async () => {
    const handleClose = vi.fn();
    render(
      <ExportSuccessModal
        isOpen={true}
        onClose={handleClose}
        exportResult={mockExportCreatedExcel}
      />
    );

    expect(screen.getByTestId("export-success-modal")).toBeInTheDocument();
    expect(screen.getByText("ĐÃ TẠO TỆP")).toBeInTheDocument();
    expect(screen.getByText("Tệp sẵn sàng tải về")).toBeInTheDocument();
    expect(screen.getByTestId("file-info-chip")).toHaveTextContent(
      "BaoCao_SuCo_20261026_143000.xlsx — 1.4 MB"
    );

    // Bấm nút Tải xuống
    const downloadBtn = screen.getByTestId("btn-download-file");
    expect(downloadBtn).not.toBeDisabled();
    fireEvent.click(downloadBtn);

    expect(screen.getByTestId("download-toast")).toHaveTextContent(
      "Đang bắt đầu tải tệp BaoCao_SuCo_20261026_143000.xlsx về máy tính của bạn..."
    );
  });

  it("Màn 3/4: Safeguard 15 phút - Cảnh báo vàng và vô hiệu hóa nút tải khi hết hạn", () => {
    const expiredResult: ExportCreatedResponse = {
      ...mockExportCreatedExcel,
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(), // Đã hết hạn trong quá khứ
      is_expired: true,
    };

    render(
      <ExportSuccessModal
        isOpen={true}
        onClose={() => {}}
        exportResult={expiredResult}
      />
    );

    expect(screen.getByTestId("expired-warning-alert")).toBeInTheDocument();
    expect(screen.getByTestId("expired-warning-alert")).toHaveTextContent(
      "Liên kết tải tệp đã hết hạn do chính sách bảo mật. Vui lòng xuất lại tệp."
    );

    const downloadBtn = screen.getByTestId("btn-download-file");
    expect(downloadBtn).toBeDisabled();
  });

  // ===========================================================================
  // 4. MÀN 4/4: MODAL POPUP 'KHÔNG CÓ DỮ LIỆU' (EMPTY STATE WARNING & AUTO FOCUS)
  // ===========================================================================
  it("Màn 4/4: Bấm xuất khi danh sách rỗng (0 bản ghi) -> Mở trực tiếp popup Không có dữ liệu", async () => {
    vi.mocked(incidentExportApi.previewIncidents).mockResolvedValueOnce(mockPreviewEmpty);

    render(<IncidentExportContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-table-state")).toBeInTheDocument();
      expect(screen.getByTestId("result-summary-message")).toHaveTextContent(
        "Không có dữ liệu sự cố nào phù hợp để xuất báo cáo."
      );
    });

    const exportBtn = screen.getByTestId("btn-export-trigger");
    fireEvent.click(exportBtn);

    // Mở trực tiếp Modal Màn 4/4
    expect(screen.getByTestId("export-empty-modal")).toBeInTheDocument();
    expect(screen.getByText("KHÔNG CÓ DỮ LIỆU")).toBeInTheDocument();
    expect(screen.getByTestId("empty-guide-text")).toHaveTextContent("Hãy đổi bộ lọc");
  });

  it("Màn 4/4: Hiển thị cảnh báo đỏ khi khoảng ngày không hợp lệ (Bắt đầu > Kết thúc)", async () => {
    const invalidDateResponse: IncidentPreviewResponse = {
      ...mockPreviewEmpty,
      date_range_invalid: true,
      message: "Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại.",
    };
    vi.mocked(incidentExportApi.previewIncidents).mockResolvedValueOnce(invalidDateResponse);

    render(<IncidentExportContainer />);

    // Thiết lập ngày bắt đầu > ngày kết thúc
    const fromInput = screen.getByTestId("input-from-date");
    const toInput = screen.getByTestId("input-to-date");
    fireEvent.change(fromInput, { target: { value: "2026-10-30" } });
    fireEvent.change(toInput, { target: { value: "2026-10-20" } });

    fireEvent.click(screen.getByTestId("btn-apply-filter"));

    await waitFor(() => {
      expect(screen.getByTestId("empty-table-state")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-export-trigger"));

    expect(screen.getByTestId("export-empty-modal")).toBeInTheDocument();
    expect(screen.getByTestId("date-invalid-alert")).toBeInTheDocument();
    expect(screen.getByTestId("date-invalid-alert")).toHaveTextContent(
      "Khoảng ngày không hợp lệ dẫn đến không có dữ liệu. Vui lòng kiểm tra lại."
    );
  });

  it("Màn 4/4: Bấm 'Đóng' popup sẽ tự động focus con trỏ vào ô bộ lọc", async () => {
    const handleClose = vi.fn();
    const handleFocus = vi.fn();

    render(
      <ExportEmptyWarningModal
        isOpen={true}
        onClose={handleClose}
        dateRangeInvalid={false}
        onFocusFilterField={handleFocus}
      />
    );

    const closeBtn = screen.getByTestId("btn-empty-close");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
    expect(handleFocus).toHaveBeenCalledWith("district");
  });
});
