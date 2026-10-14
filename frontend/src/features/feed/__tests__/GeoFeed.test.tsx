import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RadiusPickerModal } from '../components/RadiusPickerModal';
import { FeedComposerBox } from '../components/FeedComposerBox';
import { FeedPostCard } from '../components/FeedPostCard';
import { BirthdayBanner } from '../components/BirthdayBanner';
import { FeedContainer } from '../FeedContainer';
import { feedService } from '../services/feedService';
import type { FeedPostItem } from '../types/feed.types';

// Mock feedService
vi.mock('../services/feedService', async () => {
  const actual = await vi.importActual('../services/feedService');
  return {
    ...actual,
    feedService: {
      getGeoFeed: vi.fn(),
      reactToPost: vi.fn(),
    },
  };
});

describe('Feature STT 08: Bảng tin Geo-Feed theo bán kính (SRS pp. 97-102)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockPost: FeedPostItem = {
    post_id: 'post-test-01',
    user_id: 'user-01',
    author: {
      user_id: 'user-01',
      full_name: 'Trần Văn Xanh',
      avatar_url: null,
    },
    content: 'Đã dọn dẹp sạch sẽ bãi rác tự phát tại cầu Bình Lợi! #SaiGonXanh #ZeroWaste',
    visibility: 'PUBLIC',
    address: 'Chân cầu Bình Lợi, Bình Thạnh, TP.HCM',
    latitude: 10.8231,
    longitude: 106.7022,
    distance_meters: 450,
    distance_text: 'Cách bạn 450m',
    reactions_count: 12,
    comments_count: 3,
    user_reaction: null,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    is_edited: false,
    is_hidden: false,
    media_urls: [
      {
        id: 'media-01',
        url: 'https://cdn.greenspot.vn/test1.jpg',
        media_type: 'IMAGE',
      },
    ],
    tagged_friends: [
      {
        user_id: 'friend-01',
        full_name: 'Nguyễn Văn Nam',
      },
    ],
  };

  describe('1. RadiusPickerModal (SRS Màn 3: Điều chỉnh bán kính quét)', () => {
    it('hiển thị cự ly hiện tại và các mốc cự ly nhanh', () => {
      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <RadiusPickerModal
          isOpen={true}
          currentRadius={2.0}
          onApply={handleApply}
          onClose={handleClose}
        />
      );

      expect(screen.getByText('CHỌN BÁN KÍNH')).toBeInTheDocument();
      expect(screen.getByText('2.0 km')).toBeInTheDocument();
      expect(screen.getAllByText('500m').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/5\s*km/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/10\s*km/i).length).toBeGreaterThanOrEqual(1);
    });

    it('cho phép chọn mốc nhanh (ví dụ 5km) và áp dụng', () => {
      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <RadiusPickerModal
          isOpen={true}
          currentRadius={2.0}
          onApply={handleApply}
          onClose={handleClose}
        />
      );

      // Bấm nút preset 5 km
      const btn5km = screen.getByRole('button', { name: '5 km' });
      fireEvent.click(btn5km);

      // Bấm nút Áp dụng
      const btnApply = screen.getByRole('button', { name: 'Áp dụng' });
      fireEvent.click(btnApply);

      expect(handleApply).toHaveBeenCalledWith(5.0);
    });

    it('gọi onClose khi nhấn nút Huỷ', () => {
      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <RadiusPickerModal
          isOpen={true}
          currentRadius={1.0}
          onApply={handleApply}
          onClose={handleClose}
        />
      );

      const btnCancel = screen.getByRole('button', { name: 'Huỷ' });
      fireEvent.click(btnCancel);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. FeedComposerBox (Khung đăng bài nhanh Facebook-style)', () => {
    it('hiển thị gợi ý đăng bài và kích hoạt callback khi nhấp vào', () => {
      const handleOpenCreate = vi.fn();

      render(
        <FeedComposerBox
          userAvatar={null}
          userName="Lê Hoàng"
          onOpenCreatePost={handleOpenCreate}
        />
      );

      expect(screen.getByText(/Lê Hoàng ơi, bạn phát hiện điểm rác thải nào cần phản ánh\?/i)).toBeInTheDocument();
      expect(screen.getByText('Ảnh / Video')).toBeInTheDocument();
      expect(screen.getByText('Gắn vị trí GPS')).toBeInTheDocument();
      expect(screen.getByText('Gắn thẻ bạn bè')).toBeInTheDocument();

      // Click vào nút Ảnh / Video
      fireEvent.click(screen.getByText('Ảnh / Video'));
      expect(handleOpenCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. FeedPostCard (Thẻ bài viết mạng xã hội chuẩn SRS)', () => {
    it('hiển thị đầy đủ thông tin: tác giả, GPS distance badge, hashtag, bạn bè được gắn thẻ', () => {
      render(
        <FeedPostCard
          post={mockPost}
          currentUserId="user-other"
        />
      );

      expect(screen.getByText('Trần Văn Xanh')).toBeInTheDocument();
      expect(screen.getByText('Cách bạn 450m')).toBeInTheDocument();
      expect(screen.getByText('#SaiGonXanh')).toBeInTheDocument();
      expect(screen.getByText('#ZeroWaste')).toBeInTheDocument();
      expect(screen.getByText('Chân cầu Bình Lợi, Bình Thạnh, TP.HCM')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn Nam')).toBeInTheDocument();
      expect(screen.getByText('12 cảm xúc')).toBeInTheDocument();
    });

    it('cho phép thả cảm xúc sinh thái (Eco-Reactions) và gọi API', async () => {
      const handleReact = vi.fn();
      const handleToast = vi.fn();

      render(
        <FeedPostCard
          post={mockPost}
          currentUserId="user-other"
          onReactPost={handleReact}
          onShowToast={handleToast}
        />
      );

      // Bấm nút Cảm xúc
      const reactBtn = screen.getByRole('button', { name: /Cảm xúc/i });
      fireEvent.click(reactBtn);

      expect(handleReact).toHaveBeenCalledWith('post-test-01', 'TREE');
      expect(handleToast).toHaveBeenCalledWith('success', expect.stringContaining('cảm xúc sinh thái'));
    });

    it('hiển thị tuỳ chọn Sửa/Ẩn/Xóa cho chính chủ bài viết (STT 13)', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();
      const handleHide = vi.fn();

      render(
        <FeedPostCard
          post={mockPost}
          currentUserId="user-01" // Chính chủ
          onEditPost={handleEdit}
          onDeletePost={handleDelete}
          onHidePost={handleHide}
        />
      );

      // Mở menu 3 chấm
      const menuBtn = screen.getByRole('button', { name: 'Tuỳ chọn bài viết' });
      fireEvent.click(menuBtn);

      expect(screen.getByText('Sửa bài viết')).toBeInTheDocument();
      expect(screen.getByText('Ẩn bài viết')).toBeInTheDocument();
      expect(screen.getByText('Xóa bài viết')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Sửa bài viết'));
      expect(handleEdit).toHaveBeenCalledWith(mockPost);
    });
  });

  describe('4. BirthdayBanner (Widget chúc mừng sinh nhật bạn bè STT 17)', () => {
    it('hiển thị lời nhắc sinh nhật và cho phép gửi lời chúc', () => {
      const handleWish = vi.fn();

      render(<BirthdayBanner onSendWish={handleWish} />);

      expect(screen.getByText(/Sinh nhật bạn bè hôm nay/i)).toBeInTheDocument();
      const wishBtn = screen.getByRole('button', { name: /Gửi lời chúc xanh/i });
      fireEvent.click(wishBtn);

      expect(handleWish).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Đã gửi lời chúc/i)).toBeInTheDocument();
    });
  });

  describe('5. FeedContainer (Tích hợp luồng mạng xã hội 3 cột và phân quyền khách)', () => {
    it('tải bảng tin Gần tôi mặc định và hiển thị danh sách bài viết', async () => {
      (feedService.getGeoFeed as any).mockResolvedValueOnce({
        items: [mockPost],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      });

      render(<FeedContainer />);

      await waitFor(() => {
        expect(feedService.getGeoFeed).toHaveBeenCalled();
      });

      expect(await screen.findByText('Trần Văn Xanh')).toBeInTheDocument();
      expect(screen.getByText('Cách bạn 450m')).toBeInTheDocument();
    });

    it('hiển thị modal yêu cầu đăng nhập khi khách vãng lai bấm sang tab Bạn bè (SRS Màn 2)', async () => {
      (feedService.getGeoFeed as any).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      });

      // Khách chưa đăng nhập
      localStorage.clear();

      render(<FeedContainer />);

      await waitFor(() => {
        expect(screen.getByText('Bạn bè')).toBeInTheDocument();
      });

      // Bấm tab Bạn bè
      fireEvent.click(screen.getByText('Bạn bè'));

      // Phải xuất hiện modal yêu cầu đăng nhập theo SRS Màn 2
      expect(await screen.findByText('Vui lòng đăng nhập')).toBeInTheDocument();
      expect(screen.getByText(/Bạn cần đăng nhập tài khoản để xem bài viết từ bạn bè/i)).toBeInTheDocument();
    });
  });
});

