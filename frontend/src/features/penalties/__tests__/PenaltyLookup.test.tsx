import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PenaltyLookupContainer } from '../PenaltyLookupContainer';
import { penaltyService } from '../services/penaltyService';

const mockCategories = [
  {
    category_name: 'Rác thải sinh hoạt',
    count: 3,
    icon: '🗑️',
    description: 'Vứt rác sinh hoạt bừa bãi tại vỉa hè, lòng đường.',
  },
  {
    category_name: 'Rác công nghiệp/nguy hại',
    count: 2,
    icon: '☢️',
    description: 'Chôn lấp chất thải nguy hại trái phép.',
  },
  {
    category_name: 'Nước thải',
    count: 2,
    icon: '💧',
    description: 'Xả nước thải bẩn vào cống thoát nước mưa.',
  },
  {
    category_name: 'Khí thải',
    count: 2,
    icon: '🌫️',
    description: 'Thải khí thải công nghiệp nguy hại vượt chuẩn.',
  },
  {
    category_name: 'Tiếng ồn',
    count: 2,
    icon: '📢',
    description: 'Gây tiếng ồn vượt quy chuẩn kỹ thuật.',
  },
];

const mockSearchItems = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Vứt, thải rác sinh hoạt trên vỉa hè, lòng đường',
    domain: 'Rác thải sinh hoạt',
    quick_category: null,
    target: 'INDIVIDUAL' as const,
    displayed_min_fine: 1000000,
    displayed_max_fine: 2000000,
    displayed_avg_fine: 1500000,
    legal_basis: 'Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP',
    amendment_warning: null,
  },
];

const mockDetailItem = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Vứt, thải rác sinh hoạt trên vỉa hè, lòng đường',
  domain: 'Rác thải sinh hoạt',
  quick_category: null,
  target: 'INDIVIDUAL' as const,
  min_fine: 1000000,
  max_fine: 2000000,
  avg_fine: 1500000,
  description: 'Hành vi vứt, thải rác sinh hoạt trên vỉa hè, lòng đường hoặc vào hệ thống cống rãnh.',
  aggravating_circumstances: 'Tái phạm nhiều lần hoặc xả thải với khối lượng trên 1m3.',
  supplementary_measures: 'Buộc khôi phục lại tình trạng môi trường ban đầu.',
  legal_basis: 'Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP',
  effective_date: '2022-08-25',
  amendment_warning: null,
  version: 1,
};

