/**
 * Axios API Service cho STT 45: Hệ thống Cảnh báo Khẩn cấp theo Vị trí & Safety Check
 * Kết nối trực tiếp với backend router /api/v1/emergency-alerts
 */

import api from "../../../api/client";
import type {
  AlertEstimateRequest,
  AlertEstimateResponse,
  BroadcastAlertRequest,
  BroadcastAlertResponse,
  BroadcastHistoryItem,
  CancelAlertRequest,
  UserActiveAlertResponse,
  EmergencySOSRequest,
  EmergencySOSResponse,
  SafetyCheckInitResponse,
  MarkSafeSelfRequest,
  MarkSafeSelfResponse,
  SendSafetyCheckToFriendsRequest,
  SendSafetyCheckToFriendsResponse,
} from "../types/emergency_alert.types";

const BASE_URL = "/api/v1/emergency-alerts";

export const emergencyAlertApi = {
  /**
   * Màn 1/4: Ước tính số người nhận trong bán kính ghim bản đồ thời gian thực (Spatial Query)
   */
  async estimateRecipients(payload: AlertEstimateRequest): Promise<AlertEstimateResponse> {
    const res = await api.post<AlertEstimateResponse>(`${BASE_URL}/estimate-recipients`, payload);
    return res.data;
  },

  /**
   * Màn 1/4: Cán bộ PCTT/Admin phát lệnh cảnh báo khẩn cấp diện rộng (FCM/WebSocket Push)
   */
  async broadcastAlert(payload: BroadcastAlertRequest): Promise<BroadcastAlertResponse> {
    const res = await api.post<BroadcastAlertResponse>(`${BASE_URL}/broadcast`, payload);
    return res.data;
  },

  /**
   * Màn 1/4: Lấy danh sách lịch sử các lệnh phát sóng cảnh báo
   */
  async getBroadcastHistory(limit = 20, alertType?: string): Promise<BroadcastHistoryItem[]> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    if (alertType) params.append("alert_type", alertType);
    const res = await api.get<BroadcastHistoryItem[]>(`${BASE_URL}/history?${params.toString()}`);
    return res.data;
  },

  /**
   * Màn 1/4: Hủy/thu hồi lệnh phát sóng cảnh báo kèm bảo vệ OCC
   */
  async cancelAlert(alertId: string, payload: CancelAlertRequest): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(`${BASE_URL}/${alertId}/cancel`, payload);
    return res.data;
  },

  /**
   * Màn 2/4: Kiểm tra cảnh báo khẩn cấp còn hiệu lực trong phạm vi Geofencing của người dùng
   */
  async getActiveAlertForUser(lat: number, lng: number): Promise<UserActiveAlertResponse> {
    const res = await api.get<UserActiveAlertResponse>(`${BASE_URL}/active-for-user?lat=${lat}&lng=${lng}`);
    return res.data;
  },

  /**
   * Màn 2/4: Người dùng kích hoạt tín hiệu cứu nạn khẩn cấp SOS (gửi vị trí tới TTĐH 43 & 114/115)
   */
  async triggerSOS(payload: EmergencySOSRequest): Promise<EmergencySOSResponse> {
    const res = await api.post<EmergencySOSResponse>(`${BASE_URL}/sos`, payload);
    return res.data;
  },

  /**
   * Màn 2/4: Ghi nhận hành động tương tác của người dùng trên Alert Modal (SAFE, NAVIGATE, DISMISSED)
   */
  async acknowledgeAlert(alertId: string, actionTaken: "SAFE" | "SOS" | "NAVIGATE" | "DISMISSED"): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `${BASE_URL}/${alertId}/acknowledge?action_taken=${actionTaken}`
    );
    return res.data;
  },

  /**
   * Màn 3/4: Khởi tạo dữ liệu màn hình Safety Check (vị trí GPS chính xác & danh bạ bạn bè kết nối)
   */
  async initSafetyCheck(lat?: number, lng?: number): Promise<SafetyCheckInitResponse> {
    const params = new URLSearchParams();
    if (lat !== undefined && lng !== undefined) {
      params.append("lat", lat.toString());
      params.append("lng", lng.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get<SafetyCheckInitResponse>(`${BASE_URL}/safety-check/init${query}`);
    return res.data;
  },

  /**
   * Màn 3/4: Bấm "Tôi an toàn" ở cột trái -> Cập nhật trạng thái hồ sơ & Bảng tin Geo-Feed (STT 08)
   */
  async markSafeSelf(payload: MarkSafeSelfRequest): Promise<MarkSafeSelfResponse> {
    const res = await api.post<MarkSafeSelfResponse>(`${BASE_URL}/safety-check/mark-safe`, payload);
    return res.data;
  },

  /**
   * Màn 3/4 -> 4/4: Chọn danh sách bạn bè và bấm "Gửi cho bạn bè" -> Mở Màn 4/4 xác nhận
   */
  async sendSafetyCheckToFriends(payload: SendSafetyCheckToFriendsRequest): Promise<SendSafetyCheckToFriendsResponse> {
    const res = await api.post<SendSafetyCheckToFriendsResponse>(`${BASE_URL}/safety-check/send-to-friends`, payload);
    return res.data;
  },

  /**
   * Cập nhật GPS Ping vị trí thiết bị người dùng
   */
  async pingDeviceLocation(payload: {
    latitude: number;
    longitude: number;
    address_text?: string;
    district?: string;
    ward?: string;
  }): Promise<{ success: boolean; location_id: string; pinged_at: string }> {
    const res = await api.post<{ success: boolean; location_id: string; pinged_at: string }>(
      `${BASE_URL}/location/ping`,
      payload
    );
    return res.data;
  },
};
