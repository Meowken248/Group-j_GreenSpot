import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceManagementPage } from '../DeviceManagementPage';
import * as authService from '../../services/authService';
import { AUTH_STORAGE_KEYS } from '../../types/auth.types';

vi.mock('../../services/authService', () => ({
  fetchUserSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeAllSessions: vi.fn(),
}));

describe('DeviceManagementPage (Màn 2)', () => {
  const mockNavigateToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('chuyển về Màn 1 kèm redirect=/devices nếu chưa có token trong localStorage', () => {
    render(<DeviceManagementPage onNavigateToLogin={mockNavigateToLogin} />);
    expect(mockNavigateToLogin).toHaveBeenCalledWith('/devices');
  });

  it('hiển thị danh sách thiết bị và badge "Thiết bị này"', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_access_token');
    
    vi.mocked(authService.fetchUserSessions).mockResolvedValueOnce({
      success: true,
      sessions: [
        {
          session_id: 'session-1',
          device_name: 'Chrome trên Windows',
          ip_address: '127.0.0.1',
          last_active_at: '2026-10-04T12:00:00Z',
          is_current: true,
        },
        {
          session_id: 'session-2',
          device_name: 'Safari trên iOS',
          ip_address: '192.168.1.5',
          last_active_at: '2026-10-04T11:00:00Z',
          is_current: false,
        },
      ],
    });

    render(<DeviceManagementPage onNavigateToLogin={mockNavigateToLogin} />);

    await waitFor(() => {
      expect(screen.getByText('Chrome trên Windows')).toBeInTheDocument();
      expect(screen.getByText('Thiết bị này')).toBeInTheDocument();
      expect(screen.getByText('Safari trên iOS')).toBeInTheDocument();
    });

    // Có 2 nút "Đăng xuất" cho 2 thiết bị và 1 nút "Đăng xuất tất cả"
    const revokeButtons = screen.getAllByRole('button', { name: /^đăng xuất$/i });
    expect(revokeButtons).toHaveLength(2);
    expect(screen.getByRole('button', { name: /đăng xuất tất cả/i })).toBeInTheDocument();
  });

  it('hiển thị hộp báo lỗi kèm link "Tải lại" khi fetch lỗi', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_access_token');
    
    vi.mocked(authService.fetchUserSessions).mockResolvedValueOnce({
      success: false,
      message: 'Network error',
    });

    render(<DeviceManagementPage onNavigateToLogin={mockNavigateToLogin} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Không thể tải danh sách thiết bị/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /tải lại/i })).toBeInTheDocument();
    });

    // Nút "Đăng xuất tất cả" bị vô hiệu hóa
    expect(screen.getByRole('button', { name: /đăng xuất tất cả/i })).toBeDisabled();
  });

  it('bấm "Đăng xuất" ở dòng thiết bị khác mở Modal Màn 3 Dạng 1', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_access_token');
    
    vi.mocked(authService.fetchUserSessions).mockResolvedValueOnce({
      success: true,
      sessions: [
        {
          session_id: 'session-other',
          device_name: 'Safari trên iOS',
          ip_address: '192.168.1.5',
          last_active_at: '2026-10-04T11:00:00Z',
          is_current: false,
        },
      ],
    });

    render(<DeviceManagementPage onNavigateToLogin={mockNavigateToLogin} />);

    await waitFor(() => {
      expect(screen.getByText('Safari trên iOS')).toBeInTheDocument();
    });

    const logoutBtn = screen.getByRole('button', { name: /^đăng xuất$/i });
    fireEvent.click(logoutBtn);

    // Modal Màn 3 xuất hiện
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ĐĂNG XUẤT THIẾT BỊ?')).toBeInTheDocument();
    expect(screen.getByText('Phiên trên thiết bị này sẽ bị thu hồi')).toBeInTheDocument();
  });

  it('bấm "Đăng xuất tất cả" mở Modal Màn 3 Dạng 2', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_access_token');
    
    vi.mocked(authService.fetchUserSessions).mockResolvedValueOnce({
      success: true,
      sessions: [
        {
          session_id: 'session-1',
          device_name: 'Chrome trên Windows',
          ip_address: '127.0.0.1',
          last_active_at: '2026-10-04T12:00:00Z',
          is_current: true,
        },
      ],
    });

    render(<DeviceManagementPage onNavigateToLogin={mockNavigateToLogin} />);

    await waitFor(() => {
      expect(screen.getByText('Chrome trên Windows')).toBeInTheDocument();
    });

    const logoutAllBtn = screen.getByRole('button', { name: /đăng xuất tất cả/i });
    fireEvent.click(logoutAllBtn);

    // Modal Màn 3 Dạng 2 xuất hiện
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ĐĂNG XUẤT TẤT CẢ THIẾT BỊ?')).toBeInTheDocument();
    expect(screen.getByText('Phiên trên tất cả thiết bị, kể cả thiết bị này, sẽ bị thu hồi')).toBeInTheDocument();
  });
});
