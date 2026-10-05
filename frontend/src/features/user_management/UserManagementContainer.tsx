import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  UserItem,
  RoleOption,
  UserListSummary,
  CreateUserPayload,
} from './types/userManagement.types';
import { userManagementService } from './services/userManagementService';
import { CreateUserModal } from './components/CreateUserModal';
import { ChangeRoleModal } from './components/ChangeRoleModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { ConfirmModal, type ConfirmActionType } from './components/ConfirmModal';
import { AUTH_STORAGE_KEYS } from '../auth';
import './styles/UserManagement.scss';

interface UserManagementContainerProps {
  onBackToHome?: () => void;
  onNavigateToAuth?: () => void;
}

export const UserManagementContainer: React.FC<UserManagementContainerProps> = ({
  onBackToHome,
  onNavigateToAuth,
}) => {
  // Lấy thông tin tài khoản hiện tại từ localStorage
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      return token && raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Dữ liệu danh sách & thống kê
  const [users, setUsers] = useState<UserItem[]>([]);
  const [summary, setSummary] = useState<UserListSummary>({
    total_users: 0,
    active_users: 0,
    blocked_users: 0,
    roles_count: 0,
  });
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Bộ lọc & phân trang
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRoleUser, setSelectedRoleUser] = useState<UserItem | null>(null);
  const [selectedPasswordUser, setSelectedPasswordUser] = useState<UserItem | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    user: UserItem | null;
    actionType: ConfirmActionType;
  }>({
    isOpen: false,
    user: null,
    actionType: 'BLOCK',
  });

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Tải danh sách vai trò cho bộ lọc & modal
  const fetchRoleOptions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const roles = await userManagementService.getRoleOptions();
      setRoleOptions(roles);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách vai trò:', err);
    }
  }, [isAdmin]);

  // Tải danh sách người dùng
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await userManagementService.getUsers({
        page,
        limit,
        search: searchTerm,
        role_id: selectedRoleId !== 'ALL' ? Number(selectedRoleId) : undefined,
        status: selectedStatus,
      });
      setUsers(res.users);
      setSummary(res.stats);
      setTotalPages(res.total_pages);
      setTotalCount(res.total);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      showToast(err.response?.data?.detail || 'Không thể tải danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, limit, searchTerm, selectedRoleId, selectedStatus]);

  useEffect(() => {
    if (isAdmin) {
      fetchRoleOptions();
    }
  }, [isAdmin, fetchRoleOptions]);

  // Debounced search / filter trigger
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [isAdmin, fetchUsers]);

  // Reset về page 1 khi thay đổi bộ lọc tìm kiếm
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoleId(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    setPage(1);
  };

  // Thao tác tạo tài khoản mới
  const handleCreateUser = async (payload: CreateUserPayload) => {
    await userManagementService.createUser(payload);
    showToast(`Đã tạo tài khoản cho ${payload.full_name} (${payload.email}) thành công!`);
    fetchUsers();
  };

  // Thao tác đổi vai trò
  const handleChangeRole = async (userId: string, newRoleId: number) => {
    await userManagementService.changeUserRole(userId, { role_id: newRoleId });
    showToast('Đã thay đổi vai trò người dùng và thu hồi phiên cũ thành công!');
    fetchUsers();
  };

  // Thao tác đổi mật khẩu
  const handleResetPassword = async (userId: string, newPass: string) => {
    await userManagementService.resetUserPassword(userId, { new_password: newPass });
    showToast('Đã đặt lại mật khẩu mới cho tài khoản người dùng thành công!');
  };

  // Thao tác xác nhận Khóa / Mở khóa / Xóa
  const handleConfirmAction = async () => {
    if (!confirmState.user) return;
    const u = confirmState.user;

    if (confirmState.actionType === 'BLOCK') {
      await userManagementService.changeUserStatus(u.user_id, { status: 'BLOCKED' });
      showToast(`Đã khóa tài khoản ${u.email} và chấm dứt các phiên đang hoạt động!`);
    } else if (confirmState.actionType === 'UNBLOCK') {
      await userManagementService.changeUserStatus(u.user_id, { status: 'ACTIVE' });
      showToast(`Đã mở khóa tài khoản ${u.email} thành công!`);
    } else if (confirmState.actionType === 'DELETE') {
      await userManagementService.deleteUser(u.user_id);
      showToast(`Đã xóa vĩnh viễn tài khoản ${u.email}!`);
    }
    fetchUsers();
  };

  // Phân loại màu cho Role Badge
  const getRoleBadgeClass = (roleName: string, isSystem: boolean) => {
    if (!isSystem) return 'role-custom';
    switch (roleName) {
      case 'ADMIN':
        return 'role-admin';
      case 'DISTRICT_MANAGER':
        return 'role-dm';
      case 'RESPONDER':
        return 'role-resp';
      case 'CITIZEN':
        return 'role-citizen';
      default:
        return 'role-custom';
    }
  };

  // Phân loại Avatar
  const getAvatarClass = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'avatar-admin';
      case 'DISTRICT_MANAGER':
        return 'avatar-dm';
      case 'RESPONDER':
        return 'avatar-resp';
      default:
        return '';
    }
  };

  // 1. Kiểm tra trạng thái Chưa Đăng Nhập
  if (!currentUser) {
    return (
      <div className="user-management-wrapper">
        <div className="um-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Yêu cầu Đăng nhập Quản trị viên
          </h2>
          <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto 24px auto', fontSize: '15px' }}>
            Chức năng Quản lý Người dùng chỉ dành cho Quản trị viên (Admin). Vui lòng đăng nhập bằng tài khoản Quản trị viên để tiếp tục.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {onBackToHome && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBackToHome}
                style={{ padding: '10px 20px', borderRadius: '8px' }}
              >
                ← Quay lại bản đồ
              </button>
            )}
            {onNavigateToAuth && (
              <button
                type="button"
                className="btn-primary-action"
                onClick={onNavigateToAuth}
                style={{ padding: '10px 20px' }}
              >
                🔐 Đăng nhập ngay
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Kiểm tra tài khoản không phải Admin
  if (!isAdmin) {
    return (
      <div className="user-management-wrapper">
        <div className="um-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⛔</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
            Từ chối quyền truy cập (403 Forbidden)
          </h2>
          <p style={{ color: '#64748b', maxWidth: '520px', margin: '0 auto 24px auto', fontSize: '15px' }}>
            Tài khoản hiện tại của bạn (<strong>{currentUser.email}</strong> - Vai trò:{' '}
            <strong>{currentUser.role}</strong>) không có đặc quyền Quản trị viên tối cao để quản lý người dùng.
          </p>
          {onBackToHome && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBackToHome}
              style={{ padding: '10px 20px', borderRadius: '8px' }}
            >
              ← Quay lại bản đồ WebGIS
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. Màn hình quản trị đầy đủ cho Admin
  return (
    <div className="user-management-wrapper">
      <div className="um-container">
        {/* Thanh tiêu đề Header */}
        <div className="um-header-bar">
          <div>
            <div className="um-breadcrumb">
              Hệ thống quản trị / <span className="current">Quản lý người dùng & Tài khoản</span>
            </div>
            <h1 className="um-title">
              <span className="title-icon">👥</span> Quản lý Người dùng & Cấp quyền
            </h1>
            <p className="um-subtitle">
              Admin tạo tài khoản cho các quyền nghiệp vụ, phân quyền vai trò, quản lý trạng thái kích hoạt và bảo mật tài khoản.
            </p>
          </div>

          <div className="um-header-actions">
            {onBackToHome && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBackToHome}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                ← Quay lại Bản đồ
              </button>
            )}
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => setIsCreateOpen(true)}
            >
              <span>➕</span>
              <span>Thêm người dùng mới</span>
            </button>
          </div>
        </div>

        {/* Thống kê nhanh Stats Grid */}
        <div className="um-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper icon-total">👥</div>
            <div className="stat-content">
              <span className="stat-value">{summary.total_users}</span>
              <span className="stat-label">Tổng số người dùng</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper icon-active">🟢</div>
            <div className="stat-content">
              <span className="stat-value">{summary.active_users}</span>
              <span className="stat-label">Đang hoạt động</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper icon-blocked">🔴</div>
            <div className="stat-content">
              <span className="stat-value">{summary.blocked_users}</span>
              <span className="stat-label">Tài khoản bị khóa</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper icon-roles">🛡️</div>
            <div className="stat-content">
              <span className="stat-value">{summary.roles_count}</span>
              <span className="stat-label">Tổng số vai trò</span>
            </div>
          </div>
        </div>

        {/* Khung nội dung chính & Bảng dữ liệu */}
        <div className="um-main-card">
          {/* Thanh công cụ Tìm kiếm & Bộ lọc */}
          <div className="um-toolbar">
            <div className="um-toolbar-left">
              <div className="search-box-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {/* Lọc theo Vai trò */}
              <select
                className="filter-select"
                value={selectedRoleId}
                onChange={handleRoleFilterChange}
                aria-label="Lọc theo vai trò"
              >
                <option value="ALL">Tất cả vai trò</option>
                {roleOptions.map((role) => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name} ({role.scope_display})
                  </option>
                ))}
              </select>

              {/* Lọc theo Trạng thái */}
              <select
                className="filter-select"
                value={selectedStatus}
                onChange={handleStatusFilterChange}
                aria-label="Lọc theo trạng thái"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="BLOCKED">Bị khóa</option>
              </select>
            </div>

            <div className="um-toolbar-right">
              <button
                type="button"
                className="btn-refresh"
                onClick={fetchUsers}
                disabled={loading}
                title="Làm mới danh sách"
              >
                <span>🔄</span>
                <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
            </div>
          </div>

          {/* Bảng danh sách người dùng */}
          <div className="um-table-responsive">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò & Phân quyền</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo / Phiên cuối</th>
                  <th className="th-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-loading-state">
                      <div className="spinner-border" style={{ borderColor: '#10b981', borderTopColor: 'transparent', width: '28px', height: '28px' }} />
                      <p style={{ marginTop: '12px' }}>Đang tải danh sách người dùng...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-state">
                      <div className="empty-icon">📂</div>
                      <p>Không tìm thấy người dùng nào phù hợp với điều kiện tìm kiếm.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u.user_id === currentUser?.user_id || u.email === currentUser?.email;
                    return (
                      <tr key={u.user_id} className={u.status === 'BLOCKED' ? 'row-blocked' : ''}>
                        {/* Cột 1: Thông tin người dùng */}
                        <td>
                          <div className="user-info-cell">
                            <div className={`user-avatar-circle ${getAvatarClass(u.role_name)}`}>
                              {u.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-meta-texts">
                              <span className="user-name-line">
                                {u.full_name}
                                {isSelf && <span className="self-tag">Chính bạn</span>}
                              </span>
                              <span className="user-email-line">{u.email}</span>
                              {u.phone_number && <span className="user-phone-line">📞 {u.phone_number}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Vai trò & Phạm vi */}
                        <td>
                          <div className="role-badge-cell">
                            <span className={`role-pill ${getRoleBadgeClass(u.role_name, u.role_is_system)}`}>
                              🛡️ {u.role_name}
                            </span>
                            <span className="role-scope-subtext">
                              {u.role_scope_display || (u.role_scope === 'CITY' ? '🌐 Toàn thành phố' : '🏢 Cấp Quận')}
                              {u.role_is_system ? ' • Hệ thống' : ' • Tùy chỉnh'}
                            </span>
                          </div>
                        </td>

                        {/* Cột 3: Trạng thái */}
                        <td>
                          <span className={`status-badge status-${u.status.toLowerCase()}`}>
                            <span className="status-dot" />
                            {u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã bị khóa'}
                          </span>
                        </td>

                        {/* Cột 4: Ngày tạo / Phiên hoạt động cuối */}
                        <td>
                          <div className="date-info-cell">
                            <span className="created-date">
                              Tạo: {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                            </span>
                            <span className="last-active">
                              {u.last_active_at
                                ? `Active: ${new Date(u.last_active_at).toLocaleString('vi-VN')}`
                                : 'Chưa có phiên'}
                            </span>
                          </div>
                        </td>

                        {/* Cột 5: Hành động */}
                        <td>
                          <div className="actions-cell">
                            {/* Đổi vai trò */}
                            <button
                              type="button"
                              className="btn-action-icon"
                              title={isSelf ? 'Không thể tự đổi vai trò của chính mình' : 'Đổi vai trò'}
                              onClick={() => setSelectedRoleUser(u)}
                              disabled={isSelf}
                            >
                              🛡️
                            </button>

                            {/* Đặt lại mật khẩu */}
                            <button
                              type="button"
                              className="btn-action-icon"
                              title="Đặt lại mật khẩu mới"
                              onClick={() => setSelectedPasswordUser(u)}
                            >
                              🔑
                            </button>

                            {/* Khóa / Mở khóa tài khoản */}
                            {u.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                className="btn-action-icon action-block"
                                title={isSelf ? 'Không thể tự khóa tài khoản của chính mình' : 'Khóa tài khoản'}
                                onClick={() =>
                                  setConfirmState({
                                    isOpen: true,
                                    user: u,
                                    actionType: 'BLOCK',
                                  })
                                }
                                disabled={isSelf}
                              >
                                🔒
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-action-icon"
                                title="Mở khóa tài khoản"
                                onClick={() =>
                                  setConfirmState({
                                    isOpen: true,
                                    user: u,
                                    actionType: 'UNBLOCK',
                                  })
                                }
                              >
                                🔓
                              </button>
                            )}

                            {/* Xóa tài khoản */}
                            <button
                              type="button"
                              className="btn-action-icon action-delete"
                              title={isSelf ? 'Không thể tự xóa tài khoản của chính mình' : 'Xóa vĩnh viễn'}
                              onClick={() =>
                                setConfirmState({
                                  isOpen: true,
                                  user: u,
                                  actionType: 'DELETE',
                                })
                              }
                              disabled={isSelf}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang Pagination */}
          <div className="um-pagination-bar">
            <div className="pagination-info">
              Hiển thị <strong>{users.length}</strong> trên tổng số <strong>{totalCount}</strong> người dùng (Trang {page}/{totalPages || 1})
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="btn-page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                ‹ Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {hasGap && <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>}
                      <button
                        type="button"
                        className={`btn-page ${p === page ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                        disabled={loading}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                className="btn-page"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Sau ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: TẠO TÀI KHOẢN MỚI */}
      <CreateUserModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateUser}
        roleOptions={roleOptions}
      />

      {/* MODAL 2: THAY ĐỔI VAI TRÒ */}
      <ChangeRoleModal
        isOpen={!!selectedRoleUser}
        user={selectedRoleUser}
        roleOptions={roleOptions}
        onClose={() => setSelectedRoleUser(null)}
        onSubmit={handleChangeRole}
      />

      {/* MODAL 3: ĐẶT LẠI MẬT KHẨU */}
      <ResetPasswordModal
        isOpen={!!selectedPasswordUser}
        user={selectedPasswordUser}
        onClose={() => setSelectedPasswordUser(null)}
        onSubmit={handleResetPassword}
      />

      {/* MODAL 4: XÁC NHẬN KHÓA / MỞ KHÓA / XÓA */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        user={confirmState.user}
        actionType={confirmState.actionType}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
      />

      {/* TOAST THÔNG BÁO NỔI */}
      {toast && (
        <div className="um-toast-container">
          <div className={`um-toast toast-${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
            <span className="toast-msg">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => setToast(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserManagementContainer;
