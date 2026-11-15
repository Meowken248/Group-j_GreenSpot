import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GlobalSearchBar } from "../GlobalSearchBar";
import * as searchApi from "../../services/searchApi";

vi.mock("../../services/searchApi", () => ({
  getSearchAutocompleteAPI: vi.fn().mockResolvedValue({ suggestions: [] }),
  searchGlobalAPI: vi.fn(),
}));

describe("GlobalSearchBar Component (STT 12 UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input correctly with placeholder and shortcut", () => {
    render(<GlobalSearchBar isDarkMode={false} />);
    const input = screen.getByPlaceholderText(/Tìm kiếm sự cố, SOS, sự kiện/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText("Ctrl K")).toBeInTheDocument();
  });

  it("applies dark-mode class when isDarkMode is true", () => {
    render(<GlobalSearchBar isDarkMode={true} />);
    const container = screen.getByTestId("global-search-container");
    expect(container).toHaveClass("dark-mode");
  });

  it("opens full search dialog on Enter and displays empty state when no results", async () => {
    vi.mocked(searchApi.searchGlobalAPI).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      took_ms: 5,
    });

    render(<GlobalSearchBar isDarkMode={false} />);
    const input = screen.getByPlaceholderText(/Tìm kiếm sự cố, SOS, sự kiện/i);

    fireEvent.change(input, { target: { value: "cây đổ ngập đường" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByText(/Kết quả tìm kiếm toàn hệ thống/i)).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy kết quả nào phù hợp/i)).toBeInTheDocument();
    expect(screen.getByText(/Thử điều chỉnh từ khóa hoặc đổi danh mục lọc/i)).toBeInTheDocument();
    expect(screen.getByText(/Được hỗ trợ bởi Elasticsearch 8.x/i)).toBeInTheDocument();
  });

  it("closes modal dialog when close button is clicked", async () => {
    vi.mocked(searchApi.searchGlobalAPI).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      took_ms: 2,
    });

    render(<GlobalSearchBar isDarkMode={false} />);
    const input = screen.getByPlaceholderText(/Tìm kiếm sự cố, SOS, sự kiện/i);

    fireEvent.change(input, { target: { value: "ngập" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const closeBtn = screen.getByTitle("Đóng hộp thoại");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("triggers full search when clicking search lens button and renders result cards", async () => {
    vi.mocked(searchApi.searchGlobalAPI).mockResolvedValueOnce({
      items: [
        {
          entity_id: "inc-123",
          entity_type: "incident",
          code: "SC-2026-001",
          title: "Bãi rác tự phát đường Lê Lợi",
          description: "Rác thải tồn đọng bốc mùi",
          highlight_title: "Bãi <mark>rác</mark> tự phát đường Lê Lợi",
          highlight_description: "<mark>Rác</mark> thải tồn đọng",
          category: "Sự cố môi trường",
          status: "PENDING",
          priority: "HIGH",
          address: "123 Lê Lợi, Quận 1",
          district: "Quận 1",
          latitude: 10.77,
          longitude: 106.70,
          distance_km: 1.2,
          created_at: "2026-11-14T00:15:22+00:00",
          url_path: "/triage?id=inc-123",
          score: 9.8,
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
      total_pages: 1,
      took_ms: 12,
    });

    render(<GlobalSearchBar isDarkMode={false} />);
    const input = screen.getByPlaceholderText(/Tìm kiếm sự cố, SOS, sự kiện/i);
    fireEvent.change(input, { target: { value: "rác" } });

    const searchBtn = screen.getByTitle("Nhấn để tìm kiếm");
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(screen.getByText(/Tìm thấy 1 kết quả/i)).toBeInTheDocument();
    expect(screen.getByText("SC-2026-001")).toBeInTheDocument();
    expect(screen.getByText("📍 123 Lê Lợi, Quận 1")).toBeInTheDocument();
    expect(screen.getByText(/Cách 1.2 km/i)).toBeInTheDocument();
  });

  it("closes dialog when backdrop is clicked", async () => {
    vi.mocked(searchApi.searchGlobalAPI).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      took_ms: 2,
    });

    render(<GlobalSearchBar isDarkMode={false} />);
    const input = screen.getByPlaceholderText(/Tìm kiếm sự cố, SOS, sự kiện/i);
    fireEvent.change(input, { target: { value: "cây đổ" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const backdrop = document.querySelector(".global-search-backdrop");
    expect(backdrop).toBeInTheDocument();
    if (backdrop) fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
