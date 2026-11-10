import api from "../../../api/client";
import type {
  TriageIncidentSummaryItem,
  TriageEvaluationData,
  RegenerateSummaryResponse,
  TriageActionResponse,
  AuditLogItem,
  FacilityListResponse,
  FacilityDetailProfile,
  SendAlertResponse,
} from "../types";

export const triageService = {
  // STT 39: AI Triage & Priority
  async getIncidentsList(limit = 20): Promise<TriageIncidentSummaryItem[]> {
    const res = await api.get<TriageIncidentSummaryItem[]>("/api/v1/incidents/triage/list", {
      params: { limit },
    });
    return res.data;
  },

  async getIncidentDetail(incidentId: string): Promise<TriageEvaluationData> {
    const res = await api.get<TriageEvaluationData>(`/api/v1/incidents/triage/${incidentId}`);
    return res.data;
  },

  async regenerateSummary(incidentId: string): Promise<RegenerateSummaryResponse> {
    const res = await api.post<RegenerateSummaryResponse>(`/api/v1/incidents/triage/${incidentId}/regenerate`);
    return res.data;
  },

  async acceptPriority(incidentId: string, currentVersion: number): Promise<TriageActionResponse> {
    const res = await api.post<TriageActionResponse>(`/api/v1/incidents/triage/${incidentId}/accept`, {
      version: currentVersion,
    });
    return res.data;
  },

  async overridePriority(
    incidentId: string,
    newPriority: string,
    reason: string,
    currentVersion: number
  ): Promise<TriageActionResponse> {
    const res = await api.post<TriageActionResponse>(`/api/v1/incidents/triage/${incidentId}/override`, {
      new_priority: newPriority,
      reason,
      version: currentVersion,
    });
    return res.data;
  },

  async getAuditLogs(incidentId: string): Promise<AuditLogItem[]> {
    const res = await api.get<AuditLogItem[]>(`/api/v1/incidents/triage/${incidentId}/audit-logs`);
    return res.data;
  },

  // STT 40: Spatial Facility Buffer Analysis
  async queryFacilitiesInBuffer(
    incidentId: string,
    radiusMeters: number,
    facilityTypes: string[]
  ): Promise<FacilityListResponse> {
    const res = await api.post<FacilityListResponse>("/api/v1/spatial/facilities/buffer", {
      incident_id: incidentId,
      radius_meters: radiusMeters,
      facility_types: facilityTypes,
    });
    return res.data;
  },

  async getFacilityDetail(facilityId: number, incidentId?: string): Promise<FacilityDetailProfile> {
    const res = await api.get<FacilityDetailProfile>(`/api/v1/spatial/facilities/${facilityId}`, {
      params: incidentId ? { incident_id: incidentId } : undefined,
    });
    return res.data;
  },

  async sendEmergencyAlert(
    incidentId: string,
    facilityId: number,
    messageText: string
  ): Promise<SendAlertResponse> {
    const res = await api.post<SendAlertResponse>("/api/v1/spatial/facilities/alert", {
      incident_id: incidentId,
      facility_id: facilityId,
      message_text: messageText,
    });
    return res.data;
  },

  async logCallInitiated(incidentId: string, facilityId: number): Promise<void> {
    await api.post("/api/v1/spatial/facilities/call-log", null, {
      params: { incident_id: incidentId, facility_id: facilityId },
    });
  },
};
