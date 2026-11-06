import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GroupMembersManagement } from "../components/GroupMembersManagement";
import { ChangeMemberRoleModal } from "../components/ChangeMemberRoleModal";
import { RemoveMemberConfirmModal } from "../components/RemoveMemberConfirmModal";
import { MemberRemovedSuccessModal } from "../components/MemberRemovedSuccessModal";
import { groupService } from "../services/groupService";
import type { GroupMemberListResponse, GroupMemberItem } from "../types/group";

const mockMembersAdminView: GroupMemberListResponse = {
  items: [
    {
      user_id: "user-admin-1",
      full_name: "Nguyễn Văn Admin",
      avatar_url: null,
      district: "Quận 1",
      role: "ADMIN",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-10T10:00:00Z",
      is_self: true,
      can_change_role: true,
      can_remove: false,
      disabled_remove_reason: "Bạn không thể tự xoá mình khỏi nhóm",
    },
    {
      user_id: "user-admin-2",
      full_name: "Trần Thị Admin Phụ",
      avatar_url: null,
      district: "Quận 3",
      role: "ADMIN",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-12T10:00:00Z",
      is_self: false,
      can_change_role: true,
      can_remove: false,
      disabled_remove_reason: "Không thể xoá Quản trị nhóm. Hãy đổi vai trò trước",
    },
    {
      user_id: "user-mod-1",
      full_name: "Lê Văn Mod",
      avatar_url: null,
      district: "Bình Thạnh",
      role: "MODERATOR",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-15T10:00:00Z",
      is_self: false,
      can_change_role: true,
      can_remove: true,
    },
    {
      user_id: "user-mem-1",
      full_name: "Phạm Thị Thành Viên",
      avatar_url: null,
      district: "Quận 7",
      role: "MEMBER",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-20T10:00:00Z",
      is_self: false,
      can_change_role: true,
      can_remove: true,
    },
  ],
  total: 25,
  page: 1,
  limit: 20,
  has_more: true,
  group_name: "Cộng Đồng Sống Xanh Quận 1",
  is_system_admin: true,
  my_role: "ADMIN",
  can_invite: true,
};

