import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceAssistant } from '../VoiceAssistant/VoiceAssistant';
import * as voiceService from '../../services/voiceService';

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

    // Kiểm tra Badge & Tiêu đề Màn 1
    expect(screen.getByText(/TRỢ LÝ GIỌNG NÓI RẢNH TAY/i)).toBeInTheDocument();
    expect(screen.getByText(/Bạn cần hỗ trợ điều gì hôm nay\?/i)).toBeInTheDocument();

    // Kiểm tra Nút micro lớn & Nút bắt đầu nói
    expect(screen.getByLabelText(/Kích hoạt nhận dạng giọng nói/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bắt đầu nói/i })).toBeInTheDocument();

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
      // Khối Cột trái "LỆNH CỦA BẠN"
      expect(screen.getByText(/LỆNH CỦA BẠN/i)).toBeInTheDocument();
      expect(screen.getByText(/"Báo cáo bãi rác gần đây\."/i)).toBeInTheDocument();

      // Khối Cột phải "PHẢN HỒI"
      expect(screen.getByText(/PHẢN HỒI TỪ TRỢ LÝ/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Trợ lý: Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn\./i)
      ).toBeInTheDocument();

      // Nút Nói tiếp và Đóng
      expect(screen.getByRole('button', { name: /Nói tiếp/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đóng/i })).toBeInTheDocument();
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

    // Kiểm tra Màn 2 hiển thị
    await waitFor(() => {
      expect(screen.getByText('ĐANG NGHE...')).toBeInTheDocument();
      expect(screen.getByTestId('voice-waveform')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Dừng & Xử lý ngay/i })).toBeInTheDocument();
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
});
