import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceWaveform } from '../VoiceWaveform';

describe('VoiceWaveform Component (Canvas Audio Visualizer)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Render khi isListening=false -> hiển thị container và canvas mặc định', () => {
    render(<VoiceWaveform isListening={false} stream={null} />);

    const container = screen.getByTestId('voice-waveform');
    expect(container).toBeInTheDocument();
  });

  it('Render khi isListening=true không có stream -> hiển thị container an toàn không lỗi', () => {
    render(<VoiceWaveform isListening={true} stream={null} />);

    const container = screen.getByTestId('voice-waveform');
    expect(container).toBeInTheDocument();
  });

  it('Render khi isListening=true có stream -> khởi tạo AudioContext và dọn dẹp khi unmount', () => {
    const mockDisconnect = vi.fn();
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockConnect = vi.fn();

    class MockAudioContext {
      state = 'running';
      createAnalyser() {
        return {
          fftSize: 64,
          frequencyBinCount: 32,
          getByteFrequencyData: vi.fn(),
        };
      }
      createMediaStreamSource() {
        return {
          connect: mockConnect,
          disconnect: mockDisconnect,
        };
      }
      close() {
        return mockClose();
      }
    }

    (window as any).AudioContext = MockAudioContext;
    const mockStream = {} as MediaStream;

    const { unmount } = render(<VoiceWaveform isListening={true} stream={mockStream} />);

    expect(mockConnect).toHaveBeenCalled();

    // Dọn dẹp khi unmount
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });
});
