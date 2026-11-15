import React from "react";

export const HotspotFooter: React.FC = () => {
  return (
    <footer className="hotspot-footer">
      <div>
        <span>Bản quyền © 2026 GreenSpot. Hệ thống phân tích không gian địa lý môi trường đô thị.</span>
      </div>
      <div className="footer-links">
        <a href="#privacy" onClick={(e) => e.preventDefault()}>Chính sách dữ liệu</a>
        <a href="#terms" onClick={(e) => e.preventDefault()}>Quy chuẩn GIS</a>
        <a href="#support" onClick={(e) => e.preventDefault()}>Hỗ trợ kỹ thuật</a>
      </div>
    </footer>
  );
};
