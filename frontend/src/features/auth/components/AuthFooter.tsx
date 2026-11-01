import React from "react";

export const AuthFooter: React.FC = () => {
  return (
    <footer className="auth-footer" role="contentinfo">
      <div className="footer-links">
        <span className="footer-link">Điều khoản sử dụng</span>
        <span className="footer-divider">•</span>
        <span className="footer-link">Chính sách bảo mật</span>
        <span className="footer-divider">•</span>
        <span className="footer-link">Tra cứu pháp luật sinh thái</span>
      </div>
      <p className="footer-copyright">
        © {new Date().getFullYear()} GreenSpot Platform. Hệ thống định danh & dịch vụ công dân sinh thái số. Bảo lưu mọi quyền.
      </p>
    </footer>
  );
};
