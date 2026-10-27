import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { EmergencyHeader } from '../components/EmergencyHeader';
import { EmergencyFooter } from '../components/EmergencyFooter';
import { Screen2AlertModal } from '../components/Screen2AlertModal';
import { Screen3SafetyCheck } from '../components/Screen3SafetyCheck';
import { Screen4SafetyConfirmModal } from '../components/Screen4SafetyConfirmModal';
import type { UserActiveAlertResponse } from '../types/emergency_alert.types';

describe('Bộ kiểm thử UI/UX STT 45: Hệ thống Cảnh báo Khẩn cấp theo Vị trí & Safety Check', () => {
  // Test Khung Header
  it('Màn hình hiển thị đúng Header với Logo, Menu và Role Badge', () => {
    const handleSwitchView = vi.fn();
    render(
      <EmergencyHeader
        currentView="CONSOLE"
        onSwitchView={handleSwitchView}
        userFullName="Đại tá Nguyễn Văn An"
        userRole="ADMIN"
      />
    );

    expect(screen.getByText(/GreenSpot PCTT/i)).toBeInTheDocument();
    expect(screen.getByText(/BAN CHỈ HUY PCTT & TKCN/i)).toBeInTheDocument();
    expect(screen.getByText(/Phát lệnh khẩn cấp/i)).toBeInTheDocument();
    expect(screen.getByText(/Safety Check/i)).toBeInTheDocument();
    expect(screen.getByText(/Đại tá Nguyễn Văn An/i)).toBeInTheDocument();
  });

  // Test Khung Footer
  it('Màn hình hiển thị đúng Footer với bản quyền, liên hệ và chính sách', () => {
    render(<EmergencyFooter />);
    expect(screen.getByText(/Bản quyền/i)).toBeInTheDocument();
    expect(screen.getByText(/Liên hệ/i)).toBeInTheDocument();
    expect(screen.getByText(/Chính sách/i)).toBeInTheDocument();
    expect(screen.getByText(/Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn TP.HCM/i)).toBeInTheDocument();
  });

  // Test Màn 2/4: Emergency Alert Modal
  it('Màn 2/4: Hiển thị đúng POPUP CẢNH BÁO KHẨN CẤP với cụm 3 nút hành động', async () => {
    const mockAlert: UserActiveAlertResponse = {
      has_active_alert: true,
      alert_id: 'alert-001',
      alert_type: 'FLOOD',
      title: 'CẢNH BÁO KHẨN CẤP',
      situation_message: 'Ngập nặng trong bán kính 2 km quanh bạn',
      content: 'Mực nước dâng nhanh trên 0.8m do triều cường kết hợp mưa lớn.',
      radius_meters: 2000,
      severity: 'CRITICAL',
    };

    const handleNavigateSafety = vi.fn();
    const handleNavigateRoute = vi.fn();

    render(
      <Screen2AlertModal
        alertData={mockAlert}
        onNavigateSafetyCheck={handleNavigateSafety}
        onNavigateSafeRoute={handleNavigateRoute}
      />
    );

    // Kiểm tra các phần tử đúng Wireframe
    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('CẢNH BÁO KHẨN CẤP')).toBeInTheDocument();
    expect(screen.getByText('Ngập nặng trong bán kính 2 km quanh bạn')).toBeInTheDocument();

    // Cụm 3 nút hành động
    const btnSafe = screen.getByRole('button', { name: /Tôi an toàn/i });
    const btnHelp = screen.getByRole('button', { name: /Cần giúp đỡ/i });
    const btnDetail = screen.getByRole('button', { name: /Xem chi tiết/i });

    expect(btnSafe).toBeInTheDocument();
    expect(btnHelp).toBeInTheDocument();
    expect(btnDetail).toBeInTheDocument();

    // Bấm "Tôi an toàn" điều hướng sang Màn 3/4
    fireEvent.click(btnSafe);
    await vi.waitFor(() => {
      expect(handleNavigateSafety).toHaveBeenCalledTimes(1);
    });

    // Bấm "Xem chi tiết" điều hướng sang STT 41
    fireEvent.click(btnDetail);
    await vi.waitFor(() => {
      expect(handleNavigateRoute).toHaveBeenCalledTimes(1);
    });
  });

  // Test Màn 3/4: Safety Check 2 Cột
  it('Màn 3/4: Hiển thị đúng 2 cột Xác nhận an toàn và Gửi cho bạn bè', async () => {
    const handleSendSuccess = vi.fn();
    render(<Screen3SafetyCheck onSendSuccess={handleSendSuccess} />);

    // Kiểm tra Cột Trái: XÁC NHẬN AN TOÀN
    expect(screen.getByText('🛡️ XÁC NHẬN AN TOÀN')).toBeInTheDocument();
    expect(screen.getByText(/Vị trí GPS thời gian thực/i)).toBeInTheDocument();
    const btnMarkSafe = screen.getByRole('button', { name: /Tôi an toàn/i });
    expect(btnMarkSafe).toBeInTheDocument();

    // Kiểm tra Cột Phải: GỬI CHO
    expect(screen.getByText('👥 GỬI CHO')).toBeInTheDocument();
    const btnSendFriends = screen.getByRole('button', { name: /Gửi cho bạn bè/i });
    expect(btnSendFriends).toBeInTheDocument();
  });

  // Test Màn 4/4: Safety Check Confirmation Modal
  it('Màn 4/4: Hiển thị đúng POPUP ĐÃ BÁO AN TOÀN kèm nút Đóng duy nhất', () => {
    const handleClose = vi.fn();
    render(
      <Screen4SafetyConfirmModal
        sentCount={3}
        hasSmsFallback={true}
        onClose={handleClose}
      />
    );

    // Kiểm tra đúng Wireframe Màn 4/4
    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('ĐÃ BÁO AN TOÀN')).toBeInTheDocument();
    expect(screen.getByText('Bạn bè đã nhận thông báo')).toBeInTheDocument();
    expect(screen.getByText(/gửi thành công đến/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/nhận được tin nhắn SMS thay thế/i)).toBeInTheDocument();

    // Nút hành động duy nhất: "Đóng"
    const btnClose = screen.getByRole('button', { name: /Đóng/i });
    expect(btnClose).toBeInTheDocument();

    fireEvent.click(btnClose);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
