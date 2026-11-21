import React from 'react';

export const PenaltyReportsDashboard: React.FC<any> = () => {
  return (
    <div className="penalty-reports-stub-container" data-testid="penalty-reports-dashboard" style={{ padding: '2.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--bg-card, #ffffff)', padding: '2rem', borderRadius: '12px', border: '1px dashed #10b981' }}>
        <h2 style={{ color: '#10b981', marginBottom: '1rem' }}>STT 11: Thống kê biên bản vi phạm</h2>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '1rem' }}>
          Chức năng đã được chuyển sang chế độ <strong>Mock/Stub an toàn</strong>.
        </p>
      </div>
    </div>
  );
};
