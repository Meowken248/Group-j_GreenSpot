import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WasteCategoryContainer } from "../WasteCategoryContainer";

describe("Feature STT 22: Danh mục Rác thải & SLA (Mock/Stub)", () => {
  it("renders stub container without crashing", () => {
    render(<WasteCategoryContainer />);
    expect(screen.getByTestId("waste-categories-container")).toBeInTheDocument();
    expect(screen.getByText(/STT 22: Quản trị Danh mục Rác thải & SLA/i)).toBeInTheDocument();
  });
});
