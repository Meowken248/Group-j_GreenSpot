import api from "../../../api/client";
import type {
  HotspotFilterParams,
  HotspotMapResponse,
  AreaOptionItem,
  ForecastResponse,
  ExportReportRequest,
  ExportReportResponse,
  HotspotDetailResponse,
} from "../types/hotspot.types";

const BASE_URL = "/api/v1/hotspots";

export const hotspotApi = {
  /**
   * Màn 1/3: Lấy dữ liệu bản đồ điểm nóng KDE và Top 5 điểm nóng đô thị
   */
  async getHotspotMap(params: HotspotFilterParams = {}): Promise<HotspotMapResponse> {
    const searchParams = new URLSearchParams();
    if (params.incident_type) searchParams.append("incident_type", params.incident_type);
    if (params.time_range) searchParams.append("time_range", params.time_range);
    if (params.start_date) searchParams.append("start_date", params.start_date);
    if (params.end_date) searchParams.append("end_date", params.end_date);

    const queryString = searchParams.toString();
    const url = queryString ? `${BASE_URL}/map?${queryString}` : `${BASE_URL}/map`;
    const res = await api.get<HotspotMapResponse>(url);
    return res.data;
  },

  /**
   * Màn 2/3: Lấy danh sách Quận/Huyện và Điểm nóng cho combobox khu vực
   */
  async getAvailableAreas(): Promise<AreaOptionItem[]> {
    const res = await api.get<AreaOptionItem[]>(`${BASE_URL}/areas`);
    return res.data;
  },

  /**
   * Màn 2/3: Lấy dữ liệu chuỗi dự báo 7 ngày kèm khoảng tin cậy 95%
   */
  async get7DayForecast(targetId: string, targetType: "DISTRICT" | "HOTSPOT" = "DISTRICT"): Promise<ForecastResponse> {
    const res = await api.get<ForecastResponse>(
      `${BASE_URL}/forecast?target_id=${encodeURIComponent(targetId)}&target_type=${encodeURIComponent(targetType)}`
    );
    return res.data;
  },

  /**
   * Màn 2/3: Yêu cầu xuất báo cáo dự báo định dạng PDF / Excel
   */
  async exportForecastReport(payload: ExportReportRequest): Promise<ExportReportResponse> {
    const res = await api.post<ExportReportResponse>(`${BASE_URL}/forecast/export`, payload);
    return res.data;
  },

  /**
   * Màn 3/3: Xem chi tiết điểm nóng và chuẩn bị dữ liệu điều động hiện trường STT 43
   */
  async getHotspotDetail(hotspotId: string): Promise<HotspotDetailResponse> {
    const res = await api.get<HotspotDetailResponse>(`${BASE_URL}/${encodeURIComponent(hotspotId)}`);
    return res.data;
  },
};
