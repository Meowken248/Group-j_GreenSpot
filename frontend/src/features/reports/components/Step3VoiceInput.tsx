import React, { useState, useRef, useEffect } from "react";
import type { ReportFormData } from "../types/report.types";
import { VoiceWaveform } from "../../../components/VoiceAssistant/VoiceWaveform";

interface Step3Props {
  formData: ReportFormData;
  onUpdateFormData: (updates: Partial<ReportFormData>) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export const Step3VoiceInput: React.FC<Step3Props> = ({
  formData,
  onUpdateFormData,
  onPrevStep,
  onNextStep,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>(formData.voice_text || "");
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [hasEmptyTextError, setHasEmptyTextError] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // Khởi tạo Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setInfoMessage("Đang dùng dịch vụ nhận dạng dự phòng");
    }

    return () => {
      stopRecordingSession();
    };
  }, []);

  const startRecordingSession = async () => {
    setErrorMessage(null);
    setHasEmptyTextError(false);
    setMicPermissionDenied(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Trình duyệt không hỗ trợ ghi âm");
      }
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);
      setIsRecording(true);
      setRecordSeconds(0);

      // Bắt đầu nhận dạng qua Web Speech API
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "vi-VN";
        recognition.continuous = true;
        recognition.interimResults = true;

        let accumulatedTranscript = recognizedText ? `${recognizedText} ` : "";

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              accumulatedTranscript += `${transcript} `;
            } else {
              interim += transcript;
            }
          }
          setRecognizedText((accumulatedTranscript + interim).trim());
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setMicPermissionDenied(true);
            setErrorMessage("Không truy cập được micro. Hãy cấp quyền cho trình duyệt");
          } else if (event.error === "no-speech") {
            // Không nhận được âm thanh
          } else {
            setErrorMessage("Không thể nhận dạng. Vui lòng thử lại hoặc nhập tay");
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      // Đếm giờ tối đa 60 giây
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 59) {
            // Đã đạt 60 giây: tự dừng ghi
            stopRecordingSession();
            setInfoMessage("Đã đạt thời gian ghi tối đa 60 giây");
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("Lỗi micro:", err);
      setMicPermissionDenied(true);
      setErrorMessage("Không truy cập được micro. Hãy cấp quyền cho trình duyệt");
      setIsRecording(false);
    }
  };

  const stopRecordingSession = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    setIsRecording(false);

    // Kiểm tra kết quả sau khi dừng
    if (!recognizedText || recognizedText.trim().length === 0) {
      setIsRecognizing(false);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecordingSession();
    } else {
      startRecordingSession();
    }
  };

  // Nút "Ghi lại": xoá bản ghi và văn bản hiện tại để ghi lại
  const handleResetAndRecord = () => {
    stopRecordingSession();
    setRecognizedText("");
    setErrorMessage(null);
    setInfoMessage(null);
    setHasEmptyTextError(false);
    startRecordingSession();
  };

  // Nút "Dùng văn bản này": thêm văn bản vào phần mô tả và sang Màn 4
  const handleApplyVoiceText = () => {
    const trimmed = recognizedText.trim();
    if (!trimmed) {
      setHasEmptyTextError(true);
      setErrorMessage("Văn bản không được để trống");
      return;
    }

    // Bổ sung vào phần mô tả của báo cáo
    const currentDesc = formData.description ? formData.description.trim() : "";
    const combinedDesc = currentDesc
      ? `${currentDesc}\n\n[Mô tả giọng nói]: ${trimmed}`
      : trimmed;

    // Giới hạn 500 ký tự cho mô tả
    const finalDesc = combinedDesc.slice(0, 500);

    onUpdateFormData({
      voice_text: trimmed,
      description: finalDesc,
    });

    onNextStep();
  };

  // Nút "Bỏ qua bước này": chuyển thẳng sang Bước 4
  const handleSkipStep = () => {
    stopRecordingSession();
    onNextStep();
  };

  return (
    <div className="report-step-content step-3-container">
      <div className="step-header">
        <div className="step-title-row">
          <h2 className="step-title">3. Nhập mô tả bằng giọng nói</h2>
          <button
            type="button"
            className="link-skip-step"
            onClick={handleSkipStep}
          >
            Bỏ qua bước này →
          </button>
        </div>
        <p className="step-subtitle">
          Thu âm hiện trường và hệ thống sẽ tự động chuyển giọng nói thành văn bản. Bạn có thể kiểm tra và chỉnh sửa nội dung trước khi chuyển sang bước tiếp theo.
        </p>
      </div>

      {/* THÔNG BÁO VÀ HƯỚNG DẪN */}
      {infoMessage && (
        <div className="inline-info-banner">ℹ️ {infoMessage}</div>
      )}
      {errorMessage && (
        <div className="inline-error-banner">⚠️ {errorMessage}</div>
      )}

      {/* KHUNG GHI ÂM */}
      <div className="section-card voice-record-section">
        <div className="mic-action-center">
          <button
            type="button"
            className={`btn-big-mic ${isRecording ? "recording pulsing" : ""} ${
              micPermissionDenied ? "disabled" : ""
            }`}
            onClick={handleToggleRecord}
            disabled={micPermissionDenied}
            title={isRecording ? "Bấm để dừng ghi" : "Bấm để bắt đầu thu âm"}
          >
            <span className="mic-icon">🎙️</span>
            {isRecording && <span className="mic-pulse-ring" />}
          </button>

          <div className="record-meta-info">
            <span className="record-status-label">
              {isRecording ? "Đang lắng nghe giọng nói của bạn..." : "Bấm vào Micro để bắt đầu nói"}
            </span>
            <span className={`record-clock ${recordSeconds > 50 ? "clock-warning" : ""}`}>
              ⏱️ {recordSeconds}s / 60s
            </span>
          </div>
        </div>

        {/* SÓNG ÂM THANH THỜI GIAN THỰC (TÁI SỬ DỤNG TỪ VOICE ASSISTANT) */}
        <div className="voice-waveform-display-box">
          <VoiceWaveform stream={stream} isListening={isRecording} />
        </div>
      </div>

      {/* KHUNG VĂN BẢN NHẬN DẠNG */}
      <div className="section-card recognized-text-section">
        <div className="section-heading">
          <label className="section-label">
            Văn bản nhận dạng từ giọng nói (Bạn có thể sửa tay):
          </label>
          {isRecognizing && <span className="recognition-spinner">Đang nhận dạng giọng nói…</span>}
        </div>

        <textarea
          rows={4}
          className={`form-textarea text-recognized-input ${
            hasEmptyTextError ? "input-error" : ""
          }`}
          placeholder="Văn bản sau khi nói sẽ xuất hiện ở đây. Bạn có thể gõ thêm hoặc sửa nội dung theo ý muốn..."
          value={recognizedText}
          onChange={(e) => {
            setRecognizedText(e.target.value);
            if (e.target.value.trim().length > 0) {
              setHasEmptyTextError(false);
              setErrorMessage(null);
            }
          }}
        />

        <div className="voice-controls-row">
          <button
            type="button"
            className="btn-secondary btn-re-record"
            onClick={handleResetAndRecord}
          >
            🔄 Ghi lại
          </button>

          <button
            type="button"
            className={`btn-primary btn-apply-voice ${
              recognizedText.trim().length === 0 ? "btn-dimmed" : ""
            }`}
            onClick={handleApplyVoiceText}
          >
            ✍️ Dùng văn bản này
          </button>
        </div>
      </div>

      {/* KHUNG ĐIỀU HƯỚNG */}
      <div className="navigation-actions-bar">
        <button
          type="button"
          className="btn-secondary btn-back"
          onClick={() => {
            stopRecordingSession();
            onPrevStep();
          }}
        >
          ← Quay lại
        </button>

        <button
          type="button"
          className="btn-secondary btn-skip"
          onClick={handleSkipStep}
        >
          Bỏ qua bước này
        </button>
      </div>
    </div>
  );
};

