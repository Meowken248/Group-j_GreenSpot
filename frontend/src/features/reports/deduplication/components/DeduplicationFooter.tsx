import React from 'react';

export const DeduplicationFooter: React.FC = () => {
  return (
    <footer className="dedup-footer">
      <div className="footer-copyright">
        © 2026 GreenSpot Smart City. Hệ thống AI Phân tích & Tinh gọn Dữ liệu Môi trường. Bản quyền thuộc về Sở Tài nguyên & Môi trường.
      </div>
      <div className="footer-links">
        <a href="#privacy" className="footer-link">
          Chính sách bảo mật
        </a>
        <a href="#contact" className="footer-link">
          Liên hệ điều phối
        </a>
        <a href="#terms" className="footer-link">
          Điều khoản dịch vụ
        </a>
      </div>
    </footer>
  );
};
