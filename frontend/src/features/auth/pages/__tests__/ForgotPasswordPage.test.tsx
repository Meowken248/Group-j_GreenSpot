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

    it("transitions to Step 2 and validates strict password requirements", async () => {
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
      });

      // 1. Nhập OTP hợp lệ nhưng mật khẩu yếu (chỉ gồm chữ thường)
      const otpInput = screen.getByPlaceholderText("••••••");
      fireEvent.change(otpInput, { target: { value: "123456" } });

      const newPwdInput = screen.getByPlaceholderText(/Mật khẩu mới/);
      fireEvent.change(newPwdInput, { target: { value: "weakpassword" } });

      fireEvent.click(screen.getByText("Xác nhận & Đổi mật khẩu"));

      await waitFor(() => {
        expect(
          screen.getByText("Mật khẩu phải từ 8 đến 32 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt, không chứa bất kì khoảng trăng")
        ).toBeInTheDocument();
      });

      // 2. Nhập mật khẩu mạnh nhưng xác nhận không khớp
      fireEvent.change(newPwdInput, { target: { value: "StrongPass123@" } });
      const confirmPwdInput = screen.getByPlaceholderText("Nhập lại mật khẩu mới");
      fireEvent.change(confirmPwdInput, { target: { value: "DifferentPass123@" } });

      fireEvent.click(screen.getByText("Xác nhận & Đổi mật khẩu"));

      await waitFor(() => {
        expect(screen.getByText("Mật khẩu nhập lại không khớp")).toBeInTheDocument();
      });

      // 3. Nhập mật khẩu khớp chuẩn và gửi thành công
      const resetSpy = vi.spyOn(authService, "resetPassword").mockResolvedValueOnce({
        success: true,
        status: "SUCCESS",
        message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới",
      });

      fireEvent.change(confirmPwdInput, { target: { value: "StrongPass123@" } });
      fireEvent.click(screen.getByText("Xác nhận & Đổi mật khẩu"));

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith({
          email: "test@example.com",
          otp_code: "123456",
          new_password: "StrongPass123@",
        });
      });
    });
  });
