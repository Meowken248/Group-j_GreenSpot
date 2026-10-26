import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UnfriendModal } from '../components/UnfriendModal';
import { FriendRequestsView } from '../components/FriendRequestsView';
import { FriendListView } from '../components/FriendListView';
import type { FriendItem, FriendRequestItem, GreenCitizenSuggestion, FollowingItem } from '../types';

describe('Friends & Follows Domain Unit & Component Tests (Chức năng 6)', () => {
  // =========================================================================
  // 1. MÀN 3: POPUP XÁC NHẬN HỦY KẾT BẠN (UnfriendModal)
  // =========================================================================
  describe('UnfriendModal (Màn 3/3 Popup)', () => {
    const mockFriend: FriendItem = {
      user_id: '1111-2222-3333-4444',
      full_name: 'Hoàng Văn Tuấn',
      avatar_url: null,
      district: 'TP. Thủ Đức',
      status: 'ACTIVE',
      is_suspended: false,
      total_green_points: 820,
      is_online: true,
      friends_count: 50,
      friendship_created_at: '2026-01-01T00:00:00Z',
    };

    it('render đúng tiêu đề HUỶ KẾT BẠN?, tên người bạn và nội dung cảnh báo', () => {
      render(
        <UnfriendModal
          friend={mockFriend}
          isOpen={true}
          isProcessing={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText('HUỶ KẾT BẠN?')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Văn Tuấn')).toBeInTheDocument();
      expect(
        screen.getByText(/Hai người sẽ không còn xem được bài viết bạn bè của nhau/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Xác nhận hủy')).toBeInTheDocument();
      expect(screen.getByText('Đóng')).toBeInTheDocument();
    });

    it('hiển thị trạng thái "Đang xử lý…" khi isProcessing = true và vô hiệu hóa nút', () => {
      render(
        <UnfriendModal
          friend={mockFriend}
          isOpen={true}
          isProcessing={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      );

      expect(screen.getByText('Đang xử lý…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đang xử lý…' })).toBeDisabled();
    });

    it('gọi callback onConfirm khi click nút Xác nhận hủy', () => {
      const handleConfirm = vi.fn();
      render(
        <UnfriendModal
          friend={mockFriend}
          isOpen={true}
          isProcessing={false}
          onClose={vi.fn()}
          onConfirm={handleConfirm}
        />
      );

      fireEvent.click(screen.getByText('Xác nhận hủy'));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 2. MÀN 1: LỜI MỜI KẾT BẠN & GỢI Ý CÔNG DÂN XANH (FriendRequestsView)
  // =========================================================================
  describe('FriendRequestsView (Màn 1)', () => {
    const mockRequests: FriendRequestItem[] = [
      {
        request_id: 'req-1',
        sender_id: 'u-1',
        sender_name: 'Nguyễn Văn An',
        sender_avatar: null,
        district: 'Quận 1',
        mutual_friends_count: 3,
        status: 'PENDING',
        created_at: '2026-10-01T00:00:00Z',
      },
    ];

    const mockSuggestions: GreenCitizenSuggestion[] = [
      {
        user_id: 'sug-1',
        full_name: 'Đặng Hải Yến',
        avatar_url: null,
        district: 'Quận Tân Bình',
        total_green_points: 580,
        mutual_friends_count: 2,
        is_following: false,
        has_pending_request: false,
      },
    ];

    it('render đầy đủ danh sách lời mời kèm số bạn chung và nút Chấp nhận/Từ chối', () => {
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <FriendRequestsView
          requests={mockRequests}
          suggestions={mockSuggestions}
          loadingRequests={false}
          loadingSuggestions={false}
          onAcceptRequest={onAccept}
          onRejectRequest={onReject}
          onSendRequest={vi.fn()}
          onToggleFollow={vi.fn()}
        />
      );

      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText(/3 bạn chung/i)).toBeInTheDocument();
      expect(screen.getByText('Chấp nhận')).toBeInTheDocument();
      expect(screen.getByText('Từ chối')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Chấp nhận'));
      expect(onAccept).toHaveBeenCalledWith(mockRequests[0]);

      fireEvent.click(screen.getByText('Từ chối'));
      expect(onReject).toHaveBeenCalledWith(mockRequests[0]);
    });

    it('render khối gợi ý công dân xanh kèm điểm tích lũy và nút Kết bạn / Theo dõi', () => {
      const onSend = vi.fn();
      const onFollow = vi.fn();

      render(
        <FriendRequestsView
          requests={mockRequests}
          suggestions={mockSuggestions}
          loadingRequests={false}
          loadingSuggestions={false}
          onAcceptRequest={vi.fn()}
          onRejectRequest={vi.fn()}
          onSendRequest={onSend}
          onToggleFollow={onFollow}
        />
      );

      expect(screen.getByText('Đặng Hải Yến')).toBeInTheDocument();
      expect(screen.getByText(/580 điểm xanh/i)).toBeInTheDocument();
      expect(screen.getByText('+ Kết bạn')).toBeInTheDocument();
      expect(screen.getByText('Theo dõi')).toBeInTheDocument();

      fireEvent.click(screen.getByText('+ Kết bạn'));
      expect(onSend).toHaveBeenCalledWith(mockSuggestions[0]);

      fireEvent.click(screen.getByText('Theo dõi'));
      expect(onFollow).toHaveBeenCalledWith(mockSuggestions[0]);
    });
  });

  // =========================================================================
  // 3. MÀN 2: QUẢN LÝ BẠN BÈ & ĐANG THEO DÕI (FriendListView)
  // =========================================================================
  describe('FriendListView (Màn 2)', () => {
    const mockFriends: FriendItem[] = [
      {
        user_id: 'fr-active',
        full_name: 'Đỗ Bích Ngân',
        avatar_url: null,
        district: 'Quận 1',
        status: 'ACTIVE',
        is_suspended: false,
        total_green_points: 460,
        is_online: true,
        friends_count: 32,
        friendship_created_at: '2026-05-01T00:00:00Z',
      },
      {
        user_id: 'fr-suspended',
        full_name: 'Bùi Tiến Dũng',
        avatar_url: null,
        district: 'Huyện Bình Chánh',
        status: 'SUSPENDED',
        is_suspended: true,
        total_green_points: 90,
        is_online: false,
        friends_count: 10,
        friendship_created_at: '2026-02-01T00:00:00Z',
      },
    ];

    const mockFollowing: FollowingItem[] = [
      {
        user_id: 'fol-1',
        full_name: 'Phạm Minh Đức',
        avatar_url: null,
        district: 'Quận 7',
        total_green_points: 450,
        status: 'ACTIVE',
        followed_at: '2026-08-01T00:00:00Z',
      },
    ];

    it('hiển thị tag "Tài khoản bị tạm khóa" và vô hiệu hóa nút chat của tài khoản bị khóa', () => {
      render(
        <FriendListView
          friends={mockFriends}
          followingList={mockFollowing}
          loadingFriends={false}
          loadingFollowing={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          onOpenUnfriendModal={vi.fn()}
          onUnfollow={vi.fn()}
          onOpenChat={vi.fn()}
        />
      );

      // Bạn bè bình thường: Nút chat hoạt động
      expect(screen.getByText('Đỗ Bích Ngân')).toBeInTheDocument();

      // Bạn bè bị khóa: Hiển thị tag cảnh báo
      expect(screen.getByText('Bùi Tiến Dũng')).toBeInTheDocument();
      expect(screen.getByText('Tài khoản bị tạm khóa')).toBeInTheDocument();

      // Kiểm tra nút chat của tài khoản bị khóa bị disabled
      const chatButtons = screen.getAllByText(/Nhắn tin/i);
      const disabledChatBtn = chatButtons.find((btn) => btn.closest('button')?.disabled);
      expect(disabledChatBtn).toBeDefined();
    });

    it('gọi callback onOpenUnfriendModal khi click nút Hủy kết bạn', () => {
      const handleOpenModal = vi.fn();
      render(
        <FriendListView
          friends={mockFriends}
          followingList={mockFollowing}
          loadingFriends={false}
          loadingFollowing={false}
          searchQuery=""
          onSearchChange={vi.fn()}
          onOpenUnfriendModal={handleOpenModal}
          onUnfollow={vi.fn()}
          onOpenChat={vi.fn()}
        />
      );

      const unfriendButtons = screen.getAllByText('Hủy kết bạn');
      fireEvent.click(unfriendButtons[0]);
      expect(handleOpenModal).toHaveBeenCalledWith(mockFriends[0]);
    });
  });
});
