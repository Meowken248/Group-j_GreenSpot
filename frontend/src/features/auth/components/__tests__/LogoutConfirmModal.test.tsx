import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LogoutConfirmModal } from '../LogoutConfirmModal';

describe('LogoutConfirmModal (Màn 3)', () => {
  it('không render khi isOpen là false', () => {
    render(
      <LogoutConfirmModal
        isOpen={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('render Dạng 1 - Đăng xuất một thiết bị khác', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        isAllDevices={false}
        deviceName="Chrome trên Windows"
        isCurrentDevice={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('ĐĂNG XUẤT THIẾT BỊ?')).toBeInTheDocument();
    expect(screen.getByText('Phiên trên thiết bị này sẽ bị thu hồi')).toBeInTheDocument();
    expect(screen.getByText('Chrome trên Windows')).toBeInTheDocument();
    expect(screen.queryByText('Bạn sẽ bị đăng xuất khỏi thiết bị này')).toBeNull();
  });

  it('render Dạng 1 - Đăng xuất thiết bị đang dùng kèm cảnh báo', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        isAllDevices={false}
        deviceName="Safari trên iOS"
        isCurrentDevice={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('ĐĂNG XUẤT THIẾT BỊ?')).toBeInTheDocument();
    expect(screen.getByText('Phiên trên thiết bị này sẽ bị thu hồi')).toBeInTheDocument();
    expect(screen.getByText('Safari trên iOS')).toBeInTheDocument();
    expect(screen.getByText('Bạn sẽ bị đăng xuất khỏi thiết bị này')).toBeInTheDocument();
  });

  it('render Dạng 2 - Đăng xuất tất cả thiết bị', () => {
    render(
      <LogoutConfirmModal
        isOpen={true}
        isAllDevices={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('ĐĂNG XUẤT TẤT CẢ THIẾT BỊ?')).toBeInTheDocument();
    expect(screen.getByText('Phiên trên tất cả thiết bị, kể cả thiết bị này, sẽ bị thu hồi')).toBeInTheDocument();
  });

  it('bấm nút "Huỷ" gọi onCancel', () => {
    const handleCancel = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /huỷ/i });
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('bấm nút "Đăng xuất" gọi onConfirm', () => {
    const handleConfirm = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /^đăng xuất$/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('nhấn phím ESC gọi onCancel', () => {
    const handleCancel = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('bấm ra ngoài backdrop gọi onCancel', () => {
    const handleCancel = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('khi isLoading=true: vô hiệu hóa 2 nút, hiện vòng quay, ESC và backdrop không đóng', () => {
    const handleCancel = vi.fn();
    render(
      <LogoutConfirmModal
        isOpen={true}
        isLoading={true}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /huỷ/i });
    const confirmBtn = screen.getByRole('button', { name: /đang xử lý/i });

    expect(cancelBtn).toBeDisabled();
    expect(confirmBtn).toBeDisabled();

    // ESC không hoạt động
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();

    // Backdrop click không hoạt động
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(handleCancel).not.toHaveBeenCalled();
  });
});
