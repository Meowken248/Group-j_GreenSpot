import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichMessage } from "../components/RichMessage";

describe("RichMessage - hiển thị câu trả lời AI (Chức năng 24)", () => {
  it("chuyển **in đậm** thành thẻ <strong>, không còn ký tự ** thô", () => {
    const { container } = render(<RichMessage content="**Rác hữu cơ** là rác dễ phân hủy" />);
    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("Rác hữu cơ");
    expect(container.textContent).not.toContain("**");
  });

  it("render gạch đầu dòng (•, -, *) và danh sách đánh số thành từng dòng riêng", () => {
    const { container } = render(
      <RichMessage content={"• Pin cũ\n- Vỏ chai thủy tinh\n* Túi nilon\n1. Bọc kín pin\n2. Mang ra trạm"} />
    );
    expect(container.querySelectorAll(".rich-list-item").length).toBe(5);
    expect(container.textContent).toContain("Pin cũ");
    expect(container.textContent).toContain("Mang ra trạm");
    // Không còn dấu * hoặc - thô ở đầu dòng
    expect(container.textContent).not.toContain("* Túi nilon");
    expect(container.textContent).not.toContain("- Vỏ chai");
  });

  it("render *in nghiêng* và biến dòng trống thành khoảng nghỉ", () => {
    const { container } = render(<RichMessage content={"*Lưu ý:* rửa sạch chai\n\nHết"} />);
    expect(container.querySelector("em")?.textContent).toBe("Lưu ý:");
    expect(container.querySelectorAll(".rich-gap").length).toBe(1);
  });

  it("giữ nguyên nội dung văn bản thuần và các dòng cảnh báo lỗi", () => {
    render(<RichMessage content="Trợ lý phản hồi chậm. Vui lòng thử lại." />);
    expect(screen.getByText("Trợ lý phản hồi chậm. Vui lòng thử lại.")).toBeTruthy();
  });
});
