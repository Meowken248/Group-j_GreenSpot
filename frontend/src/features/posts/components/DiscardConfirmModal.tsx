import React from "react";

interface DiscardConfirmModalProps {
  isOpen: boolean;
  onConfirmExit: () => void;
  onStay: () => void;
}

export const DiscardConfirmModal: React.FC<DiscardConfirmModalProps> = ({
  isOpen,
  onConfirmExit,
  onStay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="discard-modal-backdrop" onClick={onStay}>
      <div className="discard-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="icon-warn">⚠️</div>
        <h3>Bạn có thay đổi chưa lưu. Bạn muốn thoát?</h3>
        <p>Toàn bộ nội dung bài viết và tệp đính kèm đang soạn sẽ bị hủy bỏ.</p>
        <div className="modal-actions">
          <button type="button" className="btn-stay" onClick={onStay}>
            Ở lại
          </button>
          <button type="button" className="btn-exit" onClick={onConfirmExit}>
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
};
