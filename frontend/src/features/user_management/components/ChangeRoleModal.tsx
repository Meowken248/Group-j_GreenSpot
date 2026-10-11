import React, { useState } from 'react';
import type { UserItem, RoleOption } from '../types/userManagement.types';

interface ChangeRoleModalProps {
  isOpen: boolean;
  user: UserItem | null;
  roleOptions: RoleOption[];
  onClose: () => void;
  onSubmit: (userId: string, newRoleId: number) => Promise<void>;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  user,
  roleOptions,
  onClose,
  onSubmit,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setSelectedRoleId(user.role_id);
      setErrorMsg(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleId === '') {
      setErrorMsg('Vui lòng chọn vai trò mới');
      return;
    }
    if (Number(selectedRoleId) === user.role_id) {
      setErrorMsg('Người dùng hiện đã có vai trò này. Vui lòng chọn vai trò khác để thay đổi.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      await onSubmit(user.user_id, Number(selectedRoleId));
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Không thể đổi vai trò người dùng';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const targetRole = roleOptions.find((r) => r.role_id === selectedRoleId);

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-content">
        <div className="um-modal-header">
          <div className="header-icon-title">
            <div className="modal-icon role-icon">🛡️🔄</div>
            <div>
              <h3>Thay đổi vai trò người dùng</h3>
              <p className="subtitle">Cập nhật quyền hạn truy cập của tài khoản</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={loading} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="um-modal-body">
          {errorMsg && (
            <div className="um-alert um-alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">{errorMsg}</span>
            </div>
          )}

          <div className="user-info-summary-card">
            <div className="summary-avatar">{user.full_name?.charAt(0).toUpperCase() || 'U'}</div>
            <div className="summary-details">
              <strong>{user.full_name}</strong>
              <span className="email">{user.email}</span>
              <div className="current-badge-row">
                <span>Vai trò hiện tại:</span>
                <span className="badge badge-current">{user.role_name}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="changeRole-select">
              Chọn vai trò mới <span className="required-star">*</span>
            </label>
            <select
              id="changeRole-select"
              className="form-control form-select"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(Number(e.target.value))}
              disabled={loading}
              required
            >
              {roleOptions.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name} ({role.scope_display})
                  {role.is_system ? ' - Hệ thống' : ' - Tùy chỉnh'}
                </option>
              ))}
            </select>
          </div>

          {targetRole && (
            <div className="role-preview-hint">
              <span className="role-scope-tag">
                {targetRole.scope === 'CITY' ? '🌐 Toàn thành phố' : '🏢 Cấp Quận'}
              </span>
              <span className="role-desc-text">Mã quyền: {targetRole.role_code}</span>
            </div>
          )}

          <div className="um-warning-box">
            <span className="warn-icon">⚡</span>
            <span>
              <strong>Lưu ý quan trọng:</strong> Khi đổi vai trò, toàn bộ phiên đăng nhập hiện tại của người dùng này trên các thiết bị sẽ bị <strong>thu hồi ngay lập tức</strong>. Người dùng sẽ phải đăng nhập lại để nhận quyền mới.
            </span>
          </div>

          <div className="um-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || selectedRoleId === user.role_id}
            >
              {loading ? (
                <>
                  <span className="spinner-border" /> Đang cập nhật...
                </>
              ) : (
                'Cập nhật vai trò'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
