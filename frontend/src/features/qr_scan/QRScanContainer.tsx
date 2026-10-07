import React, { useState, useEffect, useCallback } from "react";
import { qrScanApi } from "./qrScanApi";
import type { QRScanResult } from "./types";
import "./qr_scan.css";

interface Props {
  onBackToHome?: () => void;
  onNavigateWallet?: () => void;
  onNavigateLogin?: () => void;
}

export const QRScanContainer: React.FC<Props> = ({
  onBackToHome,
  onNavigateWallet,
  onNavigateLogin,
}) => {
  // Camera & Scanning States
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Manual Input Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>("");

  // Result Modals
  const [successResult, setSuccessResult] = useState<QRScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Detect GPS Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Default fallback near Ben Nghe, District 1
          setCurrentCoords({ lat: 10.7769, lng: 106.7009 });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setCurrentCoords({ lat: 10.7769, lng: 106.7009 });
    }
  }, []);

  // Request camera permission
  const requestCamera = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        // Stop stream immediately just testing permission
        stream.getTracks().forEach((track) => track.stop());
        setHasCameraPermission(true);
        setIsScanning(true);
      }
    } catch {
      setHasCameraPermission(false);
    }
  }, []);

  useEffect(() => {
    requestCamera();
  }, [requestCamera]);

  // Execute Scan
  const handleExecuteScan = async (codeToScan: string) => {
    if (!codeToScan.trim()) return;
    setSubmitting(true);
    setIsScanning(false);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const res = await qrScanApi.scanQRCode({
        code: codeToScan.trim().toUpperCase(),
        user_lat: currentCoords?.lat,
        user_lng: currentCoords?.lng,
      });
      setSuccessResult(res);
      setShowManualModal(false);
      setManualCode("");
    } catch (err: unknown) {
      let msg = "Mã QR không hợp lệ hoặc không thuộc hệ thống";
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { data?: { detail?: string }; status?: number } }).response;
        if (res?.status === 401) {
          if (onNavigateLogin) {
            onNavigateLogin();
            return;
          }
          msg = "Vui lòng đăng nhập để quét mã nhận điểm";
        } else if (res?.data?.detail) {
          msg = res.data.detail;
        }
      }
      setErrorMessage(msg);
      setShowManualModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Esc listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (successResult) setSuccessResult(null);
        if (errorMessage) setErrorMessage(null);
        if (showManualModal) setShowManualModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [successResult, errorMessage, showManualModal]);

  const sampleCodes = [
    { code: "ECO-BIN-101", title: "Trạm Ve Chai Xanh Q1" },
    { code: "PIN-UBND-P4", title: "Thùng thu pin Q3" },
    { code: "RECYCLE-BT-02", title: "Trạm thông minh Bình Thạnh" },
    { code: "EVENT-GREEN-SUN", title: "Chiến dịch Chủ Nhật Xanh" },
  ];

  return (
    <div className="qr-scan-container">
      {/* Header */}
      <div className="qr-header">
        <div>
          <div className="qr-title">
            <span>📷</span>
            <span>Máy Quét Mã QR Nhận Điểm</span>
          </div>
          <p className="qr-subtitle">
            Quét mã QR dán tại trạm thu gom rác tái chế, thùng thu hồi pin hoặc bàn check-in sự kiện môi trường để tích lũy Điểm Xanh tức thì!
          </p>
        </div>
      </div>

      {/* Camera Viewfinder Card */}
      <div className="qr-scanner-card">
        {!hasCameraPermission ? (
          <div className="qr-permission-denied-box">
            <span style={{ fontSize: "2rem" }}>🚫</span>
            <span className="qr-permission-denied-title">
              Không thể mở camera. Hãy cấp quyền truy cập camera
            </span>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>
              Trình duyệt chưa được cấp quyền sử dụng máy ảnh. Bạn có thể cấp lại quyền hoặc nhập chuỗi mã trạm thủ công bên dưới.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button className="qr-btn qr-btn-manual" onClick={requestCamera}>
                Cấp quyền lại
              </button>
              <button
                className="qr-btn qr-btn-flash"
                onClick={() => setShowManualModal(true)}
              >
                Nhập mã thủ công
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Viewfinder Target Box */}
            <div className="qr-viewfinder-box">
              {/* Corner brackets */}
              <div className="qr-corner qr-corner-tl" />
              <div className="qr-corner qr-corner-tr" />
              <div className="qr-corner qr-corner-bl" />
              <div className="qr-corner qr-corner-br" />

              {/* Laser line animation */}
              {isScanning && <div className="qr-laser-line" />}

              <span className="qr-guide-text">
                {submitting ? "Đang xử lý…" : isScanning ? "Đưa mã vào khung để quét" : "Đang bắt nét…"}
              </span>
            </div>

            {/* Action buttons */}
            <div className="qr-actions-row">
              <button
                className={`qr-btn qr-btn-flash ${flashOn ? "active" : ""}`}
                onClick={() => setFlashOn((prev) => !prev)}
              >
                <span>{flashOn ? "🔦" : "💡"}</span>
                <span>{flashOn ? "Tắt đèn flash" : "Bật đèn flash"}</span>
              </button>

              <button
                className="qr-btn qr-btn-manual"
                onClick={() => setShowManualModal(true)}
              >
                <span>⌨️</span>
                <span>Nhập mã thủ công</span>
              </button>
            </div>

            {/* Anti-fraud GPS status badge */}
            <div className="qr-gps-badge">
              <span>📍</span>
              <span>
                Cơ chế chống gian lận GPS: Đang xác thực bán kính 50m quanh trạm thu gom
              </span>
            </div>
          </>
        )}
      </div>

      {/* MÀN 2: POPUP QUÉT THÀNH CÔNG (Table 143) */}
      {successResult && (
        <div className="qr-modal-overlay" onClick={() => setSuccessResult(null)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-icon">🎉</div>
            <h3 className="qr-modal-title success">NHẬN ĐIỂM THÀNH CÔNG</h3>
            <div className="qr-points-highlight">
              +{successResult.point_reward} Điểm Xanh
            </div>
            <p className="qr-modal-desc">
              Bạn nhận được +{successResult.point_reward} điểm xanh từ {successResult.title}.
              <br />
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Địa điểm: {successResult.location_name} • Lúc: {successResult.scanned_at}
              </span>
            </p>
            <div className="qr-modal-buttons">
              <button
                className="qr-btn-secondary"
                onClick={() => {
                  setSuccessResult(null);
                  setIsScanning(true);
                }}
              >
                Quét tiếp
              </button>
              <button
                className="qr-btn-primary"
                onClick={() => {
                  setSuccessResult(null);
                  if (onNavigateWallet) {
                    onNavigateWallet();
                  } else {
                    window.location.hash = "wallet";
                  }
                }}
              >
                Xem ví điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN 3: POPUP KHÔNG THỂ NHẬN ĐIỂM (Table 144) */}
      {errorMessage && (
        <div className="qr-modal-overlay" onClick={() => setErrorMessage(null)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-icon">⚠️</div>
            <h3 className="qr-modal-title error">KHÔNG THỂ NHẬN ĐIỂM</h3>
            <p className="qr-modal-desc">{errorMessage}</p>
            <div className="qr-modal-buttons">
              <button
                className="qr-btn-secondary"
                onClick={() => {
                  setErrorMessage(null);
                  if (onBackToHome) {
                    onBackToHome();
                  } else {
                    window.location.hash = "map";
                  }
                }}
              >
                Đóng
              </button>
              <button
                className="qr-btn-primary"
                onClick={() => {
                  setErrorMessage(null);
                  setIsScanning(true);
                }}
              >
                Quét lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NHẬP MÃ THỦ CÔNG */}
      {showManualModal && (
        <div className="qr-modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Nhập Mã QR Thủ Công
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem" }}>
              Dành cho trường hợp camera mờ hoặc tem mã QR ngoài thực địa bị xước.
            </p>

            <input
              type="text"
              className="qr-manual-input"
              placeholder="VD: ECO-BIN-101"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecuteScan(manualCode);
              }}
              autoFocus
            />

            {/* Quick Demo chips */}
            <div className="qr-chips-row">
              {sampleCodes.map((c) => (
                <button
                  key={c.code}
                  className="qr-chip"
                  onClick={() => setManualCode(c.code)}
                >
                  {c.code} ({c.title})
                </button>
              ))}
            </div>

            <div className="qr-modal-buttons" style={{ marginTop: "1.25rem" }}>
              <button
                className="qr-btn-secondary"
                onClick={() => setShowManualModal(false)}
              >
                Huỷ
              </button>
              <button
                className="qr-btn-primary"
                disabled={!manualCode.trim() || submitting}
                onClick={() => handleExecuteScan(manualCode)}
              >
                {submitting ? "Đang gửi…" : "Xác nhận nhận điểm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanContainer;
