import api from "../../api/client";
import type {
  PointPolicyResponse,
  DailyLimitsPolicyResponse,
  ClaimPointRequest,
  ClaimPointResponse,
  WalletSummaryResponse,
  TransactionHistoryResponse,
  TransactionDetailResponse,
} from "./types";

export const rewardsApi = {
  /**
   * [Chức năng 28 - Màn 1] Lấy bảng quy chuẩn tích điểm & thông tin cấp bậc
   */
  async getPointsPolicy(): Promise<PointPolicyResponse> {
    const res = await api.get<PointPolicyResponse>("/api/v1/rewards/policy");
    return res.data;
  },

  /**
   * [Chức năng 28 - Màn 2] Lấy quy định định ngạch 24h & chế tài chống gian lận
   */
  async getDailyLimitsPolicy(): Promise<DailyLimitsPolicyResponse> {
    const res = await api.get<DailyLimitsPolicyResponse>("/api/v1/rewards/limits-policy");
    return res.data;
  },

  /**
   * [Chức năng 28 - Màn 3 Popup] Nhận Điểm Xanh tức thì từ hành động môi trường
   */
  async claimPoints(payload: ClaimPointRequest): Promise<ClaimPointResponse> {
    const res = await api.post<ClaimPointResponse>("/api/v1/rewards/claim", payload);
    return res.data;
  },

  /**
   * [Chức năng 29 - Màn 1] Bảng điều khiển ví điểm cá nhân (Green Wallet Dashboard)
   */
  async getWalletSummary(): Promise<WalletSummaryResponse> {
    const res = await api.get<WalletSummaryResponse>("/api/v1/rewards/wallet");
    return res.data;
  },

  /**
   * [Chức năng 29 - Màn 2] Sao kê lịch sử biến động điểm theo bộ lọc & phân trang
   */
  async getTransactionHistory(params: {
    flow_type?: string;
    time_range?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<TransactionHistoryResponse> {
    const res = await api.get<TransactionHistoryResponse>("/api/v1/rewards/history", {
      params,
    });
    return res.data;
  },

  /**
   * [Chức năng 29 - Màn 3 Popup] Xem chứng từ chi tiết một giao dịch điện tử
   */
  async getTransactionDetail(transactionId: string): Promise<TransactionDetailResponse> {
    const res = await api.get<TransactionDetailResponse>(
      `/api/v1/rewards/transactions/${transactionId}`
    );
    return res.data;
  },

  /**
   * Tải tệp sao kê CSV
   */
  async downloadStatementCsv(flowType?: string, timeRange = "30_DAYS"): Promise<void> {
    const token = localStorage.getItem("eco_access_token");
    const baseUrl = api.defaults.baseURL || "http://localhost:8000";
    const url = new URL(`${baseUrl}/api/v1/rewards/export-statement`);
    if (flowType) url.searchParams.set("flow_type", flowType);
    if (timeRange) url.searchParams.set("time_range", timeRange);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải tệp sao kê");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `sao_ke_vi_diem_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * [Chức năng 30 - Màn 1] Danh mục quà tặng xanh & kho voucher sinh thái
   */
  async getRewardCatalog(params?: {
    search?: string;
    stock_status?: string;
  }): Promise<import("./types").RewardCatalogResponse> {
    const res = await api.get<import("./types").RewardCatalogResponse>("/api/v1/rewards/catalog", {
      params,
    });
    return res.data;
  },

  /**
   * [Chức năng 30] Chi tiết quà tặng
   */
  async getRewardDetail(rewardId: number): Promise<import("./types").EcoRewardItem> {
    const res = await api.get<import("./types").EcoRewardItem>(`/api/v1/rewards/catalog/${rewardId}`);
    return res.data;
  },

  /**
   * [Chức năng 30 - Màn 2] Thêm quà tặng / lô voucher mới vào kho
   */
  async createReward(payload: import("./types").CreateRewardRequest): Promise<import("./types").EcoRewardItem> {
    const res = await api.post<import("./types").EcoRewardItem>("/api/v1/rewards/catalog", payload);
    return res.data;
  },

  /**
   * [Chức năng 30 - Màn 3] Cập nhật thông tin & điều chỉnh kho voucher
   */
  async updateReward(
    rewardId: number,
    payload: import("./types").UpdateRewardRequest
  ): Promise<import("./types").EcoRewardItem> {
    const res = await api.put<import("./types").EcoRewardItem>(`/api/v1/rewards/catalog/${rewardId}`, payload);
    return res.data;
  },

  /**
   * [Chức năng 30 - Màn 4 & 5] Xóa quà tặng khỏi danh mục
   */
  async deleteReward(rewardId: number): Promise<{ message: string; detail?: string }> {
    const res = await api.delete<{ message: string; detail?: string }>(`/api/v1/rewards/catalog/${rewardId}`);
    return res.data;
  },

  /**
   * [Chức năng 30 - Màn 6] Bảng điều khiển phân tích số liệu quy đổi quà tặng
   */
  async getRedemptionAnalytics(
    timeRange = "MONTH"
  ): Promise<import("./types").RedemptionAnalyticsResponse> {
    const res = await api.get<import("./types").RedemptionAnalyticsResponse>("/api/v1/rewards/analytics", {
      params: { time_range: timeRange },
    });
    return res.data;
  },

  /**
   * [Chức năng 30 - Màn 6] Xuất báo cáo thống kê quy đổi ra tệp CSV
   */
  async downloadAnalyticsCsv(timeRange = "MONTH"): Promise<void> {
    const token = localStorage.getItem("eco_access_token");
    const baseUrl = api.defaults.baseURL || "http://localhost:8000";
    const url = new URL(`${baseUrl}/api/v1/rewards/analytics/export`);
    url.searchParams.set("time_range", timeRange);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không thể tải báo cáo phân tích");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `thong_ke_doi_qua_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * [Chức năng 31] Đổi Điểm Xanh lấy E-Voucher / Quà tặng
   */
  async redeemReward(rewardId: number): Promise<import("./types").RedeemRewardResponse> {
    const res = await api.post<import("./types").RedeemRewardResponse>("/api/v1/rewards/redeem", {
      reward_id: rewardId,
    });
    return res.data;
  },

  /**
   * [Chức năng 31 - Màn 1] Kho voucher và quà tặng cá nhân
   */
  async getMyVouchers(statusFilter = "ALL"): Promise<import("./types").UserVoucherListResponse> {
    const res = await api.get<import("./types").UserVoucherListResponse>("/api/v1/rewards/my-vouchers", {
      params: { status_filter: statusFilter },
    });
    return res.data;
  },

  /**
   * [Chức năng 31 - Màn 2] Chi tiết voucher cá nhân & màn hình xuất trình chứng từ
   */
  async getMyVoucherDetail(voucherId: string): Promise<import("./types").UserVoucherItem> {
    const res = await api.get<import("./types").UserVoucherItem>(`/api/v1/rewards/my-vouchers/${voucherId}`);
    return res.data;
  },

  /**
   * [Chức năng 31 - Màn 3 Popup] Đánh dấu voucher đã sử dụng
   */
  async markVoucherUsed(voucherId: string): Promise<import("./types").MarkVoucherUsedResponse> {
    const res = await api.post<import("./types").MarkVoucherUsedResponse>(
      `/api/v1/rewards/my-vouchers/${voucherId}/use`
    );
    return res.data;
  },
};
