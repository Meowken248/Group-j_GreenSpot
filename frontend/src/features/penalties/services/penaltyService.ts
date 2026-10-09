/**
 * Penalty Regulations API Client Service (Chức năng 11: Tra cứu quy định xử phạt)
 */

import api from '../../../api/client';
import type {
  PenaltySearchResponse,
  PenaltyDetailResponse,
  QuickCategoryStat,
  TargetType,
} from '../types/penalty.types';

export const penaltyService = {
  /**
   * Tra cứu và lọc danh sách quy định xử phạt (Màn 1 & Màn 2)
   */
  async searchPenalties(params: {
    query?: string;
    domain?: string;
    quick_category?: string;
    target?: TargetType;
    page?: number;
    limit?: number;
  }): Promise<PenaltySearchResponse> {
    const cleanParams: Record<string, string | number> = {};
    if (params.query?.trim()) cleanParams.query = params.query.trim();
    if (params.domain && params.domain !== 'ALL') cleanParams.domain = params.domain;
    if (params.quick_category) cleanParams.quick_category = params.quick_category;
    if (params.target) cleanParams.target = params.target;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const res = await api.get<PenaltySearchResponse>('/api/v1/penalties/search', {
      params: cleanParams,
    });
    return res.data;
  },

  /**
   * Lấy 4 danh mục truy cập nhanh kèm số lượng thực tế (Màn 1)
   */
  async getQuickCategories(): Promise<QuickCategoryStat[]> {
    const res = await api.get<QuickCategoryStat[]>('/api/v1/penalties/categories');
    return res.data;
  },

  /**
   * Lấy danh sách các lĩnh vực chuyên đề có trong hệ thống (Màn 2)
   */
  async getDomains(): Promise<string[]> {
    const res = await api.get<string[]>('/api/v1/penalties/domains');
    return res.data;
  },

  /**
   * Xem chi tiết đầy đủ 3 khối thông tin của điều luật (Màn 3)
   */
  async getPenaltyDetail(
    penaltyId: string,
    target: TargetType = 'INDIVIDUAL'
  ): Promise<PenaltyDetailResponse> {
    const res = await api.get<PenaltyDetailResponse>(`/api/v1/penalties/${penaltyId}`, {
      params: { target },
    });
    return res.data;
  },
};
