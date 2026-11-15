import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../../api/client';
import { fetchVoiceSuggestions, processVoiceCommand, DEFAULT_SUGGESTIONS } from '../voiceService';
import type { VoiceProcessRequest, VoiceProcessResponse, VoiceSampleCommand } from '../../../types/voice_assistant';

describe('Voice Assistant Frontend Service (voiceService.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchVoiceSuggestions', () => {
    it('Lấy thành công danh sách câu lệnh mẫu theo danh mục và limit', async () => {
      const mockData: VoiceSampleCommand[] = [
        {
          command_id: 'custom-1',
          category: 'FLOOD',
          command_text: 'Đường nào an toàn không ngập?',
          intent_code: 'CHECK_SAFE_ROUTE',
          action_type: 'NAVIGATION',
          action_target: 'map_flood',
          default_response: 'Mở bản đồ',
          display_order: 1,
        },
      ];

      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockData });

      const result = await fetchVoiceSuggestions('FLOOD', 5);

      expect(getSpy).toHaveBeenCalledWith('/api/v1/voice/suggestions?category=FLOOD&limit=5');
      expect(result).toEqual(mockData);
    });

    it('Lấy thành công danh sách câu lệnh mẫu không cần category', async () => {
      const mockData: VoiceSampleCommand[] = [
        {
          command_id: 'custom-2',
          category: 'GENERAL',
          command_text: 'Dự án GreenSpot',
          intent_code: 'PROJECT_OVERVIEW',
          action_type: 'LOOKUP',
          default_response: 'Tổng quan GreenSpot',
          display_order: 1,
        },
      ];

      const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: mockData });

      const result = await fetchVoiceSuggestions(undefined, 10);

      expect(getSpy).toHaveBeenCalledWith('/api/v1/voice/suggestions?limit=10');
      expect(result).toEqual(mockData);
    });

    it('Khi backend trả về danh sách rỗng -> tự động fallback về DEFAULT_SUGGESTIONS', async () => {
      vi.spyOn(api, 'get').mockResolvedValue({ data: [] });

      const result = await fetchVoiceSuggestions();

      expect(result).toEqual(DEFAULT_SUGGESTIONS);
      expect(result.length).toBe(4);
    });

    it('Khi kết nối API thất bại (Network Error/500) -> ghi warn và fallback về DEFAULT_SUGGESTIONS', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(api, 'get').mockRejectedValue(new Error('Connection refused'));

      const result = await fetchVoiceSuggestions('INCIDENT', 3);

      expect(result).toEqual(DEFAULT_SUGGESTIONS);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('processVoiceCommand', () => {
    it('Gửi payload câu lệnh thành công và nhận phản hồi từ Backend AI NLU', async () => {
      const req: VoiceProcessRequest = {
        transcript: 'báo cáo bãi rác ngã tư lê lợi',
        session_source: 'VOICE',
        current_lat: 10.7765,
        current_lng: 106.7009,
      };

      const mockResponse: VoiceProcessResponse = {
        log_id: 'sample-log-id',
        raw_transcript: 'báo cáo bãi rác ngã tư lê lợi',
        normalized_text: 'Báo cáo bãi rác ngã tư Lê Lợi.',
        detected_intent: 'REPORT_INCIDENT',
        confidence_score: 0.95,
        action_type: 'NAVIGATION',
        action_target: '/report-incident',
        action_payload: { incident_type: 'WASTE', location_text: 'ngã tư Lê Lợi' },
        response_text: 'Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.',
        is_success: true,
        processing_time_ms: 12,
      };

      const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: mockResponse });

      const result = await processVoiceCommand(req);

      expect(postSpy).toHaveBeenCalledWith('/api/v1/voice/process', req);
      expect(result).toEqual(mockResponse);
      expect(result.detected_intent).toBe('REPORT_INCIDENT');
      expect(result.is_success).toBe(true);
    });
  });
});
