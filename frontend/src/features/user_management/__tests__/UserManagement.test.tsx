import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementContainer } from '../UserManagementContainer';
import { CreateUserModal } from '../components/CreateUserModal';
import { ChangeRoleModal } from '../components/ChangeRoleModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { userManagementService } from '../services/userManagementService';
import { RoleOption, UserItem } from '../types/userManagement.types';
import { AUTH_STORAGE_KEYS } from '../../auth';

vi.mock('../services/userManagementService', () => ({
  userManagementService: {
    getRoleOptions: vi.fn(),
    getUsers: vi.fn(),
    createUser: vi.fn(),
    changeUserRole: vi.fn(),
    changeUserStatus: vi.fn(),
    resetUserPassword: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const mockRoleOptions: RoleOption[] = [
  {
    role_id: 1,
    role_code: 'ADMIN',
    role_name: 'Admin',
    scope: 'CITY',
    scope_display: 'Toàn thành phố',
    is_system: true,
  },
  {
    role_id: 2,
    role_code: 'DISTRICT_MANAGER',
    role_name: 'District Manager',
    scope: 'DISTRICT',
    scope_display: 'Quận',
    is_system: true,
  },
  {
    role_id: 3,
    role_code: 'CITIZEN',
    role_name: 'Citizen',
    scope: 'CITY',
    scope_display: 'Toàn thành phố',
    is_system: true,
  },
];

const mockUsers: UserItem[] = [
  {
    user_id: 'user-admin-1',
    email: 'admin@greenspot.vn',
    phone_number: '0901234567',
    full_name: 'Nguyễn Quản Trị',
    role_id: 1,
    role_code: 'ADMIN',
    role_name: 'Admin',
    role_scope: 'CITY',
    role_scope_display: 'Toàn thành phố',
    role_is_system: true,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    last_active_at: '2026-10-05T10:00:00Z',
  },
  {
    user_id: 'user-dm-2',
    email: 'dm_quan1@greenspot.vn',
    phone_number: '0912345678',
    full_name: 'Trần Văn Cán Bộ',
    role_id: 2,
    role_code: 'DISTRICT_MANAGER',
    role_name: 'District Manager',
    role_scope: 'DISTRICT',
    role_scope_display: 'Quận',
    role_is_system: true,
    status: 'ACTIVE',
    created_at: '2026-02-01T00:00:00Z',
    last_active_at: null,
  },
  {
    user_id: 'user-citizen-3',
    email: 'citizen_block@gmail.com',
    phone_number: null,
    full_name: 'Lê Vi Phạm',
    role_id: 3,
    role_code: 'CITIZEN',
    role_name: 'Citizen',
    role_scope: 'CITY',
    role_scope_display: 'Toàn thành phố',
    role_is_system: true,
    status: 'BLOCKED',
    created_at: '2026-03-01T00:00:00Z',
    last_active_at: null,
  },
];

describe('User Management Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('UserManagementContainer Auth & Permissions', () => {
    it('hiển thị thông báo yêu cầu đăng nhập nếu người dùng chưa xác thực', () => {
      render(<UserManagementContainer />);
      expect(screen.getByText('Yêu cầu Đăng nhập Quản trị viên')).toBeInTheDocument();
    });

    it('hiển thị lỗi 403 Forbidden nếu người dùng không có vai trò ADMIN', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'user-citizen-3',
          email: 'citizen@greenspot.vn',
          role: 'CITIZEN',
        })
      );

      render(<UserManagementContainer />);
      expect(screen.getByText(/Từ chối quyền truy cập/i)).toBeInTheDocument();
      expect(screen.getAllByText(/CITIZEN/i).length).toBeGreaterThan(0);
    });

    it('tải và hiển thị danh sách người dùng khi là ADMIN', async () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'admin_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'user-admin-1',
          email: 'admin@greenspot.vn',
          full_name: 'Nguyễn Quản Trị',
          role: 'ADMIN',
        })
      );

      vi.mocked(userManagementService.getRoleOptions).mockResolvedValue(mockRoleOptions);
      vi.mocked(userManagementService.getUsers).mockResolvedValue({
        users: mockUsers,
        stats: {
          total_users: 3,
          active_users: 2,
          blocked_users: 1,
          roles_count: 3,
        },
        page: 1,
        limit: 10,
        total: 3,
        total_pages: 1,
      });

      render(<UserManagementContainer />);

      await waitFor(() => {
        expect(screen.getByText('Quản lý Người dùng & Cấp quyền')).toBeInTheDocument();
        expect(screen.getByText('Nguyễn Quản Trị')).toBeInTheDocument();
        expect(screen.getByText('Trần Văn Cán Bộ')).toBeInTheDocument();
        expect(screen.getByText('Lê Vi Phạm')).toBeInTheDocument();
      });

      // Kiểm tra nhãn 'Chính bạn' dành cho tài khoản admin hiện tại
      expect(screen.getByText('Chính bạn')).toBeInTheDocument();
    });
  });

  describe('CreateUserModal Component', () => {
    it('kiểm tra validation họ tên, email và mật khẩu', async () => {
      const mockSubmit = vi.fn();
      const mockClose = vi.fn();

      render(
        <CreateUserModal
          isOpen={true}
          onClose={mockClose}
          onSubmit={mockSubmit}
          roleOptions={mockRoleOptions}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /Tạo tài khoản/i });

      // Điền họ tên ngắn
      const nameInput = screen.getByLabelText(/Họ và tên/i);
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.click(submitBtn);
      expect(await screen.findByText(/Họ và tên phải có tối thiểu 2 ký tự/i)).toBeInTheDocument();

      // Điền họ tên hợp lệ nhưng email sai định dạng
      fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn Test' } });
      const emailInput = screen.getByLabelText(/Địa chỉ Email/i);
      fireEvent.change(emailInput, { target: { value: 'email-sai' } });
      fireEvent.click(submitBtn);
      expect(await screen.findByText(/Địa chỉ email không đúng định dạng/i)).toBeInTheDocument();

      // Điền email hợp lệ nhưng mật khẩu yếu
      fireEvent.change(emailInput, { target: { value: 'test@greenspot.vn' } });
      const passInput = screen.getByLabelText(/Mật khẩu khởi tạo/i);
      fireEvent.change(passInput, { target: { value: '123' } });
      fireEvent.click(submitBtn);
      expect(await screen.findByText(/Mật khẩu phải có tối thiểu 8 ký tự/i)).toBeInTheDocument();
    });

    it('tạo mật khẩu ngẫu nhiên và gửi form thành công', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn();

      render(
        <CreateUserModal
          isOpen={true}
          onClose={mockClose}
          onSubmit={mockSubmit}
          roleOptions={mockRoleOptions}
        />
      );

      fireEvent.change(screen.getByLabelText(/Họ và tên/i), {
        target: { value: 'Hoàng Quản Lý' },
      });
      fireEvent.change(screen.getByLabelText(/Địa chỉ Email/i), {
        target: { value: 'hoang.ql@greenspot.vn' },
      });

      // Bấm nút sinh mật khẩu ngẫu nhiên
      const genBtn = screen.getByRole('button', { name: /Tạo mật khẩu ngẫu nhiên/i });
      fireEvent.click(genBtn);

      const passInput = screen.getByLabelText(/Mật khẩu khởi tạo/i) as HTMLInputElement;
      expect(passInput.value.length).toBeGreaterThanOrEqual(8);

      const submitBtn = screen.getByRole('button', { name: /Tạo tài khoản/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledTimes(1);
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'Hoàng Quản Lý',
            email: 'hoang.ql@greenspot.vn',
          })
        );
      });
    });
  });

  describe('ChangeRoleModal Component', () => {
    it('chặn submit nếu vai trò chọn trùng với vai trò hiện tại', () => {
      const mockSubmit = vi.fn();
      const mockClose = vi.fn();

      render(
        <ChangeRoleModal
          isOpen={true}
          user={mockUsers[1]}
          roleOptions={mockRoleOptions}
          onClose={mockClose}
          onSubmit={mockSubmit}
        />
      );

      const submitBtn = screen.getByRole('button', { name: /Cập nhật vai trò/i });
      // Nút bị disabled khi chọn đúng vai trò hiện tại
      expect(submitBtn).toBeDisabled();
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('cho phép chọn vai trò mới và submit thành công', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn();

      render(
        <ChangeRoleModal
          isOpen={true}
          user={mockUsers[1]}
          roleOptions={mockRoleOptions}
          onClose={mockClose}
          onSubmit={mockSubmit}
        />
      );

      const select = screen.getByLabelText(/Chọn vai trò mới/i);
      fireEvent.change(select, { target: { value: 3 } });

      const submitBtn = screen.getByRole('button', { name: /Cập nhật vai trò/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith('user-dm-2', 3);
      });
    });
  });

  describe('ResetPasswordModal Component', () => {
    it('kiểm tra xác nhận mật khẩu không khớp và submit khi hợp lệ', async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn();

      render(
        <ResetPasswordModal
          isOpen={true}
          user={mockUsers[1]}
          onClose={mockClose}
          onSubmit={mockSubmit}
        />
      );

      const passInput = screen.getByLabelText(/^Mật khẩu mới/i);
      const confirmInput = screen.getByLabelText(/Xác nhận mật khẩu mới/i);
      const submitBtn = screen.getByRole('button', { name: /Lưu mật khẩu mới/i });

      // Nhập mật khẩu không khớp
      fireEvent.change(passInput, { target: { value: 'AdminPass123!' } });
      fireEvent.change(confirmInput, { target: { value: 'AdminPass999!' } });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();

      // Sửa lại cho khớp
      fireEvent.change(confirmInput, { target: { value: 'AdminPass123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith('user-dm-2', 'AdminPass123!');
      });
    });
  });

  describe('ConfirmModal Component (Block / Unblock / Delete)', () => {
    it('hiển thị đúng hành động Khóa tài khoản', async () => {
      const mockConfirm = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn();

      render(
        <ConfirmModal
          isOpen={true}
          user={mockUsers[1]}
          actionType="BLOCK"
          onClose={mockClose}
          onConfirm={mockConfirm}
        />
      );

      expect(screen.getByText('Khóa tài khoản người dùng')).toBeInTheDocument();
      expect(screen.getByText(/Toàn bộ phiên đăng nhập hiện thời/i)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /Xác nhận khóa tài khoản/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('hiển thị đúng hành động Xóa vĩnh viễn', async () => {
      const mockConfirm = vi.fn().mockResolvedValue(undefined);
      const mockClose = vi.fn();

      render(
        <ConfirmModal
          isOpen={true}
          user={mockUsers[2]}
          actionType="DELETE"
          onClose={mockClose}
          onConfirm={mockConfirm}
        />
      );

      expect(screen.getByText('Xóa tài khoản người dùng')).toBeInTheDocument();
      expect(screen.getByText(/Hành động này không thể hoàn tác/i)).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: /Xác nhận xóa vĩnh viễn/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalledTimes(1);
      });
    });
  });
});
