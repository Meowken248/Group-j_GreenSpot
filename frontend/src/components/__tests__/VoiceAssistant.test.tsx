import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceAssistant } from '../VoiceAssistant/VoiceAssistant';
import * as voiceService from '../../services/voiceService';

// Mock Web Speech API and AudioContext
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

describe('VoiceAssistant Component (Hình 4.37)', () => {
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

  it('Nhấp trực tiếp vào một câu lệnh gợi ý -> Tự động nhận diện và chuyển thẳng sang Màn 3', async () => {
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

  it('Màn 4: Hiển thị Popup cảnh báo quyền micro khi người dùng từ chối cấp quyền', async () => {
    vi.spyOn(voiceService, 'fetchVoiceSuggestions').mockResolvedValue(voiceService.DEFAULT_SUGGESTIONS);

    // Mock getUserMedia bị từ chối (NotAllowedError)
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });

    render(<VoiceAssistant />);

    // Bấm nút Bắt đầu nói
    const startBtn = screen.getByRole('button', { name: /Bắt đầu nói/i });
    fireEvent.click(startBtn);

    // Kiểm tra Popup Màn 4 hiện lên với tiêu đề in đậm màu cam
    await waitFor(() => {
      expect(screen.getByText('POPUP')).toBeInTheDocument();
      expect(screen.getByText('KHÔNG TRUY CẬP ĐƯỢC MICRO')).toBeInTheDocument();
      expect(screen.getByText(/Hãy cấp quyền micro cho trình duyệt/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Đóng/i })).toBeInTheDocument();
    });

    // Bấm nút Đóng trên Popup -> Popup đóng lại
    const closeModalBtn = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeModalBtn);

    await waitFor(() => {
      expect(screen.queryByText('KHÔNG TRUY CẬP ĐƯỢC MICRO')).not.toBeInTheDocument();
    });
  });

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
  });
});
