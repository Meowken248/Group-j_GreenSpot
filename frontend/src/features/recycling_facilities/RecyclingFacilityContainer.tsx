import React from "react";
import "./RecyclingFacility.scss";

export const RecyclingFacilityContainer: React.FC<any> = () => {
  return (
    <div className="recycling-facility-stub-container" data-testid="recycling-facility-container" style={{ padding: "2.5rem", textAlign: "center" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "var(--bg-card, #ffffff)", padding: "2rem", borderRadius: "12px", border: "1px dashed #10b981" }}>
        <h2 style={{ color: "#10b981", marginBottom: "1rem" }}>STT 23: Quản trị Mạng lưới Trạm Tái chế</h2>
        <p style={{ color: "var(--text-muted, #64748b)", fontSize: "1rem", lineHeight: "1.6" }}>
          Chức năng đã được chuyển sang chế độ <strong>Mock/Stub an toàn</strong>.<br />
          Toàn bộ UI chi tiết và logic nghiệp vụ cũ đã được dọn sạch, sẵn sàng để bạn triển khai lại từ đầu theo quy trình TDD.
        </p>
      </div>
    </div>
  );
};
