import api from "../../../api/client";
import type {
  RecyclingFacilityItem,
  RecyclingFacilityListResponse,
  RecyclingFacilityCreateRequest,
  RecyclingFacilityUpdateRequest,
  FacilityValidationCheckResponse,
  DistrictItem,
  FacilityFilterParams,
} from "../types/recyclingFacility.types";

export const fetchRecyclingFacilities = async (
  params: FacilityFilterParams = {}
): Promise<RecyclingFacilityListResponse> => {
  const query = new URLSearchParams();
  query.append("page", (params.page || 1).toString());
  query.append("limit", (params.limit || 10).toString());

  if (params.status && params.status !== "ALL") {
    query.append("status", params.status);
  }
  if (params.search && params.search.trim()) {
    query.append("search", params.search.trim());
  }
  if (params.unit_id) {
    query.append("unit_id", params.unit_id.toString());
  }

  const response = await api.get<RecyclingFacilityListResponse>(
    `/api/v1/recycling-facilities?${query.toString()}`
  );
  return response.data;
};

export const fetchFacilityDetail = async (
  facilityId: number
): Promise<RecyclingFacilityItem> => {
  const response = await api.get<RecyclingFacilityItem>(
    `/api/v1/recycling-facilities/${facilityId}`
  );
  return response.data;
};

export const fetchHcmcDistricts = async (): Promise<DistrictItem[]> => {
  const response = await api.get<DistrictItem[]>(
    "/api/v1/recycling-facilities/districts/list"
  );
  return response.data;
};

export const createRecyclingFacility = async (
  data: RecyclingFacilityCreateRequest
): Promise<RecyclingFacilityItem> => {
  const response = await api.post<RecyclingFacilityItem>(
    "/api/v1/recycling-facilities",
    data
  );
  return response.data;
};

export const updateRecyclingFacility = async (
  facilityId: number,
  data: RecyclingFacilityUpdateRequest
): Promise<RecyclingFacilityItem> => {
  const response = await api.put<RecyclingFacilityItem>(
    `/api/v1/recycling-facilities/${facilityId}`,
    data
  );
  return response.data;
};

export const deleteRecyclingFacility = async (
  facilityId: number
): Promise<{ success: boolean; message: string; facility_id: number }> => {
  const response = await api.delete<{
    success: boolean;
    message: string;
    facility_id: number;
  }>(`/api/v1/recycling-facilities/${facilityId}`);
  return response.data;
};

export const checkFacilityNameUnique = async (
  name: string,
  unitId: number,
  excludeId?: number
): Promise<FacilityValidationCheckResponse> => {
  const query = new URLSearchParams({
    name: name.trim(),
    unit_id: unitId.toString(),
  });
  if (excludeId) {
    query.append("exclude_id", excludeId.toString());
  }
  const response = await api.get<FacilityValidationCheckResponse>(
    `/api/v1/recycling-facilities/validate/check-name?${query.toString()}`
  );
  return response.data;
};

export const checkFacilityProximity = async (
  lat: number,
  lng: number,
  excludeId?: number
): Promise<FacilityValidationCheckResponse> => {
  const query = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
  });
  if (excludeId) {
    query.append("exclude_id", excludeId.toString());
  }
  const response = await api.get<FacilityValidationCheckResponse>(
    `/api/v1/recycling-facilities/validate/check-proximity?${query.toString()}`
  );
  return response.data;
};

