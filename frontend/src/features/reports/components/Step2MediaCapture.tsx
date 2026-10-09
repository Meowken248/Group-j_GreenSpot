import React, { useState, useRef, useEffect } from "react";
import type { AttachedMedia, ReportFormData } from "../types/report.types";
import { uploadMediaWithWatermark } from "../services/reportService";

interface Step2Props {
  formData: ReportFormData;
  onUpdateFormData: (updates: Partial<ReportFormData>) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export const Step2MediaCapture: React.FC<Step2Props> = ({
  formData,
  onUpdateFormData,
  onPrevStep,
  onNextStep,
}) => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const currentMediaList = formData.media || [];
  const isMaxReached = currentMediaList.length >= 5;
  const isAnyUploading = currentMediaList.some((m) => m.is_uploading);

  // Mở camera khi component render
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ camera");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Không mở được camera:", err);
      setCameraError(
        "Không truy cập được camera. Hãy cấp quyền hoặc chọn ảnh từ thư viện"
      );
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Xử lý upload file lên server để đóng watermark
  const handleUploadFile = async (file: File) => {
    if (currentMediaList.length >= 5) {
      setGeneralError("Tối đa 5 tệp đính kèm");
      return;
    }

    // 1. Kiểm tra định dạng & dung lượng
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setGeneralError(
        "Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)"
      );
      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      setGeneralError(
        "Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)"
      );
      return;
    }

    if (isVideo && file.size > 50 * 1024 * 1024) {
      setGeneralError(
        "Tệp không hợp lệ (ảnh JPG/PNG tối đa 10MB, video MP4 tối đa 50MB)"
      );
      return;
    }

    setGeneralError(null);

    // Kiểm tra mạng
    if (!navigator.onLine) {
      setGeneralError("Mất kết nối. Tệp sẽ được tải lên khi có mạng");
      return;
    }

    // Tạo item tạm thời với trạng thái uploading
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const tempItem: AttachedMedia = {
      id: tempId,
      file_url: URL.createObjectURL(file),
      thumbnail_url: URL.createObjectURL(file),
      media_type: isVideo ? "VIDEO" : "IMAGE",
      file_size_bytes: file.size,
      mime_type: file.type,
      is_uploading: true,
      file,
    };

    const updatedList = [...currentMediaList, tempItem];
    onUpdateFormData({ media: updatedList });

    try {
      // Gửi tọa độ GPS nếu đã có
      const coords = formData.location
        ? { lat: formData.location.latitude, lng: formData.location.longitude }
        : undefined;

      const result = await uploadMediaWithWatermark(file, coords);

      // Cập nhật item với kết quả đã đóng watermark từ server
      const finalList = updatedList.map((m) =>
        m.id === tempId ? { ...result, is_uploading: false } : m
      );
      onUpdateFormData({ media: finalList });
    } catch (error) {
      console.error("Lỗi khi tải tệp và đóng watermark:", error);
      const failedList = updatedList.map((m) =>
        m.id === tempId
          ? {
              ...m,
              is_uploading: false,
              upload_error: "Không thể xử lý tệp này. Vui lòng thử lại",
            }
          : m
      );
      onUpdateFormData({ media: failedList });
      setGeneralError("Không thể xử lý tệp này. Vui lòng thử lại");
    }
  };

  // Nút "Chụp" ảnh tại chỗ từ video stream
  const handleCapturePhoto = () => {
    if (isMaxReached) {
      setGeneralError("Tối đa 5 tệp đính kèm");
      return;
    }
    if (!videoRef.current || !cameraStream) {
      startCamera();
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          handleUploadFile(file);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Nút "Quay" video tối đa 30 giây
  const handleToggleRecordVideo = () => {
    if (isMaxReached && !isRecording) {
      setGeneralError("Tối đa 5 tệp đính kèm");
      return;
    }

    if (isRecording) {
      // Dừng quay
      stopRecordingVideo();
    } else {
      // Bắt đầu quay
      startRecordingVideo();
    }
  };

  const startRecordingVideo = () => {
    if (!cameraStream) {
      setCameraError(
        "Không truy cập được camera. Hãy cấp quyền hoặc chọn ảnh từ thư viện"
      );
      return;
    }

    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(cameraStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/mp4" });
        const file = new File([blob], `record_${Date.now()}.mp4`, {
          type: "video/mp4",
        });
        handleUploadFile(file);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Đếm giờ tối đa 30s
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 29) {
            // Tự dừng quay ở giây 30
            stopRecordingVideo();
            setGeneralError("Video tối đa 30 giây");
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Lỗi khi quay video:", err);
      setGeneralError("Không thể quay video trên trình duyệt này.");
    }
  };

  const stopRecordingVideo = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  // Chọn từ thư viện máy
  const handleSelectFromLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      if (currentMediaList.length + i >= 5) {
        setGeneralError("Tối đa 5 tệp đính kèm");
        break;
      }
      handleUploadFile(files[i]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Xóa ảnh
  const handleRemoveMedia = (id: string) => {
    const updated = currentMediaList.filter((m) => m.id !== id);
    onUpdateFormData({ media: updated });
    setGeneralError(null);
  };

  // Thử lại tải ảnh
  const handleRetryUpload = (item: AttachedMedia) => {
    if (item.file) {
      handleRemoveMedia(item.id);
      handleUploadFile(item.file);
    }
  };

  // Chuyển sang Bước 3 (Yêu cầu ít nhất 1 ảnh/video)
  const handleProceed = () => {
    if (currentMediaList.length === 0) {
      setGeneralError("Vui lòng thêm ít nhất 1 ảnh hoặc video");
      return;
    }
    if (isAnyUploading) {
      setGeneralError("Đang xử lý ảnh… Vui lòng đợi hoàn tất");
      return;
    }
    onNextStep();
  };

  return (
    <div className="report-step-content step-2-container">
      <div className="step-header">
        <h2 className="step-title">2. Thu thập bằng chứng hình ảnh & video</h2>
        <p className="step-subtitle">
          Chụp ảnh hoặc quay video hiện trường sự cố. Hệ thống sẽ tự động đóng dấu ngày giờ máy chủ và toạ độ GPS (Watermark) để đảm bảo tính xác thực.
        </p>
      </div>

      {/* KHUNG CAMERA */}
      <div className="section-card camera-section">
        <div className="camera-viewport-wrapper">
          {cameraError ? (
            <div className="camera-error-placeholder">
              <span className="camera-alert-icon">📷</span>
              <p className="camera-error-msg">{cameraError}</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={startCamera}
              >
                Cấp quyền lại camera
              </button>
            </div>
          ) : (
            <div className="camera-live-feed">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-element"
              />
              {isRecording && (
                <div className="recording-status-overlay">
                  <span className="recording-dot blink" />
                  <span className="recording-timer">
                    Đang quay: {recordingSeconds}s / 30s
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* NÚT THAO TÁC CAMERA */}
        <div className="camera-controls-row">
          <button
            type="button"
            className={`btn-control btn-snap ${isMaxReached || isRecording ? "disabled" : ""}`}
            onClick={handleCapturePhoto}
            disabled={isMaxReached || isRecording}
            title="Chụp ảnh tại chỗ"
          >
            📸 Chụp
          </button>

          <button
            type="button"
            className={`btn-control btn-record ${isRecording ? "recording" : ""} ${isMaxReached && !isRecording ? "disabled" : ""}`}
            onClick={handleToggleRecordVideo}
            disabled={isMaxReached && !isRecording}
            title="Quay video (Tối đa 30 giây)"
          >
            {isRecording ? "⏹ Dừng quay" : "🎥 Quay video"}
          </button>

          <button
            type="button"
            className={`btn-control btn-library ${isMaxReached ? "disabled" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isMaxReached}
            title="Chọn tệp có sẵn trong máy"
          >
            📁 Chọn từ thư viện
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,video/mp4"
            multiple
            style={{ display: "none" }}
            onChange={handleSelectFromLibrary}
          />
        </div>
      </div>

      {/* KHUNG XEM TRƯỚC (PREVIEW) */}
      <div className="section-card preview-section">
        <div className="preview-heading">
          <label className="section-label">
            Tệp đính kèm đã đóng dấu Watermark ({currentMediaList.length}/5) <span className="required">*</span>
          </label>
          <span className="file-constraints-note">
            Ảnh JPG/PNG ≤ 10MB | Video MP4 ≤ 50MB (≤ 30s)
          </span>
        </div>

        {generalError && (
          <div className="inline-error-banner media-error-banner">
            ⚠️ {generalError}
          </div>
        )}

        {currentMediaList.length === 0 ? (
          <div className="empty-media-hint">
            <span className="empty-icon">🖼️</span>
            <p>Chưa có ảnh hoặc video nào. Vui lòng bấm <strong>"Chụp"</strong> hoặc <strong>"Chọn từ thư viện"</strong>.</p>
          </div>
        ) : (
          <div className="media-thumbnails-grid">
            {currentMediaList.map((item, index) => {
              const hasError = Boolean(item.upload_error);

              return (
                <div
                  key={item.id}
                  className={`thumbnail-card ${item.is_uploading ? "uploading" : ""} ${hasError ? "has-error" : ""}`}
                >
                  <div className="thumb-image-container">
                    {item.media_type === "VIDEO" ? (
                      <video
                        src={item.file_url}
                        className="thumb-media"
                        poster={item.thumbnail_url}
                        controls={false}
                      />
                    ) : (
                      <img
                        src={item.thumbnail_url || item.file_url}
                        alt={`Bằng chứng ${index + 1}`}
                        className="thumb-media"
                      />
                    )}

                    {/* Vòng quay loading khi đang upload */}
                    {item.is_uploading && (
                      <div className="upload-loading-overlay">
                        <div className="spinner" />
                        <span>Đang xử lý ảnh…</span>
                      </div>
                    )}

                    {/* Dấu Watermark góc dưới */}
                    {!item.is_uploading && !hasError && (
                      <div className="watermark-tag">
                        <span>🛡️ Watermark GPS & Giờ</span>
                      </div>
                    )}

                    {/* Nút xoá tệp */}
                    <button
                      type="button"
                      className="btn-remove-thumb"
                      onClick={() => handleRemoveMedia(item.id)}
                      title="Xoá tệp này"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Thanh thông tin dưới thumbnail */}
                  <div className="thumb-footer">
                    <span className="thumb-type-badge">
                      {item.media_type === "VIDEO" ? "🎥 Video" : "📷 Ảnh"} #{index + 1}
                    </span>

                    {hasError ? (
                      <button
                        type="button"
                        className="btn-retry-upload"
                        onClick={() => handleRetryUpload(item)}
                      >
                        Thử lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-retake"
                        onClick={() => {
                          handleRemoveMedia(item.id);
                          handleCapturePhoto();
                        }}
                      >
                        Chụp lại
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KHUNG ĐIỀU HƯỚNG */}
      <div className="navigation-actions-bar">
        <button
          type="button"
          className="btn-secondary btn-back"
          onClick={onPrevStep}
        >
          ← Quay lại
        </button>

        <button
          type="button"
          className={`btn-primary btn-continue ${
            currentMediaList.length === 0 || isAnyUploading ? "btn-disabled" : ""
          }`}
          onClick={handleProceed}
          disabled={currentMediaList.length === 0 || isAnyUploading}
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
};
