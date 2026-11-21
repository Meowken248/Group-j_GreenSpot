import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionExpiredModal } from '../SessionExpiredModal';
import { AUTH_STORAGE_KEYS } from '../../types/auth.types';
import {
  triggerSessionExpired,
  resetSessionExpired,
  isSessionExpiredActive,
  subscribeSessionExpired,
} from '../../services/sessionManager';

describe('SessionExpiredModal (Màn 4)', () => {
  const mockRelogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSessionExpired();
  });

  it('không render khi isOpen là false', () => {
    render(<SessionExpiredModal isOpen={false} onRelogin={mockRelogin} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('render đầy đủ các thành phần theo đặc tả khi isOpen là true', () => {
    render(<SessionExpiredModal isOpen={true} onRelogin={mockRelogin} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('PHIÊN ĐÃ HẾT HẠN')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng đăng nhập lại')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập lại/i })).toBeInTheDocument();
  });

  it('không thể đóng bằng ESC hoặc click ra ngoài backdrop (Unclosable modal)', () => {
    render(<SessionExpiredModal isOpen={true} onRelogin={mockRelogin} />);

    // Nhấn ESC -> Không đóng
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockRelogin).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click backdrop -> Không đóng
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(mockRelogin).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Không có nút đóng (X)
    expect(screen.queryByRole('button', { name: /close|đóng|×/i })).toBeNull();
  });

  it('bấm "Đăng nhập lại": xóa hai token khỏi localStorage, đặt lại cờ và chuyển về Màn 1 kèm redirect', () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'test_access_token');
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, 'test_refresh_token');
    localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify({ name: 'Test' }));

    render(<SessionExpiredModal isOpen={true} onRelogin={mockRelogin} />);

    const reloginBtn = screen.getByRole('button', { name: /đăng nhập lại/i });
    fireEvent.click(reloginBtn);

    // Kiểm tra token đã bị xóa
    expect(localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO)).toBeNull();

    // Callback onRelogin được gọi kèm redirect URL
    expect(mockRelogin).toHaveBeenCalledTimes(1);
    expect(typeof mockRelogin.mock.calls[0][0]).toBe('string');
  });
});

describe('sessionManager (Singleton & Logic kích hoạt)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSessionExpired();
  });

  it('không kích hoạt Popup nếu không có token trong localStorage từ đầu', () => {
    const callback = vi.fn();
    const unsub = subscribeSessionExpired(callback);

    triggerSessionExpired();

    expect(callback).not.toHaveBeenCalled();
    expect(isSessionExpiredActive()).toBe(false);
    unsub();
  });

  it('kích hoạt Popup khi có token trong localStorage mà máy chủ từ chối', () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'expired_token');

    const callback = vi.fn();
    const unsub = subscribeSessionExpired(callback);

    triggerSessionExpired();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(isSessionExpiredActive()).toBe(true);
    unsub();
  });

  it('cơ chế Singleton: nhiều yêu cầu cùng nhận lỗi chỉ kích hoạt 1 lần duy nhất', () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'expired_token');

    const callback = vi.fn();
    const unsub = subscribeSessionExpired(callback);

    // Gọi trigger 5 lần liên tiếp
    triggerSessionExpired();
    triggerSessionExpired();
    triggerSessionExpired();
    triggerSessionExpired();
    triggerSessionExpired();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(isSessionExpiredActive()).toBe(true);
    unsub();
  });
});
