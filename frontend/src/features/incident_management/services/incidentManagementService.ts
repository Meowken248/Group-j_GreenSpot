import api from "../../../api/client";
import type {
  IncidentListResponse,
  IncidentFilterParams,
  IncidentDetail,
} from "../types/incident_management.types";

export const fetchIncidentsForManagement = async (
  params: IncidentFilterParams = {}
): Promise<IncidentListResponse> => {
  const query = new URLSearchParams();
  if (params.severity && params.severity !== "ALL") {
    query.append("severity", params.severity);
  }
  if (params.status && params.status !== "ALL") {
    query.append("status", params.status);
  }
  if (params.unit_id && params.unit_id > 0) {
    query.append("unit_id", params.unit_id.toString());
  }
  if (params.search && params.search.trim()) {
    query.append("search", params.search.trim());
  }
  query.append("page", (params.page || 1).toString());
  query.append("limit", (params.limit || 20).toString());

  const response = await api.get<IncidentListResponse>(`/api/v1/incidents?${query.toString()}`);
  return response.data;
};

export const fetchIncidentDetail = async (incidentId: string): Promise<IncidentDetail> => {
  const response = await api.get<IncidentDetail>(`/api/v1/incidents/${incidentId}`);
  return response.data;
};

export const verifyIncident = async (
  incidentId: string,
  action: "VERIFY" | "REJECT",
  note?: string
): Promise<IncidentDetail> => {
  const response = await api.patch<IncidentDetail>(`/api/v1/incidents/${incidentId}/verify`, {
    action,
    note: note || undefined,
  });
  return response.data;
};

export const updateIncidentStatus = async (
  incidentId: string,
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED",
  note?: string
): Promise<IncidentDetail> => {
  const response = await api.patch<IncidentDetail>(`/api/v1/incidents/${incidentId}/status`, {
    status,
    note: note || undefined,
  });
  return response.data;
};

