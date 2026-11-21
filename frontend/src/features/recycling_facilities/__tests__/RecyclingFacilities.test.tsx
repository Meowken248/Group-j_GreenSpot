import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RecyclingFacilityContainer } from "../RecyclingFacilityContainer";

describe("Feature STT 23: Trạm Tái chế & Điểm Tiếp nhận (Mock/Stub)", () => {
  it("renders stub container without crashing", () => {
    render(<RecyclingFacilityContainer />);
    expect(screen.getByTestId("recycling-facility-container")).toBeInTheDocument();
    expect(screen.getByText(/STT 23: Quản trị Mạng lưới Trạm Tái chế/i)).toBeInTheDocument();
  });
});
