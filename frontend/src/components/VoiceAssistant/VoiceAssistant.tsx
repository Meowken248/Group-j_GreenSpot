import React, { useState, useEffect, useRef, useCallback } from "react";
import { MicPermissionModal } from "./MicPermissionModal";
import { VoiceWaveform } from "./VoiceWaveform";
import * as voiceService from "../../services/voiceService";
import type {
  VoiceAssistantScreen,
  VoiceProcessResponse,
  VoiceSampleCommand,
} from "../../types/voice";
import "./VoiceAssistant.css";

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
      } catch {}
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

  // Điều hướng hoặc Đóng từ Màn 3
  const handleCloseAssistant = () => {
    stopRecordingCleanup();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (resultData?.action_target && onNavigateToFeature) {
      onNavigateToFeature(resultData.action_target, resultData.action_payload);
    }
    if (onClose) {
      onClose();
    } else {
      setCurrentScreen("HOME");
    }
  };

  return (
    <div className="voice-assistant-fullscreen" data-testid="voice-assistant-container">
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
        {/* MÀN 1: TRUNG TÂM ĐIỀU KHIỂN TRỢ LÝ GIỌNG NÓI */}
        {/* ======================================================== */}
        {currentScreen === "HOME" && (
          <div className="voice-screen voice-home-screen" data-testid="voice-home-screen">
            <div className="voice-home-header-badge">
              <span className="pulse-dot" />
              <span>TRỢ LÝ GIỌNG NÓI RẢNH TAY</span>
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

            {/* NÚT MICRO LỚN VỚI HIỆU ỨNG NHỊP THỞ (PULSE ANIMATION) */}
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
            </div>

            {/* NÚT BẮT ĐẦU NÓI */}
            <div className="voice-start-btn-container">
              <button
                type="button"
                className="btn-start-speaking"
                onClick={startListening}
                disabled={browserUnsupported}
              >
                <span className="btn-icon">🎤</span>
                <span>Bắt đầu nói</span>
              </button>
            </div>

            {/* GỢI Ý CÂU LỆNH MẪU THỰC TẾ */}
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
          </div>
        )}

        {/* ======================================================== */}
        {/* MÀN 2: TRẠNG THÁI THU ÂM VÀ NHẬN DẠNG THỜI GIAN THỰC */}
        {/* ======================================================== */}
        {currentScreen === "LISTENING" && (
          <div className="voice-screen voice-listening-screen" data-testid="voice-listening-screen">
            <div className="listening-status-header">
              <span className="listening-pulse-dot" />
              <h2 className="listening-title">ĐANG NGHE...</h2>
            </div>

            <p className="listening-instruction">
              Hãy phát âm rõ ràng yêu cầu của bạn, hệ thống sẽ tự động xử lý khi bạn dừng nói.
            </p>

            {/* SÓNG ÂM (WAVEFORM ANIMATION MÀU XANH LÁ) */}
            <VoiceWaveform
              stream={activeMediaStream}
              isListening={currentScreen === "LISTENING"}
            />

            {/* VĂN BẢN NHẬN DẠNG THEO THỜI GIAN THỰC (< 200MS) */}
            <div className="realtime-transcript-card" aria-live="polite">
              <span className="transcript-label">Văn bản nhận dạng thời gian thực:</span>
              <p className="transcript-text">
                {realtimeTranscript || "Đang nhận diện giọng nói của bạn..."}
              </p>
            </div>

            {/* CẢNH BÁO MÔI TRƯỜNG QUÁ NHIỀU TẠP ÂM (NẾU CÓ) */}
            {noiseWarning && (
              <div className="voice-noise-warning-badge" role="alert">
                <span>⚠️ {noiseWarning}</span>
              </div>
            )}

            {/* DÒNG TRẠNG THÁI ĐANG XỬ LÝ (KHI DỪNG NÓI HOẶC BẤM DỪNG) */}
            {isProcessing && (
              <div className="processing-indicator" role="status">
                <span className="spinner" />
                <span>{processingStatusText || "Đang xử lý câu lệnh…"}</span>
              </div>
            )}

            {/* NÚT "DỪNG" CHỦ ĐỘNG KẾT THÚC CÂU NÓI */}
            <div className="listening-actions">
              <button
                type="button"
                className="btn-stop-listening"
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
        {/* MÀN 3: PHẢN HỒI VÀ THỰC THI HÀNH ĐỘNG THEO Ý ĐỊNH */}
        {/* ======================================================== */}
        {currentScreen === "RESULT" && resultData && (
          <div className="voice-screen voice-result-screen" data-testid="voice-result-screen">
            <div className="result-container-split">
              {/* KHỐI CỘT TRÁI: "LỆNH CỦA BẠN" */}
              <div className="result-column-left">
                <div className="column-card user-command-card">
                  <div className="column-header">
                    <span className="column-icon">🗣️</span>
                    <h3>LỆNH CỦA BẠN</h3>
                  </div>
                  <div className="normalized-command-box">
                    <p className="normalized-text">
                      "{resultData.normalized_text}"
                    </p>
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

              {/* KHỐI CỘT PHẢI: "PHẢN HỒI" */}
              <div className="result-column-right">
                <div className="column-card assistant-response-card">
                  <div className="column-header">
                    <div className="header-title-tts">
                      <span className="column-icon">🤖</span>
                      <h3>PHẢN HỒI TỪ TRỢ LÝ</h3>
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

                  {/* Câu trả lời văn bản */}
                  <div className="assistant-message-bubble">
                    <p>{resultData.response_text}</p>
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
                            <div className="safe-route-preview">
                              <p>✅ {resultData.action_payload.destination}</p>
                              <p>• Tránh được: {resultData.action_payload.hazard_avoided} điểm ngập</p>
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
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-open-target-feature"
                        onClick={handleCloseAssistant}
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

                  {/* NÚT "NÓI TIẾP" VÀ NÚT "ĐÓNG" */}
                  <div className="result-action-footer">
                    <button
                      type="button"
                      className="btn-speak-again"
                      onClick={startListening}
                    >
                      <span className="btn-icon">🎙️</span>
                      <span>Nói tiếp</span>
                    </button>
                    <button
                      type="button"
                      className="btn-close-result"
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
            © 2026 GreenSpot. Nền tảng Đô thị Môi trường Thông minh TP.HCM
          </p>
          <div className="footer-links">
            <button type="button" className="footer-link-btn">Liên hệ</button>
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
