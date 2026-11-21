export const penaltyService = {
  getCategories: async () => [],
  searchPenalties: async () => ({ items: [], total: 0, page: 1, limit: 10 }),
  getPenaltyDetail: async (_id: string) => null,
  getDomains: async () => [],
  getDomainCounts: async () => ({}),
  createReport: async () => ({ id: 'mock-report-id', status: 'PENDING' }),
  getReports: async () => ({ items: [], total: 0 }),
  updateReportStatus: async () => ({ status: 'UPDATED' }),
};
