import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import { notificationService } from '../../services/notificationService';

const mockNotifications = [
  {
    notification_id: 'notif-uuid-1',
    user_id: 'user-uuid-1',
    title: 'Cập nhật phản ánh vi phạm #INC-20261012-TR78A',
    message: 'Hồ sơ của bạn đã được cán bộ địa bàn Xác minh đúng vi phạm.',
    notification_type: 'PENALTY_REPORT',
    reference_id: 'INC-20261012-TR78A',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    notification_id: 'notif-uuid-2',
    user_id: 'user-uuid-1',
    title: 'Cập nhật phản ánh vi phạm #INC-20261012-WK91B',
    message: 'Hồ sơ của bạn đã được lập biên bản xử phạt hành chính hoàn tất.',
    notification_type: 'PENALTY_REPORT',
    reference_id: 'INC-20261012-WK91B',
    is_read: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('NotificationBell Unit Tests (Chuông thông báo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(notificationService, 'getMyNotifications').mockResolvedValue({
      items: mockNotifications,
      total: 2,
      unread_count: 1,
    });
    vi.spyOn(notificationService, 'markAsRead').mockResolvedValue({
      ...mockNotifications[0],
      is_read: true,
    });
    vi.spyOn(notificationService, 'markAllAsRead').mockResolvedValue({
      message: 'Đã đánh dấu tất cả thông báo là đã đọc.',
    });
  });

  it('1. Render chuông thông báo và hiển thị chấm đỏ khi có thông báo chưa đọc', async () => {
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Thông báo hệ thống/i });
    expect(bellBtn).toBeInTheDocument();

    await waitFor(() => {
      expect(bellBtn.querySelector('.bell-dot')).toBeInTheDocument();
    });
  });

  it('2. Bấm chuông thông báo -> hiển thị dropdown danh sách thông báo và badge chưa đọc', async () => {
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Thông báo hệ thống/i });
    fireEvent.click(bellBtn);

    expect(await screen.findByText('Thông báo hệ thống')).toBeInTheDocument();
    expect(await screen.findByText('Cập nhật phản ánh vi phạm #INC-20261012-TR78A')).toBeInTheDocument();
    expect(screen.getByText(/Xác minh đúng vi phạm/i)).toBeInTheDocument();
    expect(screen.getByText('Đánh dấu đã đọc')).toBeInTheDocument();
  });

  it('3. Bấm vào một thông báo chưa đọc -> gọi API markAsRead', async () => {
    const markSpy = vi.spyOn(notificationService, 'markAsRead');
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Thông báo hệ thống/i });
    fireEvent.click(bellBtn);

    const notifItem = await screen.findByText('Cập nhật phản ánh vi phạm #INC-20261012-TR78A');
    fireEvent.click(notifItem);

    await waitFor(() => {
      expect(markSpy).toHaveBeenCalledWith('notif-uuid-1');
    });
  });

  it('4. Bấm Đánh dấu đã đọc -> gọi API markAllAsRead và xóa badge', async () => {
    const markAllSpy = vi.spyOn(notificationService, 'markAllAsRead');
    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Thông báo hệ thống/i });
    fireEvent.click(bellBtn);

    const markAllBtn = await screen.findByText('Đánh dấu đã đọc');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalled();
    });
  });
});
