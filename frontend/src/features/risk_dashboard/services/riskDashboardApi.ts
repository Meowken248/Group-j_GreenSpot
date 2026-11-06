import api from "../../../api/client";
import type {
  DistrictDetailResponse,
  FilterAnalysisRequest,
  FilterAnalysisResponse,
  OverviewMetricsResponse,
} from "../types/riskDashboard.types";

const BASE_URL = "/api/v1/risk-dashboard";

export const riskDashboardApi = {
  /**
   *  Lấy dữ liệu tổng quan rủi ro đô thị toàn thành phố
   */
  async getOverview(): Promise<OverviewMetricsResponse> {
    const res = await api.get<OverviewMetricsResponse>(`${BASE_URL}/overview`);
    return res.data;
  },

  /**
   *  Lọc & phân tích chuyên sâu
   */
  async getFilteredAnalysis(payload: FilterAnalysisRequest): Promise<FilterAnalysisResponse> {
    const res = await api.post<FilterAnalysisResponse>(`${BASE_URL}/analysis`, payload);
    return res.data;
  },

  /**
   *  Lấy chi tiết thông tin quận/huyện cho Popup
   */
  async getDistrictDetail(idOrName: string | number): Promise<DistrictDetailResponse> {
    const encoded = encodeURIComponent(String(idOrName));
    const res = await api.get<DistrictDetailResponse>(`${BASE_URL}/district/${encoded}`);
    return res.data;
  },

  /**
   * Xuất báo cáo CSV / Excel
   */
  async exportReport(payload: FilterAnalysisRequest, format: "csv" | "excel" | "pdf" = "csv"): Promise<Blob> {
    const res = await api.post(`${BASE_URL}/export?format=${format}`, payload, {
      responseType: "blob",
    });
    return res.data;
  },
};
