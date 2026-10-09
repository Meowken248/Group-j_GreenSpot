import api from '../../../../api/client';
import type {
  DistrictOption,
  ClusterListResponse,
  ComparisonResponse,
  MergeIncidentRequest,
  MergeIncidentResponse,
  MarkDistinctRequest,
  MarkDistinctResponse,
} from '../types/deduplication.types';

export const deduplicationService = {
  /**
   * Lấy danh sách quận/huyện cho bộ lọc
   */
  async getDistricts(): Promise<DistrictOption[]> {
    const res = await api.get<DistrictOption[]>('/api/v1/incidents/deduplication/districts');
    return res.data;
  },

  /**
   * Lấy danh sách cụm báo cáo trùng lặp theo bộ lọc
   */
  async getClusters(params: {
    districtName?: string | null;
    minSimilarity?: number | null;
    simulateError?: boolean;
  }): Promise<ClusterListResponse> {
    const queryParams: Record<string, string | number | boolean> = {};
    if (params.districtName && params.districtName !== 'Tất cả quận/huyện') {
      queryParams.district_name = params.districtName;
    }
    if (params.minSimilarity != null) {
      queryParams.min_similarity = params.minSimilarity;
    }
    if (params.simulateError) {
      queryParams.simulate_error = true;
    }

    const res = await api.get<ClusterListResponse>('/api/v1/incidents/deduplication/clusters', {
      params: queryParams,
    });
    return res.data;
  },

  /**
   * Lấy chi tiết đối chứng song song hai báo cáo A và B
   */
  async getComparison(clusterId: string): Promise<ComparisonResponse> {
    const res = await api.get<ComparisonResponse>(`/api/v1/incidents/deduplication/compare/${clusterId}`);
    return res.data;
  },

  /**
   * Đánh dấu 2 báo cáo không trùng lặp (False Positive)
   */
  async markDistinct(payload: MarkDistinctRequest): Promise<MarkDistinctResponse> {
    const res = await api.post<MarkDistinctResponse>('/api/v1/incidents/deduplication/mark-distinct', payload);
    return res.data;
  },

  /**
   * Gộp 2 báo cáo sự cố (Optimistic Locking & Soft Delete)
   */
  async mergeIncidents(payload: MergeIncidentRequest): Promise<MergeIncidentResponse> {
    const res = await api.post<MergeIncidentResponse>('/api/v1/incidents/deduplication/merge', payload);
    return res.data;
  },
};
