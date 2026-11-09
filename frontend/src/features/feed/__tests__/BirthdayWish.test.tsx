import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BirthdayBanner } from '../components/BirthdayBanner';
import { BirthdayInboxModal } from '../components/BirthdayInboxModal';
import { BirthdayWishModal, MAX_WISH_LENGTH } from '../components/BirthdayWishModal';
import { birthdayService } from '../services/birthdayService';
import type {
  BirthdayCardTemplate,
  BirthdayFriendItem,
  BirthdayTodayResponse,
  BirthdayWishListResponse,
} from '../types/birthday.types';

// Mock service: toàn bộ dữ liệu sinh nhật đi qua API /api/v1/birthday/*
vi.mock('../services/birthdayService', () => ({
  birthdayService: {
    getTodayBirthdays: vi.fn(),
    getCardTemplates: vi.fn(),
    sendWish: vi.fn(),
    getReceivedWishes: vi.fn(),
    markWishesRead: vi.fn(),
  },
}));

const mockTemplates: BirthdayCardTemplate[] = [
  {
    card_id: 'card-green-forest',
    name: 'Rừng Xanh Việt',
    tagline: 'Một cánh rừng nhỏ gửi tặng người bạn xanh',
    icon: '🌳',
    gradient_from: '#ecfdf5',
    gradient_to: '#a7f3d0',
    accent_color: '#047857',
    suggestion: 'Chúc mừng sinh nhật {name}! Chúc bạn một năm mới ngập tràn cây xanh và niềm vui.',
  },
  {
    card_id: 'card-eco-cycle',
    name: 'Vòng Tuần Hoàn',
    tagline: 'Lan toả thông điệp sống xanh, sống khoẻ',
    icon: '♻️',
    gradient_from: '#eff6ff',
    gradient_to: '#bfdbfe',
    accent_color: '#1d4ed8',
    suggestion: 'Sinh nhật vui vẻ {name}! Cảm ơn bạn đã cùng GreenSpot lan toả lối sống xanh.',
  },
];

const mockFriend: BirthdayFriendItem = {
  user_id: 'friend-bday-01',
  full_name: 'Lê Hoàng Phúc',
  avatar_url: null,
  date_of_birth: '2000-10-21',
  age: 26,
  citizen_level_name: 'Công dân xanh',
  card_sent_today: false,
  wish_sent_today: false,
};

const mockToday: BirthdayTodayResponse = {
  items: [mockFriend],
  total: 1,
  has_more: false,
  limit: 3,
  today: '2026-10-21',
  points_per_card: 5,
  daily_points_cap: 25,
  daily_points_earned: 10,
  daily_reward_limit_reached: false,
  card_templates: mockTemplates,
  default_suggestion: 'Chúc mừng sinh nhật {name}! Chúc bạn một ngày thật xanh và tràn đầy niềm vui.',
};

const renderModal = (overrides: Partial<ComponentProps<typeof BirthdayWishModal>> = {}) => {
  const onClose = vi.fn();
  const onSent = vi.fn();

  render(
    <BirthdayWishModal
      friend={mockFriend}
      initialWishType="MESSAGE"
      templates={mockTemplates}
      defaultSuggestion={mockToday.default_suggestion}
      pointsPerCard={mockToday.points_per_card}
      dailyPointsEarned={mockToday.daily_points_earned}
      dailyPointsCap={mockToday.daily_points_cap}
      dailyRewardLimitReached={false}
      onClose={onClose}
      onSent={onSent}
      {...overrides}
    />
  );

  return { onClose, onSent };
};

