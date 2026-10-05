import React, { useState } from 'react';
import type { UserItem } from '../types/userManagement.types';

export type ConfirmActionType = 'BLOCK' | 'UNBLOCK' | 'DELETE';

interface ConfirmModalProps {
  isOpen: boolean;
  user: UserItem | null;
  actionType: ConfirmActionType;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  user,
  actionType,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setErrorMsg(null);
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Thao tác không thành công';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const config = {
    BLOCK: {
      title: 'Khóa tài khoản người dùng',
      icon: '🔒',
      badgeClass: 'badge-blocked',
      desc: (
        <>
          Bạn có chắc chắn muốn <strong>KHÓA</strong> tài khoản của{' '}
          <strong>{user.full_name}</strong> (<code>{user.email}</code>)?
          <br />
          <br />
          Toàn bộ phiên đăng nhập hiện thời của tài khoản này sẽ bị <strong>thu hồi ngay lập tức</strong>, người dùng sẽ không thể tiếp tục truy cập hệ thống.
        </>
      ),
      confirmBtnText: 'Xác nhận khóa tài khoản',
      confirmBtnClass: 'btn-warning',
    },
    UNBLOCK: {
      title: 'Mở khóa tài khoản người dùng',
      icon: '🔓',
      badgeClass: 'badge-active',
      desc: (
        <>
          Bạn có chắc chắn muốn <strong>MỞ KHÓA</strong> lại cho tài khoản của{' '}
          <strong>{user.full_name}</strong> (<code>{user.email}</code>)?
          <br />
          <br />
          Người dùng sẽ có thể đăng nhập và sử dụng hệ thống bình thường trở lại.
        </>
      ),
      confirmBtnText: 'Mở khóa tài khoản',
      confirmBtnClass: 'btn-success',
    },
    DELETE: {
      title: 'Xóa tài khoản người dùng',
      icon: '🗑️',
      badgeClass: 'badge-danger',
      desc: (
        <>
          Bạn có chắc chắn muốn <strong>XÓA VĨNH VIỄN</strong> tài khoản của{' '}
          <strong>{user.full_name}</strong> (<code>{user.email}</code>)?
          <br />
          <br />
          <span style={{ color: '#dc2626', fontWeight: 600 }}>
            Hành động này không thể hoàn tác! Toàn bộ thông tin định danh và phiên làm việc sẽ bị xóa hoàn toàn.
          </span>
        </>
      ),
      confirmBtnText: 'Xác nhận xóa vĩnh viễn',
      confirmBtnClass: 'btn-danger',
    },
  }[actionType];

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal-content um-confirm-content">
        <div className="um-modal-header">
          <div className="header-icon-title">
            <div className={`modal-icon ${config.badgeClass}`}>{config.icon}</div>
            <div>
              <h3>{config.title}</h3>
              <p className="subtitle">Yêu cầu xác nhận thao tác quản trị</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={loading} type="button">
            &times;
          </button>
        </div>

        <div className="um-modal-body">
          {errorMsg && (
            <div className="um-alert um-alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">{errorMsg}</span>
            </div>
          )}

          <div className="confirm-desc-box">{config.desc}</div>
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
            type="button"
            className={`btn ${config.confirmBtnClass}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border" /> Đang xử lý...
              </>
            ) : (
              config.confirmBtnText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
