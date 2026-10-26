import React, { useEffect, useState } from "react";
import {
  IconCheckCircle,
  IconDownload,
  IconAlertTriangle,
  IconFileSpreadsheet,
  IconFilePdf,
} from "./ExportIcons";
import type { ExportCreatedResponse } from "../types/incident_export.types";

interface ExportSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportResult: ExportCreatedResponse | null;
  onDownloadTriggered?: (fileName: string) => void;
}

export const ExportSuccessModal: React.FC<ExportSuccessModalProps> = ({
  isOpen,
  onClose,
  exportResult,
  onDownloadTriggered,
}) => {
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15 * 60); // 15 phút = 900s
  const [downloadToast, setDownloadToast] = useState<string>("");

  // Quản lý đếm ngược thời gian hết hạn 15 phút
  useEffect(() => {
    if (!isOpen || !exportResult) return;

    const expiryTime = new Date(exportResult.expires_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.floor((expiryTime - now) / 1000);

      if (diffSec <= 0) {
        setIsExpired(true);
        setRemainingSeconds(0);
      } else {
        setIsExpired(false);
        setRemainingSeconds(diffSec);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, exportResult]);

  if (!isOpen || !exportResult) return null;

  const formatRemainingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} phút ${secs < 10 ? "0" : ""}${secs} giây`;
  };

  const handleDownloadClick = () => {
    if (isExpired) return;

    // Toast thông báo
    const toastMsg = `Đang bắt đầu tải tệp ${exportResult.file_name} về máy tính của bạn...`;
    setDownloadToast(toastMsg);
    if (onDownloadTriggered) {
      onDownloadTriggered(exportResult.file_name);
    }

    // Kích hoạt thẻ <a> download tệp an toàn
    const anchor = document.createElement("a");
    anchor.href = exportResult.download_url;
    anchor.setAttribute("download", exportResult.file_name);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Xoá toast sau 4 giây
    setTimeout(() => {
      setDownloadToast("");
    }, 4000);
  };

  return (
    <div
      className="export-modal-backdrop"
      data-testid="export-success-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="export-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-success-title"
        data-testid="export-success-modal"
      >
        {/* Header Modal */}
        <div className="modal-header-section">
          <span className="modal-popup-tag">POPUP</span>
          <h3 id="modal-success-title" className="modal-title-bold">
            ĐÃ TẠO TỆP
          </h3>
        </div>

        {/* Body Modal */}
        <div className="modal-body-section">
          <div className="success-file-state">
            <div className="success-icon-wrap" aria-label="Tạo tệp thành công">
              <IconCheckCircle size={34} />
            </div>

            <div className="status-message">Tệp sẵn sàng tải về</div>

            {/* Thông tin tên tệp & dung lượng */}
            <div className="file-info-chip" data-testid="file-info-chip">
              {exportResult.file_type === "PDF" ? (
                <IconFilePdf size={16} color="#DC2626" style={{ display: "inline", marginRight: "6px" }} />
              ) : (
                <IconFileSpreadsheet size={16} color="#16A34A" style={{ display: "inline", marginRight: "6px" }} />
              )}
              {exportResult.file_name} — {exportResult.file_size_formatted}
            </div>

            {/* Thời gian còn lại hoặc cảnh báo hết hạn sau 15 phút */}
            {!isExpired ? (
              <div className="expiry-timer-note">
                Thời gian lưu tạm còn lại: <strong>{formatRemainingTime(remainingSeconds)}</strong>
              </div>
            ) : (
              <div className="expired-warning-alert" data-testid="expired-warning-alert">
                <IconAlertTriangle size={16} style={{ display: "inline", marginRight: "6px" }} />
                Liên kết tải tệp đã hết hạn do chính sách bảo mật. Vui lòng xuất lại tệp.
              </div>
            )}

            {/* Toast tải xuống */}
            {downloadToast && (
              <div
                style={{
                  background: "#E0F2FE",
                  color: "#0369A1",
                  border: "1px solid #BAE6FD",
                  padding: "0.5rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  marginTop: "0.5rem",
                }}
                data-testid="download-toast"
              >
                {downloadToast}
              </div>
            )}
          </div>
        </div>

        {/* Footer Cụm nút hành động */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-download-primary"
            onClick={handleDownloadClick}
            disabled={isExpired}
            data-testid="btn-download-file"
          >
            <IconDownload size={18} />
            Tải xuống
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            data-testid="btn-success-close"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