describe('Feature STT 17: Sinh nhật bạn bè & thiệp xanh sinh thái', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (birthdayService.getTodayBirthdays as any).mockResolvedValue(mockToday);
  });

  describe('1. Banner "Sinh nhật bạn bè hôm nay" trên Bảng tin', () => {
    it('hiển thị bạn bè sinh nhật, tuổi và điểm thưởng thiệp xanh trong ngày', async () => {
      render(<BirthdayBanner />);

      expect(await screen.findByText('Lê Hoàng Phúc')).toBeInTheDocument();
      expect(screen.getByText(/26 tuổi/)).toBeInTheDocument();
      expect(screen.getByText(/🌿 10\/25 điểm/)).toBeInTheDocument();
      expect(screen.getByText(/Chưa tặng thiệp xanh/)).toBeInTheDocument();
      expect(birthdayService.getTodayBirthdays).toHaveBeenCalledWith(3);
    });

    it('hiển thị nút "Xem tất cả" khi còn nhiều bạn sinh nhật hơn giới hạn', async () => {
      (birthdayService.getTodayBirthdays as any).mockResolvedValueOnce({
        ...mockToday,
        total: 7,
        has_more: true,
      });

      render(<BirthdayBanner />);

      expect(await screen.findByRole('button', { name: /Xem tất cả 7 người/i })).toBeInTheDocument();
    });

    it('ẩn banner khi API lỗi để không làm hỏng Bảng tin', async () => {
      (birthdayService.getTodayBirthdays as any).mockRejectedValueOnce(new Error('Network Error'));

      const { container } = render(<BirthdayBanner />);

      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });

    it('hiển thị skeleton trong lúc chờ API', () => {
      (birthdayService.getTodayBirthdays as any).mockReturnValueOnce(new Promise(() => {}));

      const { container } = render(<BirthdayBanner />);

      expect(container.querySelector('.birthday-banner-skeleton')).toBeInTheDocument();
    });
  });
});


