import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HotspotContainer } from "../pages/HotspotContainer";

describe("Feature STT 44: Phân tích điểm nóng & Dự báo 7 ngày (Mock/Stub)", () => {
  it("renders stub container without crashing", () => {
    render(<HotspotContainer />);
    expect(screen.getByTestId("hotspot-container")).toBeInTheDocument();
    expect(screen.getByText(/STT 44: Phân tích điểm nóng/i)).toBeInTheDocument();
  });
});
