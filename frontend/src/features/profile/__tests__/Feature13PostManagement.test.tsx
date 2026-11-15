import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileTimeline } from '../components/ProfileTimeline';
import { EditPostModal } from '../components/EditPostModal';
import { DeletePostModal } from '../components/DeletePostModal';
import { HidePostModal } from '../components/HidePostModal';
import { DiscardEditConfirmModal } from '../components/DiscardEditConfirmModal';
import type { UserProfile, PostListResponse, PostItem } from '../types/profile.types';
import { profileService } from '../services/profile.service';

vi.mock('../services/profile.service', () => ({
  profileService: {
    updatePost: vi.fn(),
    deletePost: vi.fn(),
    toggleHidePost: vi.fn(),
    uploadMedia: vi.fn(),
  },
}));

vi.mock('../../posts/services/postService', () => ({
  postService: {
    getFriends: vi.fn().mockResolvedValue([
      { user_id: 'friend-1', full_name: 'Bạn A', email: 'a@gmail.com' },
    ]),
    getVolunteerGroups: vi.fn().mockResolvedValue([
      { group_id: 'group-1', name: 'Nhóm Xanh', requires_approval: false },
    ]),
    uploadMedia: vi.fn(),
    createPost: vi.fn(),
    getPostById: vi.fn(),
  },
}));

