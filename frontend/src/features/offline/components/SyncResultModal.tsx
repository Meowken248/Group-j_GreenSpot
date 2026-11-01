import React, { useState, useEffect } from "react";
import type { SyncResultSummary } from "../types/offline.types";
import "./SyncResultModal.scss";

interface SyncResultModalProps {
  result: SyncResultSummary | null;
  onClose: () => void;
  onRetryAllFailed?: () => void;
  onOpenOutbox?: () => void;
  onViewIncidentDetail?: (incidentId?: string, trackingCode?: string) => void;
}

export const SyncResultModal: React.FC<SyncResultModalProps> = ({
  result,
  onClose,
  onRetryAllFailed,
  onOpenOutbox,
  onViewIncidentDetail,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (!result) return;

    // R20: Nếu thành công toàn bộ (không có lỗi), tự đóng sau 5 giây
    if (result.success_count > 0 && result.failed_count === 0) {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [result, onClose]);

  if (!result) return null;

  const isFullSuccess = result.success_count > 0 && result.failed_count === 0;
  const isPartialSuccess = result.success_count > 0 && result.failed_count > 0;
  const isFullFailure = result.success_count === 0 && result.failed_count > 0;

  // R20: Hiển thị tối đa 3 mã sự cố
  const displayIncidents = result.successful_incidents.slice(0, 3);
  const remainingCount = result.successful_incidents.length - 3;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // R22: Popup thất bại không tự đóng khi bấm backdrop
    if (isFullFailure || isPartialSuccess) {
      e.stopPropagation();
      return;
    }
    onClose();
  };

  return (
    <div
      className="greenspot-sync-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <div
        className={`greenspot-sync-modal-container ${
          isFullSuccess
            ? "state-success"
            : isPartialSuccess
            ? "state-partial"
            : "state-failed"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <div className="status-badge-icon">
            {isFullSuccess ? "🎉" : isPartialSuccess ? "⚠️" : "❌"}
          </div>
          <h2 id="sync-modal-title" className="modal-title">
            {isFullSuccess && "ĐỒNG BỘ THÀNH CÔNG"}
            {isPartialSuccess && "ĐỒNG BỘ MỘT PHẦN"}
            {isFullFailure && "ĐỒNG BỘ THẤT BẠI"}
          </h2>
          {isFullSuccess && (
            <span className="auto-close-hint">Tự đóng sau {countdown}s</span>
          )}
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* TRƯỜNG HỢP 1: THÀNH CÔNG TOÀN BỘ (R20) */}
          {isFullSuccess && (
            <div className="success-content">
              <p className="summary-desc">
                Đã gửi thành công{" "}
                <strong>{result.success_count} phản ánh</strong> từ hàng đợi
                ngoại tuyến lên hệ thống GreenSpot. Bạn đã nhận được điểm thưởng
                Công dân Xanh!
              </p>

              <div className="tracking-code-list">
                <span className="list-label">Mã tiếp nhận sự cố:</span>
                <ul>
                  {displayIncidents.map((inc, idx) => (
                    <li key={idx} className="tracking-code-item">
                      <span className="code-badge">{inc.code}</span>
                      <span className="item-title">{inc.title}</span>
                      {onViewIncidentDetail && (
                        <button
                          type="button"
                          className="view-detail-link"
                          onClick={() => {
                            onClose();
                            onViewIncidentDetail(inc.incident_id, inc.code);
                          }}
                        >
                          Xem chi tiết →
                        </button>
                      )}
                    </li>
                  ))}
                  {remainingCount > 0 && (
                    <li className="more-item">
                      và {remainingCount} sự cố khác trong hàng đợi.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 2: ĐỒNG BỘ MỘT PHẦN (R21) */}
          {isPartialSuccess && (
            <div className="partial-content">
              <p className="summary-desc">
                Đã gửi thành công{" "}
                <strong className="text-success">
                  {result.success_count} phản ánh
                </strong>
                , tuy nhiên còn{" "}
                <strong className="text-warning">
                  {result.failed_count} phản ánh gặp lỗi
                </strong>{" "}
                và được giữ an toàn trong hàng đợi.
              </p>

              {/* Danh sách thành công */}
              {displayIncidents.length > 0 && (
                <div className="mini-success-box">
                  <span className="sub-title">Đã tiếp nhận:</span>
                  <div className="codes-inline">
                    {displayIncidents.map((inc, i) => (
                      <span key={i} className="code-pill">
                        {inc.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách lỗi */}
              <div className="error-summary-box">
                <span className="sub-title">Các mục chưa gửi được:</span>
                <ul>
                  {(result.errors || []).slice(0, 3).map((err, i) => (
                    <li key={i}>
                      <strong>{err.title}:</strong> {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 3: THẤT BẠI TOÀN BỘ (R22) */}
          {isFullFailure && (
            <div className="failure-content">
              <p className="summary-desc">
                Không thể gửi{" "}
                <strong>{result.failed_count} phản ánh</strong> lên máy chủ. Tất
                cả dữ liệu và hình ảnh/âm thanh vẫn được lưu an toàn trên thiết bị
                của bạn.
              </p>
              <div className="error-details-box">
                {(result.errors || []).slice(0, 3).map((err, i) => (
                  <div key={i} className="error-item">
                    <span className="err-title">{err.title}</span>
                    <span className="err-msg">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="modal-footer">
          {isFullSuccess && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              autoFocus
            >
              Đóng ngay
            </button>
          )}

          {(isPartialSuccess || isFullFailure) && (
            <div className="action-buttons-group">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Giữ trong hàng đợi
              </button>
              {onOpenOutbox && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    onClose();
                    onOpenOutbox();
                  }}
                >
                  Xem & Sửa lỗi
                </button>
              )}
              {onRetryAllFailed && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    onRetryAllFailed();
                  }}
                  autoFocus
                >
                  Thử lại ngay
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
