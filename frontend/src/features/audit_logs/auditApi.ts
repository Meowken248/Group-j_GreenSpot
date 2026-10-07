import api from "../../api/client";
import type {
  AuditLogListResult,
  AuditLogDetail,
  AuditExportPayload,
  AuditExportResult,
} from "./types";

export const auditApi = {
  getAuditLogs: async (params: {
    action?: string;
    actor_query?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLogListResult> => {
    const res = await api.get<AuditLogListResult>("/system/audit-logs", { params });
    return res.data;
  },

  getAuditLogDetail: async (logId: number): Promise<AuditLogDetail> => {
    const res = await api.get<AuditLogDetail>(`/system/audit-logs/${logId}`);
    return res.data;
  },

  exportAuditLogs: async (payload: AuditExportPayload): Promise<AuditExportResult> => {
    const res = await api.post<AuditExportResult>("/system/audit-logs/export", payload);
    return res.data;
  },
};
