import api from "../../api/client";
import type { VoiceSampleCommand, VoiceProcessRequest, VoiceProcessResponse } from "../../types/voice_assistant";

export const DEFAULT_SUGGESTIONS: VoiceSampleCommand[] = [
  {
    command_id: "aaaaaaaa-0001-0001-0001-000000000001",
    category: "INCIDENT",
    command_text: "Báo cáo bãi rác gần đây",
    intent_code: "REPORT_INCIDENT",
    action_type: "NAVIGATION",
    action_target: "/report-incident",
    default_response: "Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn.",
    display_order: 1,
  },
  {
    command_id: "aaaaaaaa-0001-0001-0001-000000000002",
    category: "FLOOD",
    command_text: "Đường nào an toàn không bị ngập?",
    intent_code: "CHECK_SAFE_ROUTE",
    action_type: "NAVIGATION",
    action_target: "map_flood",
    default_response: "Đang hiển thị bản đồ các tuyến đường an toàn không bị ngập nước.",
    display_order: 2,
  },
  {
    command_id: "aaaaaaaa-0001-0001-0001-000000000003",
    category: "REWARD",
    command_text: "Xem số dư ví điểm",
    intent_code: "CHECK_REWARD_WALLET",
    action_type: "LOOKUP",
    action_target: "/wallet",
    default_response: "Số dư ví điểm xanh của bạn hiện có 350 điểm GreenPoints.",
    display_order: 3,
  },
  {
    command_id: "aaaaaaaa-0001-0001-0001-000000000004",
    category: "AIR_QUALITY",
    command_text: "Mở bản đồ chất lượng không khí",
    intent_code: "OPEN_AIR_QUALITY_MAP",
    action_type: "NAVIGATION",
    action_target: "dashboard_aqi",
    default_response: "Đang mở bản đồ quan trắc chất lượng không khí và chỉ số AQI.",
    display_order: 4,
  },
];

export async function fetchVoiceSuggestions(category?: string, limit = 10): Promise<VoiceSampleCommand[]> {
  try {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (limit) params.append("limit", limit.toString());
    const res = await api.get<VoiceSampleCommand[]>(`/api/v1/voice/suggestions?${params.toString()}`);
    if (res.data && res.data.length > 0) {
      return res.data;
    }
    return DEFAULT_SUGGESTIONS;
  } catch (error) {
    console.warn("fetchVoiceSuggestions fallback to default:", error);
    return DEFAULT_SUGGESTIONS;
  }
}

export async function processVoiceCommand(req: VoiceProcessRequest): Promise<VoiceProcessResponse> {
  const res = await api.post<VoiceProcessResponse>("/api/v1/voice/process", req);
  return res.data;
}
