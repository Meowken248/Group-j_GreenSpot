import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteRoleModal } from '../components/DeleteRoleModal';
import { ReassignUsersModal } from '../components/ReassignUsersModal';
import { RoleListPage } from '../pages/RoleListPage';
import { CreateRolePage } from '../pages/CreateRolePage';
import { RolePermissionMatrixPage } from '../pages/RolePermissionMatrixPage';
import { rbacService } from '../services/rbacService';
import type { RoleItem, PermissionMatrixResponse } from '../types/rbac.types';

vi.mock('../services/rbacService', () => ({
  rbacService: {
    getRoles: vi.fn(),
    createRole: vi.fn(),
    getPermissionMatrix: vi.fn(),
    updateRolePermissions: vi.fn(),
    deleteRole: vi.fn(),
    reassignAndDeleteRole: vi.fn(),
  },
}));

const mockRoles: RoleItem[] = [
  {
    role_id: 1,
    role_code: "ADMIN",
    role_name: "Admin",
    description: "Quản trị viên toàn hệ thống",
    is_system: true,
    scope: "CITY",
    scope_display: "Toàn thành phố",
    version: 1,
    user_count: 3,
  },
  {
    role_id: 2,
    role_code: "DISTRICT_MANAGER",
    role_name: "District Manager",
    description: "Cán bộ quản trị cấp quận",
    is_system: true,
    scope: "DISTRICT",
    scope_display: "Quận",
    version: 1,
    user_count: 5,
  },
  {
    role_id: 3,
    role_code: "RESPONDER",
    role_name: "Responder",
    description: "Lực lượng ứng cứu hiện trường",
    is_system: true,
    scope: "DISTRICT",
    scope_display: "Quận",
    version: 1,
    user_count: 8,
  },
  {
    role_id: 4,
    role_code: "CITIZEN",
    role_name: "Citizen",
    description: "Công dân tham gia báo cáo",
    is_system: true,
    scope: "CITY",
    scope_display: "Toàn thành phố",
    version: 1,
    user_count: 120,
  },
  {
    role_id: 5,
    role_code: "ROLE_CUSTOM1",
    role_name: "Giám sát viên Môi trường",
    description: "Chuyên viên giám sát điểm nóng",
    is_system: false,
    scope: "DISTRICT",
    scope_display: "Quận",
    version: 1,
    user_count: 0,
  },
];

