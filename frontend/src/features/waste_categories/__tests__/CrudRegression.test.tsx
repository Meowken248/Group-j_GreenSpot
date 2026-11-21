import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryFormView } from "../components/CategoryFormView";
import * as service from "../services/wasteCategoryService";

vi.mock("../services/wasteCategoryService", () => ({
  checkCategoryCodeUnique: vi.fn(), checkCategoryNameUnique: vi.fn(),
}));

describe("Chống gửi lặp khi kiểm tra danh mục", () => {
  it("hai lần bấm trong lúc kiểm tra bất đồng bộ chỉ lưu một lần", async () => {
    let resolve!: (value: {is_valid: boolean}) => void;
    vi.mocked(service.checkCategoryCodeUnique).mockReturnValue(new Promise(r => { resolve = r; }));
    vi.mocked(service.checkCategoryNameUnique).mockResolvedValue({is_valid: true});
    const save = vi.fn().mockResolvedValue(undefined);
    render(<CategoryFormView mode="create" onSaveCreate={save} onSaveUpdate={vi.fn()} onCancelRequest={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Mã danh mục/), {target: {value: "NHUA"}});
    fireEvent.change(screen.getByLabelText(/Tên loại rác/), {target: {value: "Nhựa"}});
    const button = screen.getByRole("button", {name: "Lưu"});
    fireEvent.click(button);
    fireEvent.click(button);
    expect(service.checkCategoryCodeUnique).toHaveBeenCalledTimes(1);
    resolve({is_valid: true});
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });
});
