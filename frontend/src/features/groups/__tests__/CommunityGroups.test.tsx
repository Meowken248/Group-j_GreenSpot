import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GroupTypeSelector } from "../components/GroupTypeSelector";
import { CreateGroupForm } from "../components/CreateGroupForm";
import { GroupCreatedSuccessModal } from "../components/GroupCreatedSuccessModal";
import { DisbandGroupModal } from "../components/DisbandGroupModal";
import { groupService } from "../services/groupService";
import type { AdministrativeMetadata, GroupItem } from "../types/group";

const mockMetadata: AdministrativeMetadata = {
  districts: ["Quận 1", "Quận 3", "TP. Thủ Đức"],
  wards_by_district: {
    "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành"],
    "Quận 3": ["Phường Võ Thị Sáu", "Phường 1"],
    "TP. Thủ Đức": ["Phường Thảo Điền", "Phường An Phú"],
  },
  theme_topics: ["Phân loại rác", "Cây xanh", "Chống ngập", "Tái chế"],
};

const mockGroup: GroupItem = {
  group_id: "test-group-uuid-1234",
  name: "Cộng Đồng Sống Xanh Quận 1",
  description: "Mô tả nhóm mẫu",
  group_type: "DISTRICT",
  district: "Quận 1",
  privacy: "PUBLIC",
  creator_id: "creator-uuid-1",
  creator_name: "Admin Tester",
  members_count: 5,
  posts_count: 2,
  status: "ACTIVE",
  version: 1,
  created_at: new Date().toISOString(),
  is_member: true,
  my_role: "ADMIN",
};

