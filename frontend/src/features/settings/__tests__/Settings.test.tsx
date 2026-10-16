/**
 * Frontend Unit & Component Tests for Settings Domain (Chức năng 7)
 * Đảm bảo 100% độ bao phủ các quy chuẩn đặc tả của 3 màn hình
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SettingsContainer } from "../SettingsContainer";
import { GeneralSettingsTab } from "../components/GeneralSettingsTab";
import { ChangePasswordTab } from "../components/ChangePasswordTab";
import { SettingsSavedModal } from "../components/SettingsSavedModal";
import { DiscardConfirmModal } from "../components/DiscardConfirmModal";
import * as services from "../services";

// Mock services
vi.mock("../services", async () => {
  const actual = await vi.importActual<typeof services>("../services");
  return {
    ...actual,
    fetchPreferencesFromServer: vi.fn().mockResolvedValue({
      theme: "LIGHT",
      language: "VI",
      version: 1,
    }),
    updatePreferencesOnServer: vi.fn().mockImplementation(async (payload) => ({
      theme: payload.theme,
      language: payload.language,
      version: payload.version + 1,
    })),
    changePasswordApi: vi.fn().mockResolvedValue({
      success: true,
      message: "Đổi mật khẩu thành công",
    }),
  };
});

describe("Settings Domain Feature Tests (Chức năng 7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  // =========================================================================
  // I. MÀN 1/3: CÀI ĐẶT CHUNG (3 CỘT GIAO DIỆN, NGÔN NGỮ, LƯU CÀI ĐẶT)
  // =========================================================================
  describe("Màn 1/3: Cài đặt chung & Xem trước tức thì (General Settings Tab)", () => {
    it("Hiển thị đầy đủ 3 khối: GIAO DIỆN, NGÔN NGỮ, LƯU CÀI ĐẶT", () => {
      const currentPrefs = { theme: "LIGHT" as const, language: "VI" as const, version: 1 };
      render(
        <GeneralSettingsTab
          currentPrefs={currentPrefs}
          savedPrefs={currentPrefs}
          onThemeChange={vi.fn()}
          onLanguageChange={vi.fn()}
          onSave={vi.fn()}
          onResetDefault={vi.fn()}
          isSaving={false}
        />
      );

      // Cột 1
      expect(screen.getByText("GIAO DIỆN")).toBeInTheDocument();
      expect(screen.getAllByText("Chế độ sáng")[0]).toBeInTheDocument();
      expect(screen.getByText("Chế độ tối")).toBeInTheDocument();

      // Cột 2
      expect(screen.getByText("NGÔN NGỮ")).toBeInTheDocument();
      expect(screen.getAllByText("Tiếng Việt")[0]).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();

      // Cột 3
      expect(screen.getByText("LƯU CÀI ĐẶT")).toBeInTheDocument();
      expect(screen.getByText("LƯU THAY ĐỔI")).toBeInTheDocument();
      expect(screen.getByText("ĐẶT LẠI MẶC ĐỊNH")).toBeInTheDocument();
    });

    it("Bấm chọn Chế độ tối kích hoạt callback xem trước tức thì", () => {
      const onThemeChange = vi.fn();
      const currentPrefs = { theme: "LIGHT" as const, language: "VI" as const, version: 1 };

      render(
        <GeneralSettingsTab
          currentPrefs={currentPrefs}
          savedPrefs={currentPrefs}
          onThemeChange={onThemeChange}
          onLanguageChange={vi.fn()}
          onSave={vi.fn()}
          onResetDefault={vi.fn()}
          isSaving={false}
        />
      );

      const darkOption = screen.getByText("Chế độ tối").closest(".settings-option");
      expect(darkOption).not.toBeNull();
      fireEvent.click(darkOption!);

      expect(onThemeChange).toHaveBeenCalledWith("DARK");
    });

    it("Bấm chọn English kích hoạt callback xem trước tức thì ngôn ngữ", () => {
      const onLanguageChange = vi.fn();
      const currentPrefs = { theme: "LIGHT" as const, language: "VI" as const, version: 1 };

      render(
        <GeneralSettingsTab
          currentPrefs={currentPrefs}
          savedPrefs={currentPrefs}
          onThemeChange={vi.fn()}
          onLanguageChange={onLanguageChange}
          onSave={vi.fn()}
          onResetDefault={vi.fn()}
          isSaving={false}
        />
      );

      const enOption = screen.getByText("English").closest(".settings-option");
      expect(enOption).not.toBeNull();
      fireEvent.click(enOption!);

      expect(onLanguageChange).toHaveBeenCalledWith("EN");
    });
  });

  // =========================================================================
  // II. CONTAINER FLOW & XỬ LÝ TOAST / LƯU CÀI ĐẶT
  // =========================================================================
  describe("SettingsContainer Workflow & Toast Verification", () => {
    it("Khi chưa có thay đổi nào, bấm LƯU THAY ĐỔI hiển thị Toast 'Bạn chưa thay đổi cấu hình nào'", async () => {
      render(
        <SettingsContainer
          currentUser={{ full_name: "Nguyễn Thành Đạt" }}
          onBackToMap={vi.fn()}
          onNavigateToAuth={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("LƯU THAY ĐỔI")).toBeInTheDocument();
      });

      const saveBtn = screen.getByText("LƯU THAY ĐỔI");
      fireEvent.click(saveBtn);

      // Kiểm tra toast xuất hiện
      await waitFor(() => {
        expect(
          screen.getByText("Bạn chưa thay đổi cấu hình nào")
        ).toBeInTheDocument();
      });
    });

    it("Khi thay đổi theme sang DARK và bấm LƯU THAY ĐỔI, hiển thị Popup ĐÃ LƯU CÀI ĐẶT", async () => {
      render(
        <SettingsContainer
          currentUser={{ full_name: "Nguyễn Thành Đạt" }}
          onBackToMap={vi.fn()}
          onNavigateToAuth={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Chế độ tối")).toBeInTheDocument();
      });

      // Tích chọn Chế độ tối
      const darkOption = screen.getByText("Chế độ tối").closest(".settings-option");
      fireEvent.click(darkOption!);

      // Bấm Lưu thay đổi
      const saveBtn = screen.getByText("LƯU THAY ĐỔI");
      fireEvent.click(saveBtn);

      // Kiểm tra popup Màn 3 hiển thị
      await waitFor(() => {
        expect(screen.getByText("ĐÃ LƯU CÀI ĐẶT")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // III. MÀN 2/3: ĐỔI MẬT KHẨU & POPUP XÁC NHẬN HỦY
  // =========================================================================
  describe("Màn 2/3: Đổi mật khẩu (Change Password Tab)", () => {
    it("Hiển thị đầy đủ form đổi mật khẩu và các quy chuẩn", () => {
      render(
        <ChangePasswordTab
          currentLang="VI"
          onSuccessToast={vi.fn()}
          onErrorToast={vi.fn()}
          onLogoutRedirect={vi.fn()}
        />
      );

      expect(screen.getByText("Thay đổi mật khẩu tài khoản")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Nhập mật khẩu bạn đang sử dụng")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Nhập mật khẩu mới (tối thiểu 8 ký tự)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Nhập lại mật khẩu mới")).toBeInTheDocument();
      expect(screen.getByText("Tối thiểu 8 ký tự")).toBeInTheDocument();
    });

    it("Khi đã nhập dữ liệu vào ô mật khẩu và bấm HỦY -> mở DiscardConfirmModal", () => {
      render(
        <ChangePasswordTab
          currentLang="VI"
          onSuccessToast={vi.fn()}
          onErrorToast={vi.fn()}
          onLogoutRedirect={vi.fn()}
        />
      );

      const currentInput = screen.getByPlaceholderText("Nhập mật khẩu bạn đang sử dụng");
      fireEvent.change(currentInput, { target: { value: "MyOldPass@123" } });

      const cancelBtn = screen.getByText("HỦY");
      fireEvent.click(cancelBtn);

      // Popup cảnh báo xác nhận hủy phải xuất hiện
      expect(screen.getByText("Xác nhận hủy thay đổi")).toBeInTheDocument();
      expect(
        screen.getByText("Bạn có dữ liệu mật khẩu chưa lưu. Bạn có chắc chắn muốn hủy bỏ và xóa sạch các thông tin đã nhập?")
      ).toBeInTheDocument();
    });

    it("Trong popup xác nhận hủy, bấm 'Đồng ý hủy' xóa sạch form", () => {
      render(
        <ChangePasswordTab
          currentLang="VI"
          onSuccessToast={vi.fn()}
          onErrorToast={vi.fn()}
          onLogoutRedirect={vi.fn()}
        />
      );

      const currentInput = screen.getByPlaceholderText("Nhập mật khẩu bạn đang sử dụng") as HTMLInputElement;
      fireEvent.change(currentInput, { target: { value: "MyOldPass@123" } });
      expect(currentInput.value).toBe("MyOldPass@123");

      const cancelBtn = screen.getByText("HỦY");
      fireEvent.click(cancelBtn);

      // Bấm Đồng ý hủy
      const confirmDiscardBtn = screen.getByText("Đồng ý hủy");
      fireEvent.click(confirmDiscardBtn);

      // Form phải được xóa sạch
      expect(currentInput.value).toBe("");
    });
  });

  // =========================================================================
  // IV. MÀN 3/3: POPUP ĐÃ LƯU CÀI ĐẶT
  // =========================================================================
  describe("Màn 3/3: Popup ĐÃ LƯU CÀI ĐẶT (SettingsSavedModal)", () => {
    it("Hiển thị đầy đủ thông tin xác nhận và đóng được khi bấm nút Đóng", () => {
      const onClose = vi.fn();
      const savedPrefs = { theme: "DARK" as const, language: "VI" as const, version: 2 };

      render(
        <SettingsSavedModal
          isOpen={true}
          onClose={onClose}
          savedPrefs={savedPrefs}
        />
      );

      expect(screen.getByText("ĐÃ LƯU CÀI ĐẶT")).toBeInTheDocument();
      expect(
        screen.getByText("Cài đặt giao diện và ngôn ngữ đã được cập nhật thành công và áp dụng cho toàn bộ hệ thống.")
      ).toBeInTheDocument();

      const closeBtn = screen.getByText("Đóng");
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it("Đóng được khi nhấn phím Escape", () => {
      const onClose = vi.fn();
      const savedPrefs = { theme: "LIGHT" as const, language: "EN" as const, version: 1 };

      render(
        <SettingsSavedModal
          isOpen={true}
          onClose={onClose}
          savedPrefs={savedPrefs}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // V. GLOBAL THEME SYNC & EVENT SUBSCRIPTION
  // =========================================================================
  describe("Global Theme Sync & Event Subscription", () => {
    it("applyThemeToDocument gán data-theme và dispatch event greenspot_theme_changed", () => {
      const listener = vi.fn();
      window.addEventListener("greenspot_theme_changed", listener);

      services.applyThemeToDocument("DARK");

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(document.body.classList.contains("dark-mode")).toBe(true);
      expect(listener).toHaveBeenCalled();

      window.removeEventListener("greenspot_theme_changed", listener);
    });

    it("subscribeThemeChange lắng nghe được tín hiệu thay đổi theme", () => {
      const callback = vi.fn();
      const unsubscribe = services.subscribeThemeChange(callback);

      services.applyThemeToDocument("LIGHT");
      expect(callback).toHaveBeenCalledWith("LIGHT");

      services.applyThemeToDocument("DARK");
      expect(callback).toHaveBeenCalledWith("DARK");

      unsubscribe();
    });
  });
});
