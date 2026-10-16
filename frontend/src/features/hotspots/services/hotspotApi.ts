import api from "../../../api/client";
import type {
  HotspotFilterParams,
  HotspotMapResponse,
  AreaOptionItem,
  ForecastResponse,
  ExportReportRequest,
  ExportReportResponse,
  HotspotDetailResponse,
  HotspotCluster,
  TopHotspotItem,
  DailyForecastPoint,
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
    const res = await api.get<any>(url);
    const data = res.data;

    const clusters: HotspotCluster[] = (data.clusters || []).map((c: any) => ({
      id: c.hotspot_id || c.id,
      cluster_code: c.hotspot_code || c.cluster_code,
      title: c.name || c.title,
      incident_type: c.incident_type,
      incident_count: c.incident_count,
      latitude: c.latitude,
      longitude: c.longitude,
      radius_meter: c.radius_meters || c.radius_meter || 300,
      density_score: c.kde_density_score || c.density_score || 0,
      risk_level:
        c.severity_level === "CRITICAL"
          ? "VERY_CRITICAL"
          : c.severity_level === "SEVERE"
          ? "CRITICAL"
          : c.risk_level || "POTENTIAL_RISK",
      trend: c.trend_description || c.trend || "",
      forecast_48h: c.forecast_48h || "",
      district: c.district,
      active_dispatch_order_id: c.active_dispatch_order_code || c.active_dispatch_order_id || null,
      last_updated: c.last_updated || new Date().toISOString(),
    }));

    const top5: TopHotspotItem[] = (data.top_5_hotspots || data.top_5 || []).map(
      (t: any, idx: number) => ({
        id: t.hotspot_id || t.id,
        rank: t.rank || idx + 1,
        title: t.name || t.title,
        district: t.district,
        incident_count: t.incident_count,
        risk_level:
          t.severity_level === "CRITICAL"
            ? "VERY_CRITICAL"
            : t.severity_level === "SEVERE"
            ? "CRITICAL"
            : t.risk_level || "POTENTIAL_RISK",
        trend: t.trend_description || t.trend || "",
      })
    );

    return {
      clusters,
      top_5: top5,
      total_clusters: data.total_clusters ?? clusters.length,
      total_incidents:
        data.total_incidents ?? clusters.reduce((acc, curr) => acc + curr.incident_count, 0),
      status_message: data.status_message,
    };
  },

  /**
   * Màn 2/3: Lấy danh sách Quận/Huyện và Điểm nóng cho combobox khu vực
   */
  async getAvailableAreas(): Promise<AreaOptionItem[]> {
    const res = await api.get<any[]>(`${BASE_URL}/areas`);
    return (res.data || []).map((a: any) => ({
      id: a.target_id || a.id,
      name: a.target_name || a.name,
      type: a.target_type || a.type || "DISTRICT",
    }));
  },

  /**
   * Màn 2/3: Lấy dữ liệu chuỗi dự báo 7 ngày kèm khoảng tin cậy 95%
   */
  async get7DayForecast(
    targetId: string,
    targetType: "DISTRICT" | "HOTSPOT" = "DISTRICT"
  ): Promise<ForecastResponse> {
    const res = await api.get<any>(
      `${BASE_URL}/forecast?target_id=${encodeURIComponent(targetId)}&target_type=${encodeURIComponent(targetType)}`
    );
    const data = res.data;

    const points: DailyForecastPoint[] = (data.daily_points || data.points || []).map((p: any) => ({
      date: p.date_str || p.date,
      day_of_week: p.day_label ? p.day_label.split(",")[0] : p.day_of_week || "",
      predicted_incidents: p.predicted_incidents,
      ci_lower_95: p.ci_lower_95,
      ci_upper_95: p.ci_upper_95,
      risk_level: p.risk_level,
      weather_condition: p.risk_reason || p.weather_condition || "Bình thường",
      tide_level_m: p.tidal_peak_m ?? p.tide_level_m ?? null,
      note: p.risk_reason || p.note || null,
    }));

    return {
      target_id: data.target_id,
      target_name: data.target_name,
      target_type: data.target_type,
      model_accuracy_pct: data.model_accuracy_pct ?? 87.5,
      has_weather_warning: Boolean(data.weather_warning || data.is_weather_synced === false),
      weather_warning_message:
        data.weather_warning ||
        (data.is_weather_synced === false
          ? "Cảnh báo: Dữ liệu dự báo khí tượng chưa đồng bộ, kết quả dự báo có thể có sai số lớn hơn bình thường."
          : null),
      points,
      peak_risk_summary: data.peak_risk_summary,
      peak_risk_date: data.peak_risk_day?.date_str || data.peak_risk_date || "",
      recommendations: data.recommendations || [
        "Bố trí đội nạo vét cống rãnh thường trực trước các đợt triều cường",
        "Tăng cường thu gom rác tại các bãi tập kết ven kênh rạch",
        "Kích hoạt trạm bơm tiêu thoát nước tự động khi mưa vượt 50mm",
      ],
    };
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
    const res = await api.get<any>(`${BASE_URL}/${encodeURIComponent(hotspotId)}`);
    const data = res.data;
    const h = data.hotspot || data;

    return {
      id: h.hotspot_id || h.id,
      cluster_code: h.hotspot_code || h.cluster_code,
      title: h.name || h.title,
      incident_type: h.incident_type,
      incident_type_label: h.incident_type_label || h.incident_type,
      incident_count: h.incident_count,
      risk_level:
        h.severity_level === "CRITICAL"
          ? "VERY_CRITICAL"
          : h.severity_level === "SEVERE"
          ? "CRITICAL"
          : h.risk_level || "POTENTIAL_RISK",
      risk_level_label: h.severity_label || h.risk_level_label || "Rất nghiêm trọng",
      trend: h.trend_description || h.trend || "",
      forecast_48h: h.forecast_48h || "",
      district: h.district,
      latitude: h.latitude,
      longitude: h.longitude,
      active_dispatch_order_id:
        data.active_order_code ||
        data.active_order_id ||
        h.active_dispatch_order_code ||
        h.active_dispatch_order_id ||
        null,
      has_active_order: Boolean(
        data.has_active_dispatch || data.active_order_code || h.active_dispatch_order_code
      ),
      suggested_dispatch: data.dispatch_prefill
        ? {
            title: data.dispatch_prefill.title,
            incident_type: data.dispatch_prefill.category,
            priority: data.dispatch_prefill.suggested_priority || "URGENT",
            district: data.dispatch_prefill.district,
            address: data.dispatch_prefill.location_address,
            latitude: data.dispatch_prefill.latitude,
            longitude: data.dispatch_prefill.longitude,
            target_deadline_hours: data.dispatch_prefill.suggested_priority === "URGENT" ? 4 : 8,
            description: `Cụm điểm nóng KDE mật độ cao ${h.incident_count} phản ánh tại ${h.name}. Yêu cầu điều động lực lượng xử lý hiện trường.`,
          }
        : data.suggested_dispatch || {
            title: `Xử lý điểm nóng ${h.name || h.title}`,
            incident_type: h.incident_type_label || "Rác thải",
            priority: "URGENT",
            district: h.district,
            address: h.name || h.title,
            latitude: h.latitude,
            longitude: h.longitude,
            target_deadline_hours: 4,
            description: `Xử lý khẩn cấp điểm nóng ô nhiễm ${h.name || h.title}`,
          },
    };
  },
};
