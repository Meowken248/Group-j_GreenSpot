import { type FC } from "react";

interface ConfigModalProps {
  onClose: () => void;
  onUseFallback: () => void;
}

export const ConfigModal: FC<ConfigModalProps> = ({ onClose, onUseFallback }) => {
  return (
    <div className="config-modal-overlay" onClick={onClose}>
      <div className="config-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">Google Cloud Guide</span>
            <h3>Hướng Dẫn Khắc Phục Lỗi "Permission Denied"</h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="intro-p">
            Google Maps API đã tải thành công nhưng máy chủ Google từ chối cấp quyền nạp map tiles (hiển thị mờ và thông báo <em>"Rất tiếc! Đã xảy ra lỗi"</em>). Hãy làm theo 3 bước sau để khắc phục:
          </p>

          <div className="steps-list">
            <div className="step-box">
              <div className="step-num">1</div>
              <div className="step-info">
                <h4>Cấu hình HTTP Referrers (Tên miền cho phép)</h4>
                <p>
                  API Key có thể đang bị chặn trên <code>localhost</code>. Vào <strong>Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</strong>, mở API Key này:
                </p>
                <div className="code-hint">
                  Thêm vào danh sách Website restrictions:<br />
                  <code>http://localhost:*/*</code><br />
                  <code>http://127.0.0.1:*/*</code>
                </div>
              </div>
            </div>

            <div className="step-box">
              <div className="step-num">2</div>
              <div className="step-info">
                <h4>Bật "Maps JavaScript API"</h4>
                <p>
                  Vào mục <strong>APIs &amp; Services &gt; Enabled APIs &amp; Services</strong>. Đảm bảo <strong>Maps JavaScript API</strong> và <strong>Places API</strong> đã được bật (Enable).
                </p>
              </div>
            </div>

            <div className="step-box">
              <div className="step-num">3</div>
              <div className="step-info">
                <h4>Kiểm tra Tài Khoản Thanh Toán (Billing)</h4>
                <p>
                  Google Maps Platform yêu cầu dự án phải gắn thẻ thanh toán (được tặng $200 miễn phí mỗi tháng) để các tile bản đồ không bị mờ watermark.
                </p>
              </div>
            </div>
          </div>

          <div className="modal-tip-box">
            💡 <strong>Gợi ý:</strong> Bạn có thể dùng <strong>"Google Tile Cluster"</strong> để tiếp tục sử dụng ngay lập tức mà không cần chờ cấu hình xong Google Cloud.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary-action" onClick={onUseFallback}>
            Dùng Ngay Google Tile Cluster
          </button>
          <button className="btn-secondary-action" onClick={onClose}>
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
