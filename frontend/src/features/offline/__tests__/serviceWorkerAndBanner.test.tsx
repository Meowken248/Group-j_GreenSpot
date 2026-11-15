import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { SyncResultModal } from "../components/SyncResultModal";
import { registerOfflineServiceWorker } from "../services/serviceWorkerRegistration";
import type { SyncResultSummary } from "../types/offline.types";

describe("Offline UI Components & Service Worker Tests (R01, R02, R20, R21, R22)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("1. ConnectionBanner (R01 & R02)", () => {
    it("hiển thị thanh màu vàng khi offline (R01)", () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });

      render(<ConnectionBanner pendingCount={2} onOpenOutbox={vi.fn()} />);

      const banner = screen.getByRole("status");
      expect(banner).toBeDefined();
      expect(banner.className).toContain("banner-offline");
      expect(screen.getByText(/Mất kết nối mạng/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Hàng đợi \(2\)/i })).toBeDefined();
    });

    it("hiển thị thanh màu xanh khi có mạng lại và tự ẩn sau 3 giây (R02)", () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });

      render(<ConnectionBanner pendingCount={0} />);

      // Giả lập sự kiện online
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      const onlineBanner = screen.getByRole("status");
      expect(onlineBanner.className).toContain("banner-online");
      expect(screen.getByText(/Đã kết nối lại/i)).toBeDefined();

      // Sau 3 giây tự động ẩn
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  describe("2. SyncResultModal (R20, R21, R22)", () => {
    it("hiển thị popup thành công toàn bộ, tối đa 3 mã sự cố và đếm ngược 5 giây (R20)", () => {
      const handleClose = vi.fn();
      const mockResult: SyncResultSummary = {
        total: 4,
        success_count: 4,
        failed_count: 0,
        successful_incidents: [
          { code: "#INC-20261102-00001", incident_id: "inc_1", title: "Sự cố 1" },
          { code: "#INC-20261102-00002", incident_id: "inc_2", title: "Sự cố 2" },
          { code: "#INC-20261102-00003", incident_id: "inc_3", title: "Sự cố 3" },
          { code: "#INC-20261102-00004", incident_id: "inc_4", title: "Sự cố 4" },
        ],
        errors: [],
        synced_at: new Date().toISOString(),
      };

      render(<SyncResultModal result={mockResult} onClose={handleClose} />);

      expect(screen.getByText(/ĐỒNG BỘ THÀNH CÔNG/i)).toBeDefined();
      // Kiểm tra chỉ hiển thị tối đa 3 mã (R20)
      expect(screen.getByText("#INC-20261102-00001")).toBeDefined();
      expect(screen.getByText("#INC-20261102-00002")).toBeDefined();
      expect(screen.getByText("#INC-20261102-00003")).toBeDefined();
      expect(screen.queryByText("#INC-20261102-00004")).toBeNull();
      expect(screen.getByText(/và 1 sự cố khác trong hàng đợi/i)).toBeDefined();

      // Sau 5 giây tự đóng popup
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(handleClose).toHaveBeenCalled();
    });

    it("hiển thị popup đồng bộ một phần với số thành công và số còn lại (R21)", () => {
      const handleClose = vi.fn();
      const mockResult: SyncResultSummary = {
        total: 3,
        success_count: 2,
        failed_count: 1,
        successful_incidents: [
          { code: "#INC-20261102-00001", incident_id: "inc_1", title: "Sự cố 1" },
          { code: "#INC-20261102-00002", incident_id: "inc_2", title: "Sự cố 2" },
        ],
        errors: [
          {
            queue_id: "q3",
            title: "Mục rác bị lỗi",
            error: "Thiếu thông tin vị trí",
          },
        ],
        synced_at: new Date().toISOString(),
      };

      render(<SyncResultModal result={mockResult} onClose={handleClose} />);

      expect(screen.getByText(/ĐỒNG BỘ MỘT PHẦN/i)).toBeDefined();
      expect(screen.getByText(/2 phản ánh/i)).toBeDefined();
      expect(screen.getByText(/1 phản ánh gặp lỗi/i)).toBeDefined();
      expect(screen.getByText(/Mục rác bị lỗi/i)).toBeDefined();
      expect(screen.getByText(/Thiếu thông tin vị trí/i)).toBeDefined();
    });

    it("cung cấp nút thử lại và giữ hàng đợi khi đồng bộ thất bại (R22)", () => {
      const handleRetry = vi.fn();
      const handleOpenOutbox = vi.fn();
      const handleClose = vi.fn();

      const mockResult: SyncResultSummary = {
        total: 2,
        success_count: 0,
        failed_count: 2,
        successful_incidents: [],
        errors: [
          {
            queue_id: "q1",
            title: "Phản ánh rác",
            error: "Lỗi kết nối máy chủ",
          },
        ],
        synced_at: new Date().toISOString(),
      };

      render(
        <SyncResultModal
          result={mockResult}
          onClose={handleClose}
          onRetryAllFailed={handleRetry}
          onOpenOutbox={handleOpenOutbox}
        />
      );

      const retryBtn = screen.getByRole("button", { name: /Thử lại ngay/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalled();

      const outboxBtn = screen.getByRole("button", { name: /Xem & Sửa lỗi/i });
      fireEvent.click(outboxBtn);
      expect(handleOpenOutbox).toHaveBeenCalled();
    });
  });

  describe("3. Service Worker Registration", () => {
    it("gọi register service worker khi trình duyệt hỗ trợ", () => {
      const registerMock = vi.fn().mockResolvedValue({ scope: "/" });
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          register: registerMock,
        },
        configurable: true,
      });

      registerOfflineServiceWorker();
      window.dispatchEvent(new Event("load"));

      expect(registerMock).toHaveBeenCalledWith("/service-worker.js");
    });
  });
});
