import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostCreatorContainer } from "../PostCreatorContainer";
import { PostSuccessModal } from "../components/PostSuccessModal";
import { DiscardConfirmModal } from "../components/DiscardConfirmModal";
import { TagFriendsAndGroupModal } from "../components/TagFriendsAndGroupModal";
import { LocationPickerModal } from "../components/LocationPickerModal";
import type { PostDetail } from "../types/postTypes";

// Mock postService
vi.mock("../services/postService", () => ({
  postService: {
    uploadMedia: vi.fn().mockResolvedValue({
      url: "/uploads/posts/test.jpg",
      media_type: "IMAGE",
      file_name: "test.jpg",
      size_bytes: 1024,
    }),
    createPost: vi.fn().mockResolvedValue({
      post_id: "77777777-1111-2222-3333-444444444444",
      user_id: "user-123",
      content: "Bài viết kiểm thử",
      media_urls: [],
      visibility: "PUBLIC",
      is_hidden: false,
      reactions_count: 0,
      comments_count: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tagged_friends: [],
    }),
    getPostById: vi.fn(),
    getFriends: vi.fn().mockResolvedValue([
      {
        user_id: "friend-1",
        full_name: "Nguyễn Văn An",
        avatar_url: null,
        email: "an@test.com",
      },
      {
        user_id: "friend-2",
        full_name: "Trần Thị Mai",
        avatar_url: null,
        email: "mai@test.com",
      },
    ]),
    getVolunteerGroups: vi.fn().mockResolvedValue([
      {
        group_id: "group-1",
        name: "CLB Sài Gòn Xanh",
        description: "Nhóm dọn rác",
        members_count: 500,
        district: "Quận 1",
        requires_approval: false,
      },
    ]),
    reverseGeocode: vi.fn().mockResolvedValue("Quận 1, TP. Hồ Chí Minh"),
  },
}));

describe("Feature STT 9: Đăng bài kèm toạ độ, ảnh, video, gắn thẻ bạn bè", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "fake-token");
  });

  // =========================================================================
  // I. KIỂM THỬ MÀN 1: KHUNG SOẠN THẢO BÀI ĐĂNG (3 CỘT)
  // =========================================================================

  it("Màn 1: Hiển thị đầy đủ 3 khối (Nội dung, Tuỳ chọn, Đăng)", () => {
    render(<PostCreatorContainer />);

    expect(screen.getByText("Khối Nội dung")).toBeInTheDocument();
    expect(screen.getByText("Khối Tuỳ chọn")).toBeInTheDocument();
    expect(screen.getByText("Khối Đăng")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Chia sẻ trải nghiệm sống xanh/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đăng bài/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Huỷ/i })).toBeInTheDocument();
  });

  it("Màn 1: Để trống cả nội dung và ảnh/video thì nút 'Đăng bài' bị làm mờ (disabled)", () => {
    render(<PostCreatorContainer />);
    const submitBtn = screen.getByRole("button", { name: /Đăng bài/i });
    expect(submitBtn).toBeDisabled();
  });

  it("Màn 1: Nhập nội dung hợp lệ thì nút 'Đăng bài' kích hoạt bình thường", () => {
    render(<PostCreatorContainer />);
    const textarea = screen.getByPlaceholderText(/Chia sẻ trải nghiệm sống xanh/i);

    fireEvent.change(textarea, { target: { value: "Sáng nay đi dọn rác tại Kênh Nhiêu Lộc #SaiGonXanh" } });

    const submitBtn = screen.getByRole("button", { name: /Đăng bài/i });
    expect(submitBtn).not.toBeDisabled();
    expect(screen.getByText(/3\.000 ký tự/i)).toBeInTheDocument();

  });

  it("Màn 1: Bấm nút Huỷ khi đã có dữ liệu thì mở Popup xác nhận 'Bạn có thay đổi chưa lưu'", () => {
    render(<PostCreatorContainer />);
    const textarea = screen.getByPlaceholderText(/Chia sẻ trải nghiệm sống xanh/i);

    fireEvent.change(textarea, { target: { value: "Nội dung đang soạn thảo dở" } });

    const cancelBtn = screen.getByRole("button", { name: /Huỷ/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText("Bạn có thay đổi chưa lưu. Bạn muốn thoát?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ở lại" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thoát" })).toBeInTheDocument();
  });

  // =========================================================================
  // II. KIỂM THỬ MÀN 3: POPUP GẮN THẺ BẠN BÈ / CHỌN NHÓM
  // =========================================================================

  it("Màn 3: Hiển thị nhãn POPUP, tiêu đề GẮN THẺ BẠN BÈ / CHỌN NHÓM và cho phép chọn bạn bè", () => {
    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <TagFriendsAndGroupModal
        isOpen={true}
        initialMode="FRIENDS"
        friendsList={[
          { user_id: "u-1", full_name: "Nguyễn Văn An", email: "an@test.com", avatar_url: null },
          { user_id: "u-2", full_name: "Trần Thị Mai", email: "mai@test.com", avatar_url: null },
        ]}
        groupsList={[]}
        selectedFriendIds={[]}
        selectedGroupId={null}
        onConfirm={onConfirmMock}
        onClose={onCloseMock}
      />
    );

    expect(screen.getByText("POPUP")).toBeInTheDocument();
    expect(screen.getByText("GẮN THẺ BẠN BÈ / CHỌN NHÓM")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    // Tích chọn bạn bè
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    // Bấm nút Xong
    const doneBtn = screen.getByRole("button", { name: "Xong" });
    fireEvent.click(doneBtn);

    expect(onConfirmMock).toHaveBeenCalledWith(["u-1"], null);
  });

  // =========================================================================
  // III. KIỂM THỬ MÀN 4: POPUP ĐÃ ĐĂNG BÀI
  // =========================================================================

  it("Màn 4: Hiển thị nhãn POPUP, 'ĐÃ ĐĂNG BÀI' và 2 nút 'Xem bài viết' & 'Đóng'", () => {
    const dummyPost: PostDetail = {
      post_id: "p-123",
      user_id: "u-123",
      content: "Nội dung đã đăng",
      media_urls: [],
      visibility: "PUBLIC",
      is_hidden: false,
      reactions_count: 0,
      comments_count: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tagged_friends: [],
    };

    const onViewPostMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <PostSuccessModal
        isOpen={true}
        post={dummyPost}
        onViewPost={onViewPostMock}
        onClose={onCloseMock}
      />
    );

    expect(screen.getByText("POPUP")).toBeInTheDocument();
    expect(screen.getByText("ĐÃ ĐĂNG BÀI")).toBeInTheDocument();
    expect(screen.getByText("Bài viết đã xuất hiện trên bảng tin")).toBeInTheDocument();

    const viewBtn = screen.getByRole("button", { name: "Xem bài viết" });
    fireEvent.click(viewBtn);
    expect(onViewPostMock).toHaveBeenCalledWith("p-123");

    const closeBtn = screen.getByRole("button", { name: "Đóng" });
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
