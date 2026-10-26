import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharePostModal } from '../components/SharePostModal';
import { commentService } from '../services/commentService';

// Mock commentService
vi.mock('../services/commentService', () => ({
  commentService: {
    sharePost: vi.fn(),
    getFriendsForShare: vi.fn(),
    getGroupsForShare: vi.fn(),
  },
}));

describe('Feature STT 14: Popup Chia sẻ bài viết (Màn 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFriends = [
    { user_id: 'friend-01', full_name: 'Lê Hoàng Minh', avatar_url: null },
    { user_id: 'friend-02', full_name: 'Phạm Thị Thúy', avatar_url: null },
  ];

  const mockGroups = [
    {
      group_id: 'group-01',
      name: 'Chiến binh Xanh Kênh Nhiêu Lộc',
      members_count: 640,
      can_post: true,
    },
    {
      group_id: 'group-02',
      name: 'Tái chế Nhựa Thủ Đức (Cần duyệt bài)',
      members_count: 850,
      can_post: false, // Không có quyền đăng
    },
  ];

  it('1. Hiển thị đúng cấu trúc Popup: Header "POPUP", tiêu đề "CHIA SẺ BÀI VIẾT" và 4 lựa chọn', () => {
    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        onClose={vi.fn()}
        onShareSuccess={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    expect(screen.getByText('POPUP')).toBeInTheDocument();
    expect(screen.getByText('CHIA SẺ BÀI VIẾT')).toBeInTheDocument();
    expect(screen.getByText('Chia sẻ lên bảng tin')).toBeInTheDocument();
    expect(screen.getByText('Gửi cho bạn bè')).toBeInTheDocument();
    expect(screen.getByText('Đăng vào nhóm')).toBeInTheDocument();
    expect(screen.getByText('Sao chép liên kết')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument();
  });

  it('2. Riêng "Sao chép liên kết" thực hiện ngay khi bấm, không cần bấm "Chia sẻ" (SRS Màn 3)', async () => {
    const mockShowToast = vi.fn();
    const mockClose = vi.fn();

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(commentService.sharePost).mockResolvedValue({
      success: true,
      message: 'Đã sao chép liên kết',
      shares_count: 6,
      share_id: 'share-01',
    });

    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        onClose={mockClose}
        onShareSuccess={vi.fn()}
        onShowToast={mockShowToast}
      />
    );

    const copyOption = screen.getByText('Sao chép liên kết');
    fireEvent.click(copyOption);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('#post-comments?id=post-test-14')
      );
      expect(mockShowToast).toHaveBeenCalledWith('success', 'Đã sao chép liên kết');
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('3. Khi chọn "Gửi cho bạn bè", phải chọn ít nhất 1 bạn bè mới bấm được "Chia sẻ"', async () => {
    vi.mocked(commentService.getFriendsForShare).mockResolvedValue(mockFriends);

    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        onClose={vi.fn()}
        onShareSuccess={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    // Chọn option Gửi cho bạn bè
    fireEvent.click(screen.getByText('Gửi cho bạn bè'));

    // Chờ danh sách bạn bè nạp
    await waitFor(() => {
      expect(screen.getByText('Lê Hoàng Minh')).toBeInTheDocument();
      expect(screen.getByText('Phạm Thị Thúy')).toBeInTheDocument();
    });

    const shareBtn = screen.getByRole('button', { name: 'Chia sẻ' });

    // Khi chưa chọn ai: Nút chia sẻ bị disable và có dòng nhắc
    expect(shareBtn).toBeDisabled();
    expect(
      screen.getByText('Vui lòng chọn ít nhất 1 người nhận')
    ).toBeInTheDocument();

    // Tích chọn 1 bạn bè -> Nút chia sẻ sáng lên
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(shareBtn).not.toBeDisabled();
  });

  it('4. Khi chọn "Đăng vào nhóm", nhóm không có quyền sẽ bị làm mờ và gắn nhãn cảnh báo', async () => {
    vi.mocked(commentService.getGroupsForShare).mockResolvedValue(mockGroups);

    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        onClose={vi.fn()}
        onShareSuccess={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Đăng vào nhóm'));

    await waitFor(() => {
      expect(screen.getByText('Chiến binh Xanh Kênh Nhiêu Lộc')).toBeInTheDocument();
      expect(
        screen.getByText('Tái chế Nhựa Thủ Đức (Cần duyệt bài)')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Bạn không có quyền đăng vào nhóm này')
      ).toBeInTheDocument();
    });
  });

  it('5. Hiển thị các nút mạng xã hội (Facebook, Zalo, X, Telegram, LinkedIn) và mở cửa sổ chia sẻ khi bấm vào', async () => {
    const mockWindowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    const mockOnShareSuccess = vi.fn();
    const mockClose = vi.fn();

    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        onClose={mockClose}
        onShareSuccess={mockOnShareSuccess}
        onShowToast={vi.fn()}
      />
    );

    // Kiểm tra hiển thị các nút mạng xã hội
    expect(screen.getByRole('button', { name: 'Chia sẻ lên Facebook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ qua Zalo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ lên X (Twitter)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ qua Telegram' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chia sẻ lên LinkedIn' })).toBeInTheDocument();

    // Bấm nút Facebook
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ lên Facebook' }));
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer'),
        '_blank',
        expect.any(String)
      );
      expect(mockOnShareSuccess).toHaveBeenCalledWith(expect.stringContaining('Facebook'));
      expect(mockClose).toHaveBeenCalled();
    });

    mockWindowOpen.mockRestore();
  });

  it('6. Khi chia sẻ sang app khác, nội dung bài viết và tên tác giả được lấy đầy đủ', async () => {
    const mockWindowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share: mockShare });

    render(
      <SharePostModal
        isOpen={true}
        postId="post-test-14"
        postContent="Hôm nay đội mình vừa dọn sạch rạch rác Linh Trung, trả lại dòng nước xanh mát!"
        authorName="Nguyễn Thành Đạt"
        onClose={vi.fn()}
        onShareSuccess={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    // Bấm nút Twitter/X -> Kiểm tra URL có chứa nội dung bài viết và tên tác giả
    fireEvent.click(screen.getByRole('button', { name: 'Chia sẻ lên X (Twitter)' }));
    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('Nguy%E1%BB%85n%20Th%C3%A0nh%20%C4%90%E1%BA%A1t'),
        '_blank',
        expect.any(String)
      );
    });

    // Bấm nút Ứng dụng khác... (Web Share API)
    const otherAppBtn = screen.getByRole('button', { name: 'Mở menu chia sẻ hệ thống' });
    fireEvent.click(otherAppBtn);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Nguyễn Thành Đạt'),
          text: expect.stringContaining('dọn sạch rạch rác Linh Trung'),
        })
      );
    });

    mockWindowOpen.mockRestore();
  });
});