const mockMembersRegularMemberView: GroupMemberListResponse = {
  items: [
    {
      user_id: "user-mem-1",
      full_name: "Phạm Thị Thành Viên",
      avatar_url: null,
      district: "Quận 7",
      role: "MEMBER",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-20T10:00:00Z",
      is_self: true,
      can_change_role: false,
      can_remove: false,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  has_more: false,
  group_name: "Cộng Đồng Sống Xanh Quận 1",
  is_system_admin: false,
  my_role: "MEMBER",
  can_invite: false,
};

describe("STT 04: Vai trò trong nhóm (Nguyễn Thành Đạt - 24211TT0236)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Màn 1/4: Danh sách thành viên nhóm (/groups/{group_id}/members)", () => {
    it("1.1. Render chuẩn bố cục 2 khung: Khung trái Danh sách và Khung phải MỜI", async () => {
      vi.spyOn(groupService, "getGroupMembers").mockResolvedValue(mockMembersAdminView);

      render(<GroupMembersManagement groupId="test-group-id" />);

      await waitFor(() => {
        expect(screen.getByTestId("members-card-left")).toBeInTheDocument();
        expect(screen.getByTestId("members-card-right")).toBeInTheDocument();
      });

      // Tiêu đề số lượng và tên nhóm
      expect(screen.getByTestId("members-count-title")).toHaveTextContent("DANH SÁCH THÀNH VIÊN (25)");
      expect(screen.getAllByText("Cộng Đồng Sống Xanh Quận 1")[0]).toBeInTheDocument();

      // Dòng thông báo quyền Admin hệ thống
      expect(screen.getByTestId("admin-system-notice")).toHaveTextContent("Bạn đang xem với quyền Admin hệ thống");
    });

    it("1.2. Hiển thị nhãn (Bạn) và các badge vai trò với class màu tương ứng", async () => {
      vi.spyOn(groupService, "getGroupMembers").mockResolvedValue(mockMembersAdminView);

      render(<GroupMembersManagement groupId="test-group-id" />);

      await waitFor(() => {
        expect(screen.getByTestId("badge-you-user-admin-1")).toBeInTheDocument();
        expect(screen.getByTestId("badge-you-user-admin-1")).toHaveTextContent("(Bạn)");
      });

      // Role badge classes
      expect(screen.getByTestId("role-badge-user-admin-1")).toHaveClass("role-admin");
      expect(screen.getByTestId("role-badge-user-mod-1")).toHaveClass("role-moderator");
      expect(screen.getByTestId("role-badge-user-mem-1")).toHaveClass("role-member");
    });

    it("1.3. Áp dụng đúng ma trận nút hành động và tooltip khi bị vô hiệu hoá", async () => {
      vi.spyOn(groupService, "getGroupMembers").mockResolvedValue(mockMembersAdminView);

      render(<GroupMembersManagement groupId="test-group-id" />);

      await waitFor(() => {
        // Tự xoá chính mình bị disable kèm tooltip
        const btnDeleteSelf = screen.getByTestId("btn-remove-user-admin-1");
        expect(btnDeleteSelf).toBeDisabled();
        expect(btnDeleteSelf).toHaveAttribute("title", "Bạn không thể tự xoá mình khỏi nhóm");

        // Xoá Admin khác bị disable kèm tooltip
        const btnDeleteOtherAdmin = screen.getByTestId("btn-remove-user-admin-2");
        expect(btnDeleteOtherAdmin).toBeDisabled();
        expect(btnDeleteOtherAdmin).toHaveAttribute("title", "Không thể xoá Quản trị nhóm. Hãy đổi vai trò trước");

        // Xoá Moderator và Member được enabled
        const btnDeleteMod = screen.getByTestId("btn-remove-user-mod-1");
        expect(btnDeleteMod).not.toBeDisabled();
        const btnDeleteMem = screen.getByTestId("btn-remove-user-mem-1");
        expect(btnDeleteMem).not.toBeDisabled();
      });
    });

    it("1.4. Thành viên thường chỉ xem được danh sách, ẩn cụm nút và ẩn khung MỜI (chiếm full width)", async () => {
      vi.spyOn(groupService, "getGroupMembers").mockResolvedValue(mockMembersRegularMemberView);

      render(<GroupMembersManagement groupId="test-group-id" />);

      await waitFor(() => {
        expect(screen.getByTestId("members-card-left")).toBeInTheDocument();
      });

      // Khung MỜI bị ẩn hoàn toàn
      expect(screen.queryByTestId("members-card-right")).not.toBeInTheDocument();

      // Cụm nút hành động bị ẩn hoàn toàn
      expect(screen.queryByTestId("actions-user-mem-1")).not.toBeInTheDocument();
    });

    it("1.5. Nút 'Xem thêm' xuất hiện khi còn thành viên và tải tiếp trang kế tiếp", async () => {
      vi.spyOn(groupService, "getGroupMembers").mockResolvedValue(mockMembersAdminView);

      render(<GroupMembersManagement groupId="test-group-id" />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-load-more")).toBeInTheDocument();
        expect(screen.getByTestId("btn-load-more")).toHaveTextContent("Xem thêm");
      });

      const nextBatchResponse: GroupMemberListResponse = {
        items: [
          {
            user_id: "user-mem-2",
            full_name: "Hoàng Văn Hai",
            avatar_url: null,
            district: "Quận 5",
            role: "MEMBER",
            status: "ACTIVE",
            version: 1,
            joined_at: "2025-01-22T10:00:00Z",
            is_self: false,
            can_change_role: true,
            can_remove: true,
          },
        ],
        total: 25,
        page: 2,
        limit: 20,
        has_more: false,
        group_name: "Cộng Đồng Sống Xanh Quận 1",
        is_system_admin: true,
        my_role: "ADMIN",
        can_invite: true,
      };

      vi.spyOn(groupService, "getGroupMembers").mockResolvedValueOnce(nextBatchResponse);

      fireEvent.click(screen.getByTestId("btn-load-more"));

      await waitFor(() => {
        expect(screen.getByText("Hoàng Văn Hai")).toBeInTheDocument();
      });
    });
  });

  describe("Màn 2/4: Popup Đổi vai trò (ChangeMemberRoleModal)", () => {
    const memberToChange: GroupMemberItem = {
      user_id: "user-admin-1",
      full_name: "Nguyễn Văn Admin",
      avatar_url: null,
      district: "Quận 1",
      role: "ADMIN",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-10T10:00:00Z",
      is_self: true,
      can_change_role: true,
      can_remove: false,
    };

    it("2.1. Render modal với 3 lựa chọn radio và thông tin thành viên", () => {
      render(
        <ChangeMemberRoleModal
          groupId="test-group-id"
          member={memberToChange}
          isOpen={true}
          isSelf={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          onErrorToast={vi.fn()}
        />
      );

      expect(screen.getByText("ĐỔI VAI TRÒ")).toBeInTheDocument();
      expect(screen.getByText("Nguyễn Văn Admin")).toBeInTheDocument();
      expect(screen.getByTestId("radio-role-item-ADMIN")).toBeInTheDocument();
      expect(screen.getByTestId("radio-role-item-MODERATOR")).toBeInTheDocument();
      expect(screen.getByTestId("radio-role-item-MEMBER")).toBeInTheDocument();
    });

    it("2.2. Hiển thị cảnh báo đỏ khi Admin tự hạ quyền quản trị của chính mình", () => {
      render(
        <ChangeMemberRoleModal
          groupId="test-group-id"
          member={memberToChange}
          isOpen={true}
          isSelf={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          onErrorToast={vi.fn()}
        />
      );

      // Ban đầu chọn ADMIN -> Không có cảnh báo đỏ
      expect(screen.queryByTestId("self-demote-warning")).not.toBeInTheDocument();

      // Đổi sang MODERATOR -> Xuất hiện cảnh báo đỏ
      fireEvent.click(screen.getByTestId("radio-role-item-MODERATOR"));
      expect(screen.getByTestId("self-demote-warning")).toBeInTheDocument();
      expect(screen.getByTestId("self-demote-warning")).toHaveTextContent("Bạn sẽ không còn quyền quản trị nhóm này");

      // Đổi sang MEMBER -> Vẫn có cảnh báo đỏ
      fireEvent.click(screen.getByTestId("radio-role-item-MEMBER"));
      expect(screen.getByTestId("self-demote-warning")).toBeInTheDocument();
    });

    it("2.3. Bấm Lưu gọi API cập nhật vai trò kèm version kiểm soát xung đột", async () => {
      const onSuccessMock = vi.fn();
      const mockUpdate = vi.spyOn(groupService, "updateMemberRole").mockResolvedValue({
        user_id: "user-admin-1",
        full_name: "Nguyễn Văn Admin",
        role: "MODERATOR",
        joined_at: "2025-01-10T10:00:00Z",
        version: 2,
        is_self: true,
      });

      render(
        <ChangeMemberRoleModal
          groupId="test-group-id"
          member={memberToChange}
          isOpen={true}
          isSelf={true}
          onClose={vi.fn()}
          onSuccess={onSuccessMock}
          onErrorToast={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId("radio-role-item-MODERATOR"));
      fireEvent.click(screen.getByTestId("btn-save-change-role"));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          "test-group-id",
          memberToChange.user_id,
          expect.objectContaining({
            new_role: "MODERATOR",
            version: 1,
          })
        );
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });

    it("2.4. Xử lý xung đột vai trò (HTTP 409 ROLE_CHANGED) với thông báo phù hợp", async () => {
      const onErrorToastMock = vi.fn();
      vi.spyOn(groupService, "updateMemberRole").mockRejectedValue({
        response: {
          status: 409,
          data: {
            detail: {
              code: "ROLE_CHANGED",
              message: "Vai trò của thành viên đã bị thay đổi bởi người khác.",
            },
          },
        },
      });

      render(
        <ChangeMemberRoleModal
          groupId="test-group-id"
          member={memberToChange}
          isOpen={true}
          isSelf={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          onErrorToast={onErrorToastMock}
        />
      );

      fireEvent.click(screen.getByTestId("radio-role-item-MODERATOR"));
      fireEvent.click(screen.getByTestId("btn-save-change-role"));

      await waitFor(() => {
        expect(onErrorToastMock).toHaveBeenCalledWith(
          "Vai trò của thành viên đã bị thay đổi. Danh sách đã được tải lại"
        );
      });
    });
  });

  describe("Màn 3/4: Popup Xác nhận Xoá thành viên (RemoveMemberConfirmModal)", () => {
    const memberToDelete: GroupMemberItem = {
      user_id: "user-mem-1",
      full_name: "Phạm Thị Thành Viên",
      avatar_url: null,
      district: "Quận 7",
      role: "MEMBER",
      status: "ACTIVE",
      version: 1,
      joined_at: "2025-01-20T10:00:00Z",
      is_self: false,
      can_change_role: true,
      can_remove: true,
    };

    it("3.1. Render modal xác nhận xoá với cảnh báo, thông tin thành viên và lưu ý giữ bài viết", () => {
      render(
        <RemoveMemberConfirmModal
          groupId="test-group-id"
          member={memberToDelete}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          onErrorToast={vi.fn()}
        />
      );

      expect(screen.getByText("XOÁ KHỎI NHÓM?")).toBeInTheDocument();
      expect(screen.getByText("Thành viên sẽ không xem được bài trong nhóm")).toBeInTheDocument();
      expect(screen.getByText("Phạm Thị Thành Viên")).toBeInTheDocument();
      expect(
        screen.getByText("Bài viết và bình luận của người này trong nhóm được giữ nguyên")
      ).toBeInTheDocument();
    });

    it("3.2. Focus mặc định vào nút 'Huỷ' để phòng ngừa xoá nhầm", async () => {
      render(
        <RemoveMemberConfirmModal
          groupId="test-group-id"
          member={memberToDelete}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          onErrorToast={vi.fn()}
        />
      );

      const cancelButton = screen.getByTestId("btn-cancel-remove");
      await waitFor(() => {
        expect(cancelButton).toHaveFocus();
      });
    });

    it("3.3. Bấm nút 'Huỷ' đóng modal và không thực hiện xoá", () => {
      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      render(
        <RemoveMemberConfirmModal
          groupId="test-group-id"
          member={memberToDelete}
          isOpen={true}
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
          onErrorToast={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId("btn-cancel-remove"));
      expect(onCloseMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe("Màn 4/4: Popup Thông báo Đã xoá thành viên (MemberRemovedSuccessModal)", () => {
    it("4.1. Hiển thị đúng tiêu đề, nội dung thông báo cập nhật danh sách và nút Đóng duy nhất", () => {
      const onCloseMock = vi.fn();

      render(
        <MemberRemovedSuccessModal
          memberName="Phạm Thị Thành Viên"
          groupName="Cộng Đồng Sống Xanh Quận 1"
          isOpen={true}
          onClose={onCloseMock}
        />
      );

      expect(screen.getByText("ĐÃ XOÁ THÀNH VIÊN")).toBeInTheDocument();
      expect(screen.getByText("Danh sách nhóm đã cập nhật")).toBeInTheDocument();
      expect(screen.getByTestId("btn-close-removed-modal")).toHaveTextContent("Đóng");

      fireEvent.click(screen.getByTestId("btn-close-removed-modal"));
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
