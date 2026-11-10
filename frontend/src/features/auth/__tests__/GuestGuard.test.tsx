import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthContainer } from '../AuthContainer';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { AUTH_STORAGE_KEYS } from '../types/auth.types';

// Mock authService to avoid real network calls
vi.mock('../services/authService', () => ({
  registerCitizen: vi.fn(),
  loginCitizen: vi.fn(),
  getMyDevices: vi.fn().mockResolvedValue({
    success: true,
    data: { devices: [], total: 0 },
  }),
  revokeDeviceSession: vi.fn(),
  revokeAllOtherSessions: vi.fn(),
}));

describe('Guest Guard - Chặn truy cập Đăng ký / Đăng nhập khi đã có phiên', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('RegisterPage: Tự động chuyển hướng (onLogoClick) khi đã có token hợp lệ trong localStorage', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_valid_token');
    const onLogoClick = vi.fn();
    const onNavigateToLogin = vi.fn();
    const onNavigateToOtp = vi.fn();

    render(
      <RegisterPage
        onNavigateToLogin={onNavigateToLogin}
        onNavigateToOtp={onNavigateToOtp}
        onLogoClick={onLogoClick}
      />
    );

    await waitFor(() => {
      expect(onLogoClick).toHaveBeenCalled();
    });
  });

  it('LoginPage: Tự động chuyển hướng (onLoginSuccess) khi đã có token hợp lệ trong localStorage', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_valid_token');
    const onLoginSuccess = vi.fn();
    const onLogoClick = vi.fn();
    const onNavigateToRegister = vi.fn();
    const onNavigateToOtp = vi.fn();
    const onNavigateToForgotPassword = vi.fn();

    render(
      <LoginPage
        onNavigateToRegister={onNavigateToRegister}
        onNavigateToOtp={onNavigateToOtp}
        onNavigateToForgotPassword={onNavigateToForgotPassword}
        onLoginSuccess={onLoginSuccess}
        onLogoClick={onLogoClick}
      />
    );

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith('/geo-feed');
    });
  });

  it('AuthContainer: Chặn render form đăng nhập/đăng ký và gọi onExitAuth khi đã đăng nhập', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_valid_token');
    const onExitAuth = vi.fn();

    const { container } = render(
      <AuthContainer
        initialView="register"
        onExitAuth={onExitAuth}
      />
    );

    // Không render form Đăng ký hay form Đăng nhập
    expect(screen.queryByText('ĐĂNG KÝ TÀI KHOẢN')).toBeNull();
    expect(screen.queryByText('ĐĂNG NHẬP')).toBeNull();

    await waitFor(() => {
      expect(onExitAuth).toHaveBeenCalled();
    });
  });

  it('AuthContainer: Vẫn cho phép truy cập màn hình devices (Quản lý thiết bị) ngay cả khi đã đăng nhập', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_valid_token');
    const onExitAuth = vi.fn();

    render(
      <AuthContainer
        initialView="devices"
        onExitAuth={onExitAuth}
      />
    );

    // Màn hình thiết bị được render bình thường
    await waitFor(() => {
      expect(screen.getByText('THIẾT BỊ ĐANG ĐĂNG NHẬP')).toBeInTheDocument();
    });
    // Không bị chặn hay kích hoạt onExitAuth
    expect(onExitAuth).not.toHaveBeenCalled();
  });

  it('AuthContainer: Khi chưa đăng nhập, hiển thị form bình thường theo initialView', () => {
    render(<AuthContainer initialView="register" />);
    expect(screen.getByText('ĐĂNG KÝ TÀI KHOẢN')).toBeInTheDocument();
  });
});
