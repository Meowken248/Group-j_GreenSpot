export const fundraiserService = {
  getCampaigns: async () => ({ items: [], total: 0 }),
  getCampaignDetail: async () => null,
  createCampaign: async () => ({ id: "mock-id" }),
  updateCampaign: async () => ({ id: "mock-id" }),
  deleteCampaign: async () => true,
  donate: async () => ({ success: true }),
  getDonations: async () => ({ items: [], total: 0 }),
  addExpense: async () => ({ id: "exp-id" }),
  getExpenses: async () => ({ items: [], total: 0 }),
  reviewCampaign: async () => ({ success: true }),
};
