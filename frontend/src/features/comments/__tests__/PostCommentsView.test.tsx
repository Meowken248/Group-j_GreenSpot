import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostCommentsView } from '../PostCommentsView';
import { commentService } from '../services/commentService';
import type { FeedPostItem } from '../../feed/types/feed.types';
import type { CommentItem } from '../types/commentTypes';
import { AUTH_STORAGE_KEYS } from '../../auth/types/auth.types';

// Mock commentService
vi.mock('../services/commentService', () => ({
  commentService: {
    getPostComments: vi.fn(),
    createComment: vi.fn(),
    getCommentReplies: vi.fn(),
    createReply: vi.fn(),
    deleteComment: vi.fn(),
    sharePost: vi.fn(),
    getFriendsForShare: vi.fn(),
    getGroupsForShare: vi.fn(),
    uploadMedia: vi.fn(),
  },
}));

describe('Feature STT 14: Bình luận và Trả lời bình luận (Màn 1 & Màn 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const mockPost: FeedPostItem = {
    post_id: 'post-test-14',
    user_id: 'user-author-01',
    author: {
      user_id: 'user-author-01',
      full_name: 'Nguyễn Văn Xanh',
      avatar_url: 'https://example.com/avatar.jpg',
      email: 'vanxanh@ecoreport.gov.vn',
    },
    content: 'Chung tay dọn dẹp vệ sinh kênh Nhiêu Lộc sáng nay! Hãy cùng bảo vệ nguồn nước trong lành cho thành phố.',
    media_urls: [
      { url: 'https://example.com/canal-clean.jpg', media_type: 'IMAGE' },
    ],
    visibility: 'PUBLIC',
    is_hidden: false,
    is_edited: false,
    reactions_count: 25,
    comments_count: 2,
    shares_count: 5,
    version: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    tagged_friends: [],
  };

  const mockComments: CommentItem[] = [
    {
      comment_id: 'comment-01',
      post_id: 'post-test-14',
      author: {
        user_id: 'user-commenter-01',
        full_name: 'Trần Thị Thảo',
        avatar_url: null,
        role: 'CITIZEN',
      },
      content: 'Hoạt động ý nghĩa quá, mình muốn đăng ký tham gia vào tuần tới!',
      media_url: 'https://example.com/clean-up.jpg',
      replies_count: 1,
      likes_count: 4,
      created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      initial_replies: [
        {
          comment_id: 'reply-01',
          parent_id: 'comment-01',
          author: {
            user_id: 'user-author-01',
            full_name: 'Nguyễn Văn Xanh',
            avatar_url: null,
            role: 'CITIZEN',
          },
          reply_to_user: {
            user_id: 'user-commenter-01',
            full_name: 'Trần Thị Thảo',
          },
          content: 'Chào Thảo, bạn đăng ký qua link ở trang chủ nhé!',
          likes_count: 2,
          created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        },
      ],
    },
    {
      comment_id: 'comment-02',
      post_id: 'post-test-14',
      author: {
        user_id: 'user-commenter-02',
        full_name: 'Lê Hoàng Minh',
        avatar_url: null,
        role: 'CITIZEN',
      },
      content: 'Khu vực này nay sạch đẹp hẳn ra, cảm ơn mọi người!',
      replies_count: 0,
      likes_count: 1,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      initial_replies: [],
    },
  ];

  it('1. Hiển thị đúng bố cục Màn 1: Tóm tắt bài viết ở trên và khu bình luận ở dưới', async () => {
    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    // Kiểm tra tóm tắt bài viết
    expect(screen.getByText('Nguyễn Văn Xanh')).toBeInTheDocument();
    expect(screen.getByText(/Chung tay dọn dẹp vệ sinh kênh Nhiêu Lộc/)).toBeInTheDocument();
    expect(screen.getByText('🌍 Công khai')).toBeInTheDocument();

    // Chờ danh sách bình luận xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
      expect(screen.getByText('Hoạt động ý nghĩa quá, mình muốn đăng ký tham gia vào tuần tới!')).toBeInTheDocument();
      expect(screen.getByText('Lê Hoàng Minh')).toBeInTheDocument();
    });

    // Kiểm tra tiêu đề kèm tổng số bình luận
    expect(screen.getByRole('heading', { name: /Bình luận/ })).toHaveTextContent('(2)');
  });

  it('2. Hiển thị khối trống khi bài viết chưa có bình luận nào (Màn 1 SRS)', async () => {
    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={{ ...mockPost, comments_count: 0 }}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Chưa có bình luận nào. Hãy là người đầu tiên!')
      ).toBeInTheDocument();
    });
  });

  it('3. Khi chưa đăng nhập mà bấm vào ô nhập -> Hiện popup nhắc đăng nhập kèm nút chuyển về STT 02', async () => {
    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    const mockNavigateLogin = vi.fn();

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
        onNavigateLogin={mockNavigateLogin}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    // Click vào ô nhập bình luận khi chưa có token
    const input = screen.getByPlaceholderText('Vui lòng đăng nhập để bình luận...');
    fireEvent.click(input);

    // Popup nhắc đăng nhập xuất hiện
    expect(screen.getByText('Yêu cầu đăng nhập')).toBeInTheDocument();
    expect(
      screen.getByText(/Vui lòng đăng nhập để bình luận/)
    ).toBeInTheDocument();

    // Bấm nút chuyển về đăng nhập
    const loginBtn = screen.getByRole('button', { name: 'Đăng nhập ngay' });
    fireEvent.click(loginBtn);
    expect(mockNavigateLogin).toHaveBeenCalled();
  });

  it('4. Kiểm soát độ dài tối đa 500 ký tự và bộ đếm ký tự (Màn 1 SRS)', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock-jwt-token');
    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify({ user_id: 'user-01', full_name: 'Người dùng Thử nghiệm' })
    );

    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Viết bình luận công khai của bạn...');
    const sendBtn = screen.getByRole('button', { name: 'Gửi' });

    // Khi để trống -> Nút gửi bị làm mờ
    expect(sendBtn).toBeDisabled();
    expect(screen.getByText('0/500')).toBeInTheDocument();

    // Khi nhập 10 ký tự -> Bộ đếm cập nhật
    fireEvent.change(textarea, { target: { value: 'Tuyệt vời!' } });
    expect(screen.getByText('10/500')).toBeInTheDocument();
    expect(sendBtn).not.toBeDisabled();

    // Khi nhập vượt quá 500 ký tự -> Bộ đếm chuyển đỏ và nút Gửi bị disable
    const longText = 'A'.repeat(505);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(screen.getByText('505/500')).toHaveClass('is-red-alert');
    expect(sendBtn).toBeDisabled();
  });

  it('5. Màn 2: Bấm "Trả lời" dưới một bình luận mở ô nhập có dòng "Đang trả lời @tên"', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock-jwt-token');
    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify({ user_id: 'user-01', full_name: 'Người dùng Thử nghiệm' })
    );

    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    // Bấm nút "Trả lời" dưới bình luận của Trần Thị Thảo
    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời' });
    fireEvent.click(replyButtons[0]);

    // Ô nhập trả lời xuất hiện ngay dưới bình luận gốc kèm nhãn
    expect(screen.getByText(/Đang trả lời/)).toHaveTextContent('Trần Thị Thảo');

    // Nút hủy ✕ đóng ô nhập
    const cancelBtn = screen.getByRole('button', { name: 'Hủy trả lời' });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText(/Đang trả lời/)).not.toBeInTheDocument();
  });

  it('6. Hỗ trợ chọn biểu tượng cảm xúc Emoji và chèn vào bình luận', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock-jwt-token');
    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify({ user_id: 'user-01', full_name: 'Người dùng Thử nghiệm' })
    );

    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Viết bình luận công khai của bạn...');
    const emojiTriggerBtn = screen.getByRole('button', { name: 'Mở bảng biểu tượng cảm xúc' });

    // Bấm mở bảng emoji
    fireEvent.click(emojiTriggerBtn);
    expect(screen.getByRole('dialog', { name: 'Chọn biểu tượng cảm xúc' })).toBeInTheDocument();

    // Chọn emoji 🌱
    const emojiPlantBtn = screen.getByRole('button', { name: 'Chọn biểu tượng 🌱' });
    fireEvent.click(emojiPlantBtn);

    // Kiểm tra ô nhập đã nhận emoji
    expect(textarea).toHaveValue('🌱');
  });

  it('7. Hiển thị ảnh đính kèm trong bình luận và mở lightbox modal khi click vào ảnh', async () => {
    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    // Bình luận có ảnh đính kèm
    const attachedImg = screen.getByAltText('Ảnh đính kèm');
    expect(attachedImg).toBeInTheDocument();

    // Bấm vào ảnh -> Mở modal lightbox
    fireEvent.click(attachedImg);
    expect(screen.getByRole('dialog', { name: 'Xem ảnh phóng to' })).toBeInTheDocument();

    // Bấm nút đóng ✕
    const closeLightboxBtn = screen.getByRole('button', { name: 'Đóng xem ảnh' });
    fireEvent.click(closeLightboxBtn);
    expect(screen.queryByRole('dialog', { name: 'Xem ảnh phóng to' })).not.toBeInTheDocument();
  });

  it('8. Hỗ trợ đính kèm ảnh, hiển thị preview và gọi uploadMedia khi gửi bình luận', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock-jwt-token');
    localStorage.setItem(
      AUTH_STORAGE_KEYS.USER_INFO,
      JSON.stringify({ user_id: 'user-01', full_name: 'Người dùng Thử nghiệm' })
    );

    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-preview.png');
    window.URL.revokeObjectURL = vi.fn();

    vi.mocked(commentService.getPostComments).mockResolvedValue({
      items: mockComments,
      total: 2,
      page: 1,
      limit: 10,
      has_more: false,
    });

    vi.mocked(commentService.uploadMedia).mockResolvedValue('/uploads/comments/test-pic.png');
    vi.mocked(commentService.createComment).mockResolvedValue({
      ...mockComments[0],
      comment_id: 'comment-photo-01',
      content: 'Ảnh hiện trường sáng nay',
      media_url: '/uploads/comments/test-pic.png',
    });

    render(
      <PostCommentsView
        post={mockPost}
        onBackToFeed={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thảo')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('Viết bình luận công khai của bạn...');
    fireEvent.change(textarea, { target: { value: 'Ảnh hiện trường sáng nay' } });

    // Đính kèm tệp ảnh qua input file
    const file = new File(['fake-image-bytes'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Hiển thị ảnh xem trước và nút xóa
    expect(screen.getByAltText('Ảnh xem trước')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa ảnh đính kèm' })).toBeInTheDocument();

    // Bấm gửi bình luận
    const sendBtn = screen.getByRole('button', { name: 'Gửi' });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(commentService.uploadMedia).toHaveBeenCalled();
      expect(commentService.createComment).toHaveBeenCalledWith(
        'post-test-14',
        'Ảnh hiện trường sáng nay',
        '/uploads/comments/test-pic.png'
      );
    });
  });
});
