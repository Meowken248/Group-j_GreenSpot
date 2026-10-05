import React, { useState } from 'react';
import type { RoleOption, CreateUserPayload } from '../types/userManagement.types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
  roleOptions: RoleOption[];
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  roleOptions,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cập nhật roleId mặc định khi roleOptions tải xong
  React.useEffect(() => {
    if (!roleId && roleOptions.length > 0) {
      const defaultRole = roleOptions.find((r) => r.role_code === 'DISTRICT_MANAGER') || roleOptions[0];
      setRoleId(defaultRole.role_id);
    }
  }, [roleOptions, roleId]);

  if (!isOpen) return null;

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
    setPassword(result);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg('Họ và tên phải có tối thiểu 2 ký tự.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Địa chỉ email không đúng định dạng.');
      return;
    }

    if (phone.trim()) {
      const phoneRegex = /^0\d{9,10}$/;
      if (!phoneRegex.test(phone.trim())) {
        setErrorMsg('Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.');
        return;
      }
    }

    if (!password || password.length < 8) {
      setErrorMsg('Mật khẩu phải có tối thiểu 8 ký tự.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg('Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường và một chữ số.');
      return;
    }

    if (!roleId) {
      setErrorMsg('Vui lòng chọn một vai trò cho người dùng.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.trim() ? phone.trim() : undefined,
        password,
        role_id: Number(roleId),
      });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Không thể tạo tài khoản người dùng';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roleOptions.find((r) => r.role_id === roleId);

  return (
    <div className="um-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="um-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="um-modal-header">
          <div className="header-icon-title">
            <div className="modal-icon user-add-icon">👤➕</div>
            <div>
              <h3>Tạo tài khoản người dùng mới</h3>
              <p className="subtitle">Chỉ Quản trị viên (Admin) mới có quyền cấp phát tài khoản nghiệp vụ</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={loading} type="button">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="um-modal-body" noValidate>
          {errorMsg && (
            <div className="um-alert um-alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">{errorMsg}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="createUser-fullName">
              Họ và tên <span className="required-star">*</span>
            </label>
            <input
              id="createUser-fullName"
              type="text"
              className="form-control"
              placeholder="VD: Trần Văn Nam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group col-6">
              <label htmlFor="createUser-email">
                Địa chỉ Email <span className="required-star">*</span>
              </label>
              <input
                id="createUser-email"
                type="email"
                className="form-control"
                placeholder="nam.tran@greenspot.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="form-group col-6">
              <label htmlFor="createUser-phone">Số điện thoại</label>
              <input
                id="createUser-phone"
                type="tel"
                className="form-control"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="createUser-role">
              Vai trò & Phân quyền <span className="required-star">*</span>
            </label>
            <select
              id="createUser-role"
              className="form-control form-select"
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
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
            {selectedRole && (
              <div className="role-preview-hint">
                <span className="role-scope-tag">
                  {selectedRole.scope === 'CITY' ? '🌐 Toàn thành phố' : '🏢 Cấp Quận'}
                </span>
                <span className="role-desc-text">Mã quyền: {selectedRole.role_code}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <div className="label-with-action">
              <label htmlFor="createUser-password">
                Mật khẩu khởi tạo <span className="required-star">*</span>
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
                id="createUser-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control font-mono"
                placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <p className="form-hint">
              💡 Mật khẩu cần tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.
            </p>
          </div>

          <div className="um-note-box">
            <span className="note-icon">ℹ️</span>
            <span>
              Tài khoản sau khi tạo sẽ ở trạng thái <strong>ĐANG HOẠT ĐỘNG (ACTIVE)</strong> và có thể đăng nhập ngay lập tức bằng email và mật khẩu khởi tạo này.
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
                  <span className="spinner-border" /> Đang tạo tài khoản...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
