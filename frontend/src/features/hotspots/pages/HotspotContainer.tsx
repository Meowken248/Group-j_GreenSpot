import React from "react";
import "../styles/hotspots.scss";

export interface HotspotContainerProps {
  currentUser?: any;
  onNavigateToDispatch?: (prefill: any, activeOrderId?: string) => void;
  redirectUrl?: string;
}

export const HotspotContainer: React.FC<HotspotContainerProps> = () => {
  return (
    <div className="hotspot-stub-container" data-testid="hotspot-container" style={{ padding: "2.5rem", textAlign: "center" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "var(--bg-card, #ffffff)", padding: "2rem", borderRadius: "12px", border: "1px dashed #10b981" }}>
        <h2 style={{ color: "#10b981", marginBottom: "1rem" }}>STT 44: Phân tích điểm nóng & Dự báo 7 ngày</h2>
        <p style={{ color: "var(--text-muted, #64748b)", fontSize: "1rem", lineHeight: "1.6" }}>
          Chức năng đã được chuyển sang chế độ <strong>Mock/Stub an toàn</strong>.<br />
          Toàn bộ UI chi tiết và logic nghiệp vụ cũ đã được dọn sạch, sẵn sàng để bạn triển khai lại từ đầu theo quy trình TDD.
        </p>
      </div>
    </div>
  );
};
