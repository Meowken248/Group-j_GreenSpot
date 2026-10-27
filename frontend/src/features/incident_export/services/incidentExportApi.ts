/**
 * API Service kết nối backend cho tính năng STT 47:
 * Xuất danh sách sự cố ra Excel hoặc PDF theo bộ lọc
 */

import api from "../../../api/client";
import type {
  ExportCreatedResponse,
  ExportMetadataOptionsResponse,
  ExportStatusResponse,
  IncidentExportFilterParams,
  IncidentPreviewResponse,
  TriggerExportRequest,
} from "../types/incident_export.types";

const BASE_URL = "/api/v1/incidents/export";

export const incidentExportApi = {
  /**
   * Lấy danh mục tùy chọn bộ lọc: 22 quận/huyện, loại sự cố, trạng thái, chọn nhanh
   */
  async getFilterOptions(): Promise<ExportMetadataOptionsResponse> {
    const res = await api.get<ExportMetadataOptionsResponse>(`${BASE_URL}/options`);
    return res.data;
  },

  /**
   * Màn 1/4: Truy vấn danh sách sự cố xem trước (Data Preview) theo bộ lọc
   */
  async previewIncidents(
    params: IncidentExportFilterParams
  ): Promise<IncidentPreviewResponse> {
    const res = await api.post<IncidentPreviewResponse>(`${BASE_URL}/preview`, params);
    return res.data;
  },

  /**
   * Màn 2/4: Khởi tạo tiến trình kết xuất tệp Excel (.xlsx) hoặc PDF (.pdf)
   */
  async generateExport(
    payload: TriggerExportRequest
  ): Promise<ExportCreatedResponse> {
    const res = await api.post<ExportCreatedResponse>(`${BASE_URL}/generate`, payload);
    return res.data;
  },

  /**
   * Màn 3/4: Kiểm tra trạng thái và thời hạn bảo mật 15 phút của tệp
   */
  async checkExportStatus(exportId: string): Promise<ExportStatusResponse> {
    const res = await api.get<ExportStatusResponse>(`${BASE_URL}/${exportId}/status`);
    return res.data;
  },

  /**
   * Đường dẫn tải tệp trực tiếp
   */
  getDownloadUrl(exportId: string): string {
    return `${api.defaults.baseURL || ""}${BASE_URL}/${exportId}/download`;
  },

  /**
   * Tải dữ liệu nhị phân (Blob) tệp Excel/PDF trực tiếp từ backend
   */
  async downloadFile(exportId: string): Promise<{ data: Blob; fileName?: string }> {
    const res = await api.get(`${BASE_URL}/${exportId}/download`, {
      responseType: "blob",
    });
    const disposition = (res.headers["content-disposition"] as string) || "";
    let fileName: string | undefined;
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      fileName = match[1];
    }
    return { data: res.data as Blob, fileName };
  },
};
