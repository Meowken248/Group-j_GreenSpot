import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PenaltyLookupContainer } from '../PenaltyLookupContainer';
import { penaltyService } from '../services/penaltyService';

const mockCategories = [
  {
    category_name: 'Xả rác',
    count: 3,
    icon: '🗑️',
    description: 'Vứt rác sinh hoạt bừa bãi tại vỉa hè, lòng đường.',
  },
  {
    category_name: 'Đốt rác',
    count: 2,
    icon: '🔥',
    description: 'Đốt chất thải rắn sinh hoạt lộ thiên.',
  },
  {
    category_name: 'Nước thải',
    count: 2,
    icon: '💧',
    description: 'Xả nước thải bẩn vào cống thoát nước mưa.',
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
    quick_category: 'Xả rác',
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
  quick_category: 'Xả rác',
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
      'Nước thải',
      'Tiếng ồn',
    ]);
    vi.spyOn(penaltyService, 'searchPenalties').mockResolvedValue({
      items: mockSearchItems,
      total: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
      target: 'INDIVIDUAL',
    });
    vi.spyOn(penaltyService, 'getPenaltyDetail').mockResolvedValue(mockDetailItem);
  });

  // =========================================================================
  // MÀN 1: TÌM KIẾM TỪ KHÓA & DANH MỤC PHỔ BIẾN
  // =========================================================================
  it('Màn 1: Hiển thị đầy đủ ô tìm kiếm và 4 danh mục phổ biến', async () => {
    render(<PenaltyLookupContainer />);

    expect(screen.getByText(/TÌM KIẾM QUY ĐỊNH/i)).toBeInTheDocument();
    expect(screen.getByText(/DANH MỤC PHỔ BIẾN/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Xả rác')).toBeInTheDocument();
      expect(screen.getByText('Đốt rác')).toBeInTheDocument();
      expect(screen.getByText('Nước thải')).toBeInTheDocument();
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

  it('Màn 1: Bấm vào thẻ danh mục nhanh Xả rác -> chuyển sang Màn 2 với bộ lọc tương ứng', async () => {
    render(<PenaltyLookupContainer />);

    const xaRacCard = await screen.findByText('Xả rác');
    fireEvent.click(xaRacCard);

    await waitFor(() => {
      expect(screen.getByTestId('penalty-screen-list')).toBeInTheDocument();
      expect(penaltyService.searchPenalties).toHaveBeenCalledWith(
        expect.objectContaining({ quick_category: 'Xả rác' })
      );
    });
  });

  // =========================================================================
  // MÀN 2: BỘ LỌC ĐỐI TƯỢNG (NHÂN ĐÔI x2) & LĨNH VỰC
  // =========================================================================
  it('Màn 2: Đổi đối tượng sang Tổ chức -> tự động yêu cầu nhân đôi mức phạt', async () => {
    render(<PenaltyLookupContainer />);

    // Vào màn 2 qua danh mục
    const xaRacCard = await screen.findByText('Xả rác');
    fireEvent.click(xaRacCard);

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

    const xaRacCard = await screen.findByText('Xả rác');
    fireEvent.click(xaRacCard);

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

  it('Màn 3: Bấm Báo cáo vi phạm khi chưa đăng nhập -> hiển thị Popup ẩn danh / đăng nhập', async () => {
    render(<PenaltyLookupContainer currentUser={null} />);

    // Mở màn 3
    const xaRacCard = await screen.findByText('Xả rác');
    fireEvent.click(xaRacCard);

    const viewDetailBtn = await screen.findByRole('button', {
      name: /Xem chi tiết Vứt, thải rác/i,
    });
    fireEvent.click(viewDetailBtn);

    const reportBtn = await screen.findByRole('button', {
      name: /Báo cáo vi phạm này/i,
    });
    fireEvent.click(reportBtn);

    expect(await screen.findByTestId('anon-report-modal')).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn có thể báo cáo ẩn danh hoặc đăng nhập để nhận điểm/i)
    ).toBeInTheDocument();
  });
});
