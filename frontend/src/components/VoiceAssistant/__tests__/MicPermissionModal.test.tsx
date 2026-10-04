import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MicPermissionModal } from '../MicPermissionModal';

describe('MicPermissionModal Component (Màn 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Khi isOpen=false -> không render modal ra DOM', () => {
    const { container } = render(
      <MicPermissionModal isOpen={false} onClose={vi.fn()} onPermissionGranted={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('Khi isOpen=true -> hiển thị đầy đủ giao diện Màn 4, nhãn POPUP, ổ khóa và hướng dẫn', () => {
    render(
      <MicPermissionModal isOpen={true} onClose={vi.fn()} onPermissionGranted={vi.fn()} />
    );

    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('KHÔNG TRUY CẬP ĐƯỢC MICRO')).toBeInTheDocument();
    expect(screen.getByText(/Hãy cấp quyền micro cho trình duyệt/i)).toBeInTheDocument();
    expect(screen.getByText('greenspot.gov.vn')).toBeInTheDocument();
    expect(screen.getByText('🎤 Bị chặn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đóng/i })).toBeInTheDocument();
  });

  it('Bấm nút "Đóng" kích hoạt callback onClose', () => {
    const mockClose = vi.fn();
    render(
      <MicPermissionModal isOpen={true} onClose={mockClose} onPermissionGranted={vi.fn()} />
    );

    const closeBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('Nhấn phím "Escape" kích hoạt callback onClose', () => {
    const mockClose = vi.fn();
    render(
      <MicPermissionModal isOpen={true} onClose={mockClose} onPermissionGranted={vi.fn()} />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('Bấm nút "Thử lại" khi cấp quyền thành công -> gọi onPermissionGranted', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    const mockGranted = vi.fn();
    render(
      <MicPermissionModal isOpen={true} onClose={vi.fn()} onPermissionGranted={mockGranted} />
    );

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockGranted).toHaveBeenCalledTimes(1);
    });
  });

  it('Bấm nút "Thử lại" khi người dùng vẫn chặn quyền -> hiển thị thông báo lỗi', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true,
    });

    render(
      <MicPermissionModal isOpen={true} onClose={vi.fn()} onPermissionGranted={vi.fn()} />
    );

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Micro vẫn đang bị chặn\. Vui lòng kiểm tra cài đặt trình duyệt/i)).toBeInTheDocument();
    });
  });

  it('Bấm nút "Thử lại" khi trình duyệt không hỗ trợ mediaDevices -> hiển thị thông báo dùng bàn phím', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(
      <MicPermissionModal isOpen={true} onClose={vi.fn()} onPermissionGranted={vi.fn()} />
    );

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Trình duyệt không hỗ trợ nhận dạng giọng nói\. Hãy dùng bàn phím/i)).toBeInTheDocument();
    });
  });
});
