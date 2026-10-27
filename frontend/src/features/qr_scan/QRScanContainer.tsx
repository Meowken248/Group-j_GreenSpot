import React, { useState, useEffect, useCallback, useRef } from "react";
import jsQR from "jsqr";
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
  // Camera & Stream Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Camera & Scanning States
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean>(true);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Manual Input Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>("");

  // Result Modals
  const [successResult, setSuccessResult] = useState<QRScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Detect GPS Location for anti-fraud radius check
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

  // Beep feedback on successful QR recognition
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not allowed or not supported, ignore silently
    }
  };

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start real-time camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    if (!isCameraActive) return;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }

      // Build video constraints tailored for both mobile phone and laptop
      let videoConstraints: MediaTrackConstraints = selectedDeviceId
        ? { deviceId: { exact: selectedDeviceId } }
        : { facingMode: { ideal: cameraFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch {
        // Fallback to basic constraints if requested device or facingMode fails (common on laptop webcams)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play().catch(() => {});
      }

      setHasCameraPermission(true);
      setIsScanning(true);

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && typeof (videoTrack as any).getCapabilities === "function") {
        const capabilities = (videoTrack as any).getCapabilities();
        setIsTorchSupported(!!capabilities.torch);
      } else {
        setIsTorchSupported(false);
      }

      // Enumerate available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setAvailableDevices(videoInputs);
    } catch {
      setHasCameraPermission(false);
      setIsScanning(false);
    }
  }, [cameraFacingMode, isCameraActive, selectedDeviceId, stopCamera]);

  // Restart camera when configuration changes
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Toggle flashlight / torch
  const handleToggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && isTorchSupported && typeof (track as any).applyConstraints === "function") {
      const nextFlash = !flashOn;
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: nextFlash }],
        });
        setFlashOn(nextFlash);
      } catch {
        setFlashOn((prev) => !prev);
      }
    } else {
      setFlashOn((prev) => !prev);
    }
  };

  // Flip camera between front (user) and back (environment)
  const handleSwitchCamera = () => {
    setCameraFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setSelectedDeviceId(""); // clear specific device ID so ideal facingMode takes effect
  };

  // Execute Scan API Call
  const handleExecuteScan = async (codeToScan: string) => {
    if (!codeToScan.trim() || submitting) return;

    // Throttle duplicate scans within 3 seconds
    const now = Date.now();
    if (now - lastScannedTimeRef.current < 3000) return;
    lastScannedTimeRef.current = now;

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
      let msg = "Mã QR không hợp lệ hoặc không thuộc hệ thống GreenSpot";
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

  // Real-time video frame QR scanning loop
  useEffect(() => {
    if (!isScanning || !isCameraActive) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data && code.data.trim()) {
        playBeep();
        handleExecuteScan(code.data.trim());
      }
    }, 150);

    scanIntervalRef.current = interval;
    return () => {
      clearInterval(interval);
      scanIntervalRef.current = null;
    };
  }, [isScanning, isCameraActive]);

  // Handle Image File Upload (QR Image Import)
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          setIsProcessingFile(false);
          if (code && code.data && code.data.trim()) {
            playBeep();
            handleExecuteScan(code.data.trim());
          } else {
            setErrorMessage(
              "Không nhận diện được mã QR trong hình ảnh đã chọn. Vui lòng chọn ảnh chụp góc thẳng, rõ nét hơn hoặc nhập mã trạm thủ công."
            );
          }
        } else {
          setIsProcessingFile(false);
          setErrorMessage("Không thể khởi tạo bộ xử lý hình ảnh trên trình duyệt.");
        }
      };

      img.onerror = () => {
        setIsProcessingFile(false);
        setErrorMessage("Không thể tải tập tin hình ảnh. Vui lòng thử lại với ảnh định dạng PNG/JPG.");
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    // Reset file input value so user can upload the same file again if needed
    e.target.value = "";
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
      {/* Hidden file input for importing QR image from device */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageFileSelect}
        style={{ display: "none" }}
      />

      {/* Offscreen Canvas for QR decoding */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Header */}
      <div className="qr-header">
        <div>
          <div className="qr-title">
            <span>📷</span>
            <span>Máy Quét Mã QR Nhận Điểm</span>
          </div>
          <p className="qr-subtitle">
            Hỗ trợ quét trực tiếp qua camera điện thoại/laptop hoặc tải ảnh chụp mã QR từ máy để tích lũy Điểm Xanh ngay lập tức!
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
              Trình duyệt chưa được cấp quyền sử dụng máy ảnh hoặc thiết bị không có camera sẵn sàng. Bạn có thể cấp lại quyền, tải ảnh QR từ máy hoặc nhập mã thủ công.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button className="qr-btn qr-btn-manual" onClick={startCamera}>
                Cấp quyền lại
              </button>
              <button
                className="qr-btn qr-btn-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Tải ảnh QR từ máy
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
            {/* Viewfinder Target Box with Live Video */}
            <div className="qr-viewfinder-box">
              {/* Real camera video feed */}
              <video
                ref={videoRef}
                className="qr-video-feed"
                playsInline
                autoPlay
                muted
              />

              {/* Corner brackets */}
              <div className="qr-corner qr-corner-tl" />
              <div className="qr-corner qr-corner-tr" />
              <div className="qr-corner qr-corner-bl" />
              <div className="qr-corner qr-corner-br" />

              {/* Laser line animation */}
              {isScanning && isCameraActive && <div className="qr-laser-line" />}

              <span className="qr-guide-text">
                {submitting
                  ? "Đang xác thực điểm…"
                  : isProcessingFile
                  ? "Đang đọc ảnh QR…"
                  : !isCameraActive
                  ? "Camera đang tạm dừng"
                  : isScanning
                  ? "Đưa mã QR vào khung để quét"
                  : "Đang bắt nét…"}
              </span>
            </div>

            {/* Processing loader for image upload */}
            {isProcessingFile && (
              <div className="qr-upload-loading">
                <span>🔄</span>
                <span>Đang phân tích và giải mã hình ảnh QR...</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="qr-actions-row">
              {/* Upload image button */}
              <button
                className="qr-btn qr-btn-upload"
                onClick={() => fileInputRef.current?.click()}
                title="Tải ảnh mã QR từ thiết bị / Thư viện ảnh"
              >
                <span>📁</span>
                <span>Tải ảnh QR từ máy</span>
              </button>

              {/* Switch camera button (Front/Back on phone or between cameras) */}
              <button
                className="qr-btn qr-btn-switch"
                onClick={handleSwitchCamera}
                title="Chuyển đổi camera trước/sau"
              >
                <span>🔄</span>
                <span>Đổi camera ({cameraFacingMode === "environment" ? "Sau" : "Trước"})</span>
              </button>

              {/* Flashlight button */}
              <button
                className={`qr-btn qr-btn-flash ${flashOn ? "active" : ""}`}
                onClick={handleToggleFlash}
                title="Bật/Tắt đèn trợ sáng"
              >
                <span>{flashOn ? "🔦" : "💡"}</span>
                <span>{flashOn ? "Tắt flash" : "Bật flash"}</span>
              </button>

              {/* Camera toggle button */}
              <button
                className={`qr-btn qr-btn-camera ${!isCameraActive ? "paused" : ""}`}
                onClick={() => setIsCameraActive((prev) => !prev)}
                title="Tạm dừng hoặc tiếp tục camera"
              >
                <span>{isCameraActive ? "⏸️" : "▶️"}</span>
                <span>{isCameraActive ? "Tắt Camera" : "Bật Camera"}</span>
              </button>

              {/* Manual input button */}
              <button
                className="qr-btn qr-btn-manual"
                onClick={() => setShowManualModal(true)}
                title="Nhập mã chữ số in trên trạm thu gom"
              >
                <span>⌨️</span>
                <span>Nhập mã thủ công</span>
              </button>
            </div>

            {/* Camera device selector for laptops / multi-camera phones */}
            {availableDevices.length > 1 && (
              <div className="qr-device-select-row">
                <span>📷 Chọn thiết bị:</span>
                <select
                  className="qr-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  <option value="">Tự động (Mặc định)</option>
                  {availableDevices.map((d, idx) => (
                    <option key={d.deviceId || idx} value={d.deviceId}>
                      {d.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