describe('2. Popup gửi lời chúc / tặng thiệp xanh', () => {
  const mockSendResult = {
    success: true,
    wish_id: 'wish-01',
    wish_type: 'MESSAGE' as const,
    recipient_id: mockFriend.user_id,
    recipient_name: mockFriend.full_name,
    message: 'Chúc mừng sinh nhật Phúc!',
    points_awarded: 0,
    daily_limit_reached: false,
    sender_total_green_points: 120,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (birthdayService.sendWish as any).mockResolvedValue(mockSendResult);
  });

  it('gửi lời chúc xanh thành công với nội dung đã chuẩn hoá khoảng trắng', async () => {
    const { onSent } = renderModal();

    fireEvent.change(screen.getByLabelText(/Lời chúc của bạn/i), {
      target: { value: '  Chúc mừng   sinh nhật Phúc!  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /🌱 Gửi lời chúc/i }));

    await waitFor(() => {
      expect(birthdayService.sendWish).toHaveBeenCalledWith({
        recipient_id: mockFriend.user_id,
        wish_type: 'MESSAGE',
        card_template_id: null,
        message: 'Chúc mừng sinh nhật Phúc!',
      });
    });
    expect(onSent).toHaveBeenCalledWith(mockSendResult, 'MESSAGE');
  });

  it('chặn gửi khi lời chúc để trống', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/Lời chúc của bạn/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /🌱 Gửi lời chúc/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng nhập lời chúc sinh nhật.');
    expect(birthdayService.sendWish).not.toHaveBeenCalled();
  });

  it(`giới hạn lời chúc tối đa ${MAX_WISH_LENGTH} ký tự`, () => {
    renderModal();

    const textarea = screen.getByLabelText(/Lời chúc của bạn/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'a'.repeat(MAX_WISH_LENGTH + 50) } });

    expect(textarea.value).toHaveLength(MAX_WISH_LENGTH);
    expect(screen.getByText(`${MAX_WISH_LENGTH}/${MAX_WISH_LENGTH}`)).toBeInTheDocument();
  });

  it('tặng thiệp xanh gửi kèm mã mẫu thiệp đã chọn', async () => {
    const { onSent } = renderModal({ initialWishType: 'CARD' });

    fireEvent.click(screen.getByRole('radio', { name: /Vòng Tuần Hoàn/i }));
    fireEvent.click(screen.getByRole('button', { name: /🎁 Tặng thiệp xanh/i }));

    await waitFor(() => {
      expect(birthdayService.sendWish).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: mockFriend.user_id,
          wish_type: 'CARD',
          card_template_id: 'card-eco-cycle',
        })
      );
    });
    expect(onSent).toHaveBeenCalledWith(mockSendResult, 'CARD');
  });

  it('hiển thị thông điệp lỗi từ backend khi đã gửi lời chúc trong ngày', async () => {
    (birthdayService.sendWish as any).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error_code: 'ALREADY_SENT', message: 'Bạn đã gửi lời chúc cho người bạn này hôm nay.' },
      },
    });

    const { onSent } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /🌱 Gửi lời chúc/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bạn đã gửi lời chúc cho người bạn này hôm nay.'
    );
    expect(onSent).not.toHaveBeenCalled();
  });

  it('đóng popup khi bấm nút Huỷ', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('3. Hộp thư lời chúc & thiệp xanh đã nhận', () => {
  const mockInbox: BirthdayWishListResponse = {
    items: [
      {
        wish_id: 'wish-inbox-01',
        sender_id: 'sender-01',
        sender_name: 'Trần Minh Anh',
        sender_avatar_url: null,
        wish_type: 'CARD',
        card_template_id: 'card-green-forest',
        message: 'Chúc mừng sinh nhật bạn! Chúc bạn một năm mới thật xanh.',
        points_awarded: 5,
        is_read: false,
        birthday_date: '2026-10-21',
        created_at: '2026-10-21T08:15:00+07:00',
      },
      {
        wish_id: 'wish-inbox-02',
        sender_id: 'sender-02',
        sender_name: 'Phạm Gia Hân',
        sender_avatar_url: null,
        wish_type: 'MESSAGE',
        card_template_id: null,
        message: 'Sinh nhật vui vẻ nhé!',
        points_awarded: 0,
        is_read: true,
        birthday_date: '2026-10-21',
        created_at: '2026-10-20T09:00:00+07:00',
      },
    ],
    total: 2,
    unread_count: 1,
    has_more: false,
    limit: 20,
    offset: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (birthdayService.getReceivedWishes as any).mockResolvedValue(mockInbox);
    (birthdayService.markWishesRead as any).mockResolvedValue({
      success: true,
      marked_count: 1,
      unread_count: 0,
    });
  });

  it('hiển thị lời chúc, thiệp xanh và số lượng chưa đọc trong hộp thư', async () => {
    render(<BirthdayInboxModal templates={mockTemplates} onClose={vi.fn()} />);

    expect(await screen.findByText('Trần Minh Anh')).toBeInTheDocument();
    expect(screen.getByText('Phạm Gia Hân')).toBeInTheDocument();
    expect(
      screen.getByText('Chúc mừng sinh nhật bạn! Chúc bạn một năm mới thật xanh.')
    ).toBeInTheDocument();
    expect(screen.getByText(/💌 Rừng Xanh Việt/)).toBeInTheDocument();
    expect(screen.getByText('+5 điểm xanh')).toBeInTheDocument();
    expect(screen.getByText('Chưa đọc')).toBeInTheDocument();
    expect(screen.getByText(/1 lời chúc chưa đọc/)).toBeInTheDocument();
    expect(birthdayService.getReceivedWishes).toHaveBeenCalledWith(20, 0);
  });

  it('đánh dấu tất cả đã đọc và cập nhật huy hiệu chưa đọc', async () => {
    const onUnreadChange = vi.fn();
    render(
      <BirthdayInboxModal templates={mockTemplates} onClose={vi.fn()} onUnreadChange={onUnreadChange} />
    );

    fireEvent.click(await screen.findByRole('button', { name: /Đánh dấu tất cả đã đọc/i }));

    await waitFor(() => {
      expect(birthdayService.markWishesRead).toHaveBeenCalledWith();
    });
    await waitFor(() => {
      expect(onUnreadChange).toHaveBeenCalledWith(0);
    });
    expect(screen.queryByText('Chưa đọc')).not.toBeInTheDocument();
  });

  it('hiển thị trạng thái rỗng khi chưa nhận được lời chúc nào', async () => {
    (birthdayService.getReceivedWishes as any).mockResolvedValue({
      items: [],
      total: 0,
      unread_count: 0,
      has_more: false,
      limit: 20,
      offset: 0,
    });

    render(<BirthdayInboxModal onClose={vi.fn()} />);

    expect(await screen.findByText(/Chưa có lời chúc nào trong hộp thư/i)).toBeInTheDocument();
  });

  it('banner vẫn hiển thị nút hộp thư khi hôm nay không có ai sinh nhật nhưng có lời chúc chưa đọc', async () => {
    (birthdayService.getTodayBirthdays as any).mockResolvedValue({
      ...mockToday,
      items: [],
      total: 0,
      has_more: false,
    });

    render(<BirthdayBanner />);

    const inboxButton = await screen.findByRole('button', { name: /Hộp thư lời chúc/i });
    expect(inboxButton).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(inboxButton);

    expect(await screen.findByRole('dialog', { name: /Hộp thư lời chúc của bạn/i })).toBeInTheDocument();
  });
});

