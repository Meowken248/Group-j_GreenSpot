import React, { useState } from "react";
import type { WasteCategoryItem } from "../types/wasteCategory.types";

interface Props {
  isOpen: boolean;
  category: WasteCategoryItem | null;
  onConfirmDelete: (id: number) => Promise<void>;
  onCancel: () => void;
}

export const CategoryDeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  category,
  onConfirmDelete,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !category) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirmDelete(category.category_id);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Không thể xoá danh mục. Vui lòng thử lại";
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasUnresolved = (category.unresolved_incidents_count || 0) > 0;

  return (
    <div
      className="waste-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div className="waste-modal-card waste-modal-confirm-delete">
        {/* TAG */}
        <div className="waste-modal-tag-badge">
          <span className="badge-popup">POPUP</span>
        </div>

        {/* TIÊU ĐỀ */}
        <h3 id="delete-confirm-title" className="waste-modal-title delete-title">
          ⚠️ XÁC NHẬN XOÁ
        </h3>

        {/* DÒNG CẢNH BÁO CHUNG */}
        <p className="delete-main-warning">
          Bạn chắc chắn muốn xoá mục này? Dữ liệu liên quan sẽ bị ảnh hưởng.
        </p>

        {/* THÔNG TIN DANH MỤC ĐỐI CHIẾU */}
        <div className="delete-target-preview">
          <div className="preview-row">
            <span className="preview-label">Mã danh mục:</span>
            <span className="preview-val code-highlight">{category.category_code}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Tên loại rác:</span>
            <span className="preview-val name-highlight">{category.name}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Quy chuẩn SLA:</span>
            <span className="preview-val">{category.sla_hours} giờ</span>
          </div>
        </div>

        {/* CẢNH BÁO VÀNG NẾU CÓ PHẢN ÁNH CHƯA XỬ LÝ */}
        {hasUnresolved && (
          <div className="warning-banner-yellow" role="alert">
            <span className="warn-icon">⚠️</span>
            <span className="warn-text">
              Danh mục đang có {category.unresolved_incidents_count} phản ánh chưa xử lý. Không thể khôi phục sau khi xoá!
            </span>
          </div>
        )}

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {errorMessage && (
          <div className="error-banner-red" role="alert">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CẶP NÚT THAO TÁC */}
        <div className="waste-modal-actions">
          <button
            type="button"
            className="btn-danger-confirm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="spinner-inline">Đang xoá…</span>
            ) : (
              <span>Xoá</span>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
};