describe('Feature 13: Sửa, Xoá và Ẩn Bài Viết (SRS pp. 123-127)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUserProfile: UserProfile = {
    user_id: 'user-tu-123',
    email: 'tu@greenspot.vn',
    full_name: 'Huỳnh Anh Tú',
    avatar_url: null,
    cover_image_url: null,
    bio: 'Bảo vệ môi trường',
    friends_count: 42,
    activated_at: '2026-01-01T00:00:00Z',
    is_own_profile: true,
    total_green_points: 350,
    version: 1,
    highlight_badges: [],
    total_badges_count: 0,
  };

  const mockOwnPost: PostItem = {
    post_id: 'post-101',
    user_id: 'user-tu-123',
    content: 'Cùng nhau dọn rác bãi biển Cần Giờ #SaiGonXanh',
    reactions_count: 15,
    comments_count: 3,
    is_hidden: false,
    is_edited: true,
    version: 2,
    created_at: '2026-03-01T08:00:00Z',
    updated_at: '2026-03-01T09:30:00Z',
  };

  const mockHiddenPost: PostItem = {
    post_id: 'post-102',
    user_id: 'user-tu-123',
    content: 'Bài viết đã bị ẩn nội bộ',
    reactions_count: 2,
    comments_count: 0,
    is_hidden: true,
    is_edited: false,
    version: 1,
    created_at: '2026-03-02T08:00:00Z',
  };

  const mockOtherUserPost: PostItem = {
    post_id: 'post-103',
    user_id: 'user-other-456',
    content: 'Bài viết của bạn bè khác',
    reactions_count: 5,
    comments_count: 1,
    is_hidden: false,
    is_edited: false,
    version: 1,
    created_at: '2026-03-03T08:00:00Z',
  };

  // =========================================================================
  // 1. MÀN 1/5: TIMELINE CARD, MENU ⋯, ĐÃ CHỈNH SỬA, ĐÃ ẨN & HIỆN LẠI
  // =========================================================================
  describe('Màn 1/5: Thẻ bài viết trên ProfileTimeline', () => {
    it('hiển thị nhãn [Đã chỉnh sửa] khi bài viết có is_edited = true', () => {
      const posts: PostListResponse = {
        items: [mockOwnPost],
        total: 1,
        page: 1,
        size: 10,
        has_more: false,
      };

      render(
        <ProfileTimeline
          profile={mockUserProfile}
          posts={posts}
          profileLoading={false}
          postsLoading={false}
          profileError={null}
          postsError={null}
          onRetryProfile={vi.fn()}
          onRetryPosts={vi.fn()}
          onLoadMorePosts={vi.fn()}
          loadingMore={false}
          onOpenEditProfile={vi.fn()}
          onOpenPassport={vi.fn()}
          onOpenHistory={vi.fn()}
          onNavigateToFeed={vi.fn()}
        />
      );

      expect(screen.getByText('Đã chỉnh sửa')).toBeInTheDocument();
    });

    it('hiển thị trạng thái [Đã ẩn] và nút [Hiện lại] khi post.is_hidden = true', () => {
      const posts: PostListResponse = {
        items: [mockHiddenPost],
        total: 1,
        page: 1,
        size: 10,
        has_more: false,
      };

      render(
        <ProfileTimeline
          profile={mockUserProfile}
          posts={posts}
          profileLoading={false}
          postsLoading={false}
          profileError={null}
          postsError={null}
          onRetryProfile={vi.fn()}
          onRetryPosts={vi.fn()}
          onLoadMorePosts={vi.fn()}
          loadingMore={false}
          onOpenEditProfile={vi.fn()}
          onOpenPassport={vi.fn()}
          onOpenHistory={vi.fn()}
          onNavigateToFeed={vi.fn()}
        />
      );

      expect(screen.getByText('Đã ẩn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hiện lại' })).toBeInTheDocument();
    });

    it('menu ⋯ hiển thị Sửa bài viết, Ẩn bài viết, Xoá bài viết cho bài viết của chính mình', () => {
      const posts: PostListResponse = {
        items: [mockOwnPost],
        total: 1,
        page: 1,
        size: 10,
        has_more: false,
      };

      render(
        <ProfileTimeline
          profile={mockUserProfile}
          posts={posts}
          profileLoading={false}
          postsLoading={false}
          profileError={null}
          postsError={null}
          onRetryProfile={vi.fn()}
          onRetryPosts={vi.fn()}
          onLoadMorePosts={vi.fn()}
          loadingMore={false}
          onOpenEditProfile={vi.fn()}
          onOpenPassport={vi.fn()}
          onOpenHistory={vi.fn()}
          onNavigateToFeed={vi.fn()}
        />
      );

      const moreMenuBtn = screen.getByRole('button', { name: 'Tùy chọn bài viết' });
      fireEvent.click(moreMenuBtn);

      expect(screen.getByText('Sửa bài viết')).toBeInTheDocument();
      expect(screen.getByText('Ẩn bài viết')).toBeInTheDocument();
      expect(screen.getByText('Xoá bài viết')).toBeInTheDocument();
    });

    it('menu ⋯ chỉ hiển thị Báo cáo bài viết cho bài viết của người khác', () => {
      const otherUserProfile: UserProfile = {
        ...mockUserProfile,
        is_own_profile: false,
        user_id: 'user-guest-999',
      };
      const posts: PostListResponse = {
        items: [mockOtherUserPost],
        total: 1,
        page: 1,
        size: 10,
        has_more: false,
      };

      render(
        <ProfileTimeline
          profile={otherUserProfile}
          posts={posts}
          profileLoading={false}
          postsLoading={false}
          profileError={null}
          postsError={null}
          onRetryProfile={vi.fn()}
          onRetryPosts={vi.fn()}
          onLoadMorePosts={vi.fn()}
          loadingMore={false}
          onOpenEditProfile={vi.fn()}
          onOpenPassport={vi.fn()}
          onOpenHistory={vi.fn()}
          onNavigateToFeed={vi.fn()}
        />
      );

      const moreMenuBtn = screen.getByRole('button', { name: 'Tùy chọn bài viết' });
      fireEvent.click(moreMenuBtn);

      expect(screen.getByText('Báo cáo bài viết')).toBeInTheDocument();
      expect(screen.queryByText('Sửa bài viết')).not.toBeInTheDocument();
      expect(screen.queryByText('Xoá bài viết')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. MÀN 2/5: POPUP SỬA BÀI VIẾT (EditPostModal) & DiscardConfirm
  // =========================================================================
  describe('Màn 2/5: EditPostModal & DiscardEditConfirmModal', () => {
    it('hiển thị form sửa bài, bộ đếm ký tự và nạp nội dung cũ', () => {
      render(
        <EditPostModal
          isOpen={true}
          post={mockOwnPost}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByText('SỬA BÀI VIẾT')).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockOwnPost.content)).toBeInTheDocument();
      expect(screen.getByText(/46\s*\/\s*2000/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cập nhật' })).toBeInTheDocument();
    });

    it('hiển thị cảnh báo xác nhận thoát khi có thay đổi nội dung chưa lưu', () => {
      render(
        <EditPostModal
          isOpen={true}
          post={mockOwnPost}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const textarea = screen.getByDisplayValue(mockOwnPost.content);
      fireEvent.change(textarea, { target: { value: 'Nội dung đã được thay đổi mới' } });

      const cancelBtn = screen.getByRole('button', { name: 'Huỷ' });
      fireEvent.click(cancelBtn);

      expect(screen.getByText('Bạn có thay đổi chưa lưu. Bạn muốn thoát?')).toBeInTheDocument();
      expect(screen.getByText(/Mọi nội dung chỉnh sửa chưa được lưu sẽ bị hủy bỏ/i)).toBeInTheDocument();
    });

    it('cho phép thêm hashtag nhanh và đổi chế độ hiển thị bài viết', async () => {
      vi.mocked(profileService.updatePost).mockResolvedValueOnce({
        ...mockOwnPost,
        content: mockOwnPost.content + ' #ZeroWaste',
        visibility: 'FRIENDS',
        is_edited: true,
        version: 3,
      });
      const handleSuccess = vi.fn();

      render(
        <EditPostModal
          isOpen={true}
          post={mockOwnPost}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      // Thêm hashtag nhanh
      const hashtagBtn = screen.getByRole('button', { name: '#ZeroWaste' });
      fireEvent.click(hashtagBtn);
      expect(screen.getByDisplayValue(new RegExp('#ZeroWaste'))).toBeInTheDocument();

      // Đổi chế độ hiển thị sang Bạn bè
      const friendsVisibilityBtn = screen.getByRole('button', { name: /^👥\s*Bạn bè$/i });
      fireEvent.click(friendsVisibilityBtn);

      // Nhấn Cập nhật
      const submitBtn = screen.getByRole('button', { name: 'Cập nhật' });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(profileService.updatePost).toHaveBeenCalledWith(
          mockOwnPost.post_id,
          expect.objectContaining({
            visibility: 'FRIENDS',
            version: mockOwnPost.version,
          })
        );
        expect(handleSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('DiscardEditConfirmModal hoạt động độc lập chính xác', () => {
      const handleConfirm = vi.fn();
      const handleStay = vi.fn();

      render(
        <DiscardEditConfirmModal
          isOpen={true}
          onConfirmDiscard={handleConfirm}
          onStay={handleStay}
        />
      );

      expect(screen.getByText('Bạn có thay đổi chưa lưu. Bạn muốn thoát?')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Thoát và bỏ thay đổi' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Ở lại chỉnh sửa' }));
      expect(handleStay).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. MÀN 3/5 & 4/5: POPUP XOÁ BÀI VIẾT & ĐÃ XOÁ BÀI VIẾT (DeletePostModal)
  // =========================================================================
  describe('Màn 3/5 & 4/5: DeletePostModal', () => {
    it('hiển thị cảnh báo nguy hiểm ở Màn 3/5 và chuyển sang Màn 4/5 sau khi xoá thành công', async () => {
      vi.mocked(profileService.deletePost).mockResolvedValueOnce({
        success: true,
        message: 'Đã xoá bài viết thành công',
      });
      const handleDeleted = vi.fn();

      render(
        <DeletePostModal
          isOpen={true}
          post={mockOwnPost}
          onClose={vi.fn()}
          onDeleted={handleDeleted}
        />
      );

      expect(screen.getByText('XOÁ BÀI VIẾT?')).toBeInTheDocument();
      expect(screen.getByText(/Hành động này không thể hoàn tác/i)).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: 'Xoá bài viết' });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(profileService.deletePost).toHaveBeenCalledWith(mockOwnPost.post_id);
        expect(screen.getByText('ĐÃ XOÁ BÀI VIẾT')).toBeInTheDocument();
        expect(screen.getByText(/Bài không còn trên bảng tin và trang cá nhân của bạn/i)).toBeInTheDocument();
      });

      const closeSuccessBtn = screen.getByRole('button', { name: 'Đóng' });
      fireEvent.click(closeSuccessBtn);
      expect(handleDeleted).toHaveBeenCalledWith(mockOwnPost.post_id);
    });
  });

  // =========================================================================
  // 4. MÀN 5/5: POPUP ĐÃ ẨN BÀI VIẾT & ĐẾM NGƯỢC HOÀN TÁC 5S (HidePostModal)
  // =========================================================================
  describe('Màn 5/5: HidePostModal', () => {
    it('hiển thị thông báo ĐÃ ẨN BÀI VIẾT và nút Hoàn tác có đếm giây', () => {
      render(
        <HidePostModal
          isOpen={true}
          post={mockHiddenPost}
          onClose={vi.fn()}
          onUndoSuccess={vi.fn()}
          onConfirmedHidden={vi.fn()}
        />
      );

      expect(screen.getByText('ĐÃ ẨN BÀI VIẾT')).toBeInTheDocument();
      expect(screen.getByText(/Chỉ bạn nhìn thấy bài này/i)).toBeInTheDocument();
      expect(screen.getByText(/Hoàn tác \(5s\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
    });

    it('gọi API mở ẩn lại khi nhấn nút Hoàn tác', async () => {
      vi.mocked(profileService.toggleHidePost).mockResolvedValueOnce({
        success: true,
        message: 'Đã mở ẩn bài viết',
        post_id: mockHiddenPost.post_id,
        is_hidden: false,
      });
      const handleUndoSuccess = vi.fn();

      render(
        <HidePostModal
          isOpen={true}
          post={mockHiddenPost}
          onClose={vi.fn()}
          onUndoSuccess={handleUndoSuccess}
          onConfirmedHidden={vi.fn()}
        />
      );

      const undoBtn = screen.getByRole('button', { name: /Hoàn tác/i });
      fireEvent.click(undoBtn);

      await waitFor(() => {
        expect(profileService.toggleHidePost).toHaveBeenCalledWith(mockHiddenPost.post_id, false);
        expect(handleUndoSuccess).toHaveBeenCalled();
      });
    });
  });
});
