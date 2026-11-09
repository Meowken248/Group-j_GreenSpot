import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForgotPasswordPage } from "../ForgotPasswordPage";
import * as authService from "../../services/authService";

describe("ForgotPasswordPage Component", () => {
  it("renders Step 1 with email input and submit button", () => {
    const handleLogin = vi.fn();
    render(<ForgotPasswordPage onNavigateToLogin={handleLogin} />);

    expect(screen.getByText("KHÔI PHỤC MẬT KHẨU")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByText("Gửi mã xác thực")).toBeInTheDocument();
    expect(screen.getByText("← Quay lại Đăng nhập")).toBeInTheDocument();
  });

  it("shows error when email is empty or invalid on submit", async () => {
    const handleLogin = vi.fn();
    render(<ForgotPasswordPage onNavigateToLogin={handleLogin} />);

    fireEvent.click(screen.getByText("Gửi mã xác thực"));

    await waitFor(() => {
      expect(screen.getByText("Vui lòng nhập email")).toBeInTheDocument();
    });
  });

  it("transitions to Step 2 when email request succeeds", async () => {
    vi.spyOn(authService, "forgotPassword").mockResolvedValueOnce({
      success: true,
      status: "SUCCESS",
      message: "Mã OTP đã được gửi đến email của bạn",
    });

    const handleLogin = vi.fn();
    render(<ForgotPasswordPage onNavigateToLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText("name@example.com");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByText("Gửi mã xác thực"));

    await waitFor(() => {
      expect(screen.getByText("ĐẶT LẠI MẬT KHẨU")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••")).toBeInTheDocument();
      expect(screen.getByText("Xác nhận & Đổi mật khẩu")).toBeInTheDocument();
    });
  });
});
