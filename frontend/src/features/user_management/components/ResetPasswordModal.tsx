import React, { useState } from 'react';
import type { UserItem } from '../types/userManagement.types';
import { validatePassword } from '../../auth/utils/validators';

interface ResetPasswordModalProps {
  isOpen: boolean;
  user: UserItem | null;
  onClose: () => void;
  onSubmit: (userId: string, newPassword: string) => Promise<void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  user,
  onClose,
  onSubmit,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setShowPassword(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let result = '';
    result += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[(Math.random() * 24) | 0];
    result += 'abcdefghijkmnpqrstuvwxyz'[(Math.random() * 24) | 0];
    result += '23456789'[(Math.random() * 8) | 0];
    result += '!@#$%^&*'[(Math.random() * 8) | 0];
    for (let i = 0; i < 6; i++) {
      result += chars[(Math.random() * chars.length) | 0];
    }
    setNewPassword(result);
    setConfirmPassword(result);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setErrorMsg(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(user.user_id, newPassword);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.detail || err.message || 'Không thể đặt lại mật khẩu';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-content">
        <div className="um-modal-header">
          <div className="header-icon-title">
            <div className="modal-icon key-icon">🔑🔄</div>
            <div>
              <h3>Đặt lại mật khẩu</h3>
              <p className="subtitle">Cấp phát mật khẩu đăng nhập mới cho người dùng</p>
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
              <span className="badge badge-role">{user.role_name}</span>
            </div>
          </div>

          <div className="form-group">
            <div className="label-with-action">
              <label htmlFor="reset-newPassword">
                Mật khẩu mới <span className="required-star">*</span>
              </label>
              <button
                type="button"
                className="btn-text-action"
                onClick={generateStrongPassword}
                disabled={loading}
              >
                ⚡ Tạo mật khẩu ngẫu nhiên
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="reset-newPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-control font-mono"
                placeholder="Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirmPassword">
              Xác nhận mật khẩu mới <span className="required-star">*</span>
            </label>
            <input
              id="reset-confirmPassword"
              type={showPassword ? 'text' : 'password'}
              className="form-control font-mono"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="um-warning-box">
            <span className="warn-icon">⚠️</span>
            <span>
              Người dùng sẽ bị <strong>đăng xuất khỏi tất cả các thiết bị</strong> ngay lập tức và phải sử dụng mật khẩu mới này để đăng nhập lại.
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border" /> Đang cập nhật...
                </>
              ) : (
                'Lưu mật khẩu mới'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