describe("Chức năng 16: Frontend Community Groups (Tạo nhóm theo quận, phường, chủ đề)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Màn 1: Bộ chọn loại nhóm (GroupTypeSelector)", () => {
    it("1.1. Render đầy đủ 3 thẻ lựa chọn: Theo quận, Theo phường, Theo chủ đề", () => {
      render(
        <GroupTypeSelector
          selectedType={null}
          onSelectType={vi.fn()}
          adminGroupsCount={1}
          userDistrict="Quận 1"
          onViewMyGroups={vi.fn()}
        />
      );

      expect(screen.getByText("TẠO NHÓM MỚI")).toBeInTheDocument();
      expect(screen.getByTestId("type-card-district")).toBeInTheDocument();
      expect(screen.getByTestId("type-card-ward")).toBeInTheDocument();
      expect(screen.getByTestId("type-card-theme")).toBeInTheDocument();
      expect(screen.getByText("Theo quận")).toBeInTheDocument();
      expect(screen.getByText("Theo phường")).toBeInTheDocument();
      expect(screen.getByText("Theo chủ đề")).toBeInTheDocument();
    });

    it("1.2. Kích hoạt onSelectType khi người dùng nhấp chọn thẻ", () => {
      const handleSelect = vi.fn();
      render(
        <GroupTypeSelector
          selectedType={null}
          onSelectType={handleSelect}
          adminGroupsCount={1}
          userDistrict="Quận 1"
          onViewMyGroups={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId("type-card-theme"));
      expect(handleSelect).toHaveBeenCalledWith("THEME");
    });

    it("1.3. Cảnh báo và làm mờ 3 thẻ khi người dùng đã đạt giới hạn 5 nhóm Quản trị", () => {
      const handleSelect = vi.fn();
      render(
        <GroupTypeSelector
          selectedType={null}
          onSelectType={handleSelect}
          adminGroupsCount={5}
          userDistrict="Quận 1"
          onViewMyGroups={vi.fn()}
        />
      );

      expect(screen.getByTestId("limit-warning-banner")).toBeInTheDocument();
      expect(
        screen.getByText(/Bạn đã tạo tối đa 5 nhóm/i)
      ).toBeInTheDocument();

      // Thẻ bị disable và click không kích hoạt onSelectType
      fireEvent.click(screen.getByTestId("type-card-district"));
      expect(handleSelect).not.toHaveBeenCalled();
    });

    it("1.4. Cảnh báo hồ sơ chưa cập nhật địa chỉ khi chọn nhóm theo quận/phường", () => {
      const handleSelect = vi.fn();
      render(
        <GroupTypeSelector
          selectedType={null}
          onSelectType={handleSelect}
          adminGroupsCount={1}
          userDistrict={null} // Chưa cập nhật quận
          onViewMyGroups={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId("type-card-district"));
      expect(screen.getByTestId("profile-warning-banner")).toBeInTheDocument();
      expect(
        screen.getByText("Vui lòng cập nhật địa chỉ trong hồ sơ để tạo nhóm theo khu vực")
      ).toBeInTheDocument();
      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe("Màn 2: Form Tạo Nhóm Chi Tiết (CreateGroupForm)", () => {
    it("2.1. Render đầy đủ 3 khối: Thông tin, Phạm vi và Nút bấm", () => {
      render(
        <CreateGroupForm
          groupType="DISTRICT"
          metadata={mockMetadata}
          userDistrict="Quận 1"
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByTestId("input-group-name")).toBeInTheDocument();
      expect(screen.getByTestId("textarea-group-desc")).toBeInTheDocument();
      expect(screen.getByTestId("select-district")).toBeInTheDocument();
      expect(screen.getByTestId("btn-submit-create")).toBeInTheDocument();
      expect(screen.getByTestId("btn-cancel-create")).toBeInTheDocument();
    });

    it("2.2. Kiểm tra validation tên nhóm để trống hoặc vượt quá 50 ký tự", async () => {
      render(
        <CreateGroupForm
          groupType="DISTRICT"
          metadata={mockMetadata}
          userDistrict="Quận 1"
          onCancel={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      const nameInput = screen.getByTestId("input-group-name");
      const submitBtn = screen.getByTestId("btn-submit-create");

      // Để trống -> nút submit bị disabled
      expect(submitBtn).toBeDisabled();

      // Nhập tên quá dài
      const tooLongName = "Tên nhóm môi trường siêu dài vượt quá mức giới hạn 50 ký tự cho phép của hệ thống GreenSpot";
      fireEvent.change(nameInput, { target: { value: tooLongName } });

      expect(screen.getByText(`${tooLongName.length}/50 ký tự`)).toBeInTheDocument();
    });

    it("2.3. Hiển thị popup xác nhận thoát khi bấm Huỷ lúc form đã nhập dữ liệu", () => {
      const handleCancel = vi.fn();
      render(
        <CreateGroupForm
          groupType="DISTRICT"
          metadata={mockMetadata}
          userDistrict="Quận 1"
          onCancel={handleCancel}
          onSuccess={vi.fn()}
        />
      );

      // Nhập dữ liệu để form thành dirty
      fireEvent.change(screen.getByTestId("input-group-name"), {
        target: { value: "Nhóm Sống Xanh Mới" },
      });

      // Bấm nút Huỷ
      fireEvent.click(screen.getByTestId("btn-cancel-create"));

      // Hiện popup xác nhận
      expect(screen.getByTestId("discard-confirm-modal")).toBeInTheDocument();
      expect(screen.getByText("Bạn có thay đổi chưa lưu. Bạn muốn thoát?")).toBeInTheDocument();

      // Bấm Thoát
      fireEvent.click(screen.getByTestId("btn-discard-exit"));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it("2.4. Gửi form thành công và gọi callback onSuccess", async () => {
      const handleSuccess = vi.fn();
      vi.spyOn(groupService, "createGroup").mockResolvedValueOnce(mockGroup);

      render(
        <CreateGroupForm
          groupType="THEME"
          metadata={mockMetadata}
          onCancel={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      fireEvent.change(screen.getByTestId("input-group-name"), {
        target: { value: "Cộng Đồng Tái Chế Nhựa" },
      });
      fireEvent.change(screen.getByTestId("textarea-group-desc"), {
        target: { value: "Mô tả nhóm tái chế" },
      });

      fireEvent.click(screen.getByTestId("btn-submit-create"));

      await waitFor(() => {
        expect(groupService.createGroup).toHaveBeenCalled();
        expect(handleSuccess).toHaveBeenCalledWith(mockGroup);
      });
    });
  });

  describe("Màn 3: Popup Đã Tạo Nhóm Thành Công (GroupCreatedSuccessModal)", () => {
    it("3.1. Hiển thị đúng cấu trúc Popup: Nhãn 'POPUP', tiêu đề 'ĐÃ TẠO NHÓM', 'Bạn là Quản trị nhóm'", () => {
      render(
        <GroupCreatedSuccessModal
          group={mockGroup}
          onInviteFriends={vi.fn()}
          onEnterGroup={vi.fn()}
        />
      );

      expect(screen.getByText("POPUP")).toBeInTheDocument();
      expect(screen.getByTestId("modal-title-success")).toHaveTextContent("ĐÃ TẠO NHÓM");
      expect(screen.getByTestId("modal-role-desc")).toHaveTextContent("Bạn là Quản trị nhóm");
      expect(screen.getByTestId("btn-invite-friends-action")).toHaveTextContent("Mời bạn bè");
      expect(screen.getByTestId("btn-enter-group-action")).toHaveTextContent("Vào nhóm");
    });

    it("3.2. Bấm nút 'Mời bạn bè' hoặc 'Vào nhóm' kích hoạt đúng callback", () => {
      const handleInvite = vi.fn();
      const handleEnter = vi.fn();

      render(
        <GroupCreatedSuccessModal
          group={mockGroup}
          onInviteFriends={handleInvite}
          onEnterGroup={handleEnter}
        />
      );

      fireEvent.click(screen.getByTestId("btn-invite-friends-action"));
      expect(handleInvite).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId("btn-enter-group-action"));
      expect(handleEnter).toHaveBeenCalledTimes(1);
    });
  });

  describe("Quản trị / Giải tán nhóm (DisbandGroupModal)", () => {
    it("4.1. Nút Giải tán bị disable cho tới khi người dùng gõ chính xác 100% tên nhóm", () => {
      render(
        <DisbandGroupModal
          groupId={mockGroup.group_id}
          groupName={mockGroup.name}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByTestId("modal-title-disband")).toHaveTextContent("GIẢI TÁN NHÓM?");
      const input = screen.getByTestId("input-confirm-group-name");
      const disbandBtn = screen.getByTestId("btn-confirm-disband");

      // Khi chưa gõ: nút bị disable
      expect(disbandBtn).toBeDisabled();

      // Gõ sai tên nhóm: hiện thông báo lỗi và vẫn disable
      fireEvent.change(input, { target: { value: "Tên Sai Lệch" } });
      expect(screen.getByTestId("msg-name-mismatch")).toHaveTextContent("Tên nhóm không khớp");
      expect(disbandBtn).toBeDisabled();

      // Gõ chính xác tên nhóm: nút sáng lên
      fireEvent.change(input, { target: { value: mockGroup.name } });
      expect(screen.queryByTestId("msg-name-mismatch")).not.toBeInTheDocument();
      expect(disbandBtn).toBeEnabled();
    });

    it("4.2. Giải tán nhóm thành công khi tên khớp và bấm nút Giải tán", async () => {
      const handleSuccess = vi.fn();
      vi.spyOn(groupService, "disbandGroup").mockResolvedValueOnce({
        message: "Đã giải tán nhóm",
      });

      render(
        <DisbandGroupModal
          groupId={mockGroup.group_id}
          groupName={mockGroup.name}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      const input = screen.getByTestId("input-confirm-group-name");
      fireEvent.change(input, { target: { value: mockGroup.name } });

      fireEvent.click(screen.getByTestId("btn-confirm-disband"));

      await waitFor(() => {
        expect(groupService.disbandGroup).toHaveBeenCalledWith(
          mockGroup.group_id,
          mockGroup.name
        );
        expect(handleSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });
});
