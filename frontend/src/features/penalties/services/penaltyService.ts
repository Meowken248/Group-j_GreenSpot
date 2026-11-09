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
   * Lấy số lượng quy định theo từng lĩnh vực chuyên đề (Màn 2)
   */
  async getDomainCounts(): Promise<Record<string, number>> {
    try {
      const res = await api.get<Record<string, number>>('/api/v1/penalties/domain-counts');
      return res.data;
    } catch {
      return {};
    }
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

  /**
   * Gửi phản ánh vi phạm môi trường từ công dân
   */
  async submitPenaltyReport(
    data: import('../types/penalty.types').CreatePenaltyReportRequest
  ): Promise<import('../types/penalty.types').PenaltyReportItem> {
    const res = await api.post<import('../types/penalty.types').PenaltyReportItem>(
      '/api/v1/penalties/reports',
      data
    );
    return res.data;
  },

  /**
   * Lấy danh sách phản ánh vi phạm môi trường (Dành cho Admin / Cán bộ)
   */
  async getPenaltyReports(params: {
    status?: string;
    query?: string;
    is_anonymous?: boolean;
    page?: number;
    limit?: number;
  }): Promise<import('../types/penalty.types').PenaltyReportListResponse> {
    const cleanParams: Record<string, string | number | boolean> = {};
    if (params.status && params.status !== 'ALL') cleanParams.status_filter = params.status;
    if (params.query?.trim()) cleanParams.query = params.query.trim();
    if (params.is_anonymous !== undefined) cleanParams.is_anonymous = params.is_anonymous;
    if (params.page) cleanParams.page = params.page;
    if (params.limit) cleanParams.limit = params.limit;

    const res = await api.get<import('../types/penalty.types').PenaltyReportListResponse>(
      '/api/v1/penalties/reports',
      { params: cleanParams }
    );
    return res.data;
  },

  /**
   * Thống kê số lượng phản ánh vi phạm môi trường theo các trạng thái
   */
  async getPenaltyReportStats(): Promise<import('../types/penalty.types').PenaltyReportStatsResponse> {
    const res = await api.get<import('../types/penalty.types').PenaltyReportStatsResponse>(
      '/api/v1/penalties/reports/stats'
    );
    return res.data;
  },

  /**
   * Cập nhật trạng thái xử lý phản ánh vi phạm kèm ghi chú cán bộ
   */
  async updatePenaltyReportStatus(
    reportId: string,
    data: import('../types/penalty.types').UpdatePenaltyReportStatusRequest
  ): Promise<import('../types/penalty.types').PenaltyReportItem> {
    const res = await api.patch<import('../types/penalty.types').PenaltyReportItem>(
      `/api/v1/penalties/reports/${reportId}/status`,
      data
    );
    return res.data;
  },
};