describe('PenaltyLookupContainer Feature Tests (STT 11: Màn 1 -> Màn 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(penaltyService, 'getQuickCategories').mockResolvedValue(mockCategories);
    vi.spyOn(penaltyService, 'getDomains').mockResolvedValue([
      'Rác thải sinh hoạt',
      'Rác công nghiệp/nguy hại',
      'Nước thải',
      'Khí thải',
      'Tiếng ồn',
    ]);
    vi.spyOn(penaltyService, 'getDomainCounts').mockResolvedValue({
      'Rác thải sinh hoạt': 3,
      'Rác công nghiệp/nguy hại': 2,
      'Nước thải': 2,
      'Khí thải': 2,
      'Tiếng ồn': 2,
    });
    vi.spyOn(penaltyService, 'searchPenalties').mockResolvedValue({
      items: mockSearchItems,
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
      target: 'INDIVIDUAL',
    });
    vi.spyOn(penaltyService, 'getPenaltyDetail').mockResolvedValue(mockDetailItem);
    vi.spyOn(penaltyService, 'submitPenaltyReport').mockResolvedValue({
      id: 'rep-test-123',
      tracking_code: 'INC-20261012-ABCDE',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      violation_title: mockDetailItem.title,
      legal_basis: mockDetailItem.legal_basis,
      fine_range: '1.000.000 đ - 2.000.000 đ',
      address_text: 'Trước số nhà 12 Đường ABC, Phường X',
      description: 'Hộ gia đình xả rác bừa bãi ra vỉa hè gây nghẽn cống',
      is_anonymous: true,
      reporter_id: null,
      notes: null,
    });
  });

  // =========================================================================
  // MÀN 1: TÌM KIẾM TỪ KHÓA & LĨNH VỰC MÔI TRƯỜNG
  // =========================================================================
  it('Màn 1: Hiển thị đầy đủ ô tìm kiếm và 5 lĩnh vực môi trường', async () => {
    render(<PenaltyLookupContainer />);

    expect(screen.getByText(/TÌM KIẾM QUY ĐỊNH/i)).toBeInTheDocument();
    expect(screen.getByText(/LĨNH VỰC MÔI TRƯỜNG/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Rác thải sinh hoạt')).toBeInTheDocument();
      expect(screen.getByText('Rác công nghiệp/nguy hại')).toBeInTheDocument();
      expect(screen.getByText('Nước thải')).toBeInTheDocument();
      expect(screen.getByText('Khí thải')).toBeInTheDocument();
      expect(screen.getByText('Tiếng ồn')).toBeInTheDocument();
    });
  });

  it('Màn 1: Để trống từ khóa mà bấm nút Tìm -> hiển thị dòng nhắc lỗi viền đỏ', async () => {
    render(<PenaltyLookupContainer />);

    const searchBtn = screen.getByRole('button', { name: /Nút Tìm kiếm/i });
    fireEvent.click(searchBtn);

    expect(
      await screen.findByText(/Vui lòng nhập từ khoá tìm kiếm/i)
    ).toBeInTheDocument();
  });

  it('Màn 1: Nhập từ khóa hợp lệ và bấm Tìm -> chuyển sang Màn 2 hiển thị kết quả', async () => {
    render(<PenaltyLookupContainer />);

    const input = screen.getByLabelText(/Từ khóa tìm kiếm/i);
    fireEvent.change(input, { target: { value: 'vỉa hè' } });

    const searchBtn = screen.getByRole('button', { name: /Nút Tìm kiếm/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByTestId('penalty-screen-list')).toBeInTheDocument();
      expect(
        screen.getByText(/Vứt, thải rác sinh hoạt trên vỉa hè/i)
      ).toBeInTheDocument();
    });
  });

  it('Màn 1: Bấm vào thẻ lĩnh vực Rác thải sinh hoạt -> chuyển sang Màn 2 với bộ lọc tương ứng', async () => {
    render(<PenaltyLookupContainer />);

    const card = await screen.findByText('Rác thải sinh hoạt');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId('penalty-screen-list')).toBeInTheDocument();
      expect(penaltyService.searchPenalties).toHaveBeenCalledWith(
        expect.objectContaining({ domain: 'Rác thải sinh hoạt' })
      );
    });
  });

  // =========================================================================
  // MÀN 2: BỘ LỌC ĐỐI TƯỢNG (NHÂN ĐÔI x2) & LĨNH VỰC
  // =========================================================================
  it('Màn 2: Đổi đối tượng sang Tổ chức -> tự động yêu cầu nhân đôi mức phạt', async () => {
    render(<PenaltyLookupContainer />);

    // Vào màn 2 qua lĩnh vực
    const card = await screen.findByText('Rác thải sinh hoạt');
    fireEvent.click(card);

    await waitFor(() => {
      expect(screen.getByTestId('penalty-screen-list')).toBeInTheDocument();
    });

    // Bấm chọn Tổ chức
    const orgRadio = screen.getByRole('radio', { name: /Tổ chức/i });
    fireEvent.click(orgRadio);

    await waitFor(() => {
      expect(penaltyService.searchPenalties).toHaveBeenCalledWith(
        expect.objectContaining({ target: 'ORGANIZATION' })
      );
    });
  });

  // =========================================================================
  // MÀN 3: CHI TIẾT ĐIỀU LUẬT & POPUP BÁO CÁO VI PHẠM
  // =========================================================================
  it('Màn 2 -> Màn 3: Bấm Xem chi tiết mở Màn 3 với đầy đủ 3 khối thông tin', async () => {
    render(<PenaltyLookupContainer />);

    const card = await screen.findByText('Rác thải sinh hoạt');
    fireEvent.click(card);

    const viewDetailBtn = await screen.findByRole('button', {
      name: /Xem chi tiết Vứt, thải rác/i,
    });
    fireEvent.click(viewDetailBtn);

    await waitFor(() => {
      expect(screen.getByTestId('penalty-screen-detail')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /HÀNH VI VI PHẠM/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /MỨC PHẠT TIỀN & BIỆN PHÁP/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /CĂN CỨ PHÁP LÝ/i })).toBeInTheDocument();
    });
  });

  it('Màn 3: Bấm Báo cáo vi phạm -> mở Form phản ánh tại chỗ với thông tin điền sẵn từ điều luật', async () => {
    render(<PenaltyLookupContainer currentUser={null} />);

    // Mở màn 3
    const card = await screen.findByText('Rác thải sinh hoạt');
    fireEvent.click(card);

    const viewDetailBtn = await screen.findByRole('button', {
      name: /Xem chi tiết Vứt, thải rác/i,
    });
    fireEvent.click(viewDetailBtn);

    const reportBtn = await screen.findByRole('button', {
      name: /Báo cáo vi phạm này/i,
    });
    fireEvent.click(reportBtn);

    // Kiểm tra Form phản ánh tại chỗ hiển thị
    const modal = await screen.findByTestId('anon-report-modal');
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByRole('heading', { name: /Gửi phản ánh vi phạm môi trường/i })
    ).toBeInTheDocument();

    // Điền sẵn thông tin hành vi vi phạm & căn cứ pháp lý bên trong modal
    expect(within(modal).getByText('Vứt, thải rác sinh hoạt trên vỉa hè, lòng đường')).toBeInTheDocument();
    expect(within(modal).getByText(/Khoản 2 Điều 25 Nghị định 45\/2022\/NĐ-CP/i)).toBeInTheDocument();

    // Tùy chọn danh tính
    expect(within(modal).getByText(/Gửi báo cáo ẩn danh/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Gửi bằng tài khoản/i)).toBeInTheDocument();

    // Các trường nhập liệu
    expect(within(modal).getByTestId('report-location-input')).toBeInTheDocument();
    expect(within(modal).getByTestId('report-desc-input')).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-submit-report')).toBeInTheDocument();
  });

  it('Màn 3: Nhập vị trí & mô tả -> Xác nhận gửi thành công, hiển thị mã hồ sơ và đóng modal quay lại tra cứu', async () => {
    render(<PenaltyLookupContainer currentUser={null} />);

    // Mở màn 3
    const card = await screen.findByText('Rác thải sinh hoạt');
    fireEvent.click(card);

    const viewDetailBtn = await screen.findByRole('button', {
      name: /Xem chi tiết Vứt, thải rác/i,
    });
    fireEvent.click(viewDetailBtn);

    const reportBtn = await screen.findByRole('button', {
      name: /Báo cáo vi phạm này/i,
    });
    fireEvent.click(reportBtn);

    expect(await screen.findByTestId('anon-report-modal')).toBeInTheDocument();

    // Nhập địa chỉ & mô tả vi phạm
    fireEvent.change(screen.getByTestId('report-location-input'), {
      target: { value: 'Trước số nhà 12 Đường ABC, Phường X' },
    });
    fireEvent.change(screen.getByTestId('report-desc-input'), {
      target: { value: 'Hộ gia đình xả rác bừa bãi ra vỉa hè gây nghẽn cống' },
    });

    // Bấm gửi phản ánh
    fireEvent.click(screen.getByTestId('btn-submit-report'));

    // Hiển thị thông báo tiếp nhận phản ánh thành công
    await waitFor(() => {
      expect(screen.getByTestId('report-success-state')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /Tiếp nhận phản ánh thành công!/i })
      ).toBeInTheDocument();
    });

    // Kiểm tra có mã hồ sơ theo dõi
    expect(screen.getByText(/Mã hồ sơ theo dõi:/i)).toBeInTheDocument();

    // Bấm Đóng & Quay lại tra cứu -> Người dùng vẫn ở Màn 3 chi tiết điều luật
    fireEvent.click(screen.getByTestId('btn-close-success'));

    expect(screen.queryByTestId('anon-report-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-success-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('penalty-screen-detail')).toBeInTheDocument();
  });
});

