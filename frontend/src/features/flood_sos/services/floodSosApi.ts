/**
 * API Service cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
 * Kết nối các REST API endpoint backend của hệ thống
 */

import api from "../../../api/client";
import type {
  CreateFloodSosPayload,
  CreateFloodSosResponse,
  VolunteerSosCard,
  AcceptSosPayload,
  SkipSosPayload,
  SosTrackingDetail,
  UpdateSosProgressPayload,
  ChatMessageItem,
  SendChatMessagePayload,
  CancelSosPayload,
  CancelSosResponse,
  CompleteSosRatingPayload,
} from "../types/flood_sos.types";

const BASE_URL = "/api/v1/flood-sos";

export const floodSosApi = {
  /**
   * Màn 1/5 & 2/5: Phát lệnh cấp cứu SOS
   */
  async dispatchSos(payload: CreateFloodSosPayload): Promise<CreateFloodSosResponse> {
    const res = await api.post<CreateFloodSosResponse>(`${BASE_URL}/dispatch`, payload);
    return res.data;
  },

  /**
   * Màn 3/5: Lấy danh sách yêu cầu cứu hộ gần tình nguyện viên (bán kính 3km)
   */
  async getNearbySosRequests(
    latitude: number,
    longitude: number,
    radiusKm: number = 3.0,
  ): Promise<VolunteerSosCard[]> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius_km: radiusKm.toString(),
    });
    const res = await api.get<VolunteerSosCard[]>(`${BASE_URL}/nearby?${params.toString()}`);
    return res.data;
  },

  /**
   * Màn 3/5: Tình nguyện viên tiếp nhận ca cứu hộ
   */
  async acceptSosRequest(requestId: string, payload: AcceptSosPayload): Promise<SosTrackingDetail> {
    const res = await api.post<SosTrackingDetail>(`${BASE_URL}/${requestId}/accept`, payload);
    return res.data;
  },

  /**
   * Màn 3/5: Tình nguyện viên bỏ qua yêu cầu
   */
  async skipSosRequest(
    requestId: string,
    payload: SkipSosPayload,
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>(
      `${BASE_URL}/${requestId}/skip`,
      payload,
    );
    return res.data;
  },

  /**
   * Màn 4/5: Lấy thông tin theo dõi trực tiếp ca cứu hộ
   */
  async getSosTrackingDetail(requestId: string): Promise<SosTrackingDetail> {
    const res = await api.get<SosTrackingDetail>(`${BASE_URL}/${requestId}/tracking`);
    return res.data;
  },

  /**
   * Màn 4/5: Cập nhật vị trí GPS và tiến độ người cứu hộ
   */
  async updateSosProgress(
    requestId: string,
    payload: UpdateSosProgressPayload,
  ): Promise<SosTrackingDetail> {
    const res = await api.post<SosTrackingDetail>(`${BASE_URL}/${requestId}/progress`, payload);
    return res.data;
  },

  /**
   * Màn 4/5: Gửi tin nhắn trao đổi khẩn cấp
   */
  async sendChatMessage(
    requestId: string,
    payload: SendChatMessagePayload,
  ): Promise<ChatMessageItem> {
    const res = await api.post<ChatMessageItem>(`${BASE_URL}/${requestId}/chat`, payload);
    return res.data;
  },

  /**
   * Màn 5/5: Huỷ yêu cầu SOS (kiểm tra khoảng cách < 100m)
   */
  async cancelSosRequest(requestId: string, payload: CancelSosPayload): Promise<CancelSosResponse> {
    const res = await api.post<CancelSosResponse>(`${BASE_URL}/${requestId}/cancel`, payload);
    return res.data;
  },

  /**
   * Màn 4/5: Đánh giá chất lượng sau cứu hộ
   */
  async submitRating(
    requestId: string,
    payload: CompleteSosRatingPayload,
  ): Promise<{ success: boolean; message: string; rating: number }> {
    const res = await api.post<{ success: boolean; message: string; rating: number }>(
      `${BASE_URL}/${requestId}/rating`,
      payload,
    );
    return res.data;
  },
};
