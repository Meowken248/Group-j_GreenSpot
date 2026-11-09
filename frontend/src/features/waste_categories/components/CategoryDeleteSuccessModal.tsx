import React from "react";
import type { WasteCategoryItem } from "../types/wasteCategory.types";

interface Props {
  isOpen: boolean;
  category: WasteCategoryItem | null;
  onClose: () => void;
}

export const CategoryDeleteSuccessModal: React.FC<Props> = ({
  isOpen,
  category,
  onClose,
}) => {
  if (!isOpen || !category) return null;

  return (
    <div
      className="waste-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-success-title"
      // Bấm ra ngoài popup: không đóng popup theo spec
      onClick={(e) => e.stopPropagation()}
    >
      <div className="waste-modal-card waste-modal-success-card">
        {/* TAG */}
        <div className="waste-modal-tag-badge">
          <span className="badge-popup">POPUP</span>
        </div>

        {/* ICON THÀNH CÔNG */}
        <div className="success-icon-wrap" aria-hidden="true">
          <div className="checkmark-circle">✓</div>
        </div>

        {/* TIÊU ĐỀ */}
        <h3 id="delete-success-title" className="waste-modal-title success-title">
          ĐÃ XOÁ THÀNH CÔNG
        </h3>

        {/* DÒNG THÔNG BÁO CHÍNH */}
        <p className="delete-success-main-msg">
          Danh mục <strong>{category.name}</strong> (<code>{category.category_code}</code>) đã được xoá khỏi hệ thống.
        </p>

        {/* DÒNG PHỤ */}
        <p className="delete-success-sub-msg">
          Danh sách đã được cập nhật.
        </p>

        {/* NÚT ĐÓNG */}
        <div className="waste-modal-actions single-action">
          <button
            type="button"
            className="btn-success-close"
            onClick={onClose}
            autoFocus
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

