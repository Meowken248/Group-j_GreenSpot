import React, { useState, useEffect, useRef, useCallback } from "react";
import { MicPermissionModal } from "./MicPermissionModal";
import { VoiceWaveform } from "./VoiceWaveform";
import * as voiceService from "../../services/voice_assistant";
import type {
  VoiceAssistantScreen,
  VoiceProcessResponse,
  VoiceSampleCommand,
} from "../../types/voice_assistant";
import "./VoiceAssistant.scss";

interface VoiceAssistantProps {
  onClose?: () => void;
  onNavigateToFeature?: (target: string, payload?: any) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onClose,
  onNavigateToFeature,
}) => {
  // Trạng thái màn hình hiện tại: HOME (Màn 1) | LISTENING (Màn 2) | RESULT (Màn 3)
  const [currentScreen, setCurrentScreen] = useState<VoiceAssistantScreen>("HOME");

  // Trạng thái Popup Màn 4
  const [showMicPermissionModal, setShowMicPermissionModal] = useState<boolean>(false);

  // Vị trí GPS hiện tại của người dùng phục vụ truy vấn cục bộ
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Danh sách câu lệnh mẫu Màn 1
  const [suggestions, setSuggestions] = useState<VoiceSampleCommand[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  // Lỗi mạng hoặc khởi động
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [browserUnsupported, setBrowserUnsupported] = useState<boolean>(false);

  // Trạng thái Thu âm & Nhận diện giọng nói Màn 2
  const [realtimeTranscript, setRealtimeTranscript] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>("");
  const [noiseWarning, setNoiseWarning] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Kết quả phản hồi Màn 3
  const [resultData, setResultData] = useState<VoiceProcessResponse | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Quản lý trạng thái theme Sáng / Tối thời gian thực
  const [themeMode, setThemeMode] = useState<"LIGHT" | "DARK">(() => {
    try {
      const savedTheme = localStorage.getItem("greenspot_user_theme");
      if (savedTheme === "DARK") return "DARK";
      if (document.body.classList.contains("dark-mode")) return "DARK";
      return "LIGHT";
    } catch {
      return "LIGHT";
    }
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme?: "LIGHT" | "DARK" }>;
      if (customEvent.detail?.theme) {
        setThemeMode(customEvent.detail.theme);
      }
    };
    window.addEventListener("greenspot_theme_changed", handleThemeChange);
    return () => window.removeEventListener("greenspot_theme_changed", handleThemeChange);
  }, []);

  // Audio Stream & Web Speech Recognition Refs
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTimestampRef = useRef<number>(0);

  // Dọn dẹp micro và timer
  const stopRecordingCleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSoundTimerRef.current) {
      clearTimeout(noSoundTimerRef.current);
      noSoundTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setActiveMediaStream(null);
  }, []);

  // Tải danh sách câu lệnh mẫu cho Màn 1
  const loadSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    setNetworkError(null);
    try {
      if (navigator.onLine === false) {
        throw new Error("Offline");
      }
      const data = await voiceService.fetchVoiceSuggestions();
      setSuggestions(data);
    } catch {
      setNetworkError("Không thể khởi động trợ lý ảo. Vui lòng thử lại");
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();

    // Lấy tọa độ GPS người dùng để phục vụ tra cứu chính xác
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Mặc định khu vực trung tâm TP.HCM (Quận 1)
          setUserCoords({ lat: 10.7765, lng: 106.7009 });
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }

    // Kiểm tra tính năng Web Speech API trên trình duyệt
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition && !navigator.mediaDevices?.getUserMedia) {
      setBrowserUnsupported(true);
    }

    return () => {
      stopRecordingCleanup();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadSuggestions, stopRecordingCleanup]);

  // Phát âm thanh phản hồi Text-to-Speech (TTS)
  const speakResponse = (text: string) => {
    try {
      if (
        typeof window === "undefined" ||
        !window.speechSynthesis ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS speak warning:", e);
    }
  };

  // Gửi câu lệnh lên Backend xử lý và chuyển sang Màn 3
  const handleProcessCommand = async (
    transcriptText: string,
    source: "VOICE" | "SUGGESTION_CLICK"
  ) => {
    stopRecordingCleanup();
    setIsProcessing(true);
    setProcessingStatusText("Đang xử lý câu lệnh…");

    try {
      const response = await voiceService.processVoiceCommand({
        transcript: transcriptText,
        session_source: source,
        current_lat: userCoords?.lat,
        current_lng: userCoords?.lng,
      });

      setResultData(response);
      setCurrentScreen("RESULT");
      setIsProcessing(false);
      setProcessingStatusText("");

      // Phát âm thanh TTS qua loa (nếu được hỗ trợ)
      speakResponse(response.response_text);
    } catch (err) {
      console.error("Voice process error:", err);
      setIsProcessing(false);
      setProcessingStatusText("");
      setToastMessage("Mất kết nối. Vui lòng thử lại");
      setCurrentScreen("HOME");
    }
  };

  // Khởi động thu âm và chuyển sang Màn 2
  const startListening = async () => {
    setNoiseWarning(null);
    setRealtimeTranscript("");

    // Kiểm tra kết nối mạng
    if (!navigator.onLine) {
      setToastMessage("Mất kết nối. Vui lòng thử lại");
      return;
    }

    // 1. Yêu cầu quyền Micro
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setBrowserUnsupported(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setActiveMediaStream(stream);
    } catch {
      // Chưa cấp quyền hoặc bị chặn -> Kích hoạt mở Màn 4
      setShowMicPermissionModal(true);
      return;
    }

    // 2. Chuyển sang Màn 2 (Đang nghe)
    setCurrentScreen("LISTENING");
    lastSpokenTimestampRef.current = Date.now();

    // 3. Khởi tạo SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "vi-VN";
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptPart;
          } else {
            interim += transcriptPart;
          }
        }

        const currentText = final || interim;
        if (currentText.trim()) {
          setRealtimeTranscript(currentText);
          lastSpokenTimestampRef.current = Date.now();

          // Reset timer 10s im lặng ban đầu vì người dùng đã có phát âm
          if (noSoundTimerRef.current) {
            clearTimeout(noSoundTimerRef.current);
            noSoundTimerRef.current = null;
          }

          // Quy tắc: Nếu ngừng nói quá 3 giây, tự động dừng thu âm và chuyển sang Màn 3
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            handleProcessCommand(currentText, "VOICE");
          }, 3000);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          stopRecordingCleanup();
          setShowMicPermissionModal(true);
        } else if (event.error === "network") {
          stopRecordingCleanup();
          setToastMessage("Mất kết nối. Vui lòng thử lại");
          setCurrentScreen("HOME");
        } else if (event.error === "no-speech") {
          // Xử lý không phát hiện âm thanh
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition start error:", err);
      }
    } else {
      // Mô phỏng nhận diện nhanh khi SpeechRecognition API không khả dụng trong test
      setRealtimeTranscript("Đang lắng nghe giọng nói của bạn...");
    }

    // Quy tắc: Nếu sau 10 giây không có âm thanh phát ra, tự động hủy thu âm và quay lại Màn 1
    noSoundTimerRef.current = setTimeout(() => {
      if (Date.now() - lastSpokenTimestampRef.current >= 9500) {
        stopRecordingCleanup();
        setToastMessage("Không nghe thấy giọng nói của bạn");
        setCurrentScreen("HOME");
      }
    }, 10000);
  };

  // Nút Dừng trên Màn 2
  const handleStopListening = () => {
    const textToProcess = realtimeTranscript.trim() || "Báo cáo sự cố gần đây";
    handleProcessCommand(textToProcess, "VOICE");
  };

  // Click trực tiếp câu lệnh gợi ý tại Màn 1 -> Chuyển thẳng sang Màn 3
  const handleSuggestionClick = (cmdText: string) => {
    handleProcessCommand(cmdText, "SUGGESTION_CLICK");
  };

  // Đóng trợ lý từ Header hoặc nút Đóng
  const handleCloseAssistant = () => {
    stopRecordingCleanup();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentScreen("HOME");
    setResultData(null);
    if (onClose) {
      onClose();
    }
  };

  // Mở chức năng liên quan từ Thẻ hành động
  const handleOpenTargetFeature = () => {
    stopRecordingCleanup();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (resultData?.action_target && onNavigateToFeature) {
      onNavigateToFeature(resultData.action_target, resultData.action_payload);
    }
    setCurrentScreen("HOME");
    setResultData(null);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`voice-assistant-fullscreen ${themeMode === "DARK" ? "dark-mode" : "light-mode"}`}
      data-testid="voice-assistant-container"
    >
      {/* KHUNG HEADER CHUNG */}
      <header className="voice-header" role="banner">
        <div className="voice-header-left">
          <button
            type="button"
            className="voice-menu-btn"
            title="Menu điều hướng"
            onClick={onClose}
          >
            ☰
          </button>
          <div className="voice-brand">
            <span className="brand-leaf-icon" aria-hidden="true">🌿</span>
            <span className="brand-name">GreenSpot</span>
            <span className="brand-sub">Voice AI</span>
          </div>
        </div>

        <div className="voice-header-right">
          <button
            type="button"
            className="voice-icon-btn"
            title="Thông báo hệ thống"
            aria-label="Thông báo"
          >
            🔔
          </button>
          <div className="voice-avatar" title="Tài khoản công dân">
            <span>👤</span>
          </div>
          <button
            type="button"
            className="voice-close-app-btn"
            onClick={handleCloseAssistant}
            title="Đóng trợ lý giọng nói"
          >
            ✕
          </button>
        </div>
      </header>

      {/* TOAST THÔNG BÁO LỖI / TRẠNG THÁI */}
      {toastMessage && (
        <div className="voice-toast-alert" role="alert">
          <span>⚠️ {toastMessage}</span>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => setToastMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* NỘI DUNG CHÍNH (KHỐI TRỢ LÝ GIỌNG NÓI TOÀN MÀN HÌNH) */}
      <main className="voice-main-content">
        {/* ======================================================== */}
        {/* MÀN 1: TRUNG TÂM ĐIỀU KHIỂN TRỢ LÝ GIỌNG NÓI (CHỜ LỆNH) */}
        {/* ======================================================== */}
        {currentScreen === "HOME" && (
          <div className="voice-screen voice-home-screen voice-panel-container" data-testid="voice-home-screen">
            {/* TIÊU ĐỀ KHỐI THEO WIREFRAME 1: TRỢ LÝ GIỌNG NÓI */}
            <div className="voice-panel-header">
              <h2 className="voice-panel-title">TRỢ LÝ GIỌNG NÓI</h2>
              <div className="voice-home-header-badge">
                <span className="pulse-dot" />
                <span>TRỢ LÝ GIỌNG NÓI RẢNH TAY</span>
              </div>
            </div>

            <h1 className="voice-main-title">Bạn cần hỗ trợ điều gì hôm nay?</h1>
            <p className="voice-main-desc">
              Chạm vào micro hoặc bấm nút bắt đầu nói để tương tác hoàn toàn rảnh tay khi đang di chuyển.
            </p>

            {/* Thông báo trình duyệt không hỗ trợ */}
            {browserUnsupported && (
              <div className="voice-error-banner" role="alert">
                <span>⚠️ Trình duyệt không hỗ trợ nhận dạng giọng nói. Hãy dùng bàn phím</span>
              </div>
            )}

            {/* Thông báo mất kết nối mạng khi mở trợ lý */}
            {networkError && (
              <div className="voice-error-banner" role="alert">
                <span>⚠️ {networkError}</span>
                <button
                  type="button"
                  className="btn-retry-network"
                  onClick={loadSuggestions}
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* NÚT MICRO LỚN VỚI HIỆU ỨNG NHỊP THỞ (PULSE ANIMATION - WIREFRAME 1) */}
            <div className="voice-mic-hero-wrapper">
              <button
                type="button"
                className={`voice-big-mic-btn ${browserUnsupported ? "disabled" : ""}`}
                onClick={startListening}
                disabled={browserUnsupported}
                aria-label="Kích hoạt nhận dạng giọng nói"
              >
                <div className="pulse-ring ring-1" />
                <div className="pulse-ring ring-2" />
                <div className="pulse-ring ring-3" />
                <span className="mic-icon" aria-hidden="true">🎙️</span>
              </button>
              <span className="mic-label-badge">Nút micro lớn</span>
            </div>

            {/* GỢI Ý CÂU LỆNH MẪU THỰC TẾ (WIREFRAME 1) */}
            <div className="voice-suggestions-section">
              <div className="suggestions-header">
                <span className="suggestions-icon">💡</span>
                <span>Gợi ý câu lệnh mẫu (Chạm để xử lý ngay):</span>
              </div>

              <div className="suggestions-grid">
                {isLoadingSuggestions ? (
                  <div className="suggestions-loading">Đang tải câu lệnh mẫu...</div>
                ) : (
                  suggestions.map((cmd) => (
                    <button
                      key={cmd.command_id}
                      type="button"
                      className="suggestion-pill-card"
                      onClick={() => handleSuggestionClick(cmd.command_text)}
                    >
                      <span className="pill-quote">“</span>
                      <span className="pill-text">{cmd.command_text}</span>
                      <span className="pill-quote">”</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* NÚT BẮT ĐẦU NÓI DẠNG PILL RỘNG THEO WIREFRAME 1 */}
            <div className="voice-start-btn-container">
              <button
                type="button"
                className="btn-start-speaking wide-pill-btn"
                onClick={startListening}
                disabled={browserUnsupported}
              >
                <span className="btn-icon">🎤</span>
                <span>Bắt đầu nói</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MÀN 2: TRẠNG THÁI THU ÂM VÀ NHẬN DẠNG THỜI GIAN THỰC (ĐANG NGHE) */}
        {/* ======================================================== */}
        {currentScreen === "LISTENING" && (
          <div className="voice-screen voice-listening-screen voice-panel-container" data-testid="voice-listening-screen">
            {/* TIÊU ĐỀ KHỐI THEO WIREFRAME 2: ĐANG NGHE... */}
            <div className="voice-panel-header">
              <h2 className="voice-panel-title listening-title">ĐANG NGHE...</h2>
              <span className="listening-pulse-dot" />
            </div>

            <p className="listening-instruction">
              Hãy phát âm rõ ràng yêu cầu của bạn, hệ thống sẽ tự động xử lý khi bạn dừng nói.
            </p>

            {/* SÓNG ÂM (WAVEFORM ANIMATION MÀU XANH LÁ - WIREFRAME 2) */}
            <div className="waveform-box-wrapper">
              <div className="waveform-sublabel">Sóng âm</div>
              <VoiceWaveform
                stream={activeMediaStream}
                isListening={currentScreen === "LISTENING"}
              />
            </div>

            {/* VĂN BẢN NHẬN DẠNG THEO THỜI GIAN THỰC (< 200MS - WIREFRAME 2) */}
            <div className="realtime-transcript-card" aria-live="polite">
              <span className="transcript-label">Văn bản nhận dạng theo thời gian thực:</span>
              <p className="transcript-text">
                {realtimeTranscript || "Đang nhận diện giọng nói của bạn..."}
              </p>
            </div>

            {/* DÒNG TRẠNG THÁI ĐANG XỬ LÝ (KHI DỪNG NÓI HOẶC BẤM DỪNG) */}
            {isProcessing && (
              <div className="processing-indicator" role="status">
                <span className="spinner" />
                <span>{processingStatusText || "Đang xử lý câu lệnh…"}</span>
              </div>
            )}

            {/* CẢNH BÁO MÔI TRƯỜNG QUÁ NHIỀU TẠP ÂM (HIỂN THỊ PHÍA TRÊN NÚT DỪNG THEO SPEC) */}
            {noiseWarning && (
              <div className="voice-noise-warning-badge yellow-warning" role="alert">
                <span>⚠️ {noiseWarning}</span>
              </div>
            )}

            {/* NÚT "DỪNG" CHỦ ĐỘNG KẾT THÚC CÂU NÓI DẠNG PILL RỘNG THEO WIREFRAME 2 */}
            <div className="listening-actions">
              <button
                type="button"
                className="btn-stop-listening wide-pill-btn"
                onClick={handleStopListening}
                disabled={isProcessing}
              >
                <span className="btn-stop-icon">⏹</span>
                <span>Dừng &amp; Xử lý ngay</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MÀN 3: PHẢN HỒI VÀ THỰC THI HÀNH ĐỘNG THEO Ý ĐỊNH (KẾT QUẢ LỆNH) */}
        {/* ======================================================== */}
        {currentScreen === "RESULT" && resultData && (
          <div className="voice-screen voice-result-screen" data-testid="voice-result-screen">
            <div className="result-container-split">
              {/* KHỐI CỘT TRÁI: "LỆNH CỦA BẠN" (WIREFRAME 3) */}
              <div className="result-column-left voice-panel-container">
                <div className="column-card user-command-card">
                  <div className="voice-panel-header">
                    <span className="column-icon">🗣️</span>
                    <h3 className="voice-panel-title">LỆNH CỦA BẠN</h3>
                  </div>

                  <div className="command-sublabel">Văn bản nhận dạng:</div>
                  <div className="normalized-command-box">
                    <p className="normalized-text">"{resultData.normalized_text}"</p>
                    <span className="command-tag-badge">
                      {resultData.detected_intent || "Ý định chung"}
                    </span>
                  </div>
                  <div className="command-meta-info">
                    <span>Độ trễ AI: {resultData.processing_time_ms}ms</span>
                    <span>Độ tin cậy: {(resultData.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* KHỐI CỘT PHẢI: "PHẢN HỒI" (WIREFRAME 3) */}
              <div className="result-column-right voice-panel-container">
                <div className="column-card assistant-response-card">
                  <div className="voice-panel-header">
                    <div className="header-title-tts">
                      <span className="column-icon">🤖</span>
                      <h3 className="voice-panel-title">PHẢN HỒI TỪ TRỢ LÝ</h3>
                    </div>
                    {/* Nút phát lại âm thanh */}
                    <button
                      type="button"
                      className={`btn-tts-replay ${isSpeaking ? "speaking" : ""}`}
                      onClick={() => speakResponse(resultData.response_text)}
                      title="Phát lại bằng giọng nói"
                    >
                      <span>{isSpeaking ? "🔊 Đang đọc..." : "🔊 Nghe lại"}</span>
                    </button>
                  </div>

                  <div className="response-sublabel">Câu trả lời / hành động đã thực hiện:</div>

                  {/* Câu trả lời văn bản */}
                  <div className="assistant-message-bubble">
                    <p>
                      {resultData.response_text.startsWith("Trợ lý:")
                        ? resultData.response_text
                        : `Trợ lý: ${resultData.response_text}`}
                    </p>
                  </div>

                  {/* THẺ HÀNH ĐỘNG THỰC THI TƯƠNG ỨNG */}
                  {resultData.is_success ? (
                    <div className="action-execution-card">
                      <div className="action-badge">
                        <span>{resultData.action_type === "NAVIGATION" ? "🚀 Điều hướng" : "📊 Tra cứu dữ liệu"}</span>
                      </div>

                      {/* Dữ liệu tra cứu hoặc điều hướng */}
                      {resultData.action_payload && (
                        <div className="action-payload-details">
                          {resultData.detected_intent === "REPORT_INCIDENT" && (
                            <div className="prefilled-form-preview">
                              <strong>Form Báo cáo sự cố (STT 01):</strong>
                              <p>• Phân loại: {resultData.action_payload.incident_type}</p>
                              <p>• Tiêu đề: {resultData.action_payload.title}</p>
                              <p>• Vị trí: {resultData.action_payload.location_text}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_REWARD_WALLET" && (
                            <div className="wallet-preview">
                              <span className="wallet-points">
                                🌟 {resultData.action_payload.balance} {resultData.action_payload.currency}
                              </span>
                              <p>{resultData.action_payload.level}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_CURRENT_AQI" && (
                            <div className="aqi-preview">
                              <span className="aqi-pill green">AQI {resultData.action_payload.aqi} - {resultData.action_payload.category}</span>
                              <p>{resultData.action_payload.station_name}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_SAFE_ROUTE" && (
                            <div className="safe-route-preview" data-testid="safe-route-card">
                              <div className="safe-route-header-row">
                                <span className="safe-route-dest-badge">
                                  🛣️ {resultData.action_payload.destination || "Lộ trình di chuyển an toàn"}
                                </span>
                                {resultData.action_payload.hazard_avoided !== undefined && (
                                  <span className="hazard-avoided-pill">
                                    Tránh {resultData.action_payload.hazard_avoided} đoạn trũng ngập
                                  </span>
                                )}
                              </div>

                              {/* Thông điệp cốt lõi đúng thực tế */}
                              <div className="safe-route-insight-box">
                                <span className="insight-icon">💡</span>
                                <span className="insight-text">
                                  {resultData.action_payload.realistic_nature ||
                                    "Thực tế ngập úng tại TP.HCM chỉ xảy ra cục bộ tại một đoạn trũng thấp hoặc khu vực cống thoát nước không kịp tiêu thoát, các đoạn khác lưu thông bình thường."}
                                </span>
                              </div>

                              {/* Trường hợp tra cứu đích danh 1 tuyến đường */}
                              {resultData.action_payload.specific_spot && (
                                <div className="specific-spot-card">
                                  <div className="spot-top-line">
                                    <strong className="spot-name">📍 {resultData.action_payload.specific_spot}</strong>
                                    <span className={`spot-depth-tag ${resultData.action_payload.risk_level?.toLowerCase() || 'warning'}`}>
                                      ~{resultData.action_payload.estimated_depth_cm || 0} cm ({resultData.action_payload.length_m || 500}m)
                                    </span>
                                  </div>
                                  {resultData.action_payload.spot_type && (
                                    <div className="spot-detail-row">
                                      <span className="detail-label">Đặc điểm hình thái:</span>
                                      <span className="detail-val">{resultData.action_payload.spot_type}</span>
                                    </div>
                                  )}
                                  {resultData.action_payload.drainage_issue && (
                                    <div className="spot-detail-row">
                                      <span className="detail-label">Nguyên nhân thoát nước:</span>
                                      <span className="detail-val warning-text">{resultData.action_payload.drainage_issue}</span>
                                    </div>
                                  )}
                                  {resultData.action_payload.segment_scope && (
                                    <div className="spot-scope-note">
                                      ℹ️ {resultData.action_payload.segment_scope}
                                    </div>
                                  )}
                                  {resultData.action_payload.detour_advice && (
                                    <div className="spot-detour-box">
                                      🧭 <strong>Lộ trình né:</strong> {resultData.action_payload.detour_advice}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Trường hợp hỏi lân cận vị trí hiện tại có điểm ngập */}
                              {resultData.action_payload.nearby_spot && (
                                <div className="specific-spot-card nearby" data-testid="nearby-spot-card">
                                  <div className="spot-top-line">
                                    <strong className="spot-name">📍 {resultData.action_payload.nearby_spot.name}</strong>
                                    <span className="spot-depth-tag warning">
                                      Cách {resultData.action_payload.nearby_spot.dist_m}m (~{resultData.action_payload.nearby_spot.estimated_depth_cm}cm)
                                    </span>
                                  </div>
                                  <div className="spot-detail-row">
                                    <span className="detail-label">Đoạn đường:</span>
                                    <span className="detail-val">{resultData.action_payload.nearby_spot.street}</span>
                                  </div>
                                  {resultData.action_payload.nearby_spot.detour_advice && (
                                    <div className="spot-detour-box">
                                      🧭 <strong>Lộ trình né:</strong> {resultData.action_payload.nearby_spot.detour_advice}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Trường hợp hỏi tuyến đường an toàn nằm ngoài điểm đen */}
                              {resultData.action_payload.is_safe && resultData.action_payload.matched_street && (
                                <div className="safe-street-badge-card" data-testid="safe-street-card">
                                  <div className="safe-street-header">
                                    <span className="safe-icon">✅</span>
                                    <strong>{resultData.action_payload.matched_street}</strong>
                                    <span className="safe-status-pill">Khô ráo &amp; An toàn</span>
                                  </div>
                                  <p className="safe-desc">
                                    Tuyến đường này cao ráo, cống thoát nước tốt và nằm ngoài 30 điểm đen ngập úng của TP.HCM.
                                  </p>
                                </div>
                              )}

                              {/* Trường hợp danh sách các đoạn trũng cần lưu ý (General Query) */}
                              {resultData.action_payload.specific_segments && resultData.action_payload.specific_segments.length > 0 && (
                                <div className="flood-segments-section">
                                  <div className="section-label">⚠️ Các đoạn trũng cục bộ cần lưu ý:</div>
                                  <div className="segments-grid">
                                    {resultData.action_payload.specific_segments.map((seg: any, idx: number) => (
                                      <div key={idx} className="segment-card-item">
                                        <div className="segment-header">
                                          <span className="seg-name">{seg.name}</span>
                                          <span className={`seg-badge ${seg.risk_level?.toLowerCase() || 'warning'}`}>
                                            ~{seg.estimated_depth_cm}cm ({seg.length_m}m)
                                          </span>
                                        </div>
                                        <div className="seg-desc">
                                          • {seg.drainage_issue || seg.spot_type || "Cống thoát nước quá tải khi mưa lớn"}
                                        </div>
                                        {seg.detour_advice && (
                                          <div className="seg-detour-hint">
                                            💡 {seg.detour_advice}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Danh sách các trục đường cao ráo an toàn */}
                              {resultData.action_payload.safe_corridors && (
                                <div className="safe-corridors-section">
                                  <div className="section-label">✅ Trục đường cao ráo không ngập:</div>
                                  <div className="corridor-tags">
                                    {resultData.action_payload.safe_corridors.map((c: any, i: number) => (
                                      <span key={i} className="corridor-tag">
                                        {typeof c === "string" ? c : c.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_WEATHER" && (
                            <div className="weather-preview" data-testid="weather-preview-card">
                              <div className="weather-header-row">
                                <span className="weather-temp-badge">
                                  🌡️ {resultData.action_payload.temp_str || `${resultData.action_payload.temperature}°C`}
                                </span>
                                <span className="weather-desc-pill">{resultData.action_payload.desc}</span>
                              </div>
                              <div className="weather-stats-grid">
                                <span>💧 Độ ẩm: {resultData.action_payload.humidity}</span>
                                <span>💨 Gió: {resultData.action_payload.wind}</span>
                                <span className="weather-aqi-tag">🍃 AQI: {resultData.action_payload.aqi} ({resultData.action_payload.aqi_status})</span>
                              </div>
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_TIDE_LEVEL" && (
                            <div className="tide-preview" data-testid="tide-preview-card">
                              <div className="tide-header-row">
                                <span className="tide-level-badge">
                                  🌊 {resultData.action_payload.water_level_m}m
                                </span>
                                <span className={`tide-alert-pill ${resultData.action_payload.is_flood_risk ? "risk" : "safe"}`}>
                                  {resultData.action_payload.state_label} • {resultData.action_payload.alert_label}
                                </span>
                              </div>
                              <p className="tide-station-text">📍 {resultData.action_payload.station_name}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "CHECK_PARKS_GREEN_SPACES" && (
                            <div className="parks-preview">
                              <span className="parks-badge">🌳 {resultData.action_payload.feature || "Không gian xanh đô thị"}</span>
                              <p>• Quy mô quản lý: {resultData.action_payload.total_area_ha} ha tại {resultData.action_payload.city}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "PROJECT_OVERVIEW" && (
                            <div className="overview-preview">
                              <strong>🌐 {resultData.action_payload.project_name || "GreenSpot Smart Urban WebGIS"}</strong>
                              <p>Module: {Array.isArray(resultData.action_payload.modules) ? resultData.action_payload.modules.join(" • ") : "Thời tiết, Ngập lụt, Không khí, Cây xanh, Ví điểm"}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "REPORT_FLOOD" && (
                            <div className="flood-report-preview">
                              <span className="flood-badge">⚠️ Phản ánh điểm ngập nước</span>
                              <p>Đang chuyển tiếp tới bản đồ và form tiếp nhận ngập lụt...</p>
                            </div>
                          )}

                          {resultData.detected_intent === "CURRENT_LOCATION" && (
                            <div className="location-preview" data-testid="location-preview-card">
                              <div className="location-header-row">
                                <span className="location-district-badge">
                                  📍 {resultData.action_payload.district || "Vị trí hiện tại"}
                                </span>
                                <span className={`location-safety-pill ${resultData.action_payload.is_hazard_free ? "safe" : "warning"}`}>
                                  {resultData.action_payload.is_hazard_free ? "✅ Khu vực an toàn" : "⚠️ Có điểm ngập gần"}
                                </span>
                              </div>
                              <div className="location-coords">
                                Tọa độ GPS: {resultData.action_payload.latitude?.toFixed(4)}, {resultData.action_payload.longitude?.toFixed(4)}
                              </div>
                              {resultData.action_payload.weather && (
                                <div className="location-weather-summary">
                                  <span>🌡️ {resultData.action_payload.weather.temp} ({resultData.action_payload.weather.desc})</span>
                                  <span>🍃 AQI {resultData.action_payload.weather.aqi} ({resultData.action_payload.weather.aqi_status})</span>
                                </div>
                              )}
                              {resultData.action_payload.nearby_hazard && (
                                <div className="location-hazard-alert">
                                  <strong>⚠️ Điểm trũng gần nhất ({resultData.action_payload.nearby_hazard.dist_m}m):</strong>
                                  <p>{resultData.action_payload.nearby_hazard.name} ({resultData.action_payload.nearby_hazard.street})</p>
                                  <span>Độ sâu dự kiến: ~{resultData.action_payload.nearby_hazard.estimated_depth_cm}cm</span>
                                </div>
                              )}
                              <p className="location-advice">🧭 {resultData.action_payload.safe_advice}</p>
                            </div>
                          )}

                          {resultData.detected_intent === "EMERGENCY_ASSISTANCE" && (
                            <div className="emergency-preview" data-testid="emergency-preview-card">
                              <div className="emergency-header">
                                <span className="emergency-icon">🚨</span>
                                <strong>{resultData.action_payload.title || "Cứu hộ khẩn cấp & Hotline TP.HCM"}</strong>
                              </div>
                              <div className="emergency-hotlines-grid">
                                {resultData.action_payload.emergency_hotlines?.map((hl: any, idx: number) => (
                                  <a key={idx} href={`tel:${hl.phone}`} className="hotline-btn">
                                    <span className="hl-name">{hl.name}</span>
                                    <span className="hl-phone">📞 {hl.phone}</span>
                                  </a>
                                ))}
                              </div>
                              {resultData.action_payload.flooded_vehicle_tips && (
                                <div className="emergency-tips-list">
                                  <div className="tips-title">💡 Mẹo xử lý xe chết máy do ngập nước:</div>
                                  <ul>
                                    {resultData.action_payload.flooded_vehicle_tips.map((tip: string, i: number) => (
                                      <li key={i}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {resultData.detected_intent === "GREETING" && (
                            <div className="greeting-preview" data-testid="greeting-preview-card">
                              <p className="greeting-message">👋 {resultData.action_payload.greeting}</p>
                              {resultData.action_payload.quick_prompts && (
                                <div className="quick-prompts-section">
                                  <span className="prompts-label">Gợi ý câu lệnh bạn có thể thử:</span>
                                  <div className="prompts-chips">
                                    {resultData.action_payload.quick_prompts.map((prompt: string, idx: number) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        className="prompt-chip-btn"
                                        onClick={() => handleProcessCommand(prompt, "SUGGESTION_CLICK")}
                                      >
                                        🗣️ {prompt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {resultData.detected_intent === "COURTESY" && (
                            <div className="courtesy-preview" data-testid="courtesy-preview-card">
                              <p className="courtesy-message">✨ {resultData.action_payload.message || "Cảm ơn bạn đã tin dùng GreenSpot Voice Assistant!"}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-open-target-feature"
                        onClick={handleOpenTargetFeature}
                      >
                        <span>Mở chức năng liên quan</span>
                        <span>➔</span>
                      </button>
                    </div>
                  ) : (
                    /* Khi không hiểu ý định -> Hiển thị hướng dẫn và các câu lệnh gợi ý */
                    <div className="fallback-suggestions-box">
                      <p className="fallback-hint">Bạn có thể thử các câu lệnh mẫu sau:</p>
                      <div className="fallback-buttons-list">
                        {(resultData.sample_suggestions || [
                          "Báo cáo bãi rác gần đây",
                          "Đường nào an toàn không bị ngập?",
                          "Xem số dư ví điểm",
                        ]).map((cmd, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="btn-retry-sample"
                            onClick={() => handleSuggestionClick(cmd)}
                          >
                            “{cmd}”
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NÚT "NÓI TIẾP" VÀ NÚT "ĐÓNG" DẠNG PILL RỘNG XẾP CHỒNG THEO CHIỀU DỌC (WIREFRAME 3) */}
                  <div className="result-action-footer-stacked">
                    <button
                      type="button"
                      className="btn-speak-again wide-pill-btn"
                      onClick={startListening}
                    >
                      <span className="btn-icon">🎙️</span>
                      <span>Nói tiếp</span>
                    </button>
                    <button
                      type="button"
                      className="btn-close-result wide-pill-btn"
                      onClick={handleCloseAssistant}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* KHUNG FOOTER CHUNG */}
      <footer className="voice-footer" role="contentinfo">
        <div className="voice-footer-inner">
          <p className="footer-copyright">
            Bản quyền © 2026 GreenSpot. Nền tảng Đô thị Môi trường Thông minh TP.HCM
          </p>
          <div className="footer-links">
            <button type="button" className="footer-link-btn">Liên hệ</button>
            <span className="sep">•</span>
            <button type="button" className="footer-link-btn">Chính sách</button>
            <span className="sep">•</span>
            <button type="button" className="footer-link-btn">Chính sách bảo mật</button>
            <span className="sep">•</span>
            <button type="button" className="footer-link-btn">Trợ năng (Accessibility)</button>
          </div>
        </div>
      </footer>

      {/* POPUP MÀN 4: CẢNH BÁO QUYỀN MICRO */}
      <MicPermissionModal
        isOpen={showMicPermissionModal}
        onClose={() => setShowMicPermissionModal(false)}
        onPermissionGranted={() => {
          setShowMicPermissionModal(false);
          setToastMessage("Đã cấp quyền micro thành công");
          startListening();
        }}
      />
    </div>
  );
};
