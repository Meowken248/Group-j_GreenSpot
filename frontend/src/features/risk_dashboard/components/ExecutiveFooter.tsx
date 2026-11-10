import React from "react";

export const ExecutiveFooter: React.FC = () => {
  return (
    <footer className="exec-footer">
      <div className="footer-copyright">
        © 2026 Bản quyền thuộc Sở Tài nguyên & Môi trường TP. Hồ Chí Minh. Trung tâm Quan trắc Môi trường & PCTT.
      </div>
      <div className="footer-links">
        <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("Chính sách bảo mật dữ liệu đô thị và phòng chống thiên tai TP.HCM."); }}>
          Chính sách
        </a>
        <span>•</span>
        <a href="#contact" onClick={(e) => { e.preventDefault(); alert("Đường dây nóng xử lý sự cố môi trường khẩn cấp: 1022 hoặc (028) 3829 3661"); }}>
          Liên hệ
        </a>
        <span>•</span>
        <span>Quy chuẩn kỹ thuật QCVN 05:2023/BTNMT</span>
      </div>
    </footer>
  );
};
