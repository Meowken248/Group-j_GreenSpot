import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeduplicationDashboard } from '../pages/DeduplicationDashboard';
import { deduplicationService } from '../services/deduplicationService';
import type {
  DistrictOption,
  ClusterListResponse,
  ComparisonResponse,
  MergeIncidentResponse,
  MarkDistinctResponse,
} from '../types/deduplication.types';

vi.mock('../services/deduplicationService');

const mockDistricts: DistrictOption[] = [
  { unit_id: null, name: 'Tất cả quận/huyện', unit_code: 'ALL' },
  { unit_id: 1, name: 'Quận 1', unit_code: 'Q1' },
  { unit_id: 2, name: 'Quận Bình Thạnh', unit_code: 'BT' },
  { unit_id: 3, name: 'TP. Thủ Đức', unit_code: 'TD' },
];

const mockClusters: ClusterListResponse = {
  total: 2,
  items: [
    {
      cluster_id: 'cluster-uuid-1',
      cluster_code: 'CLUSTER-001',
      cluster_name: 'Nhóm 1',
      report_count: 3,
      similarity_rate: 92.0,
      similarity_display: 'giống 92%',
      district_name: 'Quận 1',
      status: 'PENDING_REVIEW',
      gps_distance_m: 18.5,
      time_diff_hours: 1.25,
      visual_similarity: 94.0,
      version: 1,
    },
    {
      cluster_id: 'cluster-uuid-2',
      cluster_code: 'CLUSTER-002',
      cluster_name: 'Nhóm 2',
      report_count: 2,
      similarity_rate: 85.0,
      similarity_display: 'giống 85%',
      district_name: 'Quận Bình Thạnh',
      status: 'PENDING_REVIEW',
      gps_distance_m: 29.0,
      time_diff_hours: 3.5,
      visual_similarity: 86.5,
      version: 1,
    },
  ],
};

const mockComparison: ComparisonResponse = {
  cluster_id: 'cluster-uuid-1',
  cluster_name: 'Nhóm 1',
  version: 1,
  report_a: {
    incident_id: 'inc-a-uuid',
    tracking_code: 'RPT-Q1-AAA',
    reporter_name: 'Nguyễn Văn An',
    reporter_phone: '0901234567',
    title: 'Bãi rác tự phát bốc mùi trước hẻm 45 Nguyễn Huệ',
    description: 'Nhiều túi rác sinh hoạt và chai nhựa vứt bừa bãi góc đường Nguyễn Huệ.',
    address_text: '45 Đường Nguyễn Huệ, Quận 1',
    latitude: 10.7745,
    longitude: 106.7032,
    created_at: '2026-09-15T08:15:00Z',
    created_at_display: '08:15 15/09',
    media_url: 'https://example.com/trash-a.jpg',
    version: 1,
  },
  report_b: {
    incident_id: 'inc-b-uuid',
    tracking_code: 'RPT-Q1-BBB',
    reporter_name: 'Trần Thị Bình',
    reporter_phone: '0987654321',
    title: 'Đống rác ngổn ngang góc đường Nguyễn Huệ',
    description: 'Đống bao rác đen to góc vỉa hè chưa có ai dọn.',
    address_text: 'Góc Nguyễn Huệ - Lê Lợi, Quận 1',
    latitude: 10.77462,
    longitude: 106.70332,
    created_at: '2026-09-15T09:30:00Z',
    created_at_display: '09:30 15/09',
    media_url: 'https://example.com/trash-b.jpg',
    version: 1,
  },
  ai_conclusion: {
    similarity_rate: 92.0,
    similarity_display: 'Giống nhau: 92%',
    gps_distance_m: 18.5,
    time_diff_hours: 1.25,
    visual_similarity: 94.0,
    recommended_primary_id: 'inc-a-uuid',
    recommendation_reason: 'Báo cáo được gửi sớm hơn và hình ảnh ghi nhận hiện trường rõ nét.',
    explanation: 'Khoảng cách GPS: 18.5m; Thời gian: 1.25 giờ; Độ giống ảnh: 94%.',
  },
};

