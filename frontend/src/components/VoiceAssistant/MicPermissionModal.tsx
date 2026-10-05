import React, { useEffect, useState } from "react";
import "./VoiceAssistant.css";

interface MicPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
}

export const MicPermissionModal: React.FC<MicPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setErrorMessage(null);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRetryPermission = async () => {
    setIsRetrying(true);
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy dùng bàn phím");
        setIsRetrying(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Dừng tracks ngay sau khi kiểm tra thành công
      stream.getTracks().forEach((track) => track.stop());
      onPermissionGranted();
    } catch {
      setErrorMessage("Micro vẫn đang bị chặn. Vui lòng kiểm tra cài đặt trình duyệt");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="voice-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="voice-permission-modal">
        {/* Dòng nhỏ POPUP */}
        <span className="voice-modal-tag">POPUP</span>

        {/* Tiêu đề in đậm màu cam */}
        <h2 id="modal-title" className="voice-modal-title">
          KHÔNG TRUY CẬP ĐƯỢC MICRO
        </h2>

        {/* Dòng nội dung hướng dẫn */}
        <p className="voice-modal-subtitle">
          Hãy cấp quyền micro cho trình duyệt
        </p>

        {/* Thông báo ban đầu khi trình duyệt đang chặn truy cập micro */}
        <div className="voice-modal-initial-notice" role="status">
          <span>Trình duyệt đang chặn truy cập micro</span>
        </div>

        {/* Hình minh họa bấm vào biểu tượng ổ khóa trên thanh địa chỉ URL */}
        <div className="voice-permission-instruction-box">
          <div className="browser-url-mockup">
            <span className="lock-icon" aria-hidden="true">🔒</span>
            <span className="url-text">greenspot.gov.vn</span>
            <span className="mic-badge-blocked">🎤 Bị chặn</span>
          </div>
          <div className="instruction-steps">
            <p>1. Nhấp vào biểu tượng <strong>Ổ khóa (🔒)</strong> trên thanh địa chỉ URL.</p>
            <p>2. Chuyển mục <strong>Microphone (Micro)</strong> sang trạng thái <strong>Cho phép (Allow)</strong>.</p>
            <p>3. Nhấn nút <strong>"Thử lại"</strong> bên dưới.</p>
          </div>
        </div>

        {/* Dòng cảnh báo màu đỏ nếu thử lại thất bại */}
        {errorMessage && (
          <div className="voice-modal-error-alert" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Hai nút chức năng: Thử lại và Đóng xếp chồng theo chiều dọc (Wireframe 4) */}
        <div className="voice-modal-actions-stacked">
          <button
            type="button"
            className="btn-retry-permission wide-pill-btn"
            onClick={handleRetryPermission}
            disabled={isRetrying}
          >
            {isRetrying ? "Đang kiểm tra..." : "Thử lại"}
          </button>
          <button
            type="button"
            className="btn-close-modal wide-pill-btn"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
