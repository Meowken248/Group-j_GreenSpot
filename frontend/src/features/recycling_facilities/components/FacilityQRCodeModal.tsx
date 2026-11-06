import React from "react";
import type { RecyclingFacilityItem } from "../types/recyclingFacility.types";
import { QRCodeSvg } from "./QRCodeSvg";
import { generateQrMatrix } from "../utils/qrCodeGenerator";

interface FacilityQRCodeModalProps {
  isOpen: boolean;
  facility: RecyclingFacilityItem | null;
  onClose: () => void;
}

export const FacilityQRCodeModal: React.FC<FacilityQRCodeModalProps> = ({
  isOpen,
  facility,
  onClose,
}) => {
  if (!isOpen || !facility) return null;

  const qrValue = facility.qr_code || `GREENSPOT-${facility.facility_code}`;

  const handleDownloadPNG = () => {
    try {
      const matrix = generateQrMatrix(qrValue);
      const padding = 4;
      const matrixSize = matrix.length;
      const totalSize = matrixSize + padding * 2;
      const scale = 12; // High resolution (approx 400-500px)
      const canvasWidth = totalSize * scale;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasWidth + 120; // Extra room for label
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // QR Modules
      ctx.fillStyle = "#0f172a";
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (matrix[r][c]) {
            ctx.fillRect(
              (c + padding) * scale,
              (r + padding) * scale,
              scale,
              scale
            );
          }
        }
      }

      // Title & Code Text
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(facility.name, canvasWidth / 2, canvasWidth + 35);

      ctx.fillStyle = "#059669";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`Mã trạm: ${facility.facility_code}`, canvasWidth / 2, canvasWidth + 65);

      ctx.fillStyle = "#64748b";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Quét mã tại trạm để tích điểm GreenPoint", canvasWidth / 2, canvasWidth + 95);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `QR_${facility.facility_code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Không thể tạo file ảnh QR:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="facility-modal-backdrop" role="dialog" aria-modal="true">
      <div className="facility-modal-card qr-modal-card">
        <div className="modal-header">
          <div className="header-icon-title">
            <span className="modal-icon">📱</span>
            <div>
              <h3 className="modal-title">Mã QR Định Danh Trạm Tiếp Nhận</h3>
              <p className="modal-subtitle">
                Dùng để in bảng hiệu tại hiện trường phục vụ người dân quét tích điểm xanh
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="modal-body qr-modal-body">
          <div className="qr-preview-box">
            <QRCodeSvg value={qrValue} size={220} />
            <div className="qr-info-badge">
              <span className="qr-code-pill">{facility.facility_code}</span>
              <span className="qr-string-text">{qrValue}</span>
            </div>
          </div>

          <div className="facility-meta-card">
            <div className="meta-row">
              <span className="meta-label">Tên trạm:</span>
              <span className="meta-value font-bold">{facility.name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Địa chỉ:</span>
              <span className="meta-value">{facility.address}</span>
            </div>
            {facility.unit_name && (
              <div className="meta-row">
                <span className="meta-label">Quận/Huyện:</span>
                <span className="meta-value">{facility.unit_name}</span>
              </div>
            )}
            <div className="meta-row">
              <span className="meta-label">Giờ tiếp nhận:</span>
              <span className="meta-value">
                {facility.open_time} - {facility.close_time}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Trạng thái:</span>
              <span
                className={`status-pill ${
                  facility.is_active ? "status-active" : "status-inactive"
                }`}
              >
                {facility.is_active ? "Đang hoạt động" : "Ngưng hoạt động"}
              </span>
            </div>
          </div>

          <div className="qr-instructions">
            <p className="instruction-text">
              💡 <strong>Hướng dẫn vận hành:</strong> In biển hiệu QR này và dán tại quầy tiếp nhận hoặc cổng trạm. Người dân khi mang rác tái chế đến sẽ mở ứng dụng GreenSpot quét mã này để hoàn thành gửi rác và nhận điểm thưởng.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-actions">
            <button
              type="button"
              className="btn-qr-action btn-print"
              onClick={handlePrint}
            >
              🖨️ In biển hiệu
            </button>
            <button
              type="button"
              className="btn-qr-action btn-download"
              onClick={handleDownloadPNG}
            >
              ⬇️ Tải ảnh PNG
            </button>
            <button
              type="button"
              className="btn-qr-action btn-close"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