describe('DeduplicationDashboard Feature Tests (Màn 1 -> Màn 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deduplicationService.getDistricts).mockResolvedValue(mockDistricts);
    vi.mocked(deduplicationService.getClusters).mockResolvedValue(mockClusters);
    vi.mocked(deduplicationService.getComparison).mockResolvedValue(mockComparison);
  });

  // =========================================================================
  // MÀN 1: DANH SÁCH NHÓM BÁO CÁO TRÙNG
  // =========================================================================
  it('Màn 1: Hiển thị đầy đủ Header, Footer, Khối BỘ LỌC (cột trái) và Khối NHÓM TRÙNG (cột phải)', async () => {
    render(<DeduplicationDashboard currentUser={{ full_name: 'Đạt Quản trị', role: 'ADMIN' }} />);

    // Kiểm tra Header & Footer
    expect(screen.getByText('AI Deduplication Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Đạt Quản trị')).toBeInTheDocument();
    expect(screen.getByText(/Hệ thống AI Phân tích & Tinh gọn Dữ liệu Môi trường/i)).toBeInTheDocument();

    // Kiểm tra Cột trái BỘ LỌC
    expect(screen.getByText('BỘ LỌC')).toBeInTheDocument();
    expect(screen.getByLabelText('Quận / Huyện')).toBeInTheDocument();
    expect(screen.getByLabelText('Mức giống nhau (%)')).toBeInTheDocument();

    // Kiểm tra Cột phải NHÓM TRÙNG
    await waitFor(() => {
      expect(screen.getByText('NHÓM TRÙNG')).toBeInTheDocument();
      expect(screen.getByText('Nhóm 1')).toBeInTheDocument();
      expect(screen.getByText('3 báo cáo')).toBeInTheDocument();
      expect(screen.getByText('giống 92%')).toBeInTheDocument();

      expect(screen.getByText('Nhóm 2')).toBeInTheDocument();
      expect(screen.getByText('2 báo cáo')).toBeInTheDocument();
      expect(screen.getByText('giống 85%')).toBeInTheDocument();
    });
  });

  it('Màn 1: Thay đổi bộ lọc Quận và mức tương đồng (%) tự động cập nhật danh sách', async () => {
    render(<DeduplicationDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Nhóm 1')).toBeInTheDocument();
    });

    // Chọn quận "Quận 1"
    const districtSelect = screen.getByLabelText('Quận / Huyện');
    fireEvent.change(districtSelect, { target: { value: 'Quận 1' } });

    await waitFor(() => {
      expect(deduplicationService.getClusters).toHaveBeenCalledWith(
        expect.objectContaining({ districtName: 'Quận 1' })
      );
    });

    // Chọn mức giống nhau > 90%
    const chip90 = screen.getByRole('button', { name: '> 90%' });
    fireEvent.click(chip90);

    await waitFor(() => {
      expect(deduplicationService.getClusters).toHaveBeenCalledWith(
        expect.objectContaining({ minSimilarity: 90 })
      );
    });
  });

  it('Màn 1: Hiển thị thông báo trạng thái rỗng an toàn khi không phát hiện báo cáo trùng lặp', async () => {
    vi.mocked(deduplicationService.getClusters).mockResolvedValueOnce({
      total: 0,
      items: [],
    });

    render(<DeduplicationDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Không phát hiện báo cáo trùng lặp nào')).toBeInTheDocument();
    });
  });

  it('Màn 1: Hiển thị lỗi máy chủ AI và nút "Thử lại"', async () => {
    vi.mocked(deduplicationService.getClusters).mockRejectedValueOnce(new Error('AI Server down'));

    render(<DeduplicationDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Không thể kết nối dịch vụ AI. Vui lòng thử lại')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    });

    // Bấm nút Thử lại
    vi.mocked(deduplicationService.getClusters).mockResolvedValueOnce(mockClusters);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => {
      expect(screen.getByText('Nhóm 1')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // MÀN 2: SO SÁNH BÁO CÁO (SIDE-BY-SIDE)
  // =========================================================================
  it('Màn 2: Bấm nút "So sánh" chuyển sang Màn 2 với 3 khối đối chứng song song và kết luận AI', async () => {
    render(<DeduplicationDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-compare-cluster-uuid-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-compare-cluster-uuid-1'));

    await waitFor(() => {
      // BÁO CÁO A
      expect(screen.getByText(/BÁO CÁO A/i)).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText(/08:15 15\/09/)).toBeInTheDocument();

      // BÁO CÁO B
      expect(screen.getByText(/BÁO CÁO B/i)).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
      expect(screen.getByText(/09:30 15\/09/)).toBeInTheDocument();

      // KẾT LUẬN AI
      expect(screen.getByText('KẾT LUẬN AI')).toBeInTheDocument();
      expect(screen.getByText('Giống nhau: 92%')).toBeInTheDocument();
      expect(screen.getByTestId('btn-gop-bao-cao')).toBeInTheDocument();
      expect(screen.getByTestId('btn-khong-trung')).toBeInTheDocument();
    });
  });

  it('Màn 2: Bấm nút "Không trùng" hiển thị toast 3s "Đã đánh dấu 2 báo cáo không trùng lặp" và quay về Màn 1', async () => {
    const mockDistinctRes: MarkDistinctResponse = {
      success: true,
      message: 'Đã đánh dấu 2 báo cáo không trùng lặp',
      cluster_id: 'cluster-uuid-1',
    };
    vi.mocked(deduplicationService.markDistinct).mockResolvedValueOnce(mockDistinctRes);

    render(<DeduplicationDashboard />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('btn-compare-cluster-uuid-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-khong-trung')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-khong-trung'));

    await waitFor(() => {
      expect(deduplicationService.markDistinct).toHaveBeenCalledWith({
        cluster_id: 'cluster-uuid-1',
        version: 1,
      });
      // Hiển thị toast thông báo
      expect(screen.getByText('Đã đánh dấu 2 báo cáo không trùng lặp')).toBeInTheDocument();
      // Quay về Màn 1
      expect(screen.getByText('NHÓM TRÙNG')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // MÀN 3: POPUP XÁC NHẬN GỘP (GỘP BÁO CÁO?)
  // =========================================================================
  it('Màn 3: Bấm nút "Gộp báo cáo" mở popup Màn 3, cho phép chọn báo cáo chính và huỷ', async () => {
    render(<DeduplicationDashboard />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('btn-compare-cluster-uuid-1'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('btn-gop-bao-cao')).toBeInTheDocument();
    });

    // Mở popup Màn 3
    fireEvent.click(screen.getByTestId('btn-gop-bao-cao'));

    // Kiểm tra cấu trúc popup Màn 3
    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('GỘP BÁO CÁO?')).toBeInTheDocument();
    expect(screen.getByText(/Báo cáo phụ sẽ liên kết vào báo cáo chính/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-modal-gop')).toBeInTheDocument();
    expect(screen.getByTestId('btn-modal-huy')).toBeInTheDocument();

    // Bấm nút Huỷ đóng popup và giữ nguyên Màn 2
    fireEvent.click(screen.getByTestId('btn-modal-huy'));
    expect(screen.queryByText('GỘP BÁO CÁO?')).not.toBeInTheDocument();
    expect(screen.getByText('KẾT LUẬN AI')).toBeInTheDocument();
  });

  // =========================================================================
  // MÀN 4: THÔNG BÁO GỘP THÀNH CÔNG (ĐÃ GỘP BÁO CÁO)
  // =========================================================================
  it('Màn 4: Gộp thành công kích hoạt Màn 4 ("ĐÃ GỘP BÁO CÁO", "Người báo cáo nhận thông báo"), bấm "Đóng" quay về Màn 1', async () => {
    const mockMergeRes: MergeIncidentResponse = {
      success: true,
      message: 'Người báo cáo nhận thông báo',
      cluster_id: 'cluster-uuid-1',
      primary_incident_id: 'inc-a-uuid',
      secondary_incident_id: 'inc-b-uuid',
      new_version: 2,
    };
    vi.mocked(deduplicationService.mergeIncidents).mockResolvedValueOnce(mockMergeRes);

    render(<DeduplicationDashboard />);

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('btn-compare-cluster-uuid-1'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('btn-gop-bao-cao'));
    });

    // Bấm nút Gộp trong modal Màn 3
    fireEvent.click(screen.getByTestId('btn-modal-gop'));

    await waitFor(() => {
      // Đóng Màn 3 và kích hoạt mở Màn 4
      expect(screen.getByText('ĐÃ GỘP BÁO CÁO')).toBeInTheDocument();
      expect(screen.getByText('Người báo cáo nhận thông báo')).toBeInTheDocument();
      expect(screen.getByTestId('btn-modal-dong')).toBeInTheDocument();
    });

    // Bấm nút Đóng trên Màn 4
    fireEvent.click(screen.getByTestId('btn-modal-dong'));

    // Điều hướng cán bộ quay về Màn 1 và làm mới danh sách
    await waitFor(() => {
      expect(screen.queryByText('ĐÃ GỘP BÁO CÁO')).not.toBeInTheDocument();
      expect(screen.getByText('NHÓM TRÙNG')).toBeInTheDocument();
    });
  });
});
