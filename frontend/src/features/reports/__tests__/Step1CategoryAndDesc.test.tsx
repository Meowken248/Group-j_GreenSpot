import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Step1CategoryAndDesc } from "../components/Step1CategoryAndDesc";
import { INITIAL_FORM_DATA } from "../types/report.types";

const mockCategories = [
  {
    category_id: 1,
    category_code: "DOMESTIC_WASTE",
    name: "Rác thải sinh hoạt ứ đọng",
    sla_hours: 24,
    color_hex: "#EAB308",
    icon_name: "trash",
    is_active: true,
    default_severity: "MEDIUM",
  },
  {
    category_id: 2,
    category_code: "DRAINAGE_BLOCK",
    name: "Điểm nghẽn cống ngập úng",
    sla_hours: 18,
    color_hex: "#06B6D4",
    icon_name: "cloud-rain",
    is_active: true,
    default_severity: "HIGH",
  },
];

describe("Step1CategoryAndDesc Component", () => {
  it("hiển thị 4 thẻ lớn loại sự cố: Rác thải, Ngập úng, Ô nhiễm, Khác", () => {
    render(
      <Step1CategoryAndDesc
        formData={INITIAL_FORM_DATA}
        categories={mockCategories}
        onUpdateFormData={vi.fn()}
        onNextStep={vi.fn()}
        onSaveDraft={vi.fn()}
      />
    );

    expect(screen.getByText("Rác thải")).toBeInTheDocument();
    expect(screen.getByText("Ngập úng")).toBeInTheDocument();
    expect(screen.getByText("Ô nhiễm")).toBeInTheDocument();
    expect(screen.getByText("Khác")).toBeInTheDocument();
  });

  it("chọn loại sự cố cập nhật formData", () => {
    const handleUpdate = vi.fn();
    render(
      <Step1CategoryAndDesc
        formData={INITIAL_FORM_DATA}
        categories={mockCategories}
        onUpdateFormData={handleUpdate}
        onNextStep={vi.fn()}
        onSaveDraft={vi.fn()}
      />
    );

    const wasteCard = screen.getByText("Rác thải");
    fireEvent.click(wasteCard);

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        category_name: "Rác thải",
      })
    );
  });

  it("nút Lưu nháp kích hoạt onSaveDraft", () => {
    const handleSaveDraft = vi.fn();
    render(
      <Step1CategoryAndDesc
        formData={INITIAL_FORM_DATA}
        categories={mockCategories}
        onUpdateFormData={vi.fn()}
        onNextStep={vi.fn()}
        onSaveDraft={handleSaveDraft}
      />
    );

    const saveDraftBtn = screen.getByText(/Lưu nháp/i);
    fireEvent.click(saveDraftBtn);

    expect(handleSaveDraft).toHaveBeenCalledTimes(1);
  });

  it("nút Tiếp tục bị làm mờ khi chưa chọn loại hoặc chưa nhập tiêu đề", () => {
    render(
      <Step1CategoryAndDesc
        formData={INITIAL_FORM_DATA}
        categories={mockCategories}
        onUpdateFormData={vi.fn()}
        onNextStep={vi.fn()}
        onSaveDraft={vi.fn()}
      />
    );

    const continueBtn = screen.getByText(/Tiếp tục/i);
    expect(continueBtn).toBeDisabled();
  });
});