describe('RBAC Feature Unit & Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // MÀN 4: POPUP XOÁ VAI TRÒ (KHI USER_COUNT == 0)
  // =========================================================================
  describe('DeleteRoleModal (Màn 4)', () => {
    it('không render khi isOpen là false', () => {
      render(
        <DeleteRoleModal
          isOpen={false}
          role={mockRoles[4]}
          isDeleting={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('render đúng tiêu đề và tên vai trò cần xoá', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteRoleModal
          isOpen={true}
          role={mockRoles[4]}
          isDeleting={false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(screen.getByRole('heading', { name: 'Xoá vai trò' })).toBeInTheDocument();
      expect(screen.getByText(/Giám sát viên Môi trường/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Xoá vai trò' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Huỷ bỏ'));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // MÀN 5: POPUP CHUYỂN GIAO USER VÀ XOÁ (KHI USER_COUNT > 0)
  // =========================================================================
  describe('ReassignUsersModal (Màn 5)', () => {
    it('render cảnh báo người dùng và danh sách vai trò tiếp nhận', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <ReassignUsersModal
          isOpen={true}
          role={mockRoles[1]} // District Manager có 5 users
          availableRoles={mockRoles}
          isSubmitting={false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(screen.getByText('Chuyển giao người dùng & Xoá vai trò')).toBeInTheDocument();
      expect(screen.getByText(/hiện đang có/)).toBeInTheDocument();
      expect(screen.getAllByText(/5 người dùng/).length).toBeGreaterThan(0);

      const select = screen.getByLabelText(/Chọn vai trò tiếp nhận/);
      expect(select).toBeInTheDocument();

      fireEvent.click(screen.getByText('Chuyển giao & Xoá vai trò'));
      expect(handleConfirm).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // MÀN 1: DANH SÁCH VAI TRÒ (RoleListPage)
  // =========================================================================
  describe('RoleListPage (Màn 1)', () => {
    it('hiển thị đầy đủ danh sách vai trò theo đúng thứ tự và quy tắc nút bấm', async () => {
      vi.mocked(rbacService.getRoles).mockResolvedValue({
        roles: mockRoles,
        total: 5,
        can_create: true,
      });

      render(
        <RoleListPage
          onNavigateToCreate={vi.fn()}
          onNavigateToMatrix={vi.fn()}
          showToast={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('DANH SÁCH VAI TRÒ')).toBeInTheDocument();
      });

      // Kiểm tra sự xuất hiện của các vai trò
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('District Manager')).toBeInTheDocument();
      expect(screen.getByText('Responder')).toBeInTheDocument();
      expect(screen.getByText('Citizen')).toBeInTheDocument();
      expect(screen.getByText('Giám sát viên Môi trường')).toBeInTheDocument();

      // Kiểm tra tooltip quy tắc Admin
      expect(screen.getByText('Admin luôn có đầy đủ quyền, không thể chỉnh sửa')).toBeInTheDocument();

      // Kiểm tra số lượng người dùng
      expect(screen.getByText('3 người dùng')).toBeInTheDocument();
      expect(screen.getByText('120 người dùng')).toBeInTheDocument();
    });

    it('vô hiệu hóa nút Thêm vai trò khi hệ thống đã đạt 20 vai trò', async () => {
      vi.mocked(rbacService.getRoles).mockResolvedValue({
        roles: mockRoles,
        total: 20,
        can_create: false,
      });

      render(
        <RoleListPage
          onNavigateToCreate={vi.fn()}
          onNavigateToMatrix={vi.fn()}
          showToast={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Đã đạt tối đa 20 vai trò. Vui lòng xoá bớt vai trò không dùng')).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // MÀN 2: THÊM VAI TRÒ MỚI (CreateRolePage)
  // =========================================================================
  describe('CreateRolePage (Màn 2)', () => {
    it('render đầy đủ input, bộ đếm ký tự và radio scope', () => {
      render(
        <CreateRolePage
          onBackToList={vi.fn()}
          onRoleCreated={vi.fn()}
          showToast={vi.fn()}
        />
      );

      expect(screen.getByText('Khởi tạo Vai trò Mới')).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên vai trò/)).toBeInTheDocument();
      expect(screen.getByText('0/30')).toBeInTheDocument();
      expect(screen.getByText('0/200')).toBeInTheDocument();
      expect(screen.getByText(/Cấp Quận/)).toBeInTheDocument();
      expect(screen.getByText(/Toàn thành phố/)).toBeInTheDocument();
    });

    it('cập nhật bộ đếm ký tự khi người dùng nhập liệu', () => {
      render(
        <CreateRolePage
          onBackToList={vi.fn()}
          onRoleCreated={vi.fn()}
          showToast={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Tên vai trò/);
      fireEvent.change(input, { target: { value: 'Chuyên viên' } });

      expect(screen.getByText('11/30')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // MÀN 3: MA TRẬN PHÂN QUYỀN ĐỘNG (RolePermissionMatrixPage)
  // =========================================================================
  describe('RolePermissionMatrixPage (Màn 3)', () => {
    const mockMatrixData: PermissionMatrixResponse = {
      modules: [
        { code: "GIS_MAP", name: "Bản đồ số WebGIS", actions: ["VIEW", "CREATE", "UPDATE", "DELETE"] },
        { code: "INCIDENTS", name: "Báo cáo sự cố môi trường", actions: ["VIEW", "CREATE", "UPDATE", "DELETE"] },
        { code: "ROLE", name: "Phân quyền vai trò", actions: ["VIEW", "CREATE", "UPDATE", "DELETE"] },
        { code: "STATISTICS", name: "Thống kê & Báo cáo tổng hợp", actions: ["VIEW"] },
      ],
      roles: mockRoles,
      role_permissions: {
        "1": ["GIS_MAP:VIEW", "GIS_MAP:CREATE", "ROLE:VIEW"],
        "2": ["GIS_MAP:VIEW"],
        "5": [],
      },
    };

    it('render đầy đủ danh sách chức năng và ràng buộc interlocking logic', async () => {
      vi.mocked(rbacService.getPermissionMatrix).mockResolvedValue(mockMatrixData);

      render(
        <RolePermissionMatrixPage
          initialRoleId={2} // District Manager
          onBackToList={vi.fn()}
          showToast={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Ma Trận Phân Quyền Động GreenSpot')).toBeInTheDocument();
      });

      expect(screen.getByText('Bản đồ số WebGIS')).toBeInTheDocument();
      expect(screen.getByText('Báo cáo sự cố môi trường')).toBeInTheDocument();
      expect(screen.getByText('Phân quyền vai trò')).toBeInTheDocument();
      expect(screen.getByText('Thống kê & Báo cáo tổng hợp')).toBeInTheDocument();

      // Kiểm tra checkbox của cột đang sửa (vai trò 2)
      const incidentsCreateCheckbox = screen.getByLabelText('District Manager - Báo cáo sự cố môi trường - Thêm') as HTMLInputElement;
      expect(incidentsCreateCheckbox.checked).toBe(false);

      // Thao tác tích chọn "Thêm" -> Interlocking tự động bật "Xem"
      fireEvent.click(incidentsCreateCheckbox);
      expect(incidentsCreateCheckbox.checked).toBe(true);

      const incidentsViewCheckbox = screen.getByLabelText('District Manager - Báo cáo sự cố môi trường - Xem') as HTMLInputElement;
      expect(incidentsViewCheckbox.checked).toBe(true);

      // Kiểm tra nút Lưu thay đổi được kích hoạt
      const saveBtn = screen.getByText('💾 Lưu thay đổi');
      expect(saveBtn).not.toBeDisabled();
    });
  });
});
