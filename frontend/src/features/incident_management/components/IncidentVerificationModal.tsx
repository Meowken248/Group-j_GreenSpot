import React, { useState } from "react";
import type { IncidentListItem } from "../types/incident_management.types";

interface Props {
  incident: IncidentListItem;
  onClose: () => void;
  onVerify: (action: "VERIFY" | "REJECT", note?: string) => Promise<void>;
  onUpdateStatus: (status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED", note?: string) => Promise<void>;
  onNavigateToMap: (lat: number, lng: number) => void;
}

export const IncidentVerificationModal: React.FC<Props> = ({
  incident,
  onClose,
  onVerify,
  onUpdateStatus,
  onNavigateToMap,
}) => {
  const [rejectMode, setRejectMode] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isPending = incident.status === "PENDING";
  const isVerified = incident.status === "IN_PROGRESS";
  const isResolved = incident.status === "RESOLVED";
  const isRejected = incident.status === "REJECTED";

  const getSeverityBadge = () => {
    switch (incident.severity) {
      case "CRITICAL":
      case "EMERGENCY":
        return <span className="badge badge-critical">🚨 KHẨN CẤP</span>;
      case "HIGH":
        return <span className="badge badge-high">⚠️ MỨC ĐỘ CAO</span>;
      default:
        return <span className="badge badge-normal">🟢 BÌNH THƯỜNG</span>;
    }
  };

  const getVerificationStatusBadge = () => {
    switch (incident.status) {
      case "PENDING":
        return <span className="badge badge-unverified">🟡 Chưa kiểm chứng</span>;
      case "IN_PROGRESS":
        return <span className="badge badge-verified">🟢 Đã kiểm chứng (Đang xử lý)</span>;
      case "RESOLVED":
        return <span className="badge badge-resolved">✅ Đã hoàn thành xử lý</span>;
      case "REJECTED":
        return <span className="badge badge-rejected">🔴 Từ chối (Báo cáo sai lệch)</span>;
      default:
        return <span className="badge">{incident.status}</span>;
    }
  };

  const handleApprove = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onVerify("VERIFY", "Admin xác thực bằng chứng hiện trường chính xác");
      onClose();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Lỗi khi xác thực phản ánh");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setActionError("Vui lòng nhập lý do từ chối phản ánh");
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onVerify("REJECT", rejectReason.trim());
      onClose();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Lỗi khi từ chối phản ánh");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkResolved = async () => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await onUpdateStatus("RESOLVED", "Hoàn thành xử lý dọn dẹp tại hiện trường");
      onClose();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Lỗi khi cập nhật trạng thái");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mediaList = incident.media || [];
  const currentMedia = mediaList[activeMediaIndex];

  return (
    <div className="incident-modal-backdrop" onClick={onClose}>
      <div className="incident-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="incident-modal-header">
          <div className="header-left">
            <span className="tracking-code-pill">{incident.tracking_code}</span>
            <div className="badge-group">
              {getSeverityBadge()}
              {getVerificationStatusBadge()}
            </div>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="incident-modal-body">
          {actionError && <div className="alert-error-banner">{actionError}</div>}

          <div className="modal-content-grid">
            {/* CỘT TRÁI: HÌNH ẢNH / VIDEO WATERMARK */}
            <div className="media-preview-column">
              <h4 className="section-title">Bằng chứng hình ảnh / video (Đã đóng Watermark)</h4>
              {mediaList.length > 0 ? (
                <div className="media-viewer-box">
                  <div className="main-media-frame">
                    {currentMedia?.media_type === "VIDEO" ? (
                      <video src={currentMedia.file_url} controls className="media-player" />
                    ) : (
                      <img
                        src={currentMedia?.file_url || incident.thumbnail_url || ""}
                        alt="Bằng chứng sự cố"
                        className="media-image"
                      />
                    )}
                  </div>
                  {mediaList.length > 1 && (
                    <div className="media-thumbnail-strip">
                      {mediaList.map((m, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`thumb-btn ${idx === activeMediaIndex ? "active" : ""}`}
                          onClick={() => setActiveMediaIndex(idx)}
                        >
                          <img src={m.thumbnail_url || m.file_url} alt={`Ảnh ${idx + 1}`} />
                          <span className="thumb-idx">{idx + 1}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="watermark-note">
                    ℹ️ Ảnh và video đã được máy chủ đóng dấu Watermark thời gian thực & toạ độ GPS ở góc dưới.
                  </p>
                </div>
              ) : (
                <div className="empty-media-box">
                  <p>Không có tệp đính kèm nào.</p>
                </div>
              )}
            </div>

            {/* CỘT PHẢI: CHI TIẾT NỘI DUNG & VỊ TRÍ */}
            <div className="info-detail-column">
              <div className="info-group">
                <h3 className="incident-title">{incident.title}</h3>
                <p className="incident-category-tag">
                  📁 Danh mục: <strong>{incident.category_name}</strong>
                </p>
              </div>

              <div className="info-group">
                <label className="info-label">Mô tả chi tiết từ công dân:</label>
                <div className="description-box">
                  <p>{incident.description || "(Không có mô tả chi tiết)"}</p>
                </div>
              </div>

              <div className="info-group">
                <label className="info-label">Địa chỉ & Tọa độ GPS:</label>
                <div className="location-box">
                  <p className="address-text">📍 {incident.address_text}</p>
                  <div className="location-meta">
                    <span className="unit-tag">🏛️ {incident.unit_name || "Chưa phân quận"}</span>
                    <span className="gps-tag">
                      🌐 {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-row">
                <div className="info-group half">
                  <label className="info-label">Người báo cáo:</label>
                  <p className="reporter-text">
                    👤 {incident.reporter_name || "Công dân"}
                    {incident.reporter_phone_masked && (
                      <span className="phone-mask"> ({incident.reporter_phone_masked})</span>
                    )}
                  </p>
                </div>

                <div className="info-group half">
                  <label className="info-label">Thời hạn xử lý (SLA):</label>
                  <p className={`sla-text ${incident.is_sla_overdue ? "overdue" : ""}`}>
                    {incident.sla_deadline
                      ? new Date(incident.sla_deadline).toLocaleString("vi-VN")
                      : "Theo quy định chuẩn"}
                    {incident.is_sla_overdue && <span className="overdue-tag">⚠️ Quá hạn SLA</span>}
                  </p>
                </div>
              </div>

              {/* KHUNG TỪ CHỐI (KHI BẬT REJECT MODE) */}
              {rejectMode && (
                <div className="reject-reason-box">
                  <label className="info-label text-danger">Lý do từ chối phản ánh *:</label>
                  <textarea
                    className="reject-textarea"
                    placeholder="Ví dụ: Hình ảnh không rõ ràng, địa điểm đã kiểm tra không có rác, thông tin sai lệch..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <div className="reject-actions">
                    <button
                      type="button"
                      className="btn-danger-confirm"
                      onClick={handleRejectSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Đang xử lý..." : "Xác nhận Từ chối"}
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setRejectMode(false)}
                      disabled={isSubmitting}
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER / ACTIONS */}
        <div className="incident-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onNavigateToMap(incident.latitude, incident.longitude)}
          >
            🗺️ Xem trên Bản đồ WebGIS
          </button>

          <div className="action-button-group">
            {isPending && !rejectMode && (
              <>
                <button
                  type="button"
                  className="btn-reject"
                  onClick={() => setRejectMode(true)}
                  disabled={isSubmitting}
                >
                  ✕ Báo cáo sai lệch (Từ chối)
                </button>
                <button
                  type="button"
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={isSubmitting}
                >
                  ✓ Xác nhận Đã kiểm chứng
                </button>
              </>
            )}

            {isVerified && (
              <button
                type="button"
                className="btn-resolve"
                onClick={handleMarkResolved}
                disabled={isSubmitting}
              >
                ✅ Đánh dấu Đã xử lý xong
              </button>
            )}

            {(isResolved || isRejected) && (
              <button type="button" className="btn-secondary" onClick={onClose}>
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
