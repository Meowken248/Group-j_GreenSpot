import api from "../../api/client";
import type { OpenDataIncidentRecord, PublicReportSummary } from "./types";

export const reportsApi = {
  getPublicSummary: async (params?: {
    period_type?: string;
    year?: number;
    month?: number;
    district?: string;
  }): Promise<PublicReportSummary> => {
    const res = await api.get<PublicReportSummary>("/api/v1/reports/public-summary", { params });
    return res.data;
  },

  getOpenDataRecords: async (params?: {
    year?: number;
    month?: number;
    district?: string;
    limit?: number;
  }): Promise<OpenDataIncidentRecord[]> => {
    const res = await api.get<OpenDataIncidentRecord[]>("/api/v1/reports/open-data", { params });
    return res.data;
  },

  downloadExcel: (year: number, month: number, district: string = "ALL") => {
    const url = `/api/v1/reports/export/excel?year=${year}&month=${month}&district=${encodeURIComponent(district)}`;
    window.open(url, "_blank");
  },

  // Chức năng 33: Bảng Tổng quan Chỉ số Hiện trạng Môi trường Đô thị Công cộng
  getPublicDashboard: async () => {
    const res = await api.get("/api/v1/reports/public-dashboard");
    return res.data;
  },
};

