import api from "../../../api/client";
import type {
  FundraiserApprovalInput,
  FundraiserCampaignCreateInput,
  FundraiserCampaignItem,
  FundraiserCampaignListResponse,
  FundraiserCampaignUpdateInput,
  FundraiserDonationCreateInput,
  FundraiserDonationItem,
  FundraiserExpenseCreateInput,
  FundraiserExpenseItem,
} from "../types/fundraiser.types";

const API_BASE = "/api/v1/fundraisers";

export interface FundraiserQueryParams {
  status?: string;
  district?: string;
  search?: string;
  my_campaigns?: boolean;
  page?: number;
  page_size?: number;
}

export const fundraiserService = {
  async getCampaigns(params?: FundraiserQueryParams): Promise<FundraiserCampaignListResponse> {
    const res = await api.get<FundraiserCampaignListResponse>(API_BASE, { params });
    return res.data;
  },

  async listCampaigns(params?: FundraiserQueryParams): Promise<FundraiserCampaignListResponse> {
    return this.getCampaigns(params);
  },

  async getCampaignDetail(campaignId: string): Promise<FundraiserCampaignItem> {
    const res = await api.get<FundraiserCampaignItem>(`${API_BASE}/${campaignId}`);
    return res.data;
  },

  async createCampaign(input: FundraiserCampaignCreateInput): Promise<FundraiserCampaignItem> {
    const res = await api.post<FundraiserCampaignItem>(API_BASE, input);
    return res.data;
  },

  async updateCampaign(
    campaignId: string,
    input: FundraiserCampaignUpdateInput
  ): Promise<FundraiserCampaignItem> {
    const res = await api.put<FundraiserCampaignItem>(`${API_BASE}/${campaignId}`, input);
    return res.data;
  },

  async deleteCampaign(campaignId: string): Promise<{ message: string }> {
    const res = await api.delete<{ message: string }>(`${API_BASE}/${campaignId}`);
    return res.data;
  },

  async closeCampaign(campaignId: string): Promise<FundraiserCampaignItem> {
    const res = await api.post<FundraiserCampaignItem>(`${API_BASE}/${campaignId}/close`);
    return res.data;
  },

  async donate(
    campaignId: string,
    input: FundraiserDonationCreateInput
  ): Promise<FundraiserDonationItem> {
    const res = await api.post<FundraiserDonationItem>(`${API_BASE}/${campaignId}/donate`, input);
    return res.data;
  },

  async createDonation(
    campaignId: string,
    input: FundraiserDonationCreateInput
  ): Promise<FundraiserDonationItem> {
    return this.donate(campaignId, input);
  },

  async getDonations(
    campaignId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<FundraiserDonationItem[]> {
    const res = await api.get<FundraiserDonationItem[]>(`${API_BASE}/${campaignId}/donations`, {
      params: { page, page_size: pageSize },
    });
    return res.data;
  },

  async listDonations(
    campaignId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<FundraiserDonationItem[]> {
    return this.getDonations(campaignId, page, pageSize);
  },

  async addExpense(
    campaignId: string,
    input: FundraiserExpenseCreateInput
  ): Promise<FundraiserExpenseItem> {
    const res = await api.post<FundraiserExpenseItem>(`${API_BASE}/${campaignId}/expenses`, input);
    return res.data;
  },

  async createExpense(
    campaignId: string,
    input: FundraiserExpenseCreateInput
  ): Promise<FundraiserExpenseItem> {
    return this.addExpense(campaignId, input);
  },

  async getExpenses(campaignId: string): Promise<FundraiserExpenseItem[]> {
    const res = await api.get<FundraiserExpenseItem[]>(`${API_BASE}/${campaignId}/expenses`);
    return res.data;
  },

  async listExpenses(campaignId: string): Promise<FundraiserExpenseItem[]> {
    return this.getExpenses(campaignId);
  },

  async reviewCampaign(
    campaignId: string,
    action: "approve" | "reject",
    rejectionReason?: string
  ): Promise<FundraiserCampaignItem> {
    const payload: FundraiserApprovalInput = {
      action,
      rejection_reason: rejectionReason,
    };
    const res = await api.post<FundraiserCampaignItem>(`${API_BASE}/${campaignId}/review`, payload);
    return res.data;
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string }>(`${API_BASE}/upload-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async uploadReceiptImage(file: File): Promise<{ url: string }> {
    return this.uploadImage(file);
  },
};
