import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceAssistant } from '../VoiceAssistant';
import * as voiceService from '../../../services/voice_assistant';

// Setup Mock Web Speech API và AudioContext toàn cục
beforeEach(() => {
  vi.restoreAllMocks();

  const mockSpeechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
  };

  class MockSpeechSynthesisUtterance {
    text: string;
    lang = 'vi-VN';
    rate = 1;
    pitch = 1;
    onstart: any = null;
    onend: any = null;
    onerror: any = null;
    constructor(text: string) {
      this.text = text;
    }
  }

  window.speechSynthesis = mockSpeechSynthesis as any;
  (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  globalThis.speechSynthesis = mockSpeechSynthesis as any;
  (globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

  (globalThis as any).AudioContext = class {
    createAnalyser() {
      return {
        fftSize: 64,
        frequencyBinCount: 32,
        getByteFrequencyData: vi.fn(),
      };
    }
    createMediaStreamSource() {
      return { connect: vi.fn(), disconnect: vi.fn() };
    }
    close() {
      return Promise.resolve();
    }
  };

  const mockTrack = { stop: vi.fn() };
  const mockStream = { getTracks: () => [mockTrack] };
  const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('VoiceAssistant Component - 100% Flow & Branch Coverage (Hình 4.37)', () => {
  // -------------------------------------------------------------
  // MÀN 1: TRUNG TÂM ĐIỀU KHIỂN & GỢI Ý
  // -------------------------------------------------------------
  it('Màn 1: Hiển thị giao diện trung tâm điều khiển, nút Micro lớn và gợi ý câu lệnh mẫu', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);

    render(<VoiceAssistant />);

    // Kiểm tra Header
    expect(screen.getByText('GreenSpot')).toBeInTheDocument();
    expect(screen.getByText('Voice AI')).toBeInTheDocument();

    // Kiểm tra Badge & Tiêu đề Màn 1 theo Wireframe 1
    expect(screen.getByText('TRỢ LÝ GIỌNG NÓI')).toBeInTheDocument();
    expect(screen.getByText(/TRỢ LÝ GIỌNG NÓI RẢNH TAY/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn cần hỗ trợ điều gì hôm nay\?/i)).toBeInTheDocument();

    // Kiểm tra Nút micro lớn & Nút bắt đầu nói dạng wide-pill-btn
    expect(screen.getByLabelText(/Kích hoạt nhận dạng giọng nói/i)).toBeInTheDocument();
    expect(screen.getByText('Nút micro lớn')).toBeInTheDocument();
    const startBtn = screen.getByRole('button', { name: /Bắt đầu nói/i });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toHaveClass('wide-pill-btn');

    // Kiểm tra danh sách câu lệnh mẫu gợi ý
    await waitFor(() => {
      expect(screen.getByText(/Báo cáo bãi rác gần đây/i)).toBeInTheDocument();
      expect(screen.getByText(/Đường nào an toàn không bị ngập\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Xem số dư ví điểm/i)).toBeInTheDocument();
      expect(screen.getByText(/Mở bản đồ chất lượng không khí/i)).toBeInTheDocument();
    });

    // Kiểm tra Footer
    expect(screen.getByText(/© 2026 GreenSpot/i)).toBeInTheDocument();
    expect(screen.getByText(/Chính sách bảo mật/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------
  // MÀN 1: NHẤP GỢI Ý -> XỬ LÝ TRỰC TIẾP
  // -------------------------------------------------------------
  it('Màn 1: Nhấp trực tiếp vào một câu lệnh gợi ý -> Tự động nhận diện và chuyển thẳng sang Màn 3', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    const processSpy = vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: '12345678-1234-1234-1234-123456789012',
      raw_transcript: 'Báo cáo bãi rác gần đây',
      normalized_text: 'Báo cáo bãi rác gần đây.',
      detected_intent: 'REPORT_INCIDENT',
      confidence_score: 1.0,
      action_type: 'NAVIGATION',
      action_target: '/report-incident',
      action_payload: {
        incident_type: 'WASTE',
        title: 'Phản ánh bãi rác tự phát',
        location_text: 'Vị trí hiện tại của bạn',
      },
      response_text: 'Trợ lý: Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.',
      is_success: true,
      processing_time_ms: 15,
    });

    render(<VoiceAssistant />);

    // Chờ tải gợi ý và nhấp vào câu lệnh
    const suggestionBtn = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(suggestionBtn);

    // Kiểm tra API được gọi với nguồn SUGGESTION_CLICK
    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: 'Báo cáo bãi rác gần đây',
          session_source: 'SUGGESTION_CLICK',
        })
      );
    });

    // Kiểm tra Màn 3 được hiển thị với 2 khối theo chiều ngang
    await waitFor(() => {
      // Khối Cột trái "LỆNH CỦA BẠN" (Wireframe 3)
      expect(screen.getByText(/LỆNH CỦA BẠN/i)).toBeInTheDocument();
      expect(screen.getByText(/Văn bản nhận dạng:/i)).toBeInTheDocument();
      expect(screen.getByText(/"Báo cáo bãi rác gần đây\."/i)).toBeInTheDocument();

      // Khối Cột phải "PHẢN HỒI" (Wireframe 3)
      expect(screen.getByText(/PHẢN HỒI TỪ TRỢ LÝ/i)).toBeInTheDocument();
      expect(screen.getByText(/Câu trả lời \/ hành động đã thực hiện:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Trợ lý: Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn\./i)
      ).toBeInTheDocument();

      // Nút Nói tiếp và Đóng dạng wide-pill-btn xếp chồng theo chiều dọc
      const nextBtn = screen.getByRole('button', { name: /Nói tiếp/i });
      const closeBtn = screen.getByRole('button', { name: /^Đóng$/i });
      expect(nextBtn).toHaveClass('wide-pill-btn');
      expect(closeBtn).toHaveClass('wide-pill-btn');
    });
  });

  // -------------------------------------------------------------
  // MÀN 2: THU ÂM REAL-TIME & SÓNG ÂM
  // -------------------------------------------------------------
  it('Màn 2: Cấp quyền thành công -> Chuyển sang Màn 2 (Đang nghe), có sóng âm và nút Dừng', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);

    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: () => [mockTrack],
    };
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });

    render(<VoiceAssistant />);

    // Bấm bắt đầu nói
    const startBtn = screen.getByRole('button', { name: /Bắt đầu nói/i });
    fireEvent.click(startBtn);

    // Kiểm tra Màn 2 hiển thị theo Wireframe 2
    await waitFor(() => {
      expect(screen.getByText('ĐANG NGHE...')).toBeInTheDocument();
      expect(screen.getByText('Sóng âm')).toBeInTheDocument();
      expect(screen.getByText(/Văn bản nhận dạng theo thời gian thực:/i)).toBeInTheDocument();
      expect(screen.getByTestId('voice-waveform')).toBeInTheDocument();
      const stopBtn = screen.getByRole('button', { name: /Dừng & Xử lý ngay/i });
      expect(stopBtn).toBeInTheDocument();
      expect(stopBtn).toHaveClass('wide-pill-btn');
    });

    // Bấm nút Dừng để kết thúc thu âm
    const stopBtn = screen.getByRole('button', { name: /Dừng & Xử lý ngay/i });
    fireEvent.click(stopBtn);
  });

  // -------------------------------------------------------------
  // MÀN 3: ĐIỀU HƯỚNG TỚI TÍNH NĂNG VÀ PHÁT LẠI ÂM THANH TTS
  // -------------------------------------------------------------
  it('Màn 3: Bấm nút "Mở chức năng liên quan" kích hoạt callback onNavigateToFeature', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'sample-uuid-1',
      raw_transcript: 'Đường nào an toàn không bị ngập?',
      normalized_text: 'Đường nào an toàn không bị ngập?',
      detected_intent: 'CHECK_SAFE_ROUTE',
      confidence_score: 1.0,
      action_type: 'NAVIGATION',
      action_target: 'map_flood',
      action_payload: {
        destination: 'Lộ trình an toàn',
        hazard_avoided: 3,
      },
      response_text: 'Đang hiển thị bản đồ tuyến đường an toàn.',
      is_success: true,
      processing_time_ms: 10,
    });

    const mockNavigate = vi.fn();
    const mockClose = vi.fn();

    render(<VoiceAssistant onNavigateToFeature={mockNavigate} onClose={mockClose} />);

    // Click gợi ý để vào Màn 3
    const chip = await screen.findByText(/Đường nào an toàn không bị ngập\?/i);
    fireEvent.click(chip);

    // Chờ Màn 3 hiển thị nút mở chức năng
    const openFeatureBtn = await screen.findByRole('button', { name: /Mở chức năng liên quan/i });
    fireEvent.click(openFeatureBtn);

    // Kiểm tra onNavigateToFeature và onClose được gọi
    expect(mockNavigate).toHaveBeenCalledWith('map_flood', expect.objectContaining({ hazard_avoided: 3 }));
    expect(mockClose).toHaveBeenCalled();
  });

  it('Màn 3: Bấm nút "Nghe lại" kích hoạt TTS phát lại qua loa', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'sample-uuid-2',
      raw_transcript: 'Xem số dư ví điểm',
      normalized_text: 'Xem số dư ví điểm.',
      detected_intent: 'CHECK_REWARD_WALLET',
      confidence_score: 1.0,
      action_type: 'LOOKUP',
      action_target: '/wallet',
      action_payload: { balance: 350, currency: 'GreenPoints' },
      response_text: 'Số dư ví điểm xanh là 350 điểm.',
      is_success: true,
      processing_time_ms: 10,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Xem số dư ví điểm/i);
    fireEvent.click(chip);

    // Tìm nút Nghe lại và click
    const replayBtn = await screen.findByTitle('Phát lại bằng giọng nói');
    fireEvent.click(replayBtn);

    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('Màn 3: Hiển thị Thẻ thông tin thời tiết thời gian thực (CHECK_WEATHER) tại Thủ Đức - Grounded Data', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'weather-uuid-1',
      raw_transcript: 'Thời tiết hôm nay tại Thủ Đức.',
      normalized_text: 'Thời tiết hôm nay tại Thủ Đức.',
      detected_intent: 'CHECK_WEATHER',
      confidence_score: 0.95,
      action_type: 'LOOKUP',
      action_target: 'dashboard_aqi',
      action_payload: {
        location: 'Thủ Đức',
        temperature: 31.5,
        temp_str: '31.5°C',
        desc: 'Nắng râm nhiệt đới',
        humidity: '68%',
        wind: '12.5 km/h',
        aqi: 45,
        aqi_status: 'Tốt',
      },
      response_text: 'Trợ lý: Thời tiết tại Thủ Đức hiện tại 31.5°C, Nắng râm nhiệt đới, độ ẩm 68%, sức gió 12.5 km/h.',
      is_success: true,
      processing_time_ms: 18,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Xem số dư ví điểm/i);
    fireEvent.click(chip);

    // Kiểm tra render Thẻ thời tiết thời gian thực
    await waitFor(() => {
      const card = screen.getByTestId('weather-preview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('31.5°C');
      expect(card).toHaveTextContent('Nắng râm nhiệt đới');
      expect(card).toHaveTextContent('68%');
      expect(card).toHaveTextContent('12.5 km/h');
      expect(card).toHaveTextContent('45');
      expect(card).toHaveTextContent('Tốt');
    });
  });

  it('Màn 3: Hiển thị Thẻ thông tin triều cường thực tế trạm Phú An (CHECK_TIDE_LEVEL)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'tide-uuid-1',
      raw_transcript: 'Mực nước triều cường',
      normalized_text: 'Mực nước triều cường.',
      detected_intent: 'CHECK_TIDE_LEVEL',
      confidence_score: 0.95,
      action_type: 'LOOKUP',
      action_target: 'map_flood',
      action_payload: {
        station_name: 'Trạm Thủy văn Phú An',
        water_level_m: 1.48,
        state_label: 'Triều đang lên',
        alert_label: 'Báo động 1',
        is_flood_risk: false,
      },
      response_text: 'Trợ lý: Mực nước trạm thủy văn Phú An hiện là 1.48m, Triều đang lên ở mức Báo động 1.',
      is_success: true,
      processing_time_ms: 12,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Xem số dư ví điểm/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = screen.getByTestId('tide-preview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('1.48m');
      expect(card).toHaveTextContent('Triều đang lên');
      expect(card).toHaveTextContent('Báo động 1');
      expect(card).toHaveTextContent('Trạm Thủy văn Phú An');
    });
  });

  // -------------------------------------------------------------
  // MÀN 3: KỊCH BẢN KHÔNG HIỂU Ý ĐỊNH (FALLBACK)
  // -------------------------------------------------------------
  it('Màn 3 Fallback: Hiển thị thông báo khi không hiểu lệnh và cho phép nhấp câu lệnh mẫu', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    const processSpy = vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'sample-uuid-fallback',
      raw_transcript: 'câu lệnh lạ không hiểu',
      normalized_text: 'Câu lệnh lạ không hiểu.',
      detected_intent: null,
      confidence_score: 0.0,
      action_type: 'UNKNOWN',
      action_target: null,
      response_text: 'Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử lại các câu gợi ý',
      is_success: false,
      sample_suggestions: ['Báo cáo bãi rác gần đây', 'Xem số dư ví điểm'],
      processing_time_ms: 10,
    });

    render(<VoiceAssistant />);

    // Click chip đầu tiên để trigger processVoiceCommand
    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    // Kiểm tra Màn 3 hiển thị hộp gợi ý Fallback
    await waitFor(() => {
      expect(screen.getByText(/Bạn có thể thử các câu lệnh mẫu sau:/i)).toBeInTheDocument();
      expect(screen.getByText(/“Báo cáo bãi rác gần đây”/i)).toBeInTheDocument();
    });

    // Nhấp vào nút gợi ý trong danh sách fallback
    const retrySampleBtn = screen.getByText(/“Xem số dư ví điểm”/i);
    fireEvent.click(retrySampleBtn);

    // Kiểm tra API được gọi lại với câu lệnh gợi ý
    await waitFor(() => {
      expect(processSpy).toHaveBeenCalledWith(
        expect.objectContaining({ transcript: 'Xem số dư ví điểm' })
      );
    });
  });

  // -------------------------------------------------------------
  // MÀN 4: POPUP CẢNH BÁO QUYỀN MICRO, NÚT THỬ LẠI & PHÍM ESC
  // -------------------------------------------------------------
  it('Màn 4: Hiển thị Popup khi từ chối quyền, hỗ trợ phím Escape và nút Thử lại', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);

    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });

    render(<VoiceAssistant />);

    // Bấm bắt đầu nói -> Gây lỗi quyền -> Hiện Popup
    const startBtn = screen.getByRole('button', { name: /Bắt đầu nói/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText('KHÔNG TRUY CẬP ĐƯỢC MICRO')).toBeInTheDocument();
      expect(screen.getByText(/greenspot\.gov\.vn/i)).toBeInTheDocument();
    });

    // Bấm nút Thử lại
    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    fireEvent.click(retryBtn);
    expect(mockGetUserMedia).toHaveBeenCalled();

    // Nhấn phím Escape -> Đóng Popup Màn 4
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('KHÔNG TRUY CẬP ĐƯỢC MICRO')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // MÀN 3: NÚT "NÓI TIẾP" & NÚT "ĐÓNG"
  // -------------------------------------------------------------
  it('Màn 3: Bấm nút "Nói tiếp" kích hoạt quay lại Màn 2 (LISTENING)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'sample-log-next',
      raw_transcript: 'Xem số dư ví điểm',
      normalized_text: 'Xem số dư ví điểm.',
      detected_intent: 'CHECK_REWARD_WALLET',
      confidence_score: 1.0,
      action_type: 'LOOKUP',
      action_target: '/wallet',
      action_payload: { balance: 350, currency: 'GreenPoints' },
      response_text: 'Số dư ví điểm là 350.',
      is_success: true,
      processing_time_ms: 10,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Xem số dư ví điểm/i);
    fireEvent.click(chip);

    // Chờ Màn 3 hiển thị nút "Nói tiếp"
    const nextBtn = await screen.findByRole('button', { name: /Nói tiếp/i });
    fireEvent.click(nextBtn);

    // Màn 2 (ĐANG NGHE...) được kích hoạt
    await waitFor(() => {
      expect(screen.getByText('ĐANG NGHE...')).toBeInTheDocument();
    });
  });

  it('Màn 3: Bấm nút "Đóng" gọi callback onClose và quay về Màn 1 (HOME)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'sample-log-close',
      raw_transcript: 'Xem số dư ví điểm',
      normalized_text: 'Xem số dư ví điểm.',
      detected_intent: 'CHECK_REWARD_WALLET',
      confidence_score: 1.0,
      action_type: 'LOOKUP',
      action_target: '/wallet',
      action_payload: { balance: 350, currency: 'GreenPoints' },
      response_text: 'Số dư ví điểm là 350.',
      is_success: true,
      processing_time_ms: 10,
    });

    const mockClose = vi.fn();
    render(<VoiceAssistant onClose={mockClose} />);

    const chip = await screen.findByText(/Xem số dư ví điểm/i);
    fireEvent.click(chip);

    const closeBtn = await screen.findByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);

    // Kiểm tra màn hình đã reset về HOME (có nút Bắt đầu nói)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Bắt đầu nói/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // MÀN 3: ACTION CARDS MẢNG XANH, TỔNG QUAN & AQI
  // -------------------------------------------------------------
  it('Màn 3: Hiển thị Thẻ Action Card cho mảng xanh đô thị (CHECK_PARKS_GREEN_SPACES)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'parks-uuid-1',
      raw_transcript: 'Công viên cây xanh',
      normalized_text: 'Công viên cây xanh.',
      detected_intent: 'CHECK_PARKS_GREEN_SPACES',
      confidence_score: 0.95,
      action_type: 'NAVIGATION',
      action_target: 'map',
      action_payload: {
        feature: 'Không gian xanh đô thị',
        total_area_ha: 450,
        city: 'TP. Hồ Chí Minh',
      },
      response_text: 'Trợ lý: Hệ thống đang quản lý hơn 450 ha mảng xanh.',
      is_success: true,
      processing_time_ms: 12,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = document.querySelector('.parks-preview');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Không gian xanh đô thị');
      expect(card).toHaveTextContent('450 ha');
    });
  });

  it('Màn 3: Hiển thị Thẻ Action Card cho tổng quan dự án (PROJECT_OVERVIEW)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'overview-uuid-1',
      raw_transcript: 'Dự án GreenSpot',
      normalized_text: 'Dự án GreenSpot.',
      detected_intent: 'PROJECT_OVERVIEW',
      confidence_score: 0.95,
      action_type: 'LOOKUP',
      action_target: null as any,
      action_payload: {
        project_name: 'GreenSpot Smart Urban WebGIS',
        modules: ['Bản đồ ô nhiễm', 'Tra cứu thời tiết', 'Cảnh báo triều cường'],
      },
      response_text: 'Trợ lý: GreenSpot hỗ trợ theo dõi môi trường thông minh.',
      is_success: true,
      processing_time_ms: 14,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByText(/GreenSpot Smart Urban WebGIS/i)).toBeInTheDocument();
      expect(screen.getByText(/Bản đồ ô nhiễm/i)).toBeInTheDocument();
    });
  });

  it('Màn 3: Hiển thị Thẻ Action Card cho quan trắc AQI (CHECK_CURRENT_AQI)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'aqi-uuid-1',
      raw_transcript: 'Chất lượng không khí Quận 1',
      normalized_text: 'Chất lượng không khí Quận 1.',
      detected_intent: 'CHECK_CURRENT_AQI',
      confidence_score: 0.95,
      action_type: 'LOOKUP',
      action_target: 'dashboard_aqi',
      action_payload: {
        aqi: 42,
        category: 'Tốt',
        station_name: 'Trạm quan trắc Bến Nghé (Quận 1)',
      },
      response_text: 'Chất lượng không khí Quận 1 ở mức Tốt.',
      is_success: true,
      processing_time_ms: 10,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByText(/AQI 42 - Tốt/i)).toBeInTheDocument();
      expect(screen.getByText(/Trạm quan trắc Bến Nghé/i)).toBeInTheDocument();
    });
  });

  it('Màn 3: Hiển thị Thẻ Action Card cho Vị trí hiện tại (CURRENT_LOCATION)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'loc-uuid-1',
      raw_transcript: 'Tôi đang ở đâu',
      normalized_text: 'Tôi đang ở đâu.',
      detected_intent: 'CURRENT_LOCATION',
      confidence_score: 0.95,
      action_type: 'LOOKUP',
      action_target: 'map',
      action_payload: {
        latitude: 10.7765,
        longitude: 106.7009,
        district: 'Quận 1',
        weather: {
          temp: '31°C',
          desc: 'Nắng ấm',
          aqi: 45,
          aqi_status: 'Tốt',
        },
        nearby_hazard: null,
        is_hazard_free: true,
        safe_advice: 'Lưu thông bình thường trên các trục lộ chính.',
      },
      response_text: 'Trợ lý: Bạn hiện đang ở khu vực Quận 1. Khu vực xung quanh khô ráo.',
      is_success: true,
      processing_time_ms: 12,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = screen.getByTestId('location-preview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Quận 1');
      expect(card).toHaveTextContent('Khu vực an toàn');
      expect(card).toHaveTextContent('10.7765, 106.7009');
      expect(card).toHaveTextContent('Lưu thông bình thường');
    });
  });

  it('Màn 3: Hiển thị Thẻ Cứu hộ khẩn cấp & Hotline (EMERGENCY_ASSISTANCE)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'emer-uuid-1',
      raw_transcript: 'Xe chết máy do ngập cứu hộ',
      normalized_text: 'Xe chết máy do ngập cứu hộ.',
      detected_intent: 'EMERGENCY_ASSISTANCE',
      confidence_score: 0.98,
      action_type: 'LOOKUP',
      action_target: 'map_flood',
      action_payload: {
        title: 'Danh bạ cứu hộ khẩn cấp & Xử lý xe ngập nước TP.HCM',
        emergency_hotlines: [
          { name: 'Tổng đài 1022 TP.HCM', phone: '1022', type: 'GOVERNMENT' },
          { name: 'Cảnh sát Cứu nạn Cứu hộ', phone: '114', type: 'EMERGENCY' },
        ],
        flooded_vehicle_tips: [
          'Tuyệt đối KHÔNG cố gắng đề nổ máy lại nhằm tránh hiện tượng thủy kích.',
          'Dắt xe lên vỉa hè cao ráo.',
        ],
      },
      response_text: 'Trợ lý: Khi xe bị ngập nước tuyệt đối không đề máy lại.',
      is_success: true,
      processing_time_ms: 11,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = screen.getByTestId('emergency-preview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('Danh bạ cứu hộ khẩn cấp');
      expect(card).toHaveTextContent('Tổng đài 1022 TP.HCM');
      expect(card).toHaveTextContent('thủy kích');
    });
  });

  it('Màn 3: Hiển thị Thẻ Chào hỏi & Gợi ý câu lệnh nhanh (GREETING)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'greet-uuid-1',
      raw_transcript: 'Xin chào',
      normalized_text: 'Xin chào.',
      detected_intent: 'GREETING',
      confidence_score: 0.98,
      action_type: 'LOOKUP',
      action_target: 'map',
      action_payload: {
        greeting: 'Xin chào! GreenSpot sẵn sàng đồng hành cùng bạn.',
        quick_prompts: ['Đường nào đang bị ngập?', 'Thời tiết hôm nay thế nào?'],
      },
      response_text: 'Trợ lý: Xin chào bạn! Tôi là Trợ lý Ảo GreenSpot.',
      is_success: true,
      processing_time_ms: 8,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = screen.getByTestId('greeting-preview-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('GreenSpot sẵn sàng đồng hành');
      expect(card).toHaveTextContent('Đường nào đang bị ngập?');
    });
  });

  it('Màn 3: Hiển thị Thẻ Tuyến đường an toàn ngoài điểm đen (CHECK_SAFE_ROUTE)', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);
    vi.spyOn(voiceService, 'processVoiceCommand').mockResolvedValue({
      log_id: 'safe-uuid-1',
      raw_transcript: 'Đường Lê Lợi có ngập không',
      normalized_text: 'Đường Lê Lợi có ngập không.',
      detected_intent: 'CHECK_SAFE_ROUTE',
      confidence_score: 0.95,
      action_type: 'NAVIGATION',
      action_target: 'map_flood',
      action_payload: {
        destination: 'Tuyến đường an toàn đường Lê Lợi',
        matched_street: 'đường Lê Lợi',
        is_safe: true,
        hazard_avoided: 0,
        condition: 'Khô ráo, an toàn, nằm ngoài điểm đen ngập úng',
        realistic_nature: 'Tuyến đường Lê Lợi không thuộc danh sách các điểm trũng úng cục bộ.',
        safe_corridors: [{ name: 'đường Lê Lợi', status: 'Lưu thông an toàn' }],
      },
      response_text: 'Trợ lý: Tuyến đường Lê Lợi nằm ngoài 30 điểm đen ngập úng của TP.HCM.',
      is_success: true,
      processing_time_ms: 10,
    });

    render(<VoiceAssistant />);

    const chip = await screen.findByText(/Báo cáo bãi rác gần đây/i);
    fireEvent.click(chip);

    await waitFor(() => {
      const card = screen.getByTestId('safe-street-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent('đường Lê Lợi');
      expect(card).toHaveTextContent('Khô ráo & An toàn');
    });
  });
});
