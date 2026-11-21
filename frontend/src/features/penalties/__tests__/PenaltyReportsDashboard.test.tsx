import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PenaltyReportsDashboard } from '../components/PenaltyReportsDashboard';
import { penaltyService } from '../services/penaltyService';

const mockReportsList = [
  {
    id: 'rep-uuid-1',
    tracking_code: 'INC-20261012-TR78A',
    violation_title: 'Vứt, thải rác sinh hoạt trên vỉa hè, lòng đường',
    legal_basis: 'Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP',
    fine_range: '1.000.000đ - 2.000.000đ',
    address_text: 'Trước số nhà 45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1',
    description: 'Hộ kinh doanh tập kết nhiều bao rác thải sinh hoạt bừa bãi ra vỉa hè.',
    is_anonymous: true,
    reporter_id: null,
    reporter_name: 'Ẩn danh',
    status: 'PENDING' as const,
    officer_note: null,
    resolved_at: null,
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-12T08:00:00Z',
  },
  {
    id: 'rep-uuid-2',
    tracking_code: 'INC-20261012-WK91B',
    violation_title: 'Xả nước thải chưa qua xử lý ra môi trường tiếp nhận',
    legal_basis: 'Điều 18 Nghị định 45/2022/NĐ-CP',
    fine_range: '10.000.000đ - 30.000.000đ',
    address_text: 'Khu vực kênh Nhiêu Lộc, cầu số 4, Phường 7, Quận Phú Nhuận',
    description: 'Cơ sở rửa xe ô tô xả trực tiếp nước bọt xà phòng và dầu mỡ đen ngòm.',
    is_anonymous: false,
    reporter_id: 'user-123',
    reporter_name: 'Nguyễn Thành Đạt',
    status: 'VERIFIED' as const,
    officer_note: 'Cán bộ địa bàn đã xuống kiểm tra hiện trường.',
    resolved_at: null,
    created_at: '2026-10-12T06:00:00Z',
    updated_at: '2026-10-12T06:30:00Z',
  },
];

const mockStats = {
  total: 5,
  pending: 2,
  verified: 1,
  resolved: 1,
  rejected: 1,
};

