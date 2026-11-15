import React, { useEffect, useState } from "react";
import { IconFileSpreadsheet, IconFilePdf, IconCheckCircle, IconLoader } from "./ExportIcons";
import type { ExportFormatType, IncidentExportFilterParams } from "../types/incident_export.types";

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (format: ExportFormatType) => Promise<void>;
  filterParams: IncidentExportFilterParams;
  totalRecords: number;
}

export const ExportFormatModal: React.FC<ExportFormatModalProps> = ({
  isOpen,
  onClose,
  onConfirmExport,
  filterParams,
  totalRecords,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>("EXCEL");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // Lắng nghe phím ESC để đóng an toàn
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

  const handleExportClick = async () => {
    setIsExporting(true);
    const formatName = selectedFormat === "EXCEL" ? "Excel (.xlsx)" : "PDF (.pdf)";
    setLoadingMessage(`Đang kết xuất dữ liệu và tạo tệp ${formatName}...`);
    try {
      await onConfirmExport(selectedFormat);
    } finally {
      setIsExporting(false);
      setLoadingMessage("");
    }
  };

  return (
    <div
      className="export-modal-backdrop"
      data-testid="export-format-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        className="export-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-format-title"
        data-testid="export-format-modal"
      >
        {/* Header Modal */}
        <div className="modal-header-section">
          <span className="modal-popup-tag">POPUP</span>
          <h3 id="modal-format-title" className="modal-title-bold">
            XUẤT DANH SÁCH
          </h3>
        </div>

        {/* Body Modal */}
        <div className="modal-body-section">
          {isExporting ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <IconLoader className="spinner" size={32} style={{ margin: "0 auto 1rem auto", color: "#0284C7" }} />
              <div style={{ fontWeight: 600, color: "#0F172A", fontSize: "0.95rem" }}>
                {loadingMessage}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.5rem" }}>
                Máy chủ đang khởi tạo dữ liệu cho {totalRecords} sự cố...
              </div>
            </div>
          ) : (
            <>
              {/* Khung tùy chọn định dạng tệp */}
              <div className="format-options-group">
                {/* 1. Microsoft Excel */}
                <label
                  className={`format-radio-card ${selectedFormat === "EXCEL" ? "selected" : ""}`}
                  data-testid="option-format-excel"
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="EXCEL"
                    checked={selectedFormat === "EXCEL"}
                    onChange={() => setSelectedFormat("EXCEL")}
                  />
                  <div className="format-meta">
                    <div className="name">
                      <IconFileSpreadsheet size={18} color="#16A34A" />
                      Microsoft Excel (.xlsx)
                    </div>
                    <div className="desc">
                      Phù hợp cho việc lưu trữ thô, tính toán thống kê và phân tích pivot table nâng cao.
                    </div>
                  </div>
                </label>

                {/* 2. Adobe PDF */}
                <label
                  className={`format-radio-card ${selectedFormat === "PDF" ? "selected" : ""}`}
                  data-testid="option-format-pdf"
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="PDF"
                    checked={selectedFormat === "PDF"}
                    onChange={() => setSelectedFormat("PDF")}
                  />
                  <div className="format-meta">
                    <div className="name">
                      <IconFilePdf size={18} color="#DC2626" />
                      Adobe PDF (.pdf)
                    </div>
                    <div className="desc">
                      Phù hợp cho việc in ấn, lưu trữ văn bản hành chính và gửi báo cáo giao ban có kèm biểu mẫu quốc huy/tiêu ngữ chuẩn.
                    </div>
                  </div>
                </label>
              </div>

              {/* Dòng xác nhận kế thừa bộ lọc hiện tại */}
              <div className="filter-inherit-badge" data-testid="filter-inherit-badge">
                <IconCheckCircle size={16} color="#0284C7" />
                <span>
                  <strong>Theo bộ lọc hiện tại:</strong>{" "}
                  {filterParams.district || "Tất cả"} • {filterParams.category || "Tất cả"} •{" "}
                  {filterParams.status || "Tất cả"} ({totalRecords} sự cố)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Cụm nút hành động */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isExporting}
            data-testid="btn-format-cancel"
          >
            Huỷ
          </button>
          <button
            type="button"
            className="btn-confirm-export"
            onClick={handleExportClick}
            disabled={isExporting}
            data-testid="btn-format-submit"
          >
            {isExporting ? "Đang xử lý..." : "Xuất"}
          </button>
        </div>
      </div>
    </div>
  );
};
