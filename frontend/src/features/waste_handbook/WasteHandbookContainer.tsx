import React from "react";
import "./waste_handbook.css";

export interface WasteHandbookContainerProps {
  onBackToHome?: () => void;
  onNavigateToMap?: (facilityType: any) => void;
}

export const WasteHandbookContainer: React.FC<WasteHandbookContainerProps> = () => {
  return (
    <div className="handbook-stub-container" data-testid="handbook-container" style={{ padding: "2.5rem", textAlign: "center" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "var(--bg-card, #ffffff)", padding: "2rem", borderRadius: "12px", border: "1px dashed #10b981" }}>
        <h2 style={{ color: "#10b981", marginBottom: "1rem" }}>STT 27: Cẩm nang phân loại rác</h2>
        <p style={{ color: "var(--text-muted, #64748b)", fontSize: "1rem", lineHeight: "1.6" }}>
          Chức năng đã được chuyển sang chế độ <strong>Mock/Stub an toàn</strong>.<br />
          Toàn bộ UI chi tiết và logic nghiệp vụ cũ đã được dọn sạch, sẵn sàng để bạn triển khai lại từ đầu theo quy trình TDD.
        </p>
      </div>
    </div>
  );
};