describe('PenaltyReportsDashboard Unit & Integration Tests (Trang Quản lý phản ánh vi phạm)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(penaltyService, 'getPenaltyReports').mockResolvedValue({
      items: mockReportsList,
      total: 2,
      page: 1,
      limit: 10,
      total_pages: 1,
    });
    vi.spyOn(penaltyService, 'getPenaltyReportStats').mockResolvedValue(mockStats);
  });

  it('1. Render đầy đủ Header, 5 thẻ thống kê KPI và bảng dữ liệu phản ánh', async () => {
    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN', full_name: 'Admin GreenSpot' }} />);

    // Kiểm tra Header
    expect(
      await screen.findByRole('heading', {
        name: /Giám Sát & Xử Lý Phản Ánh Vi Phạm Môi Trường/i,
      })
    ).toBeInTheDocument();

    // Kiểm tra 5 thẻ KPI
    expect(screen.getByText('Tổng phản ánh')).toBeInTheDocument();
    expect(screen.getByText('Chờ xác minh')).toBeInTheDocument();
    expect(screen.getByText('Đã xác minh')).toBeInTheDocument();
    expect(screen.getByText('Đã xử phạt / xong')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();

    // Kiểm tra dữ liệu trong bảng
    expect(await screen.findByText('INC-20261012-TR78A')).toBeInTheDocument();
    expect(screen.getByText('INC-20261012-WK91B')).toBeInTheDocument();
    expect(screen.getByText(/Trước số nhà 45 Đường Nguyễn Huệ/i)).toBeInTheDocument();
    expect(screen.getByText(/Khu vực kênh Nhiêu Lộc/i)).toBeInTheDocument();
  });

  it('2. Nhập từ khóa tìm kiếm -> tự động gọi API tìm kiếm phản ánh', async () => {
    const searchSpy = vi.spyOn(penaltyService, 'getPenaltyReports');
    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    await screen.findByText('INC-20261012-TR78A');

    const searchInput = screen.getByTestId('reports-search-input');
    fireEvent.change(searchInput, { target: { value: 'Nguyễn Huệ' } });

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Nguyễn Huệ',
        })
      );
    });
  });

  it('3. Thay đổi bộ lọc trạng thái -> tự động gọi API lọc danh sách', async () => {
    const filterSpy = vi.spyOn(penaltyService, 'getPenaltyReports');
    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    await screen.findByText('INC-20261012-TR78A');

    const statusSelect = screen.getByTestId('status-filter-select');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    await waitFor(() => {
      expect(filterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        })
      );
    });
  });

  it('4. Bấm Chi tiết hồ sơ -> hiển thị Modal với thông tin đầy đủ và Form xử lý', async () => {
    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    await screen.findByText('INC-20261012-TR78A');

    const viewBtn = screen.getByTestId('btn-view-rep-uuid-1');
    fireEvent.click(viewBtn);

    expect(await screen.findByTestId('report-officer-modal')).toBeInTheDocument();
    expect(screen.getByText(/Hồ sơ phản ánh #INC-20261012-TR78A/i)).toBeInTheDocument();
    expect(screen.getByText(/Hộ kinh doanh tập kết nhiều bao rác thải/i)).toBeInTheDocument();
    expect(screen.getByTestId('officer-status-select')).toBeInTheDocument();
    expect(screen.getByTestId('officer-note-textarea')).toBeInTheDocument();
  });

  it('5. Cán bộ cập nhật trạng thái hồ sơ -> gọi API update và hiển thị thông báo thành công', async () => {
    const updateSpy = vi.spyOn(penaltyService, 'updatePenaltyReportStatus').mockResolvedValue({
      ...mockReportsList[0],
      status: 'RESOLVED',
      officer_note: 'Đã lập biên bản xử phạt 1.500.000đ',
    });

    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    await screen.findByText('INC-20261012-TR78A');

    const viewBtn = screen.getByTestId('btn-view-rep-uuid-1');
    fireEvent.click(viewBtn);

    await screen.findByTestId('report-officer-modal');

    // Đổi trạng thái sang RESOLVED
    const statusSelect = screen.getByTestId('officer-status-select');
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    // Nhập ghi chú cán bộ
    const noteTextarea = screen.getByTestId('officer-note-textarea');
    fireEvent.change(noteTextarea, {
      target: { value: 'Đã lập biên bản xử phạt 1.500.000đ' },
    });

    // Bấm lưu
    const saveBtn = screen.getByTestId('btn-save-officer-status');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('rep-uuid-1', {
        status: 'RESOLVED',
        officer_note: 'Đã lập biên bản xử phạt 1.500.000đ',
      });
      expect(screen.getByTestId('officer-success-alert')).toBeInTheDocument();
      expect(screen.getByText(/Cập nhật trạng thái hồ sơ thành công!/i)).toBeInTheDocument();
    });
  });

  it('6. Hiển thị trạng thái rỗng khi không có phản ánh phù hợp', async () => {
    vi.spyOn(penaltyService, 'getPenaltyReports').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    expect(await screen.findByTestId('reports-empty')).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy phản ánh nào phù hợp/i)).toBeInTheDocument();
  });

  it('7. Hiển thị thông báo lỗi và nút Thử lại khi API gặp sự cố', async () => {
    vi.spyOn(penaltyService, 'getPenaltyReports').mockRejectedValue({
      response: { data: { detail: { message: 'Máy chủ cơ sở dữ liệu gián đoạn' } } },
    });

    render(<PenaltyReportsDashboard currentUser={{ role: 'ADMIN' }} />);

    expect(await screen.findByTestId('reports-error')).toBeInTheDocument();
    expect(screen.getByText(/Máy chủ cơ sở dữ liệu gián đoạn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });
});
