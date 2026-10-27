import React from "react";

export const EmergencyFooter: React.FC = () => {
  return (
    <footer className="emergency-footer">
      <div className="footer-left">
        <span>© 2026 Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn TP.HCM — Hệ thống GreenSpot</span>
      </div>
      <div className="footer-links">
        <button type="button" onClick={() => alert("Bản quyền © 2026 thuộc về Ban Chỉ huy PCTT & TKCN.")}>
          Bản quyền
        </button>
        <span>•</span>
        <button type="button" onClick={() => alert("Đường dây nóng PCTT: 1800-6868 | Cứu hộ khẩn cấp: 114 / 115")}>
          Liên hệ
        </button>
        <span>•</span>
        <button type="button" onClick={() => alert("Chính sách bảo vệ dữ liệu công dân và định vị Geo-fencing tuyệt mật.")}>
          Chính sách
        </button>
      </div>
    </footer>
  );
};
