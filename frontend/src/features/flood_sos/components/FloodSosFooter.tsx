import React from "react";

export const FloodSosFooter: React.FC = () => {
  return (
    <footer className="sos-footer" data-testid="sos-footer">
      <div className="footer-content">
        <div>
          © 2026 GreenSpot. Hệ thống ứng phó thiên tai & điều phối cứu hộ ngập lụt khẩn cấp.
        </div>
        <div className="footer-links">
          <a href="#ban-quyen" onClick={(e) => e.preventDefault()}>
            Bản quyền
          </a>
          <span>•</span>
          <a href="#lien-he" onClick={(e) => e.preventDefault()}>
            Liên hệ: 112 / 0908.112.112
          </a>
          <span>•</span>
          <a href="#chinh-sach" onClick={(e) => e.preventDefault()}>
            Chính sách bảo mật vị trí
          </a>
        </div>
      </div>
    </footer>
  );
};
