import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FundraiserContainer } from "../FundraiserContainer";

describe("Feature STT 20: Gây quỹ cộng đồng (Fundraiser) (Mock/Stub)", () => {
  it("renders stub container without crashing", () => {
    render(<FundraiserContainer />);
    expect(screen.getByTestId("fundraiser-container")).toBeInTheDocument();
    expect(screen.getByText(/STT 20: Gây quỹ cộng đồng/i)).toBeInTheDocument();
  });
});
