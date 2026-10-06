import React from 'react';

interface AccessDeniedViewProps {
  moduleName: string;
  moduleCode: string;
  userRole?: string;
  userEmail?: string;
  onBackToHome?: () => void;
  onNavigateToAuth?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  moduleName,
  moduleCode,
  userRole,
  userEmail,
  onBackToHome,
  onNavigateToAuth,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: '32px 20px',
        backgroundColor: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            margin: '0 auto 20px auto',
          }}
        >
          🔒
        </div>

        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 8px 0',
          }}
        >
          Từ chối quyền truy cập (403 Forbidden)
        </h2>

        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
          }}
        >
          Tài khoản của bạn {userEmail ? (<strong>{userEmail}</strong>) : ''} với vai trò{' '}
          <strong style={{ color: '#0369a1' }}>{userRole || 'Chưa xác định'}</strong> chưa được
          Quản trị viên cấp quyền <strong>TRUY CẬP (ACCESS)</strong> vào chức năng{' '}
          <strong style={{ color: '#0f172a' }}>{moduleName}</strong> (<code>{moduleCode}</code>).
        </p>

        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#92400e',
            textAlign: 'left',
            marginBottom: '28px',
            lineHeight: 1.5,
          }}
        >
          💡 <strong>Cơ chế phân quyền RBAC:</strong> Để sử dụng chức năng này, vui lòng liên hệ
          Quản trị viên hệ thống để được bật quyền <strong>TRUY CẬP</strong> trong Ma trận phân quyền ACL.
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ← Quay lại bản đồ
            </button>
          )}

          {onNavigateToAuth && (
            <button
              type="button"
              onClick={onNavigateToAuth}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
              }}
            >
              🔐 Đăng nhập tài khoản khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
