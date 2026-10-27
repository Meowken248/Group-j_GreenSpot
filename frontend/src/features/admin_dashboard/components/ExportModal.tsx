/**
 *  Popup Xuất Thống Kê (Export Modal)
 *
 * File   : FrontEnd/src/features/admin_dashboard/components/ExportModal.tsx
 * Chức năng:
 *   - Lựa chọn định dạng xuất: Excel (.xlsx) hoặc PDF (.pdf)
 *   - Hiển thị khoảng thời gian xuất báo cáo
 *   - Nút "Xuất" với loading state & animation spinner
 *   - Nút "Huỷ" đóng popup
 *   - Gọi API service tải file tự động qua Blob URL
 *   - Xử lý lỗi kết nối / lỗi tạo tệp từ server
 */

import React, { useEffect, useState } from "react";
import { exportReport } from "../services/dashboardApi";
import type { ExportFormat } from "../types/dashboard.types";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  toDate: string;
  onSuccess?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  fromDate,
  toDate,
  onSuccess,
}) => {
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset trạng thái khi modal mở lại
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      setErrorMsg("Vui lòng chọn khoảng thời gian hợp lệ trước khi xuất.");
      return;
    }

    setIsExporting(true);
    setErrorMsg(null);

    try {
      await exportReport({
        from_date: fromDate,
        to_date: toDate,
        format,
      });
      setIsExporting(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setIsExporting(false);
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tạo tệp xuất dữ liệu do lỗi bộ nhớ tạm. Vui lòng thử lại.";
      setErrorMsg(msg);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isExporting) {
      onClose();
    }
  };

  return (
    <div
      className="adm-dash-modal"
      data-testid="export-activity-modal"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-export-title"
    >
      <div className="adm-dash-modal__box">
        <div className="adm-dash-modal__label">POPUP</div>
        <h2 id="modal-export-title" className="adm-dash-modal__title">
          XUẤT THỐNG KÊ
        </h2>

        {/* Thông tin phạm vi ngày xuất */}
        <div
          style={{
            fontSize: "0.8rem",
            color: "#94a3b8",
            marginBottom: "18px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          Phạm vi dữ liệu:{" "}
          <strong style={{ color: "#f1f5f9" }}>
            {fromDate} → {toDate}
          </strong>
        </div>

        {/* Chọn định dạng Excel / PDF */}
        <div className="adm-dash-modal__format-group">
          <div className="format-label">Định dạng: Excel / PDF</div>
          <div className="format-options">
            {/* Tùy chọn Excel */}
            <label
              className={`format-option ${format === "xlsx" ? "format-option--selected" : ""
                }`}
              onClick={() => setFormat("xlsx")}
              data-testid="option-format-xlsx"
            >
              <input
                type="radio"
                name="export_format"
                value="xlsx"
                checked={format === "xlsx"}
                onChange={() => setFormat("xlsx")}
              />
              <span className="fmt-icon">📊</span>
              <div className="fmt-info">
                <div className="fmt-name">Excel (.xlsx)</div>
                <div className="fmt-desc">Bảng tính &amp; công thức tính toán</div>
              </div>
            </label>

            {/* Tùy chọn PDF */}
            <label
              className={`format-option ${format === "pdf" ? "format-option--selected" : ""
                }`}
              onClick={() => setFormat("pdf")}
              data-testid="option-format-pdf"
            >
              <input
                type="radio"
                name="export_format"
                value="pdf"
                checked={format === "pdf"}
                onChange={() => setFormat("pdf")}
              />
              <span className="fmt-icon">📄</span>
              <div className="fmt-info">
                <div className="fmt-name">PDF (.pdf)</div>
                <div className="fmt-desc">Báo cáo chuẩn trình duyệt &amp; in ấn</div>
              </div>
            </label>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="adm-dash-modal__error" role="alert">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Liên kết End-to-End sang STT 47 nếu cần xuất sự cố chi tiết */}
        <div
          style={{
            marginBottom: "18px",
            padding: "10px 14px",
            borderRadius: "8px",
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px dashed rgba(59, 130, 246, 0.3)",
            fontSize: "0.75rem",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <span>Cần xuất danh sách sự cố chi tiết theo quận/huyện?</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              window.history.pushState(null, "", "/reports/incident-export");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#60a5fa",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              whiteSpace: "nowrap",
            }}
          >
            Trích xuất danh sách sự cố ➔
          </button>
        </div>

        {/* Thao tác Xuất / Huỷ */}
        <div className="adm-dash-modal__actions">
          <button
            type="button"
            id="btn-confirm-export"
            data-testid="btn-confirm-export"
            className="adm-dash-modal__export-btn"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <span className="spinner" />
                <span>Đang trích xuất dữ liệu...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Xuất</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-cancel-export"
            data-testid="btn-cancel-export"
            className="adm-dash-modal__cancel-btn"
            onClick={onClose}
            disabled={isExporting}
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
