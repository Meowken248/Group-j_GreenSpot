import React from "react";

export const IncidentExportFooter: React.FC = () => {
  return (
    <footer className="export-footer" data-testid="export-footer">
      <div className="footer-inner">
        <div>
          © 2026 GreenSpot. Bản quyền thuộc Sở Tài nguyên & Môi trường TP. Hồ Chí Minh.
        </div>
        <div className="footer-links">
          <a href="#ban-quyen" onClick={(e) => e.preventDefault()}>
            Bản quyền
          </a>
          <span>•</span>
          <a href="#lien-he" onClick={(e) => e.preventDefault()}>
            Liên hệ: (028) 38.225.686
          </a>
          <span>•</span>
          <a href="#chinh-sach" onClick={(e) => e.preventDefault()}>
            Chính sách bảo mật dữ liệu
          </a>
        </div>
      </div>
    </footer>
  );
};
