import api from "../../api/client";
import type {
  AuditLogListResult,
  AuditLogDetail,
  AuditExportPayload,
  AuditExportResult,
  AuditStatisticsData,
  AuditChainVerificationResult,
} from "./types";

export const auditApi = {
  getStatistics: async (): Promise<AuditStatisticsData> => {
    const res = await api.get<AuditStatisticsData>("/api/v1/system/audit-logs/statistics");
    return res.data;
  },

  getAuditLogs: async (params: {
    action?: string;
    actor_query?: string;
    is_suspicious?: boolean;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogListResult> => {
    const res = await api.get<AuditLogListResult>("/api/v1/system/audit-logs", { params });
    return res.data;
  },

  getAuditLogDetail: async (logId: number): Promise<AuditLogDetail> => {
    const res = await api.get<AuditLogDetail>(`/api/v1/system/audit-logs/${logId}`);
    return res.data;
  },

  exportAuditLogs: async (payload: AuditExportPayload): Promise<AuditExportResult> => {
    const res = await api.post<AuditExportResult>("/api/v1/system/audit-logs/export", payload);
    return res.data;
  },

  downloadExportedAuditLogs: async (downloadUrl: string, format: string): Promise<void> => {
    const res = await api.get(downloadUrl, { responseType: "blob" });
    const ext = format === "PDF" ? "html" : "csv";
    const mime =
      format === "PDF"
        ? "text/html;charset=utf-8"
        : "text/csv;charset=utf-8";
    const blob = new Blob([res.data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.setAttribute("download", `GreenSpot_AuditLogs_${timestamp}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  verifyChain: async (limit: number = 100): Promise<AuditChainVerificationResult> => {
    const res = await api.post<AuditChainVerificationResult>(
      "/api/v1/system/audit-logs/verify-chain",
      {},
      { params: { limit } }
    );
    return res.data;
  },
};
