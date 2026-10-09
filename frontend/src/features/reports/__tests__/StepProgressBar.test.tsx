import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepProgressBar } from "../components/StepProgressBar";

describe("StepProgressBar Component", () => {
  it("hiển thị đầy đủ 5 bước của quy trình", () => {
    render(<StepProgressBar currentStep={1} onNavigateStep={vi.fn()} />);

    expect(screen.getByText("Loại sự cố")).toBeInTheDocument();
    expect(screen.getByText("Ảnh/video")).toBeInTheDocument();
    expect(screen.getByText("Giọng nói")).toBeInTheDocument();
    expect(screen.getByText("Vị trí")).toBeInTheDocument();
    expect(screen.getByText("Xác nhận")).toBeInTheDocument();
  });

  it("chỉ cho phép bấm quay lại các bước đã hoàn thành", () => {
    const handleNav = vi.fn();
    render(<StepProgressBar currentStep={3} onNavigateStep={handleNav} />);

    // Bước 1 và Bước 2 đã hoàn thành -> bấm được
    const step1 = screen.getByText("Loại sự cố").closest(".step-item");
    expect(step1).toHaveClass("clickable");
    if (step1) fireEvent.click(step1);
    expect(handleNav).toHaveBeenCalledWith(1);

    // Bước 4 và 5 chưa làm -> không bấm được
    const step4 = screen.getByText("Vị trí").closest(".step-item");
    expect(step4).toHaveClass("disabled");
  });
});

