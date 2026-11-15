import api from "../../../api/client";
import type {
  DispatchListFilter,
  DispatchListResponse,
  IncidentComboboxItem,
  TeamOptionItem,
  CreateDispatchOrderRequest,
  EditDispatchOrderRequest,
  CancelDispatchOrderRequest,
  CloseDispatchOrderRequest,
  FieldTrackingResponse,
  DispatchActionResult,
} from "../types/dispatch.types";

const BASE_URL = "/api/v1/dispatch";

export const dispatchApi = {
  /**
   * Màn 1/6: Lấy danh sách lệnh xử lý kèm bộ lọc trạng thái, đội, quận/huyện
   */
  async getDispatchOrders(filters: DispatchListFilter): Promise<DispatchListResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.team_id) params.append("team_id", filters.team_id);
    if (filters.district) params.append("district", filters.district);

    const res = await api.get<DispatchListResponse>(`${BASE_URL}/orders?${params.toString()}`);
    return res.data;
  },

  /**
   * Màn 2/6: Lấy danh sách sự cố chưa phân công để combobox chọn
   */
  async getAvailableIncidents(): Promise<IncidentComboboxItem[]> {
    const res = await api.get<IncidentComboboxItem[]>(`${BASE_URL}/incidents`);
    return res.data;
  },

  /**
   * Lấy danh sách đội phản ứng cơ động hiện trường
   */
  async getResponseTeams(): Promise<TeamOptionItem[]> {
    const res = await api.get<TeamOptionItem[]>(`${BASE_URL}/teams`);
    return res.data;
  },

  /**
   * Màn 2/6: Giao lệnh điều động mới
   */
  async createDispatchOrder(payload: CreateDispatchOrderRequest): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders`, payload);
    return res.data;
  },

  /**
   * Màn 3/6: Cập nhật điều chỉnh lệnh (đổi đội / đổi hạn SLA)
   */
  async editDispatchOrder(orderId: string, payload: EditDispatchOrderRequest): Promise<DispatchActionResult> {
    const res = await api.put<DispatchActionResult>(`${BASE_URL}/orders/${orderId}`, payload);
    return res.data;
  },

  /**
   * Màn 4/6 & 5/6: Huỷ bỏ lệnh điều phối
   */
  async cancelDispatchOrder(orderId: string, payload: CancelDispatchOrderRequest): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders/${orderId}/cancel`, payload);
    return res.data;
  },

  /**
   * Màn 6/6: Nghiệm thu và đóng lệnh hiện trường
   */
  async closeDispatchOrder(orderId: string, payload: CloseDispatchOrderRequest): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders/${orderId}/close`, payload);
    return res.data;
  },

  /**
   * Màn 6/6: Lấy dữ liệu giám sát hiện trường GPS và tiến trình thực tế
   */
  async getFieldTrackingData(orderId: string): Promise<FieldTrackingResponse> {
    const res = await api.get<FieldTrackingResponse>(`${BASE_URL}/orders/${orderId}/tracking`);
    return res.data;
  },

  /**
   * Màn 6/6: Cập nhật toạ độ GPS thời gian thực của đội hiện trường
   */
  async updateTeamGpsLocation(orderId: string, lat: number, lng: number): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders/${orderId}/gps`, {
      team_latitude: lat,
      team_longitude: lng,
    });
    return res.data;
  },

  /**
   * Đội phản ứng hiện trường xác nhận tiếp nhận lệnh điều phối (ASSIGNED -> EN_ROUTE)
   */
  async acceptDispatchOrder(orderId: string): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders/${orderId}/accept`);
    return res.data;
  },

  /**
   * Đội phản ứng hiện trường xác nhận đã đến nơi sự cố (EN_ROUTE -> IN_PROGRESS)
   */
  async arriveDispatchOrder(orderId: string): Promise<DispatchActionResult> {
    const res = await api.post<DispatchActionResult>(`${BASE_URL}/orders/${orderId}/arrive`);
    return res.data;
  },
};


