// @vitest-environment jsdom
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LanguageProvider, useLanguage } from "../LanguageContext";

const TestComponent = () => {
  const { currentLang, toggleLanguage, t } = useLanguage();
  return (
    <div>
      <span data-testid="current-lang">{currentLang}</span>
      <span data-testid="app-title">{t("app.title")}</span>
      <span data-testid="report-btn">{t("action.quickReport")}</span>
      <span data-testid="status-pending">{t("status.pending")}</span>
      <button data-testid="toggle-btn" onClick={toggleLanguage}>
        Toggle
      </button>
    </div>
  );
};

describe("LanguageContext & Global Translation Engine", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("nhận diện ngôn ngữ từ hệ thống/trình duyệt hoặc localStorage", () => {
    // Khi lưu trước cấu hình VI vào localStorage
    window.localStorage.setItem("greenspot_user_lang", "VI");
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId("current-lang").textContent).toBe("VI");
    expect(screen.getByTestId("app-title").textContent).toBe("GreenSpot EcoReport");
    expect(screen.getByTestId("report-btn").textContent).toBe("Gửi phản ánh");
    expect(screen.getByTestId("status-pending").textContent).toBe("Mới tiếp nhận");
  });

  it("chuyển đổi sang EN khi bấm nút toggleLanguage và cập nhật toàn bộ UI", () => {
    window.localStorage.setItem("greenspot_user_lang", "VI");
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");
    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(screen.getByTestId("current-lang").textContent).toBe("EN");
    expect(screen.getByTestId("report-btn").textContent).toBe("Report Now");
    expect(screen.getByTestId("status-pending").textContent).toBe("Newly Received");
    expect(window.localStorage.getItem("greenspot_user_lang")).toBe("EN");
  });

  it("chuyển đổi qua lại giữa VI và EN nhất quán", () => {
    window.localStorage.setItem("greenspot_user_lang", "VI");
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const toggleBtn = screen.getByTestId("toggle-btn");

    // Lần 1: VI -> EN
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("EN");
    expect(screen.getByTestId("report-btn").textContent).toBe("Report Now");

    // Lần 2: EN -> VI
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId("current-lang").textContent).toBe("VI");
    expect(screen.getByTestId("report-btn").textContent).toBe("Gửi phản ánh");
    expect(window.localStorage.getItem("greenspot_user_lang")).toBe("VI");
  });
});
